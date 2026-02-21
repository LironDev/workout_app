/* ============================================================
   BADGES VIEW — Display All Badges and Progress
   ============================================================ */

import * as state from '../state.js';
import * as gamification from './gamification.js';
import { esc, xpBarHTML } from '../ui/components.js';
import * as i18n from '../i18n.js';

function mount() {
  const section   = document.getElementById('view-badges');
  const profileId = state.getState('activeProfileId');
  const profiles  = state.getState('profiles') || {};
  const profile   = profiles[profileId];

  if (!profile) {
    section.innerHTML = `<div class="section"><div class="empty-state"><div class="empty-state__icon">🏅</div><h3>${i18n.t('noProfile')}</h3></div></div>`;
    return;
  }

  const gamData  = gamification.getOrInit(profileId);
  const level    = gamification.getLevel(gamData.xp);
  const unlocked = gamData.badges.filter(b => b.unlocked).length;

  section.innerHTML = `
    <div class="view-header">
      <span class="view-header__title">${i18n.t('badgesTitle')}</span>
    </div>

    <div class="badges-header">
      <div class="badges-header__title">${i18n.t('labelLevel')} ${level} — ${esc(profile.name)}</div>
      <div class="badges-header__subtitle">${gamData.xp} ${i18n.t('totalXP')} • ${unlocked}/${gamData.badges.length} ${i18n.t('allBadges').toLowerCase()}</div>
      <div style="max-width:300px;margin:var(--space-3) auto 0">
        ${xpBarHTML(gamData.xp)}
      </div>
    </div>

    <div class="section">
      <div class="card mb-4">
        <div class="card-header">
          <span class="card-title">🔥 ${i18n.t('labelStreak')}</span>
        </div>
        <div class="grid-2">
          ${_stat(i18n.t('currentStreak'), i18n.t('daysUnit', gamData.currentStreakDays), '🔥')}
          ${_stat(i18n.t('bestStreak'),    i18n.t('daysUnit', gamData.longestStreakDays), '🏆')}
          ${_stat(i18n.t('totalWorkouts'), gamData.workoutHistory.filter(w=>w.completed).length, '💪')}
          ${_stat(i18n.t('totalXP'),       gamData.xp, '⭐')}
        </div>
      </div>

      <h3 style="margin-bottom:var(--space-4)">${i18n.t('allBadges')}</h3>
      <div class="badges-grid">
        ${gamData.badges.map(b => `
          <div class="badge-icon ${b.unlocked ? '' : 'badge-icon--locked'}" title="${esc(b.desc)}">
            <div class="badge-icon__emoji ${b.unlocked ? 'animate-badgePop' : ''}">${b.icon}</div>
            <div class="badge-icon__name">${esc(b.name)}</div>
            ${b.earnedAt ? `<div style="font-size:9px;color:var(--color-text-muted)">${_shortDate(b.earnedAt)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function unmount() {}

function _stat(label, value, emoji) {
  return `<div style="padding:var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-md);text-align:center">
    <div style="font-size:1.5rem">${emoji}</div>
    <div style="font-weight:700;font-size:var(--text-xl)">${esc(String(value))}</div>
    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${esc(label)}</div>
  </div>`;
}

function _shortDate(iso) {
  return new Date(iso).toLocaleDateString(i18n.getLang() === 'he' ? 'he-IL' : undefined, { month:'short', day:'numeric' });
}

export { mount, unmount };
