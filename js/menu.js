// CAM Kitchen: calendario, avvisi, carosello, scheda del piatto e pagina della ricetta. La scheda Oggi è in oggi.js.
import { S, giorno, salvaGiorno, salvaPref, oggi, uid, nowISO, saveUI, cfg, syncPronto } from './store.js';
import { fmt, addDays, dow, isWeekend, giornataDel, totaliGiorno, vociGiornata, macroVoci, macroRicetta, pastoDel, pastoFatto, giornoCompleto, nonSegnati, cicloDi, statoCiclo, dispensa, statoIngredienti, quantitaTesto, grammi, tolti } from './calc.js';
import { $, esc, toast, mascot, arte, tinta, breve, openSheet, closeSheet, openOverlay, closeOverlay, ICON } from './ui.js';
import { storico, apriClaude } from './ricettario.js';
const num = v => Number(String(v || '').replace(',', '.')) || 0;

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const GG = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const SESS = { armor: 'Armor', roots: 'Roots', guns: 'Guns', wings: 'Wings', breathe: 'Breathe' };
const nomeGiorno = d => `${GIORNI[dow(d)]} ${Number(d.slice(8))}`;
const corto = d => `${GG[dow(d)]} ${Number(d.slice(8))}`;
export const sel = () => S.ui.sel || oggi();

/* ---------- avvisi ---------- */
export function bannerIeri() {
  if (sel() !== oggi()) return '';
  const ieri = addDays(oggi(), -1);
  if (S.ui.ieriChiuso === ieri || ieri < (S.prog.data_inizio || '0')) return '';
  const g = giorno(ieri), mancano = nonSegnati(g);
  const cena = pastoFatto(g, 'cena');
  if (!mancano.length && cena) return '';
  const cosa = [...mancano.map(m => m.nome.toLowerCase()), ...(cena ? [] : ['cena'])].join(', ');
  return `<div class="banner">${mascot('sm')}<span><b>Ieri non hai segnato</b><small>${esc(cosa)}</small></span><span class="acts">${mancano.length ? `<button class="pill sm solid" data-act="ieri-si">Sì, fatti</button>` : ''}<button class="pill sm" data-act="ieri-no">${cena ? 'No' : 'Dopo'}</button></span></div>`;
}
export function bannerCoach() {
  const p = S.prog; if (!p.messaggio_coach || S.ui.coachVisto === p.versione) return '';
  return `<div class="banner">${mascot('sm')}<span><b>Camillo dice</b><small>${esc(p.messaggio_coach)}</small></span><button class="ib" data-act="coach-ok" aria-label="Chiudi">${ICON.x}</button></div>`;
}

/* ---------- carosello: carte sovrapposte ---------- */
export function flowEl(b, ov) {
  if (!b || b.offsetParent === null) return;
  const mid = b.scrollLeft + b.clientWidth / 2;
  [...b.children].forEach(p => {
    const c = p.offsetLeft + p.offsetWidth / 2, d = (c - mid) / (p.offsetWidth - ov), a = Math.min(Math.abs(d), 3);
    p.style.transform = `scale(${1 - a * 0.14})`; p.style.zIndex = 100 - Math.round(a * 10); p.style.opacity = 1 - Math.max(0, a - 1.6) * 0.5;
    p.classList.toggle('center', a < 0.35);
  });
}
export function initFlows() {
  document.querySelectorAll('[data-flow]').forEach(b => {
    const ov = b.classList.contains('mini') ? 44 : 64;
    if (!b.dataset.init) {
      b.dataset.init = 1;
      b.addEventListener('scroll', () => requestAnimationFrame(() => flowEl(b, ov)), { passive: true });
      const first = [...b.children].find(x => !x.classList.contains('done') && !x.classList.contains('ghost'));
      if (first) b.scrollLeft = first.offsetLeft + first.offsetWidth / 2 - b.clientWidth / 2;
    }
    flowEl(b, ov);
  });
}

