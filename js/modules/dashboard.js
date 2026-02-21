/* ============================================================
   DASHBOARD — Daily Card, Macros, Streak/XP, Profile Switcher
   ============================================================ */

import * as state from '../state.js';
import * as storage from '../storage.js';
import * as router from '../router.js';
import { generateOrLoadWorkout } from '../api.js';
import * as gamification from './gamification.js';
import { getOrGeneratePlan, sumLogged } from './nutrition.js';
import { avatarHTML, macroRingHTML, macroLegendHTML, xpBarHTML, streakHTML, skeletonCardHTML, esc } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import * as toast from '../ui/toast.js';
import * as i18n from '../i18n.js';

let _unsubscribers = [];

function mount() {
  const section = document.getElementById('view-dashboard');
  _render(section);

  _unsubscribers.push(
    state.subscribe('activeProfileId', () => _render(section)),
    state.subscribe('profiles',        () => _render(section))
  );
}

function unmount() {
  _unsubscribers.forEach(fn => fn());
  _unsubscribers = [];
}

async function _render(section) {
  const profileId = state.getState('activeProfileId');
  const profiles  = state.getState('profiles') || {};
  const profile   = profiles[profileId];

  if (!profile) {
    section.innerHTML = _noProfileHTML();
    section.querySelector('#dash-create-profile')?.addEventListener('click', () => router.navigate('#onboarding'));
    return;
  }

  const gamData   = gamification.getOrInit(profileId);
  const nutrition = getOrGeneratePlan(profile);
  const logged    = sumLogged(nutrition.log);
  const macroTgt  = { ...nutrition.plan.macroTargets, calories: nutrition.plan.targetCalories };

  section.innerHTML = _dashHTML(profile, profiles, profileId, gamData, logged, macroTgt);
  _bindEvents(section, profile, profiles, profileId);

  const workoutCard = section.querySelector('#dash-workout-card');
  if (workoutCard) {
    workoutCard.innerHTML = skeletonCardHTML(3);
    try {
      const workout = await generateOrLoadWorkout(profile, gamData);
      workoutCard.innerHTML = _workoutCardBodyHTML(workout, profile);
      workoutCard.querySelector('#dash-start-workout')?.addEventListener('click', () => router.navigate('#workout'));
    } catch (err) {
      workoutCard.innerHTML = `<div class="p-4 text-muted text-sm">⚠️ ${i18n.t('couldntLoadWorkout')}. ${err.message}</div>`;
    }
  }
}

