/* ============================================================
   ONBOARDING — 5-Step Profile Creation Wizard
   ============================================================ */

import * as storage from '../storage.js';
import * as state from '../state.js';
import * as router from '../router.js';
import { createUserProfile, kgToLbs, lbsToKg, cmToFtIn, ftInToCm } from '../models.js';
import * as gamification from './gamification.js';
import * as toast from '../ui/toast.js';
import * as i18n from '../i18n.js';

let _currentStep = 1;
let _totalSteps  = 5;
let _formData    = {};
let _useImperial = false;
let _isAddMode   = false;

/* ---- Mount ---- */
function mount({ addMode = false } = {}) {
  _isAddMode   = addMode;
  _currentStep = 1;
  _formData    = {};
  _useImperial = false;

  const section = document.getElementById('view-onboarding');
  section.innerHTML = _scaffoldHTML();
  _bindGlobal(section);
  _renderStep(1);
}

function unmount() {
  _formData = {};
}

/* ---- Scaffold ---- */
function _scaffoldHTML() {
  return `
    <div class="onboarding-layout">
      ${!_isAddMode ? `
        <div class="onboarding-hero">
          <div class="onboarding-hero__logo">🏋️‍♂️</div>
          <h1 class="onboarding-hero__title">${i18n.t('appName')}</h1>
          <p class="onboarding-hero__subtitle">${i18n.t('appTagline')}</p>
        </div>
      ` : `
        <div style="padding-top:var(--space-5)">
          <button class="btn btn--ghost btn--sm" id="ob-cancel-add">${i18n.t('btnBack2Profiles')}</button>
          <h2 style="margin-top:var(--space-4)">${i18n.t('btnNewProfile')}</h2>
        </div>
      `}

      <div id="ob-step-indicator" class="step-indicator" style="margin-bottom:var(--space-5)"></div>

      <div id="ob-step-1" class="step-container"></div>
      <div id="ob-step-2" class="step-container"></div>
      <div id="ob-step-3" class="step-container"></div>
      <div id="ob-step-4" class="step-container"></div>
      <div id="ob-step-5" class="step-container"></div>
    </div>
  `;
}

function _bindGlobal(section) {
  section.querySelector('#ob-cancel-add')?.addEventListener('click', () => router.navigate('#profiles'));
}

/* ---- Step Rendering ---- */
function _renderStep(step) {
  const ind = document.getElementById('ob-step-indicator');
  if (ind) {
    ind.innerHTML = Array.from({ length: _totalSteps }, (_, i) => {
      const n = i + 1;
      let cls = 'step-dot';
      if (n === step) cls += ' step-dot--active';
      else if (n < step) cls += ' step-dot--done';
      return `<div class="${cls}"></div>`;
    }).join('');
  }

  for (let i = 1; i <= _totalSteps; i++) {
    const el = document.getElementById(`ob-step-${i}`);
    if (el) el.classList.toggle('active', i === step);
  }

  const container = document.getElementById(`ob-step-${step}`);
  if (!container) return;

  const renderers = [null, _step1, _step2, _step3, _step4, _step5];
  renderers[step]?.(container);
}

