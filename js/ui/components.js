/* ============================================================
   COMPONENTS — Shared UI Factories
   ============================================================ */

import { icon } from './icons.js';

/** Escape HTML */
export function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/** Avatar initials + color */
export function avatarEl(name, size = 'md', index = 0) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const div = document.createElement('div');
  div.className = `avatar avatar--${size} avatar-c${index % 6}`;
  div.textContent = initials;
  div.setAttribute('aria-label', name);
  return div;
}

/** Build avatar HTML string */
export function avatarHTML(name, size = 'md', index = 0, active = false) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const ring = active ? 'avatar--ring' : '';
  return `<div class="avatar avatar--${size} avatar-c${index % 6} ${ring}" aria-label="${esc(name)}">${esc(initials)}</div>`;
}

/** Modal sheet */
export function showModal({ title, contentHTML, footer = '' }) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-handle"></div>
        <h3 class="mb-4">${esc(title)}</h3>
        ${contentHTML}
        ${footer ? `<div class="mt-4">${footer}</div>` : ''}
      </div>
    </div>
  `;
  requestAnimationFrame(() => {
    document.getElementById('modal-backdrop').classList.add('open');
  });

  // Close on backdrop click
  document.getElementById('modal-backdrop').addEventListener('click', e => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
}

export function closeModal() {
  const backdrop = document.getElementById('modal-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.addEventListener('transitionend', () => {
    document.getElementById('modal-root').innerHTML = '';
  }, { once: true });
}

/** Macro ring SVG (donut chart) */
export function macroRingHTML(logged, targets, size = 160) {
  const R     = size / 2 - 16;
  const C     = 2 * Math.PI * R;
  const cx    = size / 2;
  const cy    = size / 2;

  const calLogged  = logged?.calories  ?? 0;
  const calTarget  = targets?.calories ?? 2000;
  const protLogged = logged?.protein   ?? 0;
  const protTarget = targets?.proteinG ?? 100;
  const carbLogged = logged?.carbs     ?? 0;
  const carbTarget = targets?.carbsG   ?? 200;
  const fatLogged  = logged?.fat       ?? 0;
  const fatTarget  = targets?.fatG     ?? 60;

  function segment(value, total, color, offset) {
    const pct  = Math.min(1, total > 0 ? value / total : 0);
    const len  = pct * C;
    const gap  = C - len;
    return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${color}" stroke-width="12"
      stroke-dasharray="${len} ${gap}" stroke-dashoffset="${-offset}" stroke-linecap="round"/>`;
  }

  const protLen = Math.min(1, protTarget > 0 ? protLogged / protTarget : 0) * C;
  const carbLen = Math.min(1, carbTarget > 0 ? carbLogged / carbTarget : 0) * C;
  const fatLen  = Math.min(1, fatTarget  > 0 ? fatLogged  / fatTarget  : 0) * C;

  return `
    <div class="macro-ring" style="width:${size}px;height:${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--color-surface-2)" stroke-width="12"/>
        ${segment(protLogged, protTarget, '#6C63FF', 0)}
        ${segment(carbLogged, carbTarget, '#4ECDC4', protLen + 4)}
        ${segment(fatLogged,  fatTarget,  '#FF6B6B', protLen + carbLen + 8)}
      </svg>
      <div class="macro-ring__center">
        <span class="macro-ring__calories">${calLogged}</span>
        <span class="macro-ring__label">/ ${calTarget} kcal</span>
      </div>
    </div>
  `;
}

/** Macro legend HTML */
export function macroLegendHTML(logged, targets) {
  const items = [
    { name: 'Protein', value: logged?.protein ?? 0, target: targets?.proteinG ?? 100, color: '#6C63FF', unit: 'g' },
    { name: 'Carbs',   value: logged?.carbs   ?? 0, target: targets?.carbsG   ?? 200, color: '#4ECDC4', unit: 'g' },
    { name: 'Fat',     value: logged?.fat      ?? 0, target: targets?.fatG     ?? 60,  color: '#FF6B6B', unit: 'g' }
  ];
  return `<div class="macro-legend">
    ${items.map(i => `
      <div class="macro-legend__item">
        <div class="macro-legend__dot" style="background:${i.color}"></div>
        <span class="macro-legend__name">${esc(i.name)}</span>
        <span class="macro-legend__values">${i.value}<span style="color:var(--color-text-muted);font-weight:400">/${i.target}${i.unit}</span></span>
      </div>
    `).join('')}
  </div>`;
}

/** Progress bar HTML */
export function progressBarHTML(value, max, className = '') {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return `<div class="progress-bar ${className}">
    <div class="progress-bar__fill" style="width:${pct}%"></div>
  </div>`;
}

/** XP bar HTML */
export function xpBarHTML(xp) {
  const xpPerLevel = 200;
  const level      = Math.floor(xp / xpPerLevel) + 1;
  const xpInLevel  = xp % xpPerLevel;
  const pct        = (xpInLevel / xpPerLevel) * 100;
  return `
    <div class="xp-bar">
      <div class="xp-bar__labels">
        <span>Level ${level}</span>
        <span>${xpInLevel}/${xpPerLevel} XP</span>
      </div>
      ${progressBarHTML(xpInLevel, xpPerLevel)}
    </div>
  `;
}

/** Streak HTML */
export function streakHTML(days) {
  return `<div class="streak-counter">
    <span class="streak-counter__icon">${icon('flame')}</span>
    <span>${days}</span>
    <span style="font-size:var(--text-sm);opacity:0.85">day${days !== 1 ? 's' : ''}</span>
  </div>`;
}

/** Empty state HTML */
export function emptyStateHTML({ emoji, title, desc, btnLabel, btnAction }) {
  return `<div class="empty-state">
    <div class="empty-state__icon">${emoji}</div>
    <h3 class="empty-state__title">${esc(title)}</h3>
    <p class="empty-state__desc">${esc(desc)}</p>
    ${btnLabel ? `<button class="btn btn--primary" onclick="${btnAction}">${esc(btnLabel)}</button>` : ''}
  </div>`;
}

/** Skeleton card */
export function skeletonCardHTML(lines = 3) {
  return `<div class="card">
    ${Array(lines).fill(0).map(() => '<div class="skeleton skeleton-text mb-3" style="width:' + (60 + Math.random()*30).toFixed(0) + '%"></div>').join('')}
  </div>`;
}

/** Confetti burst */
export function confetti(count = 40) {
  const colors = ['#6C63FF','#FF6B6B','#4ECDC4','#F39C12','#2ECC71'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-particle';
    el.style.cssText = `
      left:${Math.random()*100}vw;
      top:0;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      transform:rotate(${Math.random()*360}deg);
      animation-delay:${Math.random()*0.5}s;
      animation-duration:${1.5 + Math.random()}s;
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/** Ripple effect on button click */
export function addRipple(btn) {
  btn.addEventListener('click', function(e) {
    const rect   = this.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    const x      = e.clientX - rect.left - size / 2;
    const y      = e.clientY - rect.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}