function _dashHTML(profile, profiles, activeId, gamData, logged, macroTgt) {
  const profileList = Object.values(profiles);
  const level       = gamification.getLevel(gamData.xp);
  const greeting    = _greeting();
  const isYouth     = profile.age < 15;
  const env         = profile.defaultEnvironment || profile.environment || 'home_no_equipment';

  return `
    <div class="app-layout">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="dashboard-header__top">
          <div>
            <div class="dashboard-header__greeting">${greeting}</div>
            <div class="dashboard-header__name">${esc(profile.name)} 👋</div>
          </div>
          <div style="display:flex;gap:var(--space-2);align-items:center">
            <button id="dash-install-btn" class="btn btn--icon" style="background:rgba(255,255,255,0.2);color:#fff;display:none" title="${i18n.t('btnInstall')}">${icon('install') || '📲'}</button>
            <button class="btn btn--icon" style="background:rgba(255,255,255,0.2);color:#fff" title="${i18n.t('badgesTitle')}" onclick="location.hash='#badges'">${icon('badges')}</button>
          </div>
        </div>
        <div class="dashboard-header__stats">
          <div class="dashboard-stat">
            <span class="dashboard-stat__value">${gamData.currentStreakDays}</span>
            <span class="dashboard-stat__label">${i18n.t('labelStreak')}</span>
          </div>
          <div class="dashboard-stat">
            <span class="dashboard-stat__value">${level}</span>
            <span class="dashboard-stat__label">${i18n.t('labelLevel')}</span>
          </div>
          <div class="dashboard-stat">
            <span class="dashboard-stat__value">${gamData.xp}</span>
            <span class="dashboard-stat__label">XP</span>
          </div>
          <div class="dashboard-stat">
            <span class="dashboard-stat__value">${gamData.workoutHistory.filter(w=>w.completed).length}</span>
            <span class="dashboard-stat__label">${i18n.t('labelWorkouts')}</span>
          </div>
        </div>
      </div>

      <!-- Profile Switcher -->
      <div class="profile-switcher">
        ${profileList.map((p, i) => `
          <div class="profile-switcher__item ${p.id === activeId ? 'active' : ''}" data-switch="${p.id}" role="button" tabindex="0" aria-label="${i18n.t('switchedTo', esc(p.name))}">
            ${avatarHTML(p.name, 'sm', i, p.id === activeId)}
            <div class="profile-switcher__name">${esc(p.name)}</div>
          </div>
        `).join('')}
        ${profileList.length < 6 ? `<button class="profile-switcher__add" id="dash-add-profile" title="${i18n.t('addMember')}">+</button>` : ''}
      </div>

      <!-- Scroll Content -->
      <div class="scroll-view">
        <div class="dashboard-content">

          <!-- XP Bar -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">🏆 ${i18n.t('labelLevel')} ${level}</span>
              <div class="flex items-center gap-2">
                ${gamData.currentStreakDays > 0 ? streakHTML(gamData.currentStreakDays) : ''}
              </div>
            </div>
            ${xpBarHTML(gamData.xp)}
            <div class="flex gap-2 mt-3" style="flex-wrap:wrap">
              ${gamData.badges.filter(b=>b.unlocked).slice(-4).map(b =>
                `<span title="${esc(b.name)}" style="font-size:1.5rem">${b.icon}</span>`
              ).join('') || `<span class="text-sm text-muted">${i18n.t('keepGoing')}</span>`}
              ${gamData.badges.filter(b=>b.unlocked).length > 0 ?
                `<button class="btn btn--sm btn--ghost" onclick="location.hash='#badges'">${i18n.t('btnDetails')}</button>` : ''}
            </div>
          </div>

          <!-- Today's Workout -->
          <div>
            <div class="section-header">
              <span class="section-header__title">💪 ${i18n.t('todayWorkout')}</span>
              <button class="section-header__action" onclick="location.hash='#workout'">${i18n.t('btnStartWorkout')}</button>
            </div>
            <div class="workout-card">
              <div class="workout-card__header">
                <div>
                  <div class="workout-card__title">${_envLabel(env)}</div>
                  <div class="workout-card__meta">${_fitnessLabel(profile.fitnessLevel)} • ${_dayName()}</div>
                </div>
                <span style="font-size:2rem">${_envEmoji(env)}</span>
              </div>
              <div class="workout-card__body" id="dash-workout-card">
                <!-- Loaded async -->
              </div>
            </div>
          </div>

          <!-- Nutrition Summary -->
          <div>
            <div class="section-header">
              <span class="section-header__title">🥗 ${i18n.t('nutritionToday')}</span>
              <button class="section-header__action" onclick="location.hash='#nutrition'">${i18n.t('btnDetails')}</button>
            </div>
            <div class="card">
              <div style="display:flex;gap:var(--space-4);align-items:center">
                ${macroRingHTML(logged, macroTgt, 120)}
                ${macroLegendHTML(logged, macroTgt)}
              </div>
              ${isYouth ? `<p class="text-sm text-muted mt-3">${i18n.t('youthNutrNote')}</p>` : ''}
            </div>
          </div>

          <!-- Quick Actions -->
          <div>
            <div class="section-header"><span class="section-header__title">${i18n.t('quickActions')}</span></div>
            <div class="grid-2">
              <button class="card card--interactive" style="text-align:center;cursor:pointer;border:none" onclick="location.hash='#nutrition'">
                <div style="font-size:2rem">🥗</div>
                <div style="font-weight:600;margin-top:8px">${i18n.t('btnLogMeal')}</div>
                <div class="text-sm text-muted">${i18n.t('nutritionToday')}</div>
              </button>
              <button class="card card--interactive" style="text-align:center;cursor:pointer;border:none" onclick="location.hash='#badges'">
                <div style="font-size:2rem">🏅</div>
                <div style="font-weight:600;margin-top:8px">${i18n.t('badgesTitle').replace('🏅 ','')}</div>
                <div class="text-sm text-muted">${gamData.badges.filter(b=>b.unlocked).length} ${i18n.t('allBadges').toLowerCase()}</div>
              </button>
              <button class="card card--interactive" style="text-align:center;cursor:pointer;border:none" onclick="location.hash='#profiles'">
                <div style="font-size:2rem">👨‍👩‍👧</div>
                <div style="font-weight:600;margin-top:8px">${i18n.t('navProfiles')}</div>
                <div class="text-sm text-muted">${i18n.t('aboutFamilyMode')}</div>
              </button>
              <button class="card card--interactive" style="text-align:center;cursor:pointer;border:none" onclick="location.hash='#workout'">
                <div style="font-size:2rem">🏋️</div>
                <div style="font-weight:600;margin-top:8px">${i18n.t('navWorkout')}</div>
                <div class="text-sm text-muted">${i18n.t('btnStartWorkout')}</div>
              </button>
            </div>
          </div>

          <!-- Recent Activity -->
          ${_recentActivity(gamData)}

          <div style="height:var(--space-5)"></div>
        </div>
      </div>

      <!-- Bottom Nav -->
      ${_bottomNavHTML()}
    </div>
  `;
}

