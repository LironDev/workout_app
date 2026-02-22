/* ============================================================
   WORKOUT PLAYER — Pre-workout Setup, Exercise Cards, Rest Timer, Set Tracker, Feedback
   ============================================================ */

import * as state from '../state.js';
import * as storage from '../storage.js';
import * as router from '../router.js';
import { generateOrLoadWorkout, refreshWorkout, resolveEquipment } from '../api.js';
import * as gamification from './gamification.js';
import { esc, showModal, closeModal, confetti } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import * as toast from '../ui/toast.js';
import { today } from '../models.js';
import * as i18n from '../i18n.js';

/* ---- Timer state (module-level) ---- */
let _timerRAF    = null;
let _timerEnd    = null;
let _timerActive = false;
let _audioCtx    = null;

/* ---- View state ---- */
let _workout     = null;
let _session     = { currentIdx: 0, sets: {} };
let _loading     = false;

/* ---- Environment + Accessories config ---- */
const ENVIRONMENTS = [
  { key: 'home_no_equipment', emoji: '🏠', labelKey: 'envHomeNoEq',     descKey: 'envHomeNoEqDesc' },
  { key: 'home_gym',          emoji: '🏋️', labelKey: 'envHomeGym',      descKey: 'envHomeGymDesc'  },
  { key: 'outdoor',           emoji: '🌳', labelKey: 'envOutdoor',       descKey: 'envOutdoorDesc'  },
  { key: 'calisthenics',      emoji: '🤸', labelKey: 'envCalisthenics',  descKey: 'envCalisthenicsDesc' }
];

const ACCESSORIES = [
  { key: 'dumbbell',        emoji: '🏋️', labelKey: 'accDumbbell'       },
  { key: 'resistance_band', emoji: '🔗', labelKey: 'accResistanceBand' },
  { key: 'pullup_bar',      emoji: '🪝', labelKey: 'accPullupBar'      },
  { key: 'kettlebell',      emoji: '⚫', labelKey: 'accKettlebell'     },
  { key: 'mat',             emoji: '🟩', labelKey: 'accMat'            },
  { key: 'bench',           emoji: '🪑', labelKey: 'accBench'          },
  { key: 'rings',           emoji: '⭕', labelKey: 'accRings'          },
  { key: 'parallel_bars',   emoji: '🔛', labelKey: 'accParallelBars'   }
];

/* ---- Mount ---- */
async function mount() {
  const section   = document.getElementById('view-workout');
  const profileId = state.getState('activeProfileId');
  const profiles  = state.getState('profiles') || {};
  const profile   = profiles[profileId];

  if (!profile) {
    section.innerHTML = `<div class="section"><div class="empty-state"><div class="empty-state__icon">👤</div><h3>${i18n.t('noProfile')}</h3><p class="text-muted">${i18n.t('noProfileDesc')}</p><button class="btn btn--primary mt-4" onclick="location.hash='#onboarding'">${i18n.t('btnStart')}</button></div></div>`;
    return;
  }

  // If there's an in-progress workout session, go straight to player
  const saved = state.getState('workoutSession');
  if (saved && saved.planId) {
    const todayPlan = storage.loadWorkoutForDate(profileId, today());
    if (todayPlan && todayPlan.id === saved.planId && !todayPlan.completed) {
      _workout = todayPlan;
      _session = saved;
      _renderPlayer(section, profile);
      return;
    }
  }

  // Show pre-workout setup screen
  _renderSetupScreen(section, profile);
}

function unmount() {
  _stopTimer();
  if (_workout && !_workout.completed) {
    state.setState({ workoutSession: _session });
  } else {
    state.setState({ workoutSession: null });
  }
}

