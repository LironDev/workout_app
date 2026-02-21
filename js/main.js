/* ============================================================
   MAIN — App Bootstrap & Entry Point
   ============================================================ */

import * as state      from './state.js';
import * as storage    from './storage.js';
import * as router     from './router.js';
import * as i18n       from './i18n.js';
import * as onboarding from './modules/onboarding.js';
import * as dashboard  from './modules/dashboard.js';
import * as workout    from './modules/workout.js';
import * as nutrition  from './modules/nutrition.js';
import * as profiles   from './modules/profiles.js';
import * as badges     from './modules/badges.js';

/* ---- PWA Service Worker Registration ---- */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    console.log('[PWA] Service Worker registered:', reg.scope);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller)
          console.log('[PWA] New version available.');
      });
    });
  } catch (err) {
    console.warn('[PWA] Service Worker registration failed:', err);
  }
}

/* ---- Online/Offline Banner ---- */
function setupConnectivityBanner() {
  const banner = document.createElement('div');
  banner.className = 'offline-banner';
  banner.id = 'offline-banner';
  banner.textContent = i18n.t('offline');
  document.body.appendChild(banner);

  function update() {
    const offline = !navigator.onLine;
    banner.textContent = i18n.t('offline');
    banner.classList.toggle('show', offline);
    state.setState({ ui: { ...state.getState('ui'), offlineMode: offline } });
  }
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

/* ---- Theme Management ---- */
function applyTheme() {
  const settings = storage.loadSettings();
  const theme    = settings.theme || 'system';
  if (theme === 'dark')  document.documentElement.setAttribute('data-theme', 'dark');
  else if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
}

window._applyTheme = applyTheme;

/* ---- Router Setup ---- */
function setupRouter() {
  router.init({
    '#onboarding': { sectionId: 'view-onboarding', module: onboarding },
    '#dashboard':  { sectionId: 'view-dashboard',  module: dashboard  },
    '#workout':    { sectionId: 'view-workout',     module: workout    },
    '#nutrition':  { sectionId: 'view-nutrition',   module: nutrition  },
    '#profiles':   { sectionId: 'view-profiles',    module: profiles   },
    '#badges':     { sectionId: 'view-badges',      module: badges     }
  });
}

/* ---- Bootstrap ---- */
async function initApp() {
  if (!storage.isAvailable()) {
    document.body.innerHTML = `
      <div class="loading-screen">
        <div style="font-size:3rem">⚠️</div>
        <h2>Storage Unavailable</h2>
        <p style="text-align:center;color:#6B7280;max-width:280px">
          FitLife requires localStorage to save your data. Please enable cookies/storage in your browser settings.
        </p>
      </div>
    `;
    return;
  }

  // Init i18n first (sets lang attribute on <html>)
  i18n.init();

  // Load persisted state
  const savedProfiles   = storage.loadProfiles();
  const activeProfileId = storage.getActiveProfileId();
  const validId = (activeProfileId && savedProfiles[activeProfileId])
    ? activeProfileId
    : Object.keys(savedProfiles)[0] || null;
  if (validId && validId !== activeProfileId) storage.setActiveProfileId(validId);

  state.setState({ activeProfileId: validId, profiles: savedProfiles });

  applyTheme();
  setupRouter();

  const hasProfiles = Object.keys(savedProfiles).length > 0;
  const hashFromURL = window.location.hash;
  const validHashes = ['#dashboard','#workout','#nutrition','#profiles','#badges','#onboarding'];

  if (!hasProfiles) {
    router.replace('#onboarding');
  } else if (hashFromURL && validHashes.includes(hashFromURL)) {
    router.navigate(hashFromURL);
  } else {
    router.replace('#dashboard');
  }

  setupConnectivityBanner();
  registerServiceWorker();
  _setupInstallPrompt();

  console.log('[FitLife] App initialized ✓');
}

/* ---- PWA Install Prompt ---- */
let _deferredInstall = null;

function _setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredInstall = e;
    window._deferredInstall = e;  // expose for dashboard button
    const btn = document.getElementById('install-pwa-btn');
    if (btn) btn.style.display = '';
    // Also show the dashboard install btn if visible
    document.getElementById('dash-install-btn')?.style.removeProperty('display');
  });
  window.addEventListener('appinstalled', () => {
    _deferredInstall = null;
    window._deferredInstall = null;
    const btn = document.getElementById('install-pwa-btn');
    if (btn) btn.style.display = 'none';
    document.getElementById('dash-install-btn')?.style.setProperty('display','none');
  });
}

window.triggerPWAInstall = async function() {
  if (!_deferredInstall) return;
  _deferredInstall.prompt();
  const result = await _deferredInstall.userChoice;
  console.log('[PWA] Install choice:', result.outcome);
  _deferredInstall = null;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