function _workoutCardBodyHTML(workout, profile) {
  const isComplete = workout.completed;
  const exercises  = (workout.exercises || []).slice(0, 4);

  return `
    <div class="workout-preview">
      ${exercises.map(ex => `
        <div class="workout-preview-item">
          <span class="workout-preview-item__icon">${ex.emoji || '💪'}</span>
          <span class="workout-preview-item__name">${esc(ex.name)}</span>
          <span class="workout-preview-item__sets">${ex.sets}×${ex.durationSeconds ? ex.durationSeconds+'s' : ex.reps}</span>
        </div>
      `).join('')}
      ${workout.exercises.length > 4 ? `<div class="text-sm text-muted">+${workout.exercises.length - 4} more</div>` : ''}
    </div>
    <div style="display:flex;gap:var(--space-3);align-items:center">
      <div class="flex gap-2">
        <span class="tag">⏱ ~${workout.estimatedDurationMinutes} min</span>
        <span class="tag">${workout.exercises.length} ${i18n.t('labelSets').toLowerCase()}</span>
        ${isComplete ? `<span class="tag tag--success">✓ ${i18n.t('workoutComplete')}</span>` : ''}
      </div>
      ${!isComplete ? `<button class="btn btn--primary btn--sm ml-2" style="margin-left:auto" id="dash-start-workout">${i18n.t('btnStartWorkout')}</button>` : ''}
    </div>
  `;
}

