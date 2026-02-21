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
        // Update chip visually without full re-render
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
      <p class="text-muted">Building your workout...</p>
    </div>
  `;
}

function _renderPlayer(section, profile) {
  if (!_workout) return;
  const exercises = _workout.exercises || [];
  const completed = _workout.completed;

  const envEmojis = { home_no_equipment: '🏠', home_gym: '🏋️', outdoor: '🌳', calisthenics: '🤸' };
  const envEmoji  = envEmojis[_workout.environment] || '💪';

  section.innerHTML = `
    <div class="workout-player">
      <div class="workout-player__header">
        <button class="btn btn--icon btn--ghost" id="wp-back">${icon('back')}</button>
        <div class="workout-player__progress flex-1">
          <div class="workout-player__step-label">
            ${completed ? `✅ ${i18n.t('workoutComplete')}` : `${i18n.t('navWorkout')} ${envEmoji} • ${Math.min(_session.currentIdx + 1, exercises.length)}/${exercises.length}`}
          </div>
          <div class="progress-bar mt-1">
            <div class="progress-bar__fill" style="width:${_progressPct(exercises)}%"></div>
          </div>
        </div>
        <button class="btn btn--sm btn--ghost" id="wp-refresh" title="Get new workout">${icon('refresh')}</button>
      </div>

      <div class="workout-exercise-list" id="wp-exercise-list">
        ${exercises.map((ex, i) => _exerciseCardHTML(ex, i)).join('')}
      </div>

      ${completed ? _completeBannerHTML() : `
        <div style="padding:var(--space-4);background:var(--color-surface);border-top:1px solid var(--color-border)">
          <button class="btn btn--primary btn--full btn--lg" id="wp-complete-workout">
            🏆 ${i18n.t('workoutComplete')}
          </button>
        </div>
      `}
    </div>
  `;

  // Back
  section.querySelector('#wp-back').addEventListener('click', () => {
    _stopTimer();
    router.navigate('#dashboard');
  });

  // Refresh workout
  section.querySelector('#wp-refresh').addEventListener('click', () => {
    _stopTimer();
    _renderSetupScreen(section, profile);
  });

  // Set check buttons
  section.querySelectorAll('[data-set-check]').forEach(btn => {
    btn.addEventListener('click', () => _toggleSet(btn, section, profile));
  });

  // Complete workout button
  section.querySelector('#wp-complete-workout')?.addEventListener('click', () => {
    _finishWorkout(section, profile);
  });

  // Rest timer start buttons
  section.querySelectorAll('[data-start-timer]').forEach(btn => {
    btn.addEventListener('click', () => {
      const secs = parseInt(btn.dataset.startTimer);
      _startTimer(secs, section);
    });
  });

  // Scroll to current exercise
  const currentCard = section.querySelector(`[data-ex-idx="${_session.currentIdx}"]`);
  if (currentCard) currentCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _exerciseCardHTML(ex, idx) {
  const sets       = _session.sets[ex.id] || [];
  const isCurrent  = idx === _session.currentIdx;
  const isComplete = sets.every(s => s.done);
  const envEmoji   = ex.emoji || '💪';

  let statusClass = '';
  if (isComplete) statusClass = 'exercise-card__completed';
  else if (isCurrent) statusClass = 'exercise-card__active';

  return `
    <div class="exercise-card ${statusClass}" data-ex-idx="${idx}" id="ex-card-${ex.id}">
      <div class="${ex.imageUrl ? '' : 'exercise-card__image-placeholder'}">
        ${ex.imageUrl
          ? `<img src="${esc(ex.imageUrl)}" alt="${esc(ex.name)}" class="exercise-card__image" loading="lazy" onerror="this.parentElement.innerHTML='<div class=exercise-card__image-placeholder style=height:200px>${envEmoji}</div>'">`
          : `<span style="font-size:4rem">${envEmoji}</span>`
        }
      </div>

      <div class="exercise-card__body">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2)">
          <h3 style="font-size:var(--text-lg)">${esc(ex.name)}</h3>
          ${isComplete ? `<span class="tag tag--success">✓ Done</span>` : isCurrent ? '<span class="tag tag--primary">Current</span>' : ''}
        </div>

        ${ex.description ? `<p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-3)">${esc(ex.description.slice(0, 200))}${ex.description.length > 200 ? '…' : ''}</p>` : ''}

        <div class="exercise-card__meta">
          <span class="tag">${ex.sets} ${i18n.t('labelSets')}</span>
          ${ex.durationSeconds
            ? `<span class="tag">⏱ ${ex.durationSeconds}${i18n.t('labelSecs')}</span>`
            : `<span class="tag">${ex.reps} ${i18n.t('labelReps')}</span>`
          }
          <span class="tag">Rest ${ex.restSeconds}s</span>
          ${ex.category?.name ? `<span class="tag tag--primary">${esc(ex.category.name)}</span>` : ''}
          <a href="${esc(ex.youtubeSearchUrl)}" target="_blank" rel="noopener" class="tag" style="text-decoration:none;cursor:pointer" title="Watch tutorial on YouTube">
            <span style="color:#FF0000">▶</span> ${i18n.t('tutorial')}
          </a>
        </div>

        <!-- Set Tracker -->
        <div class="set-tracker mt-3">
          <div style="display:grid;grid-template-columns:40px 1fr 1fr 40px;gap:var(--space-2);font-size:var(--text-xs);color:var(--color-text-muted);padding-bottom:var(--space-2);border-bottom:1px solid var(--color-border)">
            <span style="text-align:center">Set</span>
            <span style="text-align:center">${ex.durationSeconds ? i18n.t('labelSecs') : i18n.t('labelReps')}</span>
            <span style="text-align:center">${i18n.t('labelWeight')}</span>
            <span></span>
          </div>
          ${sets.map((s, si) => `
            <div class="set-row">
              <span class="set-row__num">${si + 1}</span>
              <input class="set-row__input" type="number" min="1" max="999"
                value="${s.reps || (ex.durationSeconds || ex.reps)}"
                data-ex-id="${ex.id}" data-set-idx="${si}" data-field="reps"
                ${s.done ? 'readonly' : ''}>
              <input class="set-row__input" type="number" min="0" step="0.5"
                placeholder="BW" value="${s.weight || ''}"
                data-ex-id="${ex.id}" data-set-idx="${si}" data-field="weight"
                ${s.done ? 'readonly' : ''}>
              <button class="set-row__check ${s.done ? 'done' : ''}"
                data-set-check="${ex.id}" data-set-idx="${si}"
                aria-label="${s.done ? 'Undo set' : 'Mark set done'}">
                ${s.done ? icon('check') : ''}
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Rest Timer -->
        <div class="timer-container mt-3" id="timer-${ex.id}" style="${isCurrent && !isComplete ? '' : 'display:none'}">
          <button class="btn btn--secondary btn--sm" data-start-timer="${ex.restSeconds}" data-ex-id="${ex.id}">
            ⏱ ${i18n.t('labelRestTimer')} (${ex.restSeconds}s)
          </button>
          <div id="timer-ring-${ex.id}" style="display:none">
            ${_timerRingHTML(ex.id, ex.restSeconds)}
          </div>
        </div>
      </div>
    </div>
  `;
}

function _completeBannerHTML() {
  return `
    <div class="workout-complete-banner">
      <div class="workout-complete-banner__icon">🏆</div>
      <div class="workout-complete-banner__title">${i18n.t('workoutComplete')}</div>
      <p style="opacity:0.9;margin-top:8px">${i18n.t('workoutCompleteMsg')}</p>
      <button class="btn btn--full mt-4" style="background:rgba(255,255,255,0.25);color:#fff;border:2px solid rgba(255,255,255,0.5)" onclick="location.hash='#dashboard'">
        ${i18n.t('backToDashboard')}
      </button>
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

  sets[setIdx].done = !sets[setIdx].done;

  const repsInput   = section.querySelector(`[data-ex-id="${exId}"][data-set-idx="${setIdx}"][data-field="reps"]`);
  const weightInput = section.querySelector(`[data-ex-id="${exId}"][data-set-idx="${setIdx}"][data-field="weight"]`);
  if (repsInput)   sets[setIdx].reps   = parseFloat(repsInput.value) || 0;
  if (weightInput) sets[setIdx].weight = parseFloat(weightInput.value) || 0;

  const ex    = _workout.exercises.find(e => e.id === exId);
  const exIdx = _workout.exercises.indexOf(ex);
  if (sets.every(s => s.done) && exIdx >= _session.currentIdx) {
    _session.currentIdx = Math.min(exIdx + 1, _workout.exercises.length - 1);
    const timerContainer = section.querySelector(`#timer-${exId}`);
    if (timerContainer) timerContainer.style.display = '';
  }

  state.setState({ workoutSession: _session });
  storage.saveWorkoutForDate(profile.id, today(), { ..._workout, _session });
  _renderPlayer(section, profile);
}

/* ---- Rest Timer ---- */
function _startTimer(totalSecs, section) {
  _stopTimer();

  const exId = section.querySelector('[data-start-timer]')?.dataset.exId;
  section.querySelectorAll('[data-start-timer]').forEach(b => b.style.display = 'none');
  const ring = exId ? section.querySelector(`#timer-ring-${exId}`) : null;
  if (ring) ring.style.display = 'flex';

  const R = 46, C = 2 * Math.PI * R;
  const circle = exId ? section.querySelector(`#timer-circle-${exId}`) : null;
  const textEl = exId ? section.querySelector(`#timer-text-${exId}`) : null;

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
  _renderPlayer(section, profile);
}

export { mount, unmount };