/* ---- Pre-workout Setup Screen ---- */
function _renderSetupScreen(section, profile) {
  const defaultEnv = profile.defaultEnvironment || 'home_no_equipment';
  let selectedEnv  = defaultEnv;
  let selectedAcc  = new Set();

  function render() {
    section.innerHTML = `
      <div class="workout-setup">
        <div class="workout-setup__header">
          <button class="btn btn--icon btn--ghost" id="ws-back">${icon('back')}</button>
          <h2 class="workout-setup__title">${i18n.t('preWorkoutTitle')}</h2>
        </div>

        <div class="workout-setup__body">
          <!-- Environment Selection -->
          <div class="setup-section">
            <div class="setup-section__label">${i18n.t('preWorkoutEnv')}</div>
            <div class="env-grid">
              ${ENVIRONMENTS.map(env => `
                <button class="env-card ${selectedEnv === env.key ? 'env-card--selected' : ''}" data-env="${env.key}">
                  <span class="env-card__emoji">${env.emoji}</span>
                  <span class="env-card__name">${i18n.t(env.labelKey)}</span>
                  <span class="env-card__desc">${i18n.t(env.descKey)}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Accessories Selection -->
          <div class="setup-section">
            <div class="setup-section__label">${i18n.t('preWorkoutAccessories')}</div>
            <p class="text-sm text-muted mb-3">${i18n.t('accessoriesDesc')}</p>
            <div class="accessories-grid">
              ${ACCESSORIES.map(acc => `
                <button class="acc-chip ${selectedAcc.has(acc.key) ? 'acc-chip--selected' : ''}" data-acc="${acc.key}">
                  <span>${acc.emoji}</span>
                  <span>${i18n.t(acc.labelKey)}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="workout-setup__footer">
          <button class="btn btn--primary btn--full btn--lg" id="ws-generate">
            ${i18n.t('btnGenerateWorkout')}
          </button>
        </div>
      </div>
    `;

    // Back button
    section.querySelector('#ws-back').addEventListener('click', () => {
      router.navigate('#dashboard');
    });

    // Environment selection
    section.querySelectorAll('[data-env]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedEnv = btn.dataset.env;
        render();
      });
    });

    // Accessories toggle
    section.querySelectorAll('[data-acc]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.acc;
        if (selectedAcc.has(key)) selectedAcc.delete(key);
        else selectedAcc.add(key);
        btn.classList.toggle('acc-chip--selected', selectedAcc.has(key));
      });
    });

    // Generate workout
    section.querySelector('#ws-generate').addEventListener('click', async () => {
      const accessories = [...selectedAcc];
      await _loadAndRender(section, profile, { environment: selectedEnv, accessories });
    });
  }

  render();
}

/* ---- Load workout + render player ---- */
async function _loadAndRender(section, profile, sessionOpts) {
  _renderLoading(section);
  _loading = true;

  try {
    const gamData = gamification.getOrInit(profile.id);
    _workout = await generateOrLoadWorkout(profile, gamData, sessionOpts);

    const saved = state.getState('workoutSession');
    if (saved?.planId === _workout.id) {
      _session = saved;
    } else {
      _session = { planId: _workout.id, currentIdx: 0, sets: {}, startedAt: new Date().toISOString() };
      _initSets(_workout);
    }

    _renderPlayer(section, profile);
  } catch (err) {
    console.error('[workout] Failed to load workout:', err);
    section.innerHTML = `<div class="section"><div class="empty-state"><div class="empty-state__icon">⚠️</div><h3>${i18n.t('couldntLoadWorkout')}</h3><p class="text-muted">${esc(err.message)}</p><button class="btn btn--primary mt-4" onclick="location.hash='#dashboard'">← ${i18n.t('navHome')}</button></div></div>`;
  } finally {
    _loading = false;
  }
}

/* ---- Init sets ---- */
function _initSets(workout) {
  _session.sets = {};
  (workout.exercises || []).forEach(ex => {
    _session.sets[ex.id] = Array.from({ length: ex.sets }, () => ({
      reps: ex.reps || 0,
      done: false
    }));
  });
}

/* ---- Rendering ---- */
function _renderLoading(section) {
  section.innerHTML = `
    <div class="loading-screen">
      <div class="spinner"></div>
      <p class="text-muted">${i18n.t('buildingWorkout')}</p>
    </div>
  `;
}

