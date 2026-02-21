/* ============================================================
   API — Wger Exercise API Client + Workout Plan Generator
   ============================================================ */

import * as storage from './storage.js';
import { createExercise, createWorkoutPlan, today } from './models.js';
import * as i18n from './i18n.js';

const BASE_URL     = 'https://wger.de/api/v2';
const LANG_EN      = 2;
const FETCH_TIMEOUT = 5000;

/* ---- Equipment ID Mapping (Wger IDs) ---- */
// 7=bodyweight, 3=dumbbell, 11=resistance band, 6=pull-up bar, 4=gym mat
// 8=barbell, 10=kettlebell, 9=cable (not used)
const ACCESSORY_EQUIPMENT_IDS = {
  dumbbell:       3,
  resistance_band:11,
  pullup_bar:     6,
  kettlebell:     10,
  mat:            4,
  bench:          3,   // treat bench as dumbbell tier
  rings:          6,   // treat rings as pull-up bar tier
  parallel_bars:  6
};

// Base equipment per environment (before accessories overlay)
const ENV_BASE_EQUIPMENT = {
  home_no_equipment: [7],
  home_gym:          [7, 3, 11],
  outdoor:           [7, 4],
  calisthenics:      [7, 6, 4]   // bodyweight + pull-up bar + mat
};

/* ---- Fallback exercise keys ---- */
const FALLBACK_KEY_MAP = {
  home_no_equipment: 'bodyweight',
  home_gym:          'home_gym',
  outdoor:           'outdoor',
  calisthenics:      'calisthenics'
};

/* ---- Category IDs (wger) ---- */
const CATEGORIES = {
  abs:       10,
  arms:      8,
  back:      12,
  calves:    14,
  cardio:    15,
  chest:     11,
  legs:      9,
  shoulders: 13
};

/* ---- Difficulty presets ---- */
const DIFFICULTY_PRESETS = {
  1: { sets: 2, reps: 8,  restSeconds: 90 },
  2: { sets: 3, reps: 10, restSeconds: 75 },
  3: { sets: 3, reps: 12, restSeconds: 60 },
  4: { sets: 4, reps: 12, restSeconds: 45 },
  5: { sets: 4, reps: 15, restSeconds: 30 }
};

const EXERCISE_COUNT = { beginner: 4, intermediate: 6, advanced: 8 };

const DAY_ROTATION = [
  ['chest', 'arms'],
  ['back', 'shoulders'],
  ['legs', 'calves'],
  ['abs', 'cardio'],
  ['chest', 'shoulders'],
  ['legs', 'abs'],
  ['cardio', 'back']
];

/* ---- Resolve effective equipment IDs ---- */
// accessories: string[] of accessory keys owned today
function resolveEquipment(environment, accessories = []) {
  const base = new Set(ENV_BASE_EQUIPMENT[environment] || [7]);
  accessories.forEach(acc => {
    const id = ACCESSORY_EQUIPMENT_IDS[acc];
    if (id) base.add(id);
  });
  return [...base];
}

/* ---- Fallback data loader ---- */
let _fallbackData = null;
async function _loadFallback() {
  if (_fallbackData) return _fallbackData;
  try {
    const res = await fetch('./assets/fallback-exercises.json');
    _fallbackData = await res.json();
  } catch {
    _fallbackData = { bodyweight: [], home_gym: [], outdoor: [], calisthenics: [] };
  }
  return _fallbackData;
}

/* ---- Fetch with timeout ---- */
async function _fetchWithTimeout(url, ms = FETCH_TIMEOUT) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ---- Wger API ---- */
async function fetchWgerExercises(equipmentIds, categoryId, limit = 20) {
  const eqParam = equipmentIds.join(',');
  const url = `${BASE_URL}/exerciseinfo/?format=json&language=${LANG_EN}&equipment=${eqParam}&category=${categoryId}&limit=${limit}&offset=0`;
  const data = await _fetchWithTimeout(url);
  return (data.results || []).map(_normalizeWgerExercise);
}

function _normalizeWgerExercise(raw) {
  const trans = (raw.translations || []).find(t => t.language === LANG_EN) || raw.translations?.[0] || {};
  const name  = trans.name || raw.name || 'Exercise';
  const desc  = (trans.description || '').replace(/<[^>]+>/g, '').trim();
  return createExercise({
    id:         raw.id,
    source:     'wger',
    name, description: desc,
    category:   raw.category || { id: 0, name: 'General' },
    muscles:    (raw.muscles || []).map(m => ({ id: m.id, name: m.name_en || m.name })),
    musclesSecondary: (raw.muscles_secondary || []).map(m => ({ id: m.id, name: m.name_en || m.name })),
    equipment:  (raw.equipment || []).map(e => ({ id: e.id, name: e.name })),
    imageUrl:   raw.images?.[0]?.image || null
  });
}

