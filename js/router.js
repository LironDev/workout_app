/* ============================================================
   ROUTER — Hash-based SPA Router
   ============================================================ */

let _routes = {};
let _currentRoute = null;
let _currentModule = null;

/**
 * Register routes.
 * @param {Object} routes  { '#hash': { sectionId, module } }
 */
function init(routes) {
  _routes = routes;
  window.addEventListener('hashchange', _handleChange);
  // Handle initial load
  _handleChange();
}

function _handleChange() {
  const hash = window.location.hash || '#dashboard';
  const route = _routes[hash];

  if (!route) {
    console.warn(`[router] No route for "${hash}", redirecting to #dashboard`);
    navigate('#dashboard');
    return;
  }

  // Unmount previous module
  if (_currentModule && typeof _currentModule.unmount === 'function') {
    try { _currentModule.unmount(); } catch (e) { console.error('[router] unmount error:', e); }
  }

  // Hide all sections
  document.querySelectorAll('.view').forEach(el => {
    el.classList.remove('view--active');
    el.setAttribute('aria-hidden', 'true');
  });

  // Show target section
  const section = document.getElementById(route.sectionId);
  if (section) {
    section.classList.add('view--active');
    section.setAttribute('aria-hidden', 'false');
  } else {
    console.error(`[router] Section "#${route.sectionId}" not found`);
  }

  // Mount new module
  _currentRoute = hash;
  _currentModule = route.module;
  if (_currentModule && typeof _currentModule.mount === 'function') {
    try { _currentModule.mount(route.params || {}); }
    catch (e) { console.error('[router] mount error:', e); }
  }

  // Update nav active state
  document.querySelectorAll('.bottom-nav__item[data-route]').forEach(btn => {
    const active = btn.dataset.route === hash;
    btn.classList.toggle('bottom-nav__item--active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

/**
 * Navigate to a route hash.
 * @param {string} hash
 * @param {Object} [params]
 */
function navigate(hash, params) {
  if (params) {
    // Store params for the route to pick up
    const route = _routes[hash];
    if (route) route.params = params;
  }
  if (window.location.hash === hash) {
    // Force re-mount if same route
    _handleChange();
  } else {
    window.location.hash = hash;
  }
}

/**
 * Replace current history entry (no back button entry).
 */
function replace(hash) {
  history.replaceState(null, '', hash);
  _handleChange();
}

/** Get current route hash. */
function getCurrentRoute() { return _currentRoute; }

/** Re-mount the current route (e.g. after language change). */
function remount() {
  if (_currentModule && typeof _currentModule.unmount === 'function') {
    try { _currentModule.unmount(); } catch (e) { /* ignore */ }
  }
  if (_currentModule && typeof _currentModule.mount === 'function') {
    try { _currentModule.mount(_routes[_currentRoute]?.params || {}); } catch (e) { console.error(e); }
  }
}

export { init, navigate, replace, getCurrentRoute, remount };