/* ---- Player: one exercise at a time ---- */
function _renderPlayer(section, profile) {
  if (!_workout) return;
  const exercises = _workout.exercises || [];
  const completed = _workout.completed;

  if (completed) {
    _renderCompletePage(section);
    return;
  }

  const idx = Math.min(_session.currentIdx, exercises.length - 1);
  const ex  = exercises[idx];

  section.innerHTML = `
    <div class="workout-player">
      <!-- Top bar -->
      <div class="workout-player__topbar">
        <div class="workout-player__topbar-left">
          <button class="btn btn--icon btn--ghost wp-topbar-btn" id="wp-exit" title="${i18n.t('exitWorkout')}">
            ${icon('back')}
          </button>
        </div>
        <div class="workout-player__topbar-center">
          <div class="workout-player__step-label">
            ${i18n.t('exerciseOf', idx + 1, exercises.length)}
          </div>
          <div class="progress-bar mt-1">
            <div class="progress-bar__fill" style="width:${_progressPct(exercises)}%"></div>
          </div>
        </div>
        <div class="workout-player__topbar-right">
          <button class="btn btn--icon btn--ghost wp-topbar-btn" id="wp-settings" title="${i18n.t('settings')}">⚙️</button>
        </div>
      </div>

      <!-- Exercise page -->
      <div class="workout-exercise-page" id="wp-exercise-page">
        ${_exercisePageHTML(ex, idx, exercises.length)}
      </div>

      <!-- Bottom nav: prev / next -->
      <div class="workout-player__bottom-nav">
        <button class="btn btn--ghost wp-nav-btn" id="wp-prev" ${idx === 0 ? 'disabled' : ''}>
          ${i18n.t('btnPrev')}
        </button>
        <div class="wp-set-progress" id="wp-set-progress">
          ${_setProgressDots(ex)}
        </div>
        ${idx < exercises.length - 1
          ? `<button class="btn btn--primary wp-nav-btn" id="wp-next">${i18n.t('btnNextExercise')}</button>`
          : `<button class="btn btn--success wp-nav-btn" id="wp-finish">🏆 ${i18n.t('btnFinishWorkout')}</button>`
        }
      </div>
    </div>
  `;

  // Exit → save state and go to dashboard
  section.querySelector('#wp-exit').addEventListener('click', () => {
    _stopTimer();
    state.setState({ workoutSession: _session });
    router.navigate('#dashboard');
  });

  // Settings → open settings modal
  section.querySelector('#wp-settings').addEventListener('click', () => {
    _openWorkoutSettings(section, profile);
  });

  // Prev exercise
  section.querySelector('#wp-prev')?.addEventListener('click', () => {
    if (_session.currentIdx > 0) {
      _session.currentIdx--;
      _stopTimer();
      state.setState({ workoutSession: _session });
      _renderPlayer(section, profile);
    }
  });

  // Next exercise
  section.querySelector('#wp-next')?.addEventListener('click', () => {
    _stopTimer();
    _session.currentIdx = Math.min(_session.currentIdx + 1, exercises.length - 1);
    state.setState({ workoutSession: _session });
    _renderPlayer(section, profile);
  });

  // Finish workout
  section.querySelector('#wp-finish')?.addEventListener('click', () => {
    _finishWorkout(section, profile);
  });

  // Set check buttons
  section.querySelectorAll('[data-set-check]').forEach(btn => {
    btn.addEventListener('click', () => _toggleSet(btn, section, profile));
  });

  // Rest timer
  section.querySelectorAll('[data-start-timer]').forEach(btn => {
    btn.addEventListener('click', () => {
      const secs = parseInt(btn.dataset.startTimer);
      _startTimer(secs, section, ex.id);
    });
  });

  // Input changes
  section.querySelectorAll('.set-row__input').forEach(input => {
    input.addEventListener('change', () => {
      const exId    = input.dataset.exId;
      const setIdx  = parseInt(input.dataset.setIdx);
      const field   = input.dataset.field;
      if (_session.sets[exId]?.[setIdx]) {
        _session.sets[exId][setIdx][field] = parseFloat(input.value) || 0;
        state.setState({ workoutSession: _session });
      }
    });
  });
}