/* ---- Get exercises (network → cache → fallback) ---- */
// equipmentIds: number[], environment used for cache key + fallback selection
async function getExercises(environment, categoryKey, equipmentIds) {
  // Cache key includes sorted equipment for accuracy
  const eqKey   = (equipmentIds || ENV_BASE_EQUIPMENT[environment] || [7]).slice().sort().join('-');
  const cacheKey = `exercises_${environment}_${categoryKey}_${eqKey}`;
  const cached   = storage.loadApiCache(cacheKey);
  if (cached) return cached;

  const catId = CATEGORIES[categoryKey];
  try {
    const exercises = await fetchWgerExercises(equipmentIds || ENV_BASE_EQUIPMENT[environment] || [7], catId, 25);
    if (exercises.length > 0) {
      storage.saveApiCache(cacheKey, exercises);
      return exercises;
    }
    throw new Error('Empty response');
  } catch (err) {
    console.warn(`[api] Wger fetch failed for ${categoryKey}:`, err.message);
    return _getFallbackExercises(environment, categoryKey);
  }
}

async function _getFallbackExercises(environment, categoryKey) {
  const fallback = await _loadFallback();
  const fbKey    = FALLBACK_KEY_MAP[environment] || 'bodyweight';
  const isHe     = i18n.getLang() === 'he';
  const rawPool  = fallback[fbKey] || fallback.bodyweight || [];

  // Filter on raw (English) category names before translation
  const cat      = categoryKey.toLowerCase();
  const rawFiltered = rawPool.filter(ex =>
    (ex.category?.name || '').toLowerCase().includes(cat) || cat === 'cardio'
  );
  const source   = rawFiltered.length > 0 ? rawFiltered : rawPool;

  const pool = source.map(ex => {
    const catName = isHe && ex.category?.name_he ? ex.category.name_he : ex.category?.name;
    return createExercise({
      ...ex,
      name:        isHe && ex.name_he        ? ex.name_he        : ex.name,
      description: isHe && ex.description_he ? ex.description_he : ex.description,
      category:    { ...ex.category, name: catName }
    });
  });
  return pool;
}

/* ---- Workout Plan Generation ---- */

/**
 * Generate or return cached today's workout.
 * @param {Object} profile   UserProfile
 * @param {Object} gamData   GamificationData
 * @param {Object} [sessionOpts]  { environment, accessories[] } override for this session
 */
async function generateOrLoadWorkout(profile, gamData, sessionOpts) {
  const dateStr = today();
  // If session opts override env/accessories, always regenerate
  if (!sessionOpts) {
    const existing = storage.loadWorkoutForDate(profile.id, dateStr);
    if (existing) return existing;
  }
  return generateWorkoutPlan(profile, gamData, dateStr, sessionOpts);
}

async function generateWorkoutPlan(profile, gamData, dateStr = today(), sessionOpts = null) {
  const environment  = sessionOpts?.environment || profile.defaultEnvironment || 'home_no_equipment';
  const accessories  = sessionOpts?.accessories || [];
  const equipmentIds = resolveEquipment(environment, accessories);

  const dayIdx   = new Date().getDay();
  const rotation = DAY_ROTATION[dayIdx];
  const count    = EXERCISE_COUNT[profile.fitnessLevel] || 4;
  const diff     = Math.round(Math.max(1, Math.min(5, gamData?.difficultyModifier ?? 2)));
  const preset   = DIFFICULTY_PRESETS[diff];
  const isYouth  = profile.age < 15;
  const exercises = [];

  for (const catKey of rotation) {
    if (exercises.length >= count) break;
    const pool     = await getExercises(environment, catKey, equipmentIds);
    const filtered = isYouth ? pool.filter(ex => ex.source === 'wger' || !ex.highImpact) : pool;
    const seed     = _seed(dateStr + profile.id + catKey);
    const shuffled = _seededShuffle([...filtered], seed);
    const selected = shuffled.slice(0, Math.ceil((count - exercises.length) / rotation.length) + 1);
    for (const ex of selected) {
      if (exercises.length >= count) break;
      exercises.push({
        ...ex,
        sets:          preset.sets,
        reps:          ex.durationSeconds ? undefined : preset.reps,
        restSeconds:   preset.restSeconds,
        completedSets: []
      });
    }
  }

  const estimatedMinutes = Math.round(
    exercises.reduce((acc, ex) => acc + ex.sets * (ex.restSeconds + (ex.durationSeconds || ex.reps * 4)), 0) / 60
  );

  const plan = createWorkoutPlan({
    profileId: profile.id,
    date:      dateStr,
    difficulty: diff,
    environment,
    accessories,
    exercises,
    estimatedDurationMinutes: Math.max(10, estimatedMinutes)
  });

  storage.saveWorkoutForDate(profile.id, dateStr, plan);
  return plan;
}

/* ---- Helpers ---- */
function _seed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}
function _seededShuffle(arr, seed) {
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = (s >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function refreshWorkout(profile, gamData, sessionOpts) {
  storage.saveWorkoutForDate(profile.id, today(), null);
  return generateWorkoutPlan(profile, gamData, today(), sessionOpts);
}

export {
  generateOrLoadWorkout, generateWorkoutPlan, refreshWorkout,
  getExercises, resolveEquipment,
  DIFFICULTY_PRESETS, ENV_BASE_EQUIPMENT, ACCESSORY_EQUIPMENT_IDS
};