/* ---- Step 1: Name + Age + Gender ---- */
function _step1(container) {
  const genders = [
    ['male',   i18n.t('genderMale')],
    ['female', i18n.t('genderFemale')],
    ['other',  i18n.t('genderOther')]
  ];

  container.innerHTML = `
    <div class="step-header">
      <div class="step-header__number">${i18n.t('onboardingStep', 1, _totalSteps)}</div>
      <h2 class="step-header__title">${i18n.t('step1Title')}</h2>
      <p class="step-header__desc">${i18n.t('step1Desc')}</p>
    </div>
    <div class="step-fields">
      <div class="form-group">
        <label class="form-label form-label--required" for="ob-name">${i18n.t('labelName')}</label>
        <input class="form-input" id="ob-name" type="text" placeholder="e.g. Alex" maxlength="30" value="${_formData.name || ''}" autocomplete="given-name">
      </div>
      <div class="form-group">
        <label class="form-label form-label--required" for="ob-age">${i18n.t('labelAge')}</label>
        <input class="form-input" id="ob-age" type="number" placeholder="e.g. 25" min="9" max="99" value="${_formData.age || ''}">
        <span class="form-hint">${i18n.t('minAge')}</span>
      </div>
      <div class="form-group">
        <label class="form-label">${i18n.t('labelGender')}</label>
        <div class="choice-group">
          ${genders.map(([id, label]) =>
            `<div class="choice-chip${_formData.gender===id?' selected':''}" data-gender="${id}">${label}</div>`
          ).join('')}
        </div>
      </div>
    </div>
    <div class="step-nav">
      <button class="btn btn--primary btn--full" id="ob-next-1">${i18n.t('btnContinue')}</button>
    </div>
  `;

  container.querySelectorAll('[data-gender]').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('[data-gender]').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      _formData.gender = chip.dataset.gender;
    });
  });

  container.querySelector('#ob-next-1').addEventListener('click', () => {
    const name = document.getElementById('ob-name').value.trim();
    const age  = parseInt(document.getElementById('ob-age').value);
    if (!name) return _fieldError('ob-name', 'Please enter your name');
    if (!age || age < 9 || age > 99) return _fieldError('ob-age', 'Please enter a valid age (9-99)');
    _formData.name = name;
    _formData.age  = age;
    if (!_formData.gender) _formData.gender = 'other';
    _advance();
  });
}

/* ---- Step 2: Weight + Height ---- */
function _step2(container) {
  container.innerHTML = `
    <div class="step-header">
      <div class="step-header__number">${i18n.t('onboardingStep', 2, _totalSteps)}</div>
      <h2 class="step-header__title">${i18n.t('step2Title')}</h2>
      <p class="step-header__desc">${i18n.t('step2Desc')}</p>
    </div>
    <div class="step-fields">
      <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-2)">
        <div class="unit-toggle">
          <button class="unit-toggle__btn ${!_useImperial?'active':''}" id="ob-metric">${i18n.t('unitMetric')}</button>
          <button class="unit-toggle__btn ${_useImperial?'active':''}" id="ob-imperial">${i18n.t('unitImperial')}</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label form-label--required">${i18n.t('labelWeight')} (${_useImperial?'lbs':'kg'})</label>
        <div class="input-group">
          <input class="form-input" id="ob-weight" type="number" step="0.1" placeholder="${_useImperial?'e.g. 154':'e.g. 70'}" value="${_weightDisplay()}">
          <span class="input-group__addon">${_useImperial?'lbs':'kg'}</span>
        </div>
      </div>

      ${!_useImperial ? `
        <div class="form-group">
          <label class="form-label form-label--required">${i18n.t('labelHeight')} (cm)</label>
          <div class="input-group">
            <input class="form-input" id="ob-height-cm" type="number" placeholder="e.g. 170" value="${_formData.height || ''}">
            <span class="input-group__addon">cm</span>
          </div>
        </div>
      ` : `
        <div class="form-group">
          <label class="form-label form-label--required">${i18n.t('labelHeight')}</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
            <div class="input-group">
              <input class="form-input" id="ob-height-ft" type="number" placeholder="5" value="${_formData.height ? Math.floor(_formData.height / 30.48) : ''}">
              <span class="input-group__addon">ft</span>
            </div>
            <div class="input-group">
              <input class="form-input" id="ob-height-in" type="number" placeholder="7" min="0" max="11" value="${_formData.height ? Math.round((_formData.height % 30.48) / 2.54) : ''}">
              <span class="input-group__addon">in</span>
            </div>
          </div>
        </div>
      `}
    </div>
    <div class="step-nav">
      <button class="btn btn--ghost btn--back" id="ob-back-2">${i18n.t('btnBack')}</button>
      <button class="btn btn--primary btn--full" id="ob-next-2">${i18n.t('btnContinue')}</button>
    </div>
  `;

  document.getElementById('ob-metric').addEventListener('click',   () => { _useImperial = false; _step2(container); });
  document.getElementById('ob-imperial').addEventListener('click', () => { _useImperial = true;  _step2(container); });
  document.getElementById('ob-back-2').addEventListener('click',   () => _back());

  document.getElementById('ob-next-2').addEventListener('click', () => {
    const wVal = parseFloat(document.getElementById('ob-weight').value);
    if (!wVal || wVal < 20 || wVal > 500) return _fieldError('ob-weight', 'Please enter a valid weight');

    let heightCm;
    if (!_useImperial) {
      heightCm = parseInt(document.getElementById('ob-height-cm').value);
      if (!heightCm || heightCm < 60 || heightCm > 280) return _fieldError('ob-height-cm', 'Please enter a valid height (60–280 cm)');
    } else {
      const ft   = parseInt(document.getElementById('ob-height-ft').value) || 0;
      const inch = parseInt(document.getElementById('ob-height-in').value) || 0;
      heightCm   = Math.round((ft * 12 + inch) * 2.54);
      if (heightCm < 60) return alert('Please enter a valid height');
    }

    _formData.weight = _useImperial ? lbsToKg(wVal) : wVal;
    _formData.height = heightCm;
    _advance();
  });
}