function _exercisePageHTML(ex, idx, total) {
  const sets      = _session.sets[ex.id] || [];
  const doneCount = sets.filter(s => s.done).length;
  const isComplete = doneCount === sets.length;
  const envEmoji  = ex.emoji || '💪';

  return `
    <div class="exercise-page">
      <!-- Exercise image / emoji -->
      <div class="exercise-page__media">
        ${ex.imageUrl
          ? `<img src="${esc(ex.imageUrl)}" alt="${esc(ex.name)}" class="exercise-page__img" loading="lazy"
               onerror="this.parentElement.innerHTML='<div class=exercise-page__emoji>${envEmoji}</div>'">`
          : `<div class="exercise-page__emoji">${envEmoji}</div>`
        }
      </div>

      <!-- Exercise info -->
      <div class="exercise-page__info">
        <h2 class="exercise-page__name">${esc(ex.name)}</h2>
        <div class="exercise-page__tags">
          <span class="tag">${ex.sets} ${i18n.t('labelSets')}</span>
          ${ex.durationSeconds
            ? `<span class="tag">⏱ ${ex.durationSeconds}${i18n.t('labelSecs')}</span>`
            : `<span class="tag">${ex.reps} ${i18n.t('labelReps')}</span>`
          }
          <span class="tag">${i18n.t('labelRest')}: ${ex.restSeconds}${i18n.t('labelSecs')}</span>
          ${ex.category?.name ? `<span class="tag tag--primary">${esc(ex.category.name)}</span>` : ''}
          <a href="${esc(ex.youtubeSearchUrl)}" target="_blank" rel="noopener" class="tag" style="text-decoration:none">
            <span style="color:#FF0000">▶</span> ${i18n.t('tutorial')}
          </a>
        </div>
        ${ex.description ? `<p class="exercise-page__desc">${esc(ex.description.slice(0, 160))}${ex.description.length > 160 ? '…' : ''}</p>` : ''}
      </div>

      <!-- Set tracker -->
      <div class="exercise-page__sets">
        <div class="set-tracker-header">
          <span>${i18n.t('setHeader')}</span>
          <span>${ex.durationSeconds ? i18n.t('labelSecs') : i18n.t('labelReps')}</span>
          <span>${i18n.t('labelWeightShort')}</span>
          <span></span>
        </div>
        ${sets.map((s, si) => `
          <div class="set-row ${s.done ? 'set-row--done' : ''}">
            <span class="set-row__num">${si + 1}</span>
            <input class="set-row__input" type="number" min="1" max="999"
              value="${s.reps || (ex.durationSeconds || ex.reps)}"
              data-ex-id="${ex.id}" data-set-idx="${si}" data-field="reps"
              ${s.done ? 'readonly' : ''}>
            <input class="set-row__input" type="number" min="0" step="0.5"
              placeholder="${i18n.t('bodyweightShort')}" value="${s.weight || ''}"
              data-ex-id="${ex.id}" data-set-idx="${si}" data-field="weight"
              ${s.done ? 'readonly' : ''}>
            <button class="set-row__check ${s.done ? 'done' : ''}"
              data-set-check="${ex.id}" data-set-idx="${si}"
              aria-label="${s.done ? i18n.t('undoSet') : i18n.t('markSetDone')}">
              ${s.done ? '✓' : ''}
            </button>
          </div>
        `).join('')}
      </div>

      <!-- Rest timer -->
      <div class="exercise-page__timer" id="timer-wrap-${ex.id}">
        <button class="btn btn--secondary btn--sm btn--full" id="timer-start-btn-${ex.id}" data-start-timer="${ex.restSeconds}" data-ex-id="${ex.id}">
          ⏱ ${i18n.t('labelRestTimer')} (${ex.restSeconds}s)
        </button>
        <div id="timer-ring-${ex.id}" style="display:none;justify-content:center;margin-top:var(--space-3)">
          ${_timerRingHTML(ex.id, ex.restSeconds)}
        </div>
      </div>
    </div>
  `;
}

function _setProgressDots(ex) {
  const sets = _session.sets[ex.id] || [];
  return sets.map((s, i) => `
    <div class="set-dot ${s.done ? 'set-dot--done' : ''}" title="${i18n.t('setHeader')} ${i + 1}"></div>
  `).join('');
}

function _renderCompletePage(section) {
  section.innerHTML = `
    <div class="workout-complete-page">
      <div class="workout-complete-page__content">
        <div style="font-size:5rem">🏆</div>
        <h2>${i18n.t('workoutComplete')}</h2>
        <p class="text-muted">${i18n.t('workoutCompleteMsg')}</p>
        <button class="btn btn--primary btn--full btn--lg mt-4" onclick="location.hash='#dashboard'">
          ${i18n.t('backToDashboard')}
        </button>
      </div>
    </div>
  `;
}

function _timerRingHTML(exId, totalSecs) {
  const R = 46, C = 2 * Math.PI * R;
  return `
    <div class="timer-ring">
      <svg viewBox="0 0 112 112" width="112" height="112" style="transform:rotate(-90deg)">
        <circle class="timer-ring__bg" cx="56" cy="56" r="${R}"/>
        <circle class="timer-ring__progress" id="timer-circle-${exId}"
          cx="56" cy="56" r="${R}"
          stroke-dasharray="${C}"
          stroke-dashoffset="0"/>
      </svg>
      <div class="timer-ring__center" id="timer-text-${exId}">${totalSecs}</div>
    </div>
  `;
}

