// CAM Kitchen: componenti condivisi (mascotte, disegni, fogli, toast).
import { S } from './store.js';

export const $ = id => document.getElementById(id);
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(t) {
  const el = $('toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 1800);
}

/* Camillo: gatto stilizzato a tratto blu */
export function mascot(cls = '') {
  return `<svg class="mascot ${cls}" viewBox="0 0 64 64" fill="none" stroke="#24408E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="body">
<path d="M16 30 L15 10 L27 17 Q32 15.5 37 17 L49 10 L48 30 Q48 45 32 45 Q16 45 16 30 Z" fill="#FFFBF2"/>
<g class="eye"><path d="M23 29 q3 3 6 0 M35 29 q3 3 6 0"/></g>
<path d="M30.5 34 h3 l-1.5 2 z" fill="#24408E"/><path d="M32 36 q-2.5 3 -5 1 M32 36 q2.5 3 5 1"/>
<path d="M12 33 h-7 M12 37 l-6 2 M52 33 h7 M52 37 l6 2"/>

</g></svg>`;
}

/* niente disegni dei piatti e una sola tinta: restano solo crema e blu */
export const arte = () => '';
export const tinta = () => 'transparent';
export const breve = id => { const r = S.R[id]; if (!r) return id; return r.breve || r.nome.split(/ (con|e|al|alla|di) /)[0]; };

/* fogli dal basso */
export function openSheet(html) {
  $('sheet').innerHTML = `<div class="sheet-wrap"><div class="sheet-bg" data-close></div><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-top"><div class="grab"></div><button class="sheet-x" data-close aria-label="Chiudi">${ICON.x}</button></div><div class="sheet-body">${html}</div></div></div>`;
  const sh = $('sheet').querySelector('.sheet'), top = sh.querySelector('.sheet-top');
  let y0 = null, dy = 0;
  const start = e => { if (sh.querySelector('.sheet-body').scrollTop > 0 && !e.target.closest('.sheet-top')) return; y0 = e.touches[0].clientY; dy = 0; sh.style.transition = 'none'; };
  const move = e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); if (dy > 0) { sh.style.transform = `translateY(${dy}px)`; if (e.cancelable) e.preventDefault(); } };
  const end = () => { if (y0 == null) return; sh.style.transition = ''; if (dy > 90) closeSheet(); else sh.style.transform = ''; y0 = null; };
  top.addEventListener('touchstart', start, { passive: true });
  sh.querySelector('.sheet-body').addEventListener('touchstart', start, { passive: true });
  sh.addEventListener('touchmove', move, { passive: false }); sh.addEventListener('touchend', end);
}
export function closeSheet() { $('sheet').innerHTML = ''; document.dispatchEvent(new Event('focusout')); }
export function openOverlay(html) { $('overlay').innerHTML = html; document.body.style.overflow = 'hidden'; }
export function closeOverlay() { $('overlay').innerHTML = ''; document.body.style.overflow = ''; }

export const ICON = {
  back: '<svg class="ico" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg class="ico" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  cal: '<svg class="ico" viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/></svg>',
  gear: '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  chev: '<svg class="ico chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  x: '<svg class="ico" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
export const NAV = [
  ['menu', 'Oggi', '<path d="M5 3v6a2.5 2.5 0 0 0 5 0V3M7.5 3v18"/><path d="M18 21V3c-3.4 2.4-3.4 8.6 0 11"/>'],
  ['ricettario', 'Ricette', '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>'],
  ['spesa', 'Spesa', '<path d="M5 8h14l-1.5 11h-11z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'],
  ['progressi', 'Piano', '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V3.5h6V5M9 11h6M9 15h4"/>'],
];
export const illo = nome => `<img class="illo" src="disegni/schede/${nome}.svg" alt="" style="width:86px;height:86px">`;
