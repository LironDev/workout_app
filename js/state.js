/* ============================================================
   STATE — Central Observable Store + Event Bus
   ============================================================ */

const _state = {
  activeProfileId: null,
  profiles: {},
  todayWorkout: null,
  workoutSession: null,
  nutritionToday: null,
  gamification: {},
  ui: { loading: false, error: null, offlineMode: false }
};

// Subscriber maps: key -> Set<callback>
const _subscribers = new Map();
// Event bus: eventName -> Set<callback>
const _eventBus = new Map();

/**
 * Merge a patch into state and notify subscribers of changed keys.
 * @param {Object} patch
 */
function setState(patch) {
  const changed = [];
  for (const key of Object.keys(patch)) {
    if (_state[key] !== patch[key]) {
      _state[key] = patch[key];
      changed.push(key);
    }
  }
  changed.forEach(key => {
    if (_subscribers.has(key)) {
      _subscribers.get(key).forEach(cb => {
        try { cb(_state[key]); }
        catch (e) { console.error(`[state] subscriber error for "${key}":`, e); }
      });
    }
  });
}

/**
 * Read a state slice (or all state if no key given).
 * @param {string} [key]
 * @returns {*}
 */
function getState(key) {
  if (key === undefined) return { ..._state };
  return _state[key];
}

/**
 * Subscribe to changes on a specific state key.
 * @param {string} key
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
function subscribe(key, callback) {
  if (!_subscribers.has(key)) _subscribers.set(key, new Set());
  _subscribers.get(key).add(callback);
  return () => _subscribers.get(key).delete(callback);
}

/**
 * Emit a named event with optional payload.
 * @param {string} eventName
 * @param {*} [payload]
 */
function emit(eventName, payload) {
  if (_eventBus.has(eventName)) {
    _eventBus.get(eventName).forEach(cb => {
      try { cb(payload); }
      catch (e) { console.error(`[state] event handler error for "${eventName}":`, e); }
    });
  }
}

/**
 * Listen to a named event.
 * @param {string} eventName
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
function on(eventName, callback) {
  if (!_eventBus.has(eventName)) _eventBus.set(eventName, new Set());
  _eventBus.get(eventName).add(callback);
  return () => _eventBus.get(eventName).delete(callback);
}

/**
 * Remove a listener.
 * @param {string} eventName
 * @param {Function} callback
 */
function off(eventName, callback) {
  if (_eventBus.has(eventName)) _eventBus.get(eventName).delete(callback);
}

export { setState, getState, subscribe, emit, on, off };