function _progressPct(exercises) {
  if (!exercises.length) return 0;
  const done = exercises.filter(ex => {
    const sets = _session.sets[ex.id] || [];
    return sets.every(s => s.done);
  }).length;
  return Math.round((done / exercises.length) * 100);
}

/* ---- Set Toggle ---- */
function _toggleSet(btn, section, profile) {
  const exId   = btn.dataset.setCheck;
  const setIdx = parseInt(btn.dataset.setIdx);
  const sets   = _session.sets[exId];
  if (!sets) return;

  // Read input values before toggling
  const repsInput   = section.querySelector(`[data-ex-id="${exId}"][data-set-idx="${setIdx}"][data-field="reps"]`);
  const weightInput = section.querySelector(`[data-ex-id="${exId}"][data-set-idx="${setIdx}"][data-field="weight"]`);
  if (repsInput)   sets[setIdx].reps   = parseFloat(repsInput.value) || 0;
  if (weightInput) sets[setIdx].weight = parseFloat(weightInput.value) || 0;

  sets[setIdx].done = !sets[setIdx].done;

  state.setState({ workoutSession: _session });
  storage.saveWorkoutForDate(profile.id, today(), { ..._workout, _session });

  // Re-render just the exercise page content (not the whole player)
  const exercises = _workout.exercises || [];
  const idx = Math.min(_session.currentIdx, exercises.length - 1);
  const ex  = exercises[idx];

  const page = section.querySelector('#wp-exercise-page');
  if (page) page.innerHTML = _exercisePageHTML(ex, idx, exercises.length);

  // Update set progress dots
  const dotsEl = section.querySelector('#wp-set-progress');
  if (dotsEl) dotsEl.innerHTML = _setProgressDots(ex);

  // Auto-advance currentIdx tracking (but don't navigate automatically)
  const allDone = sets.every(s => s.done);
  if (allDone) {
    const exIdx = exercises.indexOf(exercises.find(e => e.id === exId));
    if (exIdx >= _session.currentIdx) {
      _session.currentIdx = Math.min(exIdx + 1, exercises.length - 1);
    }
  }

  // Re-wire events after inner re-render
  section.querySelectorAll('[data-set-check]').forEach(b => {
    b.addEventListener('click', () => _toggleSet(b, section, profile));
  });
  section.querySelectorAll('[data-start-timer]').forEach(b => {
    b.addEventListener('click', () => {
      const secs = parseInt(b.dataset.startTimer);
      _startTimer(secs, section, ex.id);
    });
  });
  section.querySelectorAll('.set-row__input').forEach(input => {
    input.addEventListener('change', () => {
      const eId    = input.dataset.exId;
      const sIdx   = parseInt(input.dataset.setIdx);
      const field  = input.dataset.field;
      if (_session.sets[eId]?.[sIdx]) {
        _session.sets[eId][sIdx][field] = parseFloat(input.value) || 0;
      }
    });
  });
}

/* ---- Rest Timer ---- */
function _startTimer(totalSecs, section, exId) {
  _stopTimer();

  const startBtn = section.querySelector(`#timer-start-btn-${exId}`);
  if (startBtn) startBtn.style.display = 'none';
  const ring = section.querySelector(`#timer-ring-${exId}`);
  if (ring) ring.style.display = 'flex';

  const R = 46, C = 2 * Math.PI * R;
  const circle = section.querySelector(`#timer-circle-${exId}`);
  const textEl = section.querySelector(`#timer-text-${exId}`);

  _timerEnd    = performance.now() + totalSecs * 1000;
  _timerActive = true;

  function tick() {
    if (!_timerActive) return;
    const remaining = Math.max(0, (_timerEnd - performance.now()) / 1000);
    const pct       = remaining / totalSecs;

    if (circle) circle.style.strokeDashoffset = C * (1 - pct);
    if (textEl)  textEl.textContent = Math.ceil(remaining);

    if (remaining <= 0) {
      _timerActive = false;
      if (textEl) textEl.textContent = '✓';
      _playBeep();
      toast.success(i18n.t('restComplete'), i18n.t('restCompleteMsg'));
      return;
    }
    _timerRAF = requestAnimationFrame(tick);
  }
  _timerRAF = requestAnimationFrame(tick);
}

function _stopTimer() {
  _timerActive = false;
  if (_timerRAF) { cancelAnimationFrame(_timerRAF); _timerRAF = null; }
}

