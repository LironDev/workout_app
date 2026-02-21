/* ============================================================
   TOAST — Non-blocking Notification System
   ============================================================ */

const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
const DEFAULT_DURATION = 3500;

let _root = null;

function _getRoot() {
  if (!_root) _root = document.getElementById('toast-root');
  return _root;
}

/**
 * Show a toast notification.
 * @param {Object} options
 * @param {string} options.title
 * @param {string} [options.message]
 * @param {'success'|'error'|'warning'|'info'} [options.type]
 * @param {number} [options.duration]  ms before auto-dismiss (0 = persistent)
 */
function show({ title, message = '', type = 'info', duration = DEFAULT_DURATION }) {
  const root = _getRoot();
  if (!root) return;

  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `
    <span class="toast__icon">${ICONS[type] || 'ℹ️'}</span>
    <div class="toast__content">
      <div class="toast__title">${_esc(title)}</div>
      ${message ? `<div class="toast__message">${_esc(message)}</div>` : ''}
    </div>
    <button class="toast__close" aria-label="Dismiss">✕</button>
  `;

  el.querySelector('.toast__close').addEventListener('click', () => _dismiss(el));
  root.appendChild(el);

  if (duration > 0) setTimeout(() => _dismiss(el), duration);
}

function _dismiss(el) {
  if (!el.parentNode) return;
  el.classList.add('leaving');
  el.addEventListener('animationend', () => el.remove(), { once: true });
  // Fallback remove
  setTimeout(() => el.remove(), 400);
}

function success(title, message, duration) { show({ title, message, type: 'success', duration }); }
function error(title, message, duration)   { show({ title, message, type: 'error',   duration }); }
function warning(title, message, duration) { show({ title, message, type: 'warning', duration }); }
function info(title, message, duration)    { show({ title, message, type: 'info',    duration }); }

function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export { show, success, error, warning, info };