function _recentActivity(gamData) {
  const history = (gamData.workoutHistory || []).slice(-5).reverse();
  if (!history.length) return '';
  return `
    <div>
      <div class="section-header"><span class="section-header__title">${i18n.t('recentActivity')}</span></div>
      <div class="card" style="padding:0;overflow:hidden">
        ${history.map(w => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border)">
            <div>
              <div class="font-medium">${_friendlyDate(w.date)}</div>
              <div class="text-sm text-muted">${w.feedback ? _feedbackLabel(w.feedback) : ''}</div>
            </div>
            <div class="flex gap-2 items-center">
              <span class="tag tag--primary">+${w.xpEarned} XP</span>
              ${w.completed ? '<span style="color:var(--color-success)">✓</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function _bindEvents(section, profile, profiles, activeId) {
  section.querySelectorAll('[data-switch]').forEach(el => {
    el.addEventListener('click', () => {
      const pid = el.dataset.switch;
      if (pid === activeId) return;
      storage.setActiveProfileId(pid);
      state.setState({ activeProfileId: pid, profiles });
      toast.success(i18n.t('switchedTo', profiles[pid]?.name || ''));
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') el.click(); });
  });

  section.querySelector('#dash-add-profile')?.addEventListener('click', () => {
    router.navigate('#onboarding', { addMode: true });
  });

  // Install button — show if PWA deferred install is available
  const installBtn = section.querySelector('#dash-install-btn');
  if (installBtn) {
    if (window._deferredInstall) {
      installBtn.style.display = '';
    }
    installBtn.addEventListener('click', () => {
      if (window.triggerPWAInstall) window.triggerPWAInstall();
    });
  }
}

function _noProfileHTML() {
  return `
    <div class="loading-screen">
      <div style="font-size:4rem">🏋️‍♂️</div>
      <h2>${i18n.t('appName')}!</h2>
      <p class="text-muted text-center" style="max-width:280px">${i18n.t('appTagline')}</p>
      <button class="btn btn--primary btn--lg" id="dash-create-profile">${i18n.t('btnStart')}</button>
    </div>
  `;
}

function _bottomNavHTML() {
  return `
    <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
      <button class="bottom-nav__item" data-route="#dashboard" onclick="location.hash='#dashboard'">
        ${icon('dashboard')}<span>${i18n.t('navHome')}</span>
      </button>
      <button class="bottom-nav__item" data-route="#workout" onclick="location.hash='#workout'">
        ${icon('workout')}<span>${i18n.t('navWorkout')}</span>
      </button>
      <button class="bottom-nav__item" data-route="#nutrition" onclick="location.hash='#nutrition'">
        ${icon('nutrition')}<span>${i18n.t('navNutrition')}</span>
      </button>
      <button class="bottom-nav__item" data-route="#profiles" onclick="location.hash='#profiles'">
        ${icon('profiles')}<span>${i18n.t('navProfiles')}</span>
      </button>
      <button class="bottom-nav__item" data-route="#badges" onclick="location.hash='#badges'">
        ${icon('badges')}<span>${i18n.t('navBadges')}</span>
      </button>
    </nav>
  `;
}

/* ---- Helpers ---- */
function _greeting() {
  const h = new Date().getHours();
  if (h < 12) return i18n.t('greeting_morning');
  if (h < 17) return i18n.t('greeting_afternoon');
  return i18n.t('greeting_evening');
}

function _dayName() {
  return new Date().toLocaleDateString(i18n.getLang() === 'he' ? 'he-IL' : undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function _envEmoji(env) {
  return { home_no_equipment:'🏠', home_gym:'🏋️', outdoor:'🌳', calisthenics:'🤸' }[env] || '💪';
}

function _envLabel(env) {
  const keys = { home_no_equipment:'envHomeNoEq', home_gym:'envHomeGym', outdoor:'envOutdoor', calisthenics:'envCalisthenics' };
  return i18n.t(keys[env] || 'navWorkout');
}

function _fitnessLabel(level) {
  const keys = { beginner: 'levelBeginner', intermediate: 'levelIntermediate', advanced: 'levelAdvanced' };
  return i18n.t(keys[level] || 'levelBeginner');
}

function _friendlyDate(dateStr) {
  const d     = new Date(dateStr + 'T12:00:00');
  const today = new Date(); today.setHours(12,0,0,0);
  const diff  = Math.round((today - d) / 86400000);
  if (diff === 0) return i18n.getLang() === 'he' ? 'היום' : 'Today';
  if (diff === 1) return i18n.getLang() === 'he' ? 'אתמול' : 'Yesterday';
  return d.toLocaleDateString(i18n.getLang() === 'he' ? 'he-IL' : undefined, { weekday:'short', month:'short', day:'numeric' });
}

function _feedbackLabel(f) {
  const map = {
    too_easy:   `😴 ${i18n.t('feedbackEasy')}`,
    just_right: `😊 ${i18n.t('feedbackRight')}`,
    too_hard:   `😤 ${i18n.t('feedbackHard')}`
  };
  return map[f] || '';
}

export { mount, unmount };
