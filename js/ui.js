// CAM Kitchen: componenti condivisi (mascotte, disegni, fogli, toast).
import { S } from './store.js';

export const $ = id => document.getElementById(id);
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(t) {
  const el = $('toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 1800);
}

/* Camillo: gnocco con cappello da chef e baffi */
export function mascot(cls = '') {
  return `<svg class="mascot ${cls}" viewBox="-12 -16 104 108" aria-hidden="true"><defs><filter id="mg" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter></defs>
<g class="body"><ellipse cx="40" cy="58" rx="33" ry="27" fill="#F2CF6B" filter="url(#mg)" opacity=".85"/>
<path d="M12 60 C12 40 26 33 40 33 C54 33 68 40 68 60 C68 75 56 82 40 82 C24 82 12 75 12 60Z" fill="#F7DF9A" stroke="#3A3530" stroke-width="2"/>
<path d="M24 34 C14 34 14 18 25 19 C25 7 41 5 43 15 C49 6 64 11 59 21 C68 21 67 35 57 34 Z" fill="#FBF5E8" stroke="#3A3530" stroke-width="2" stroke-linejoin="round"/>
<rect x="24" y="31" width="33" height="8" rx="2" fill="#FBF5E8" stroke="#3A3530" stroke-width="2"/>
<circle class="eye" cx="31" cy="51" r="2.6" fill="#3A3530"/><circle class="eye" cx="49" cy="51" r="2.6" fill="#3A3530"/>
<path d="M40 58.5 C35 54 27 54 23.5 59 C21.5 62 17.5 61.5 17 58 C16 66 24 70.5 31 67.5 C35 66 37.5 64.5 40 64.5 C42.5 64.5 45 66 49 67.5 C56 70.5 64 66 63 58 C62.5 61.5 58.5 62 56.5 59 C53 54 45 54 40 58.5Z" fill="#3A3530"/>
<path d="M37 70.5 q3 2.5 6 0" stroke="#3A3530" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<ellipse cx="22" cy="55" rx="3.5" ry="2" fill="#E9A386" opacity=".6"/><ellipse cx="58" cy="55" rx="3.5" ry="2" fill="#E9A386" opacity=".6"/></g></svg>`;
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
  $('sheet').innerHTML = `<div class="sheet-wrap"><div class="sheet-bg" data-close></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
}
export function closeSheet() { $('sheet').innerHTML = ''; }
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
  ['menu', 'Menù', '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>'],
  ['ricettario', 'Ricettario', '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>'],
  ['spesa', 'Spesa', '<path d="M5 8h14l-1.5 11h-11z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'],
  ['progressi', 'Progressi', '<path d="M4 19h16"/><path d="M6 15l4-4 3 3 5-6"/>'],
];
export const illo = nome => `<img class="illo" src="disegni/schede/${nome}.svg" alt="" style="width:86px;height:86px">`;