/* ---------- azioni ---------- */
export function modifica(fn, data = sel()) { const g = structuredClone(giorno(data)); fn(g); salvaGiorno(g); }
export function togliPasto(g, quale) {
  const via = (g.eventi || []).filter(e => (e.tipo === 'pasto' || e.tipo === 'fuori') && e.pasto === quale).map(e => e.id);
  g.eventi = g.eventi.filter(e => !via.includes(e.id)); g.rimossi = [...(g.rimossi || []), ...via];
  if (quale === 'pranzo') g.pranzo = null;
}
export function registraPiatto(ricetta, quale, data = sel()) {
  const c = cicloDi(data);
  const nelCiclo = c && c.piatti.some(p => p.ricetta === ricetta);
  modifica(g => { togliPasto(g, quale); g.eventi.push({ id: uid(), t: nowISO(), tipo: 'pasto', pasto: quale, ricetta, porzione: 1, ...(nelCiclo ? { ciclo: c.id } : {}) }); }, data);
  toast(`${quale === 'cena' ? 'Cena' : 'Pranzo'} segnato`);
}

export function azioneMenu(act, el) {
  const d = sel();
  switch (act) {
    case 'day': S.ui.sel = el.dataset.d; saveUI(); return true;
    case 'week': S.ui.sel = addDays(d, Number(el.dataset.n)); saveUI(); return true;
    case 'cal': calendario(d.slice(0, 7)); return true;
    case 'cal-m': calendario(el.dataset.m); return true;
    case 'cal-d': S.ui.sel = el.dataset.d; saveUI(); closeSheet(); return true;
    case 'tick': modifica(g => { if (g.giornata[el.dataset.id]) delete g.giornata[el.dataset.id]; else g.giornata[el.dataset.id] = 'fatto'; }); return true;
    case 'stp': { const i = $(el.dataset.t); const step = Number(el.dataset.s); const cur = Number(String(i.value).replace(',', '.')) || 0; const v = Math.max(0, Math.round((cur + step * Number(el.dataset.n)) * 100) / 100); i.value = String(v).replace('.', ','); return false; }
    case 'ieri-si': modifica(g => { for (const m of giornataDel(g.data)) if (!g.giornata[m.id]) g.giornata[m.id] = 'fatto'; }, addDays(oggi(), -1)); toast('Segnate su ieri'); return true;
    case 'ieri-no': S.ui.ieriChiuso = addDays(oggi(), -1); saveUI(); return true;
    case 'coach-ok': S.ui.coachVisto = S.prog.versione; saveUI(); return true;
    case 'eat': registraPiatto(el.dataset.r, el.dataset.q || 'cena'); closeSheet(); closeOverlay(); return true;
    case 'ing-togli': case 'ing-rimetti': { const r = el.dataset.r, a = el.dataset.a; S.pref.togli = S.pref.togli || {}; const cur = new Set(S.pref.togli[r] || []);
      if (act === 'ing-togli') cur.add(a); else { cur.delete(a); S.pref.nonMiPiace = (S.pref.nonMiPiace || []).filter(x => x !== a); }
      S.pref.togli[r] = [...cur]; salvaPref(); paginaRicetta(r, el.dataset.q || 'cena'); toast(act === 'ing-togli' ? 'Tolto da questa ricetta' : 'Rimesso'); return false; }
    case 'del-ev': modifica(g => { g.eventi = g.eventi.filter(e => e.id !== el.dataset.id); g.rimossi = [...(g.rimossi || []), el.dataset.id]; }); return true;
    case 'dish': if (el.classList.contains('center') || !el.closest('[data-flow]')) sheetPiatto(el.dataset.r, el.dataset.q); else { const b = el.parentElement; b.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - b.clientWidth / 2, behavior: 'smooth' }); } return false;
    case 'recipe': paginaRicetta(el.dataset.r, el.dataset.q); return false;
    case 'close-r': closeOverlay(); return false;
  }
  return null;
}

