/* ============================================================
   PROFILES — Family Mode: Add / Switch / Delete Profiles
   ============================================================ */

import * as storage from '../storage.js';
import * as state from '../state.js';
import * as router from '../router.js';
import * as gamification from './gamification.js';
import { avatarHTML, esc, showModal, closeModal } from '../ui/components.js';
import * as toast from '../ui/toast.js';
import { icon } from '../ui/icons.js';
import * as i18n from '../i18n.js';

const AVATAR_COLORS = ['#6C63FF','#FF6B6B','#4ECDC4','#F39C12','#2ECC71','#E74C3C'];

const ENV_MAP = {
  home_no_equipment: { emoji: '🏠', labelKey: 'envHomeNoEq'    },
  home_gym:          { emoji: '🏋️', labelKey: 'envHomeGym'     },
  outdoor:           { emoji: '🌳', labelKey: 'envOutdoor'      },
  calisthenics:      { emoji: '🤸', labelKey: 'envCalisthenics' }
};

function mount() {
  const section = document.getElementById('view-profiles');
  _render(section);
}

function unmount() {}

function _render(section) {
  const profiles    = storage.loadProfiles();
  const activeId    = storage.getActiveProfileId();
  const profileList = Object.values(profiles);
  const canAddMore  = profileList.length < 6;

  section.innerHTML = `
    <div class="profiles-header">
      <div class="profiles-header__title">${i18n.t('profilesTitle')}</div>
      <div class="profiles-header__subtitle">${profileList.length} / 6 ${i18n.t('navProfiles').toLowerCase()}</div>
    </div>

    <div class="profiles-list">
      ${profileList.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state__icon">👤</div>
          <h3 class="empty-state__title">${i18n.t('noProfiles')}</h3>
          <p class="empty-state__desc">${i18n.t('noProfilesDesc')}</p>
        </div>
      ` : profileList.map((p, i) => _profileCardHTML(p, i, p.id === activeId)).join('')}

      ${canAddMore ? `
        <button class="profiles-add-btn" id="add-profile-btn">
          <span style="font-size:1.5rem">＋</span>
          <span>${i18n.t('addMember')}</span>
        </button>
      ` : `<p class="text-sm text-muted text-center">${i18n.t('maxProfiles')}</p>`}

      <div class="profiles-about">
        <div style="font-weight:var(--font-semibold);margin-bottom:var(--space-2)">${i18n.t('aboutFamilyMode')}</div>
        <p class="text-sm text-muted">${i18n.t('familyModeDesc')}</p>
      </div>
    </div>
  `;

  section.querySelector('#add-profile-btn')?.addEventListener('click', () => {
    router.navigate('#onboarding', { addMode: true });
  });

  section.querySelectorAll('[data-switch-profile]').forEach(btn => {
    btn.addEventListener('click', () => switchProfile(btn.dataset.switchProfile));
  });

  section.querySelectorAll('[data-delete-profile]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _confirmDelete(btn.dataset.deleteProfile, profiles);
    });
  });
}

function _profileCardHTML(profile, index, isActive) {
  const gamData  = gamification.getOrInit(profile.id);
  const level    = gamification.getLevel(gamData.xp);
  const streak   = gamData.currentStreakDays;
  const workouts = (gamData.workoutHistory || []).length;
  const env      = ENV_MAP[profile.defaultEnvironment || profile.environment] || { emoji: '🏠', labelKey: 'envHomeNoEq' };
  const levelLabel = `Lv.${level}`;

  return `
    <div class="profile-card ${isActive ? 'profile-card--active' : ''}" data-switch-profile="${profile.id}">
      <div class="profile-card__top">
        ${avatarHTML(profile.name, 'md', index, isActive)}
        <div class="profile-card__info">
          <div class="profile-card__name">
            ${esc(profile.name)}
            ${isActive ? `<span class="tag tag--primary" style="font-size:10px">${i18n.t('activeLabel')}</span>` : ''}
          </div>
          <div class="profile-card__sub">
            ${profile.age} ${i18n.t('labelAge').toLowerCase()} • ${_fitnessLabel(profile.fitnessLevel)} • ${env.emoji} ${i18n.t(env.labelKey)}
          </div>
        </div>
        <div class="profile-card__actions">
          <button class="btn btn--icon btn--ghost" data-delete-profile="${profile.id}" aria-label="${i18n.t('deleteProfile')}" title="${i18n.t('deleteProfile')}">
            ${icon('trash')}
          </button>
        </div>
      </div>

      <div class="profile-card__stats">
        <div class="profile-stat">
          <div class="profile-stat__value">${levelLabel}</div>
          <div class="profile-stat__label">${i18n.t('labelLevel').replace('⭐ ','')}</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat__value">${streak > 0 ? streak + '🔥' : '—'}</div>
          <div class="profile-stat__label">${i18n.t('labelStreak').replace('🔥 ','')}</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat__value">${gamData.xp}</div>
          <div class="profile-stat__label">XP</div>
        </div>
      </div>
    </div>
  `;
}

function switchProfile(profileId) {
  const profiles = storage.loadProfiles();
  if (!profiles[profileId]) return;

  storage.setActiveProfileId(profileId);
  state.setState({ activeProfileId: profileId, profiles });
  toast.success(i18n.t('switchedTo', profiles[profileId].name));
  router.navigate('#dashboard');
}

function _confirmDelete(profileId, profiles) {
  const profile   = profiles[profileId];
  const isActive  = storage.getActiveProfileId() === profileId;
  const remaining = Object.keys(profiles).length;

  if (remaining <= 1) {
    toast.error(i18n.t('cantDelete'), i18n.t('needOneProfile'));
    return;
  }

  showModal({
    title: i18n.t('deleteConfirm', profile.name),
    contentHTML: `
      <p class="text-muted">${i18n.t('deleteWarning', esc(profile.name))}</p>
    `,
    footer: `
      <div style="display:flex;gap:var(--space-3)">
        <button class="btn btn--ghost btn--full" id="modal-cancel">${i18n.t('btnCancel')}</button>
        <button class="btn btn--danger btn--full" id="modal-confirm-delete">${i18n.t('btnDelete')}</button>
      </div>
    `
  });

  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm-delete').addEventListener('click', () => {
    storage.deleteProfile(profileId);
    const updatedProfiles = storage.loadProfiles();

    if (isActive) {
      const nextId = Object.keys(updatedProfiles)[0];
      storage.setActiveProfileId(nextId);
      state.setState({ activeProfileId: nextId, profiles: updatedProfiles });
    } else {
      state.setState({ profiles: updatedProfiles });
    }

    toast.success(i18n.t('profileDeleted', profile.name));
    closeModal();
    mount();
  });
}

function _fitnessLabel(level) {
  const keys = { beginner: 'levelBeginner', intermediate: 'levelIntermediate', advanced: 'levelAdvanced' };
  return i18n.t(keys[level] || 'levelBeginner');
}

export { mount, unmount, switchProfile };
