/* ============================================================
   STORAGE — localStorage Abstraction Layer
   ============================================================ */

const KEYS = {
  PROFILES:       'fna_profiles',
  ACTIVE_PROFILE: 'fna_active_profile',
  WORKOUTS:       'fna_workouts',
  NUTRITION:      'fna_nutrition',
  GAMIFICATION:   'fna_gamification',
  SETTINGS:       'fna_settings',
  API_CACHE:      'fna_api_cache'
};

const MAX_HISTORY_DAYS = 30;

/* ---- Low-level helpers ---- */

function _read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn(`[storage] Failed to read "${key}":`, e);
    return null;
  }
}

function _write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`[storage] Failed to write "${key}":`, e);
    // If quota exceeded, try to prune and retry once
    if (e.name === 'QuotaExceededError') {
      _emergencyPrune();
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e2) {
        console.error('[storage] Still cannot write after emergency prune:', e2);
      }
    }
    return false;
  }
}

function _remove(key) {
  try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
}

/** Prune entries older than MAX_HISTORY_DAYS from a date-keyed object. */
function _pruneOldDates(obj) {
  if (!obj) return obj;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_HISTORY_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const pruned = {};
  for (const date of Object.keys(obj)) {
    if (date >= cutoffStr) pruned[date] = obj[date];
  }
  return pruned;
}

/** Emergency prune: remove oldest workout/nutrition entries across all profiles. */
function _emergencyPrune() {
  try {
    const workouts = _read(KEYS.WORKOUTS) || {};
    for (const pid of Object.keys(workouts)) {
      workouts[pid] = _pruneOldDates(workouts[pid]);
    }
    localStorage.setItem(KEYS.WORKOUTS, JSON.stringify(workouts));

    const nutrition = _read(KEYS.NUTRITION) || {};
    for (const pid of Object.keys(nutrition)) {
      nutrition[pid] = _pruneOldDates(nutrition[pid]);
    }
    localStorage.setItem(KEYS.NUTRITION, JSON.stringify(nutrition));
  } catch (e) { /* ignore */ }
}

/* ---- Profiles ---- */

function saveProfiles(profiles) {
  _write(KEYS.PROFILES, profiles);
}

function loadProfiles() {
  return _read(KEYS.PROFILES) || {};
}

function getActiveProfileId() {
  return _read(KEYS.ACTIVE_PROFILE);
}

function setActiveProfileId(profileId) {
  _write(KEYS.ACTIVE_PROFILE, profileId);
}

function deleteProfile(profileId) {
  const profiles = loadProfiles();
  delete profiles[profileId];
  saveProfiles(profiles);

  // Clean up associated data
  const workouts = _read(KEYS.WORKOUTS) || {};
  delete workouts[profileId];
  _write(KEYS.WORKOUTS, workouts);

  const nutrition = _read(KEYS.NUTRITION) || {};
  delete nutrition[profileId];
  _write(KEYS.NUTRITION, nutrition);

  const gamification = _read(KEYS.GAMIFICATION) || {};
  delete gamification[profileId];
  _write(KEYS.GAMIFICATION, gamification);
}

/* ---- Workouts ---- */

function saveWorkoutForDate(profileId, date, workoutPlan) {
  const all = _read(KEYS.WORKOUTS) || {};
  if (!all[profileId]) all[profileId] = {};
  all[profileId][date] = workoutPlan;
  all[profileId] = _pruneOldDates(all[profileId]);
  _write(KEYS.WORKOUTS, all);
}

function loadWorkoutForDate(profileId, date) {
  const all = _read(KEYS.WORKOUTS) || {};
  return (all[profileId] && all[profileId][date]) || null;
}

function loadWorkoutHistory(profileId) {
  const all = _read(KEYS.WORKOUTS) || {};
  return all[profileId] || {};
}

/* ---- Nutrition ---- */

function saveNutritionForDate(profileId, date, data) {
  const all = _read(KEYS.NUTRITION) || {};
  if (!all[profileId]) all[profileId] = {};
  all[profileId][date] = data;
  all[profileId] = _pruneOldDates(all[profileId]);
  _write(KEYS.NUTRITION, all);
}

function loadNutritionForDate(profileId, date) {
  const all = _read(KEYS.NUTRITION) || {};
  return (all[profileId] && all[profileId][date]) || null;
}

/* ---- Gamification ---- */

function saveGamification(profileId, data) {
  const all = _read(KEYS.GAMIFICATION) || {};
  all[profileId] = data;
  _write(KEYS.GAMIFICATION, all);
}

function loadGamification(profileId) {
  const all = _read(KEYS.GAMIFICATION) || {};
  return all[profileId] || null;
}

/* ---- Settings ---- */

function saveSettings(settings) {
  _write(KEYS.SETTINGS, settings);
}

function loadSettings() {
  return _read(KEYS.SETTINGS) || { theme: 'system', soundEnabled: true };
}

/* ---- API Cache ---- */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function saveApiCache(cacheKey, data) {
  const all = _read(KEYS.API_CACHE) || {};
  all[cacheKey] = { data, fetchedAt: Date.now() };
  _write(KEYS.API_CACHE, all);
}

function loadApiCache(cacheKey) {
  const all = _read(KEYS.API_CACHE) || {};
  const entry = all[cacheKey];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null; // expired
  return entry.data;
}

function clearApiCache() {
  _remove(KEYS.API_CACHE);
}

/* ---- Storage health check ---- */
function isAvailable() {
  try {
    const test = '__fna_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch { return false; }
}

export {
  KEYS,
  saveProfiles, loadProfiles,
  getActiveProfileId, setActiveProfileId, deleteProfile,
  saveWorkoutForDate, loadWorkoutForDate, loadWorkoutHistory,
  saveNutritionForDate, loadNutritionForDate,
  saveGamification, loadGamification,
  saveSettings, loadSettings,
  saveApiCache, loadApiCache, clearApiCache,
  isAvailable
};