/* ---------- fogli ---------- */
function calendario(ym) {
  const [y, m] = ym.split('-').map(Number);
  const primo = `${ym}-01`, n = new Date(y, m, 0).getDate(), off = dow(primo);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`, next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  let celle = GG.map(x => `<span class="h">${x}</span>`).join('') + '<span></span>'.repeat(off);
  for (let i = 1; i <= n; i++) { const d = `${ym}-${String(i).padStart(2, '0')}`; celle += `<button class="${d === sel() ? 'sel' : ''} ${d > oggi() ? 'fut' : ''} ${S.giorni[d] ? 'has' : ''}" data-act="cal-d" data-d="${d}"><span class="num">${i}</span><i></i></button>`; }
  openSheet(`<div class="cal-nav"><button class="ib" data-act="cal-m" data-m="${prev}">${ICON.back}</button><b>${MESI[m - 1]} ${y}</b><button class="ib" data-act="cal-m" data-m="${next}">${ICON.next}</button></div><div class="cal">${celle}</div><p class="note" style="text-align:center">Il puntino indica i giorni con qualcosa di registrato.</p>`);
}

function sheetPiatto(id, quale) {
  const r = S.R[id]; if (!r) return;
  const t = macroRicetta(id), disp = dispensa(), ing = statoIngredienti(id, disp);
  const tracciato = ing.some(i => i.stato === 'ok' || i.stato === 'no');
  openSheet(`<div class="dish"><span class="art" style="display:grid;place-items:center;background:${tinta(id)};border-radius:20px">${arte(id)}</span><span class="lab">${r.nuovo ? 'Piatto nuovo del ciclo' : esc(r.capitolo || 'Dal ciclo')}</span><h3>${esc(r.nome)}</h3><p>${esc(r.sottotitolo || '')}</p>
  <div class="spec"><div><span class="lab">kcal</span><b class="num">${fmt(t.kcal)}</b></div><div><span class="lab">proteine</span><b class="num">${fmt(t.prot)} g</b></div><div><span class="lab">tempo</span><b class="num">${r.tempo_min}′</b></div><div><span class="lab">livello</span><b class="num">${r.livello}/5</b></div></div>
  <ul class="ingr">${ing.filter(i => i.stato !== 'base').map(i => `<li><span>${esc(i.nome)}${tracciato && i.stato !== 'nd' ? ` <span class="${i.stato === 'ok' ? 'ok' : 'no'}">· ${i.stato === 'ok' ? 'in casa' : 'manca'}</span>` : ''}</span><span class="num">${quantitaTesto(i)}</span></li>`).join('')}</ul>
  <div class="act"><button class="pill solid" data-act="eat" data-r="${id}" data-q="${quale || 'cena'}">${quale === 'pranzo' ? 'Lo mangio a pranzo' : 'Stasera mangio questo'}</button><button class="link" data-act="recipe" data-r="${id}" data-q="${quale || 'cena'}">Apri la ricetta</button></div></div>`);
}

/* ---------- pagina della ricetta (carta del tè) ---------- */
export function paginaRicetta(id, quale = 'cena') {
  const r = S.R[id]; if (!r) return;
  const t = macroRicetta(id), disp = dispensa(), ing = statoIngredienti(id, disp);
  const tracciato = ing.some(i => i.stato === 'ok' || i.stato === 'no');
  const fuocoTxt = p => p.fuoco ? (/°/.test(p.fuoco) ? p.fuoco : `fuoco ${p.fuoco}`) : '';
  closeSheet();
  openOverlay(`<div class="recipe" role="dialog" aria-label="${esc(r.nome)}"><div class="recipe-in">
   <div class="r-top"><button class="link" data-act="close-r" style="padding-left:0">← Indietro</button><span class="lab">${esc(r.capitolo || '')}</span></div>
   <div class="r-grid"><div class="r-card" style="background:${tinta(id)}"><div class="r-meta"><span class="lab">Ricetta</span><span class="lab num">${r.porzioni || 1} porzione</span></div>
    <h1>${esc(r.nome)}</h1>${r.tecnica ? `<span class="r-tech">Tecnica · <b>${esc(r.tecnica.nome)}</b></span>` : ''}${arte(id, 'art')}
    <div class="r-spec"><div><span class="lab">kcal</span><b class="num">${fmt(t.kcal)}</b></div><div><span class="lab">proteine</span><b class="num">${fmt(t.prot)} g</b></div><div><span class="lab">tempo</span><b class="num">${r.tempo_min}′</b></div><div><span class="lab">carbo</span><b class="num">${fmt(t.carb)} g</b></div><div><span class="lab">grassi</span><b class="num">${fmt(t.grassi)} g</b></div><div><span class="lab">livello</span><b class="num">${r.livello}/5</b></div></div>
    <div class="r-act" style="margin-top:8px"><button class="pill solid" data-act="eat" data-r="${id}" data-q="${quale}">Fatto ${quale === 'pranzo' ? 'a pranzo' : 'a cena'}</button><button class="pill" data-act="al-menu" data-r="${id}" data-q="${quale}">Aggiungi al menù</button></div>
    ${(() => { const h = storico()[id]; if (!h) return ''; const v = Math.round(h.voto || 0); return `<div style="margin-top:6px"><span class="lab">Il tuo voto · cucinato ${h.volte} ${h.volte === 1 ? 'volta' : 'volte'}</span><div class="stars">${[1, 2, 3, 4, 5].map(n => `<button data-act="vota" data-r="${id}" data-n="${n}" class="${n <= v ? 'on' : ''}" aria-label="${n} su 5">★</button>`).join('')}</div></div>`; })()}</div>
   <div class="r-cols">
    <section><div class="bhead"><h2>Ingredienti</h2><span class="lab">per ${r.porzioni || 1}</span></div><ul class="menu-list">${ing.map(i => `<li><span>${esc(i.nome)}${tracciato && i.stato === 'no' ? '<span class="no">manca</span>' : ''}</span><span class="dots"></span><span class="num">${quantitaTesto(i)}</span>${i.stato === 'base' && !grammi(i) ? '' : `<button class="ing-x" data-act="ing-togli" data-r="${id}" data-a="${i.alimento}" data-q="${quale}" aria-label="Togli ${esc(i.nome)}">${ICON.x}</button>`}</li>`).join('')}</ul>
     ${(() => { const via = r.ingredienti.filter(i => tolti(id).has(i.alimento)); return via.length ? `<p class="note">Tolti: ${via.map(i => `${esc(S.A[i.alimento] ? S.A[i.alimento].nome.toLowerCase() : i.alimento)} <button class="link" data-act="ing-rimetti" data-r="${id}" data-a="${i.alimento}" data-q="${quale}" style="padding:0 2px">rimetti</button>`).join(' · ')}</p>` : ''; })()}
     ${r.attrezzatura ? `<p class="note">Attrezzatura: ${esc(r.attrezzatura.join(', '))}.</p>` : ''}${r.preparazione ? `<p class="note">${esc(r.preparazione)}</p>` : ''}</section>
    <section><div class="bhead"><h2>Procedimento</h2><span class="lab num">${r.passaggi.length} passaggi</span></div><ol class="steps-l">${r.passaggi.map(p => `<li><div><p>${esc(p.testo)}</p>${p.segnale ? `<small>${esc(p.segnale)}</small>` : ''}</div><span class="tm num">${p.tempo_min != null ? `${fmt(p.tempo_min)}′` : ''}${fuocoTxt(p) ? `<span>${esc(fuocoTxt(p))}</span>` : ''}</span></li>`).join('')}</ol></section>
    ${r.tecnica ? `<section class="tech"><span class="lab">La tecnica</span><b>${esc(r.tecnica.nome)}</b><p>${esc(r.tecnica.spiegazione)}</p><p class="err">Errore tipico: ${esc(r.tecnica.errore_tipico)}</p></section>` : ''}
   </div></div></div></div>`);
}