function _weightDisplay() {
  if (!_formData.weight) return '';
  return _useImperial ? kgToLbs(_formData.weight) : _formData.weight;
}

/* ---- Step 3: Fitness Level ---- */
function _step3(container) {
  const levels = [
    { id: 'beginner',     labelKey: 'levelBeginner',     descKey: 'levelBegDesc',  emoji: '🌱' },
    { id: 'intermediate', labelKey: 'levelIntermediate',  descKey: 'levelIntDesc',  emoji: '🌿' },
    { id: 'advanced',     labelKey: 'levelAdvanced',      descKey: 'levelAdvDesc',  emoji: '🌳' }
  ];

  container.innerHTML = `
    <div class="step-header">
      <div class="step-header__number">${i18n.t('onboardingStep', 3, _totalSteps)}</div>
      <h2 class="step-header__title">${i18n.t('step3Title')}</h2>
      <p class="step-header__desc">${i18n.t('step3Desc')}</p>
    </div>
    <div class="step-fields">
      ${levels.map(l => `
        <div class="env-card${_formData.fitnessLevel===l.id?' selected':''}" data-level="${l.id}">
          <span style="font-size:2rem">${l.emoji}</span>
          <div>
            <div class="env-card__title">${i18n.t(l.labelKey)}</div>
            <div class="env-card__desc">${i18n.t(l.descKey)}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="step-nav">
      <button class="btn btn--ghost btn--back" id="ob-back-3">${i18n.t('btnBack')}</button>
      <button class="btn btn--primary btn--full" id="ob-next-3">${i18n.t('btnContinue')}</button>
    </div>
  `;

  container.querySelectorAll('[data-level]').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('[data-level]').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      _formData.fitnessLevel = card.dataset.level;
    });
  });

  container.querySelector('#ob-back-3').addEventListener('click', () => _back());
  container.querySelector('#ob-next-3').addEventListener('click', () => {
    if (!_formData.fitnessLevel) return toast.warning('Please select your fitness level');
    _advance();
  });
}

/* ---- Step 4: Goals ---- */
function _step4(container) {
  if (!_formData.goals) _formData.goals = [];

  const goals = [
    { id: 'stay_active',  labelKey: 'goalStayActive',  emoji: '🚶' },
    { id: 'lose_weight',  labelKey: 'goalLoseWeight',  emoji: '⚖️' },
    { id: 'build_muscle', labelKey: 'goalMuscle',      emoji: '💪' },
    { id: 'endurance',    labelKey: 'goalEndurance',   emoji: '🏃' }
  ];

  container.innerHTML = `
    <div class="step-header">
      <div class="step-header__number">${i18n.t('onboardingStep', 4, _totalSteps)}</div>
      <h2 class="step-header__title">${i18n.t('step4Title')}</h2>
      <p class="step-header__desc">${i18n.t('step4Desc')}</p>
    </div>
    <div class="step-fields">
      <div class="choice-group" style="justify-content:center">
        ${goals.map(g => `
          <div class="choice-chip choice-chip--lg${_formData.goals.includes(g.id)?' selected':''}" data-goal="${g.id}">
            <span class="chip-icon">${g.emoji}</span>
            <span>${i18n.t(g.labelKey)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="step-nav">
      <button class="btn btn--ghost btn--back" id="ob-back-4">${i18n.t('btnBack')}</button>
      <button class="btn btn--primary btn--full" id="ob-next-4">${i18n.t('btnContinue')}</button>
    </div>
  `;

  container.querySelectorAll('[data-goal]').forEach(chip => {
    chip.addEventListener('click', () => {
      const g = chip.dataset.goal;
      if (_formData.goals.includes(g)) {
        _formData.goals = _formData.goals.filter(id => id !== g);
        chip.classList.remove('selected');
      } else {
        _formData.goals.push(g);
        chip.classList.add('selected');
      }
    });
  });

  container.querySelector('#ob-back-4').addEventListener('click', () => _back());
  container.querySelector('#ob-next-4').addEventListener('click', () => {
    if (_formData.goals.length === 0) _formData.goals = ['stay_active'];
    _advance();
  });
}

/* ---- Step 5: Default Environment ---- */
function _step5(container) {
  const environments = [
    { id: 'home_no_equipment', labelKey: 'envHomeNoEq',     descKey: 'envHomeNoEqDesc',     emoji: '🏠' },
    { id: 'home_gym',          labelKey: 'envHomeGym',      descKey: 'envHomeGymDesc',       emoji: '🏋️' },
    { id: 'outdoor',           labelKey: 'envOutdoor',      descKey: 'envOutdoorDesc',       emoji: '🌳' },
    { id: 'calisthenics',      labelKey: 'envCalisthenics', descKey: 'envCalisthenicsDesc',  emoji: '🤸' }
  ];

  container.innerHTML = `
    <div class="step-header">
      <div class="step-header__number">${i18n.t('onboardingStep', 5, _totalSteps)}</div>
      <h2 class="step-header__title">${i18n.t('step5Title')}</h2>
      <p class="step-header__desc">${i18n.t('step5Desc')}</p>
    </div>
    <div class="step-fields">
      <div class="environment-grid">
        ${environments.map(e => `
          <div class="env-card${_formData.defaultEnvironment===e.id?' selected':''}" data-env="${e.id}">
            <span class="env-card__icon">${e.emoji}</span>
            <div>
              <div class="env-card__title">${i18n.t(e.labelKey)}</div>
              <div class="env-card__desc">${i18n.t(e.descKey)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="step-nav">
      <button class="btn btn--ghost btn--back" id="ob-back-5">${i18n.t('btnBack')}</button>
      <button class="btn btn--primary btn--full" id="ob-next-5">${i18n.t('btnStart')}</button>
    </div>
  `;

  container.querySelectorAll('[data-env]').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('[data-env]').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      _formData.defaultEnvironment = card.dataset.env;
    });
  });

  container.querySelector('#ob-back-5').addEventListener('click', () => _back());
  container.querySelector('#ob-next-5').addEventListener('click', () => {
    if (!_formData.defaultEnvironment) return toast.warning('Please select your preferred workout environment');
    _finish();
  });
}

/* ---- Navigation ---- */
function _advance() { if (_currentStep < _totalSteps) { _currentStep++; _renderStep(_currentStep); } }
function _back()    { if (_currentStep > 1)            { _currentStep--; _renderStep(_currentStep); } }

/* ---- Finish ---- */
function _finish() {
  const profile  = createUserProfile(_formData);
  const profiles = storage.loadProfiles();
  profiles[profile.id] = profile;
  storage.saveProfiles(profiles);
  storage.setActiveProfileId(profile.id);

  gamification.getOrInit(profile.id);
  state.setState({ activeProfileId: profile.id, profiles });

  toast.success(`Welcome, ${profile.name}! 🎉`, 'Your profile is ready.');
  router.navigate('#dashboard');
}

/* ---- Helpers ---- */
function _fieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('error'); el.focus(); }
  toast.warning(msg);
  setTimeout(() => el?.classList.remove('error'), 2000);
}

export { mount, unmount };