function _playBeep() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 660, 440].forEach((freq, i) => {
      const osc  = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, _audioCtx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + i * 0.15 + 0.2);
      osc.start(_audioCtx.currentTime + i * 0.15);
      osc.stop(_audioCtx.currentTime + i * 0.15 + 0.25);
    });
  } catch (e) { /* Audio not available */ }
}

/* ---- Workout settings (mini modal inside workout) ---- */
function _openWorkoutSettings(section, profile) {
  const existing = document.getElementById('settings-modal-overlay');
  if (existing) { existing.remove(); return; }

  const settings = storage.loadSettings();
  const theme    = settings.theme || 'system';
  const lang     = i18n.getLang();

  const overlay = document.createElement('div');
  overlay.id = 'settings-modal-overlay';
  overlay.innerHTML = `
    <div class="settings-modal" role="dialog" aria-modal="true">
      <div class="settings-modal__header">
        <span class="settings-modal__title">${i18n.t('settings')}</span>
        <button class="settings-modal__close" id="settings-close">✕</button>
      </div>
      <div class="settings-section">
        <div class="settings-label">${i18n.t('settingsLang')}</div>
        <div class="settings-toggle-group">
          <button class="settings-toggle-btn ${lang==='en'?'active':''}" data-lang="en">🇺🇸 English</button>
          <button class="settings-toggle-btn ${lang==='he'?'active':''}" data-lang="he">🇮🇱 עברית</button>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-label">${i18n.t('settingsTheme')}</div>
        <div class="settings-toggle-group">
          <button class="settings-toggle-btn ${theme==='system'?'active':''}" data-theme="system">🌓 ${i18n.t('themeSystem')}</button>
          <button class="settings-toggle-btn ${theme==='light'?'active':''}" data-theme="light">☀️ ${i18n.t('themeLight')}</button>
          <button class="settings-toggle-btn ${theme==='dark'?'active':''}" data-theme="dark">🌙 ${i18n.t('themeDark')}</button>
        </div>
      </div>
    </div>
  `;

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#settings-close').addEventListener('click', () => overlay.remove());
  overlay.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      i18n.setLang(btn.dataset.lang);
      overlay.remove();
      _renderPlayer(section, profile);
    });
  });
  overlay.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const newTheme = btn.dataset.theme;
      storage.saveSettings({ ...storage.loadSettings(), theme: newTheme });
      if (window._applyTheme) window._applyTheme();
      overlay.querySelectorAll('[data-theme]').forEach(b =>
        b.classList.toggle('active', b.dataset.theme === newTheme)
      );
    });
  });

  document.body.appendChild(overlay);
}

/* ---- Finish Workout ---- */
function _finishWorkout(section, profile) {
  const anySets = Object.values(_session.sets).some(sets => sets.some(s => s.done));
  if (!anySets) {
    toast.warning(i18n.t('completeAtLeastOne'));
    return;
  }

  showModal({
    title: i18n.t('feedbackTitle'),
    contentHTML: `
      <p class="text-muted mb-3">${i18n.t('feedbackPrompt')}</p>
      <div class="feedback-modal__options">
        ${[
          { key: 'too_easy',   emoji: '😴', titleKey: 'feedbackEasy',  descKey: 'feedbackEasyDesc'  },
          { key: 'just_right', emoji: '😊', titleKey: 'feedbackRight', descKey: 'feedbackRightDesc' },
          { key: 'too_hard',   emoji: '😤', titleKey: 'feedbackHard',  descKey: 'feedbackHardDesc'  }
        ].map(f => `
          <div class="feedback-option" data-feedback="${f.key}">
            <span class="feedback-option__icon">${f.emoji}</span>
            <div>
              <div class="feedback-option__title">${i18n.t(f.titleKey)}</div>
              <div class="feedback-option__desc">${i18n.t(f.descKey)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `,
    footer: ''
  });

  document.querySelectorAll('[data-feedback]').forEach(opt => {
    opt.addEventListener('click', () => {
      const feedback = opt.dataset.feedback;
      _submitWorkout(profile, feedback, section);
      closeModal();
    });
  });
}

function _submitWorkout(profile, feedback, section) {
  _workout.completed = true;
  _workout.feedback  = feedback;
  storage.saveWorkoutForDate(profile.id, today(), _workout);

  const result = gamification.completeWorkout(profile.id, _workout, feedback);

  state.setState({ workoutSession: null, todayWorkout: _workout });

  confetti(40);
  _renderCompletePage(section);
}

export { mount, unmount };
