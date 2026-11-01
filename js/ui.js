// CAM Kitchen: componenti condivisi (mascotte, disegni, fogli, toast).
import { S } from './store.js';

export const $ = id => document.getElementById(id);
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(t) {
  const el = $('toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 1800);
}

/* Camillo: pesce cuoco di sushi, con la fascia hachimaki */
export function mascot(cls = '') {
  return `<svg class="mascot ${cls}" viewBox="-12 -16 104 108" aria-hidden="true"><defs><filter id="mg" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter></defs>
<g class="body">
<ellipse cx="40" cy="56" rx="34" ry="24" fill="#F4A98C" filter="url(#mg)" opacity=".55"/>
<path d="M66 54 L86 38 Q90 56 86 74 Z" fill="#F4A98C" stroke="#24408E" stroke-width="2" stroke-linejoin="round"/>
<path d="M44 31 Q56 16 68 42 Q60 34 52 33Z" fill="#F4A98C" stroke="#24408E" stroke-width="2" stroke-linejoin="round"/>
<path d="M8 56 C8 38 24 30 40 30 C58 30 70 42 70 56 C70 70 58 80 40 80 C24 80 8 72 8 56Z" fill="#F7B79E" stroke="#24408E" stroke-width="2"/>
<path d="M14 64 C24 76 52 78 64 64 C54 72 26 72 14 64Z" fill="#FBF7EE" opacity=".9"/>
<path d="M44 46 q4 4 0 8 M52 44 q4 5 0 10 M60 47 q3 4 0 7" fill="none" stroke="#24408E" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>
<path d="M11.5 46 C17 33 34 27 52 33 L50.5 41 C35 36 22 40 16.5 51 Z" fill="#FBF7EE" stroke="#24408E" stroke-width="2" stroke-linejoin="round"/>
<circle cx="31" cy="36.5" r="2.8" fill="#E0906F" stroke="#24408E" stroke-width="1"/>
<path d="M51.5 37 c5 -6 11 -6 9 0 c-2 4 -6 2 -9 0 Z M51.5 37 c6 3 9 9 5 10 c-4 1 -4 -5 -5 -10 Z" fill="#FBF7EE" stroke="#24408E" stroke-width="1.6" stroke-linejoin="round"/>
<circle cx="26" cy="51" r="6.5" fill="#FBF7EE" stroke="#24408E" stroke-width="2"/>
<g class="eye"><circle cx="24.8" cy="51.5" r="3.4" fill="#24408E"/><circle cx="23.6" cy="50.2" r="1.1" fill="#FBF7EE"/></g>
<path d="M12 62 q4 3.5 8 0" fill="none" stroke="#24408E" stroke-width="2" stroke-linecap="round"/>
<ellipse cx="22" cy="60" rx="3.2" ry="1.8" fill="#E0906F" opacity=".7"/>
<path d="M44 62 q6 6 0 12" fill="none" stroke="#24408E" stroke-width="2" stroke-linecap="round"/>
</g></svg>`;
}

/* disegno di una ricetta: il PNG se esiste, altrimenti l'illustrazione di categoria */
export function arte(ricettaId, cls = '') {
  const r = S.R[ricettaId];
  const cat = (r && r.categoria_disegno) || 'piatto';
  const fallback = `disegni/categorie/${cat}.svg`;
  const src = r && r.disegno ? r.disegno : fallback;
  return `<img class="${cls}" src="${src}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">`;
}
export const TINT = { primi: '#F3DCC9', secondi: '#E4EAD3', uova: '#F6E7B8', veloci: '#EAD9D2', nuovo: '#E3E0EE', altro: '#F1EBC4' };
export function tinta(ricettaId) {
  const r = S.R[ricettaId]; if (!r) return '#FBF5E8';
  if (r.nuovo) return TINT.nuovo;
  const c = (r.capitolo || '').toLowerCase();
  if (c.startsWith('primi')) return TINT.primi;
  if (c.startsWith('secondi')) return TINT.secondi;
  if (c.startsWith('uova')) return TINT.uova;
  if (c.startsWith('veloci')) return TINT.veloci;
  return TINT.altro;
}
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
  ['menu', 'Menù', '<circle cx="12" cy="12.5" r="6"/><circle cx="12" cy="12.5" r="3.4"/><path d="M3 4v5.5M1.8 4v3.3a1.2 1.2 0 0 0 2.4 0V4M3 9.5V21M21.5 4c-1.6 1.6-1.6 5.5 0 7v10"/>'],
  ['ricettario', 'Ricettario', '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>'],
  ['spesa', 'Spesa', '<path d="M5 8h14l-1.5 11h-11z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'],
  ['progressi', 'Progressi', '<path d="M4 19h16"/><path d="M6 15l4-4 3 3 5-6"/>'],
];
export const illo = nome => `<img class="illo" src="disegni/schede/${nome}.svg" alt="" style="width:86px;height:86px">`;
