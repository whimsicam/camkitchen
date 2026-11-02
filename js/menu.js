// CAM Kitchen: scheda Menù (il giorno e il ciclo), fogli di scelta e pagina della ricetta.
import { S, giorno, salvaGiorno, salvaPref, oggi, uid, nowISO, saveUI, cfg, syncPronto } from './store.js';
import { fmt, addDays, dow, isWeekend, giornataDel, totaliGiorno, vociGiornata, macroVoci, macroRicetta, pastoDel, giornoCompleto, nonSegnati, cicloDi, statoCiclo, dispensa, statoIngredienti, quantitaTesto, grammi, tolti } from './calc.js';
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

/* ---------- vista ---------- */
export function vistaMenu() {
  const d = sel(), g = giorno(d), t = totaliGiorno(g), T = S.prog.target;
  const lun = addDays(d, -dow(d));
  const settimana = [...Array(7)].map((_, i) => addDays(lun, i));
  const sessioni = (S.gym.sessioni || {})[d] || [];
  const sub = sessioni.length ? `Giorno di palestra · ${sessioni.map(s => SESS[s] || s).join(' + ')}` : (d <= oggi() ? 'Riposo' : '');
  const m = Number(d.slice(5, 7)) - 1;

  return `<div class="two">
  <section class="col">
    ${bannerIeri()}${bannerCoach()}
    <div class="week">
      <div class="week-head"><span class="lab">${MESI[m]} ${d.slice(0, 4)}</span>
        <div class="ctrl"><button class="ib" data-act="week" data-n="-7" aria-label="Settimana precedente">${ICON.back}</button><button class="ib" data-act="week" data-n="7" aria-label="Settimana successiva">${ICON.next}</button><button class="ib" data-act="cal" aria-label="Calendario" style="color:var(--ink)">${ICON.cal}</button></div></div>
      <div class="days">${settimana.map(x => `<button class="day ${x === d ? 'sel' : ''} ${giornoCompleto(S.giorni[x]) ? 'full' : ''} ${x > oggi() ? 'future' : ''}" data-act="day" data-d="${x}"><span class="dn">${GG[dow(x)]}</span><span class="dd num">${Number(x.slice(8))}</span><span class="dot"></span></button>`).join('')}</div>
    </div>
    <div class="dayhead">
      <div><h1 class="ttl">${nomeGiorno(d)}</h1><span class="lab">${sub}${d === oggi() ? (sub ? ' · ' : '') + 'oggi' : ''}</span>
        <div class="meter"><div><span class="lab"><i style="background:var(--peach)"></i>kcal</span><b class="num">${fmt(t.kcal)} <span>/ ${fmt(T.kcal)}</span></b></div>
        <div><span class="lab"><i style="background:var(--sage)"></i>proteine</span><b class="num">${fmt(t.prot)} <span>/ ${T.proteine_min} g</span></b></div></div></div>
      <svg class="rings" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--rule)" stroke-width="2"/>
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--peach)" stroke-width="3" stroke-linecap="round" transform="rotate(-90 50 50)" stroke-dasharray="276.5" stroke-dashoffset="${276.5 * (1 - Math.min(t.kcal / T.kcal, 1))}" style="transition:stroke-dashoffset .45s"/>
        <circle cx="50" cy="50" r="34" fill="none" stroke="var(--rule)" stroke-width="2"/>
        <circle cx="50" cy="50" r="34" fill="none" stroke="var(--sage)" stroke-width="3" stroke-linecap="round" transform="rotate(-90 50 50)" stroke-dasharray="213.6" stroke-dashoffset="${213.6 * (1 - Math.min(t.prot / T.proteine_min, 1))}" style="transition:stroke-dashoffset .45s"/>
      </svg>
    </div>
    <div>
      <div class="bhead"><h2>La giornata</h2><span class="lab">tocca per segnare</span></div>
      ${nonSegnati(g).length ? `<div class="allday"><small>Colazione, spuntino, merenda, shake e frutta in un colpo</small><button class="pill sm" data-act="allday">Come previsto</button></div>` : ''}
      <div class="tl">${timeline(g, sessioni.length > 0)}</div>
      ${altriEventi(g)}
      <div class="adds"><button class="pill sm" data-act="fuori">+ Fuori casa</button><button class="pill sm" data-act="extra">+ Extra</button></div>
    </div>
  </section>
  <section class="col">${sezioneCiclo(d)}</section>
  </div>`;
}

function bannerIeri() {
  if (sel() !== oggi()) return '';
  const ieri = addDays(oggi(), -1);
  if (S.ui.ieriChiuso === ieri || ieri < (S.prog.data_inizio || '0')) return '';
  const g = giorno(ieri), mancano = nonSegnati(g);
  const cena = pastoDel(g, 'cena');
  if (!mancano.length && cena) return '';
  const cosa = [...mancano.map(m => m.nome.toLowerCase()), ...(cena ? [] : ['cena'])].join(', ');
  return `<div class="banner">${mascot('sm')}<span><b>Ieri non hai segnato</b><small>${esc(cosa)}</small></span><span class="acts">${mancano.length ? `<button class="pill sm solid" data-act="ieri-si">Sì, fatti</button>` : ''}<button class="pill sm" data-act="ieri-no">${cena ? 'No' : 'Dopo'}</button></span></div>`;
}
function bannerCoach() {
  const p = S.prog; if (!p.messaggio_coach || S.ui.coachVisto === p.versione) return '';
  return `<div class="banner">${mascot('sm')}<span><b>Camillo dice</b><small>${esc(p.messaggio_coach)}</small></span><button class="ib" data-act="coach-ok" aria-label="Chiudi">${ICON.x}</button></div>`;
}

function timeline(g, palestra) {
  const items = giornataDel(g.data).map(m => ({ k: 'gt', m, ora: m.ora }));
  const out = [];
  let prOk = false, ceOk = false;
  for (const it of items) {
    if (!prOk && it.ora && it.ora >= '13:00') { out.push({ k: 'pranzo' }); prOk = true; }
    if (!ceOk && it.ora && it.ora >= '21:30') { out.push({ k: 'cena' }); ceOk = true; }
    out.push(it);
  }
  if (!prOk) out.push({ k: 'pranzo' }); if (!ceOk) out.push({ k: 'cena' });
  return out.map(it => {
    if (it.k === 'gt') {
      const m = it.m, st = g.giornata[m.id], t = macroVoci(vociGiornata(m, st || 'fatto'));
      const hl = palestra && m.evidenzia_dopo_palestra && !st;
      return `<div class="step ${st ? 'on' : ''} ${hl ? 'hl' : ''}"><button class="node" data-act="tick" data-id="${m.id}" aria-label="Segna ${esc(m.nome)}"></button><button class="what" data-act="voce" data-id="${m.id}"><b>${esc(m.nome)}</b>${hl ? '<span class="gym">dopo la palestra</span>' : ''}<small>${st && st !== 'fatto' ? 'modificata · ' : ''}${esc(m.descrizione || '')}</small></button><span class="k num">${fmt(t.kcal)}</span></div>`;
    }
    return slot(g, it.k);
  }).join('');
}

function slot(g, quale) {
  const e = pastoDel(g, quale);
  const ora = quale === 'pranzo' ? '13:00' : '21:30', nome = quale === 'pranzo' ? 'Pranzo' : 'Cena';
  let box, kcal = 0, on = false;
  if (e && e.tipo === 'pasto') {
    const t = macroRicetta(e.ricetta, e.ingredienti, e.porzione || 1); kcal = t.kcal; on = true;
    box = `<span class="slotbox"><span class="med" style="background:${tinta(e.ricetta)}">${arte(e.ricetta)}</span><span class="nm">${esc(S.R[e.ricetta] ? S.R[e.ricetta].nome : e.ricetta)}<small class="num">${fmt(t.kcal)} kcal · ${fmt(t.prot)} g · cambia</small></span></span>`;
  } else if (e && e.tipo === 'fuori') {
    kcal = e.kcal || 0; on = true;
    box = `<span class="slotbox"><span class="med">${mascot()}</span><span class="nm">${e.casa ? 'A casa' : 'Fuori'} · ${esc(e.nome)}<small class="num">${e.pendente ? 'stima di Claude in arrivo · tocca per inserirla' : `${fmt(e.kcal)} kcal · ${fmt(e.prot || 0)} g stimati · cambia`}</small></span></span>`;
  } else if (quale === 'pranzo' && g.pranzo && g.pranzo.tipo === 'mensa') {
    const p = (S.preset.mensa || []).find(x => x.id === g.pranzo.preset) || { nome: 'altro piatto', kcal: S.prog.pranzo.mensa_forfait.kcal };
    const f = S.preset.porzioni[g.pranzo.porzione || 'normale'] || 1; kcal = p.kcal * f; on = true;
    box = `<span class="slotbox"><span class="med"><img src="disegni/categorie/piatto.svg" alt=""></span><span class="nm">Mensa · ${esc(p.nome)}<small>porzione ${g.pranzo.porzione || 'normale'} · cambia</small></span></span>`;
  } else {
    box = `<span class="slotbox empty"><span>${quale === 'cena' ? 'Scegli dal ciclo' : isWeekend(g.data) ? 'A casa, dal ciclo' : 'Mensa o altro'}</span><span class="pill sm">Scegli</span></span>`;
  }
  return `<div class="step slot ${on ? 'on' : ''}"><button class="node" data-act="slot" data-q="${quale}" aria-label="${nome}"></button><button class="what" data-act="slot" data-q="${quale}"><b>${nome}</b>${box}</button><span class="k num">${kcal ? fmt(kcal) : ''}</span></div>`;
}

function altriEventi(g) {
  const ev = (g.eventi || []).filter(e => e.tipo === 'extra' || (e.tipo === 'fuori' && e.pasto === 'altro'));
  if (!ev.length) return '';
  return `<div style="margin-top:10px">${ev.map(e => {
    if (e.tipo === 'extra') { const a = S.A[e.alimento]; const t = macroVoci([{ alimento: e.alimento, g: e.g, pz: e.pz }]); return `<div class="evrow"><span>Extra · ${esc(a ? a.nome : e.alimento)} <small class="num">${quantitaTesto(e)}</small></span><span class="num muted">${fmt(t.kcal)}</span><button class="del" data-act="del-ev" data-id="${e.id}" aria-label="Elimina">${ICON.x}</button></div>`; }
    return `<div class="evrow"><button style="text-align:left" data-act="fuori-edit" data-id="${e.id}">Fuori · ${esc(e.nome)}${e.pendente ? ' <small>stima in arrivo</small>' : ''}</button><span class="num muted">${e.pendente ? '—' : fmt(e.kcal)}</span><button class="del" data-act="del-ev" data-id="${e.id}" aria-label="Elimina">${ICON.x}</button></div>`;
  }).join('')}</div>`;
}

function sezioneCiclo(d) {
  const c = cicloDi(d);
  if (!c) return `<div class="bhead"><h2>Il ciclo</h2></div><div class="cycle-empty">${mascot()}<span><b>Nessun menù ancora</b><small>Preparalo nella scheda Spesa: scegli quando vai al Conad e Camillo propone i piatti.</small></span></div><button class="hint" data-go="spesa">Vai alla spesa →</button>`;
  const st = statoCiclo(c);
  const cene = st.filter(p => p.pasto === 'cena'), pranzi = st.filter(p => p.pasto === 'pranzo');
  const card = p => `<button class="mcard ${p.fatto ? 'done' : ''}" data-act="dish" data-r="${p.ricetta}" data-q="${p.pasto}">${p.nuovo ? '<span class="new">nuovo</span>' : ''}<b>${esc(breve(p.ricetta))}</b><span class="art">${arte(p.ricetta)}${p.fatto ? `<span class="stamp">${corto(p.fatto)}</span>` : ''}</span><span class="tea-cut"></span><small class="num">${S.R[p.ricetta] ? fmt(macroRicetta(p.ricetta).kcal) + ' kcal · ' + S.R[p.ricetta].tempo_min + '′' : ''}</small></button>`;
  const fine = c.al, giorniAllaFine = Math.round((new Date(fine) - new Date(oggi())) / 864e5);
  return `<div class="cycle">
    <div class="bhead"><h2>Il ciclo</h2><span class="lab">${corto(c.dal)} – ${corto(c.al)}</span></div>
    <div class="strip-h"><b>Cene</b><span class="lab num">${cene.filter(p => p.fatto).length} di ${cene.length}</span></div>
    <div class="strip mini" data-flow>${cene.map(card).join('')}</div>
    <div class="strip-h"><b>Pranzi</b><span class="lab num">${pranzi.length ? `${pranzi.filter(p => p.fatto).length} di ${pranzi.length}` : 'weekend'}</span></div>
    <div class="strip mini" data-flow>${pranzi.map(card).join('')}<div class="mcard ghost"><span class="art"><img src="disegni/categorie/piatto.svg" alt=""></span><b>Mensa</b><small>dalla giornata</small></div></div>
  </div>
  ${giorniAllaFine <= 2 ? `<button class="hint" data-go="spesa">${giorniAllaFine < 0 ? 'Il ciclo è finito' : `Il ciclo finisce ${GIORNI[dow(fine)].toLowerCase()}`} · prepara la spesa →</button>` : ''}`;
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
function modifica(fn, data = sel()) { const g = structuredClone(giorno(data)); fn(g); salvaGiorno(g); }
function aggiungiEvento(e, data = sel()) { modifica(g => { g.eventi.push({ id: uid(), t: nowISO(), ...e }); }, data); }
function togliPasto(g, quale) {
  const via = (g.eventi || []).filter(e => (e.tipo === 'pasto' || e.tipo === 'fuori') && e.pasto === quale).map(e => e.id);
  g.eventi = g.eventi.filter(e => !via.includes(e.id)); g.rimossi = [...(g.rimossi || []), ...via];
  if (quale === 'pranzo') g.pranzo = null;
}
function registraPiatto(ricetta, quale, data = sel()) {
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
    case 'allday': modifica(g => { for (const m of giornataDel(d)) if (!g.giornata[m.id]) g.giornata[m.id] = 'fatto'; }); toast('Giornata tipo segnata'); return true;
    case 'voce': sheetVoce(el.dataset.id); return true;
    case 'voce-salva': salvaVoce(el.dataset.id); return true;
    case 'voce-no': modifica(g => { delete g.giornata[el.dataset.id]; }); closeSheet(); return true;
    case 'stp': { const i = $(el.dataset.t); const step = Number(el.dataset.s); const cur = Number(String(i.value).replace(',', '.')) || 0; const v = Math.max(0, Math.round((cur + step * Number(el.dataset.n)) * 100) / 100); i.value = String(v).replace('.', ','); return false; }
    case 'ieri-si': modifica(g => { for (const m of giornataDel(g.data)) if (!g.giornata[m.id]) g.giornata[m.id] = 'fatto'; }, addDays(oggi(), -1)); toast('Segnate su ieri'); return true;
    case 'ieri-no': S.ui.ieriChiuso = addDays(oggi(), -1); saveUI(); return true;
    case 'coach-ok': S.ui.coachVisto = S.prog.versione; saveUI(); return true;
    case 'slot': sheetSlot(el.dataset.q); return true;
    case 'eat': registraPiatto(el.dataset.r, el.dataset.q || 'cena'); closeSheet(); closeOverlay(); return true;
    case 'mensa': { const p = el.dataset.p; modifica(g => { togliPasto(g, 'pranzo'); g.pranzo = { tipo: 'mensa', preset: p, porzione: S.ui.porz || 'normale' }; }); closeSheet(); toast('Pranzo segnato'); return true; }
    case 'porz': S.ui.porz = el.dataset.v; document.querySelectorAll('[data-act="porz"]').forEach(b => b.classList.toggle('solid', b === el)); return false;
    case 'togli-pasto': modifica(g => togliPasto(g, el.dataset.q)); closeSheet(); return true;
    case 'altro-ric': sheetRicettario(el.dataset.q); return true;
    case 'fuori': sheetFuori(el.dataset.q || (new Date().getHours() < 16 ? 'pranzo' : 'cena')); return true;
    case 'fuori-q': sheetFuori(el.dataset.q); return true;
    case 'fuori-p': { const q = el.dataset.q, p = S.preset.fuori.find(x => x.id === el.dataset.p), f = S.preset.porzioni[S.ui.porz || 'normale'] || 1;
      modifica(g => { if (q !== 'altro') togliPasto(g, q); g.eventi.push({ id: uid(), t: nowISO(), tipo: 'fuori', pasto: q, preset: p.id, nome: p.nome, porzione: S.ui.porz || 'normale', kcal: Math.round(p.kcal * f), prot: Math.round(p.prot * f) }); });
      closeSheet(); toast('Pasto fuori segnato'); return true; }
    case 'fuori-libero': { const q = el.dataset.q, casa = el.dataset.c === '1', n = $('f-nome').value.trim(), k = Math.round(num($('f-kcal').value)), p = Math.round(num($('f-prot').value));
      if (!n || !k) { toast('Scrivi cosa e le kcal'); return false; }
      modifica(g => { if (q !== 'altro') togliPasto(g, q); g.eventi.push({ id: uid(), t: nowISO(), tipo: 'fuori', pasto: q, nome: n, kcal: k, prot: p, ...(casa ? { casa: true } : {}) }); }); closeSheet(); toast('Segnato'); return true; }
    case 'fuori-claude': { const q = el.dataset.q, casa = el.dataset.c === '1', n = $('f-nome').value.trim();
      if (!n) { toast('Scrivi prima cosa hai mangiato'); return false; }
      const id = uid(), d = sel();
      modifica(g => { if (q !== 'altro') togliPasto(g, q); g.eventi.push({ id, t: nowISO(), tipo: 'fuori', pasto: q, nome: n, kcal: null, prot: null, pendente: true, ...(casa ? { casa: true } : {}) }); });
      const c = cfg(), file = `giorni/${d}.json`;
      const msg = [`Ciao Claude, ti scrivo da CAM Kitchen. Stimami kcal e proteine di questo pasto ${casa ? 'cucinato a casa' : 'mangiato fuori'}: ${n}.`, `Giorno ${d}, ${q === 'altro' ? 'fuori pasto' : q}. Se c'è, allego una foto o l'etichetta.`,
        `Poi aggiorna il pasto in CAM Kitchen: repo ${c.owner || 'whimsicam'}/${c.repo || 'camkitchen'}, ramo ${c.branch || 'main'}, file ${file}, evento con id "${id}": imposta kcal (intero), prot (intero) e pendente: false, senza toccare il resto del file.`,
        `Se il file non c'è ancora nel repo (il telefono non ha sincronizzato), crealo tu con questo contenuto, che è il giorno com'è adesso sul telefono, aggiornando l'evento:`,
        JSON.stringify(giorno(d)),
        `Se non riesci a scrivere nel repo, rispondimi solo con kcal e proteine: li inserisco io toccando il pasto.`].join('\n');
      closeSheet(); apriClaude(msg); return true; }
    case 'fuori-etichetta': { const q = el.dataset.q, casa = el.dataset.c === '1', n = $('f-nome').value.trim(), g = num($('fl-g').value), k = num($('fl-k').value), p = num($('fl-p').value);
      if (!n || !g || !k) { toast('Scrivi cosa, i grammi e le kcal per 100 g'); return false; }
      const kcal = Math.round(g * k / 100), prot = Math.round(g * p / 100);
      modifica(x => { if (q !== 'altro') togliPasto(x, q); x.eventi.push({ id: uid(), t: nowISO(), tipo: 'fuori', pasto: q, nome: n, kcal, prot, etichetta: { g, kcal100: k, prot100: p }, ...(casa ? { casa: true } : {}) }); });
      closeSheet(); toast(`Segnato: ${fmt(kcal)} kcal, ${fmt(prot)} g di proteine`); return true; }
    case 'fuori-h': { const x = (S.ui._hist || [])[Number(el.dataset.i)], q = el.dataset.q, casa = el.dataset.c === '1', f = S.preset.porzioni[S.ui.porz || 'normale'] || 1; if (!x) { closeSheet(); return true; }
      modifica(g => { if (q !== 'altro') togliPasto(g, q); g.eventi.push({ id: uid(), t: nowISO(), tipo: 'fuori', pasto: q, nome: x.nome, porzione: S.ui.porz || 'normale', kcal: Math.round(x.kcal * f), prot: Math.round(x.prot * f), ...(casa ? { casa: true } : {}) }); }); closeSheet(); toast('Segnato'); return true; }
    case 'fuori-fill': { const k = Math.round(num($('fe-kcal').value)), p = Math.round(num($('fe-prot').value)); if (!k) { toast('Inserisci le kcal'); return false; }
      modifica(g => { const e = g.eventi.find(x => x.id === el.dataset.id); if (e) { e.kcal = k; e.prot = p; e.pendente = false; } }); closeSheet(); toast('Stima salvata'); return true; }
    case 'fuori-edit': { const e = giorno(sel()).eventi.find(x => x.id === el.dataset.id); if (e) openSheet(`<div class="picker"><span class="lab">${nomeGiorno(sel())}</span><h3 style="font-size:24px">${esc(e.nome)}</h3>${campiStima(e)}</div>`); return false; }
    case 'libero': sheetFuori(el.dataset.q, true); return false;
    case 'ing-togli': case 'ing-rimetti': { const r = el.dataset.r, a = el.dataset.a; S.pref.togli = S.pref.togli || {}; const cur = new Set(S.pref.togli[r] || []);
      if (act === 'ing-togli') cur.add(a); else { cur.delete(a); S.pref.nonMiPiace = (S.pref.nonMiPiace || []).filter(x => x !== a); }
      S.pref.togli[r] = [...cur]; salvaPref(); paginaRicetta(r, el.dataset.q || 'cena'); toast(act === 'ing-togli' ? 'Tolto da questa ricetta' : 'Rimesso'); return false; }
    case 'extra': sheetExtra(); return true;
    case 'extra-salva': { const a = $('x-al').value, q = Number(String($('x-q').value).replace(',', '.')); if (!a || !q) { toast('Scegli alimento e quantità'); return false; }
      const al = S.A[a]; aggiungiEvento({ tipo: 'extra', alimento: a, ...(al.unita === 'pz' && al.confezione && al.confezione.g_pz ? { pz: q } : { g: q }) }); closeSheet(); toast('Extra segnato'); return true; }
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

function sheetVoce(id) {
  const m = giornataDel(sel()).find(x => x.id === id), st = giorno(sel()).giornata[id];
  const voci = vociGiornata(m, st || 'fatto');
  openSheet(`<div class="form"><span class="lab">${nomeGiorno(sel())}</span><h3 style="font-size:24px">${esc(m.nome)}</h3>
  ${voci.map((v, i) => { const a = S.A[v.alimento], isPz = v.pz != null, val = isPz ? v.pz : v.g, step = isPz ? 1 : (grammi(v) >= 100 ? 10 : 5);
    return `<div class="field"><span class="lab">${esc(a ? a.nome : v.alimento)} · ${isPz ? 'pezzi' : (a && a.unita === 'ml' ? 'ml' : 'grammi')}</span><div class="stepper"><button data-act="stp" data-t="v-${i}" data-s="${step}" data-n="-1">−</button><b><input id="v-${i}" data-al="${v.alimento}" data-pz="${isPz ? 1 : 0}" value="${String(val).replace('.', ',')}" inputmode="decimal" style="width:80px;border:0;background:transparent;text-align:center;font:inherit;font-weight:600;font-size:20px"></b><button data-act="stp" data-t="v-${i}" data-s="${step}" data-n="1">+</button></div></div>`; }).join('')}
  <div class="act"><button class="pill solid" data-act="voce-salva" data-id="${id}">Fatto con queste quantità</button>${st ? `<button class="link" data-act="voce-no" data-id="${id}">Non fatto</button>` : ''}</div></div>`);
}
function salvaVoce(id) {
  const m = giornataDel(sel()).find(x => x.id === id);
  const voci = [...document.querySelectorAll('[data-al]')].map(i => { const n = Number(String(i.value).replace(',', '.')) || 0; return i.dataset.pz === '1' ? { alimento: i.dataset.al, pz: n } : { alimento: i.dataset.al, g: n }; }).filter(v => (v.g || v.pz));
  const uguale = JSON.stringify(voci) === JSON.stringify(m.voci.map(v => ({ alimento: v.alimento, ...(v.pz != null ? { pz: v.pz } : { g: v.g }) })));
  modifica(g => { g.giornata[id] = uguale ? 'fatto' : { voci }; });
  closeSheet(); toast(uguale ? 'Segnato' : 'Segnato con le tue quantità');
}

function rigaPiatto(id, quale, extra = '') {
  const t = macroRicetta(id);
  return `<button class="row" data-act="eat" data-r="${id}" data-q="${quale}"><span class="med" style="width:46px;height:46px;background:${tinta(id)}">${arte(id)}</span><span><b>${esc(S.R[id].nome)}</b><small class="num">${fmt(t.kcal)} kcal · ${fmt(t.prot)} g · ${S.R[id].tempo_min}′${extra}</small></span><span class="pill sm">Questo</span></button>`;
}
function sheetSlot(quale) {
  const d = sel(), g = giorno(d), e = pastoDel(g, quale), c = cicloDi(d);
  const daFare = c ? [...new Set(statoCiclo(c).filter(p => !p.fatto && (p.pasto === quale || quale === 'cena' && p.pasto === 'cena')).map(p => p.ricetta))] : [];
  const giaFatto = e || (quale === 'pranzo' && g.pranzo);
  const titolo = quale === 'cena' ? 'Cosa mangi stasera?' : 'Cosa hai mangiato a pranzo?';
  let corpo = '';
  if (quale === 'pranzo' && !isWeekend(d)) {
    corpo += `<span class="lab">In mensa</span><div class="toggles">${['piccola', 'normale', 'abbondante'].map(p => `<button class="pill sm ${(S.ui.porz || 'normale') === p ? 'solid' : ''}" data-act="porz" data-v="${p}">${p}</button>`).join('')}</div>
    ${(S.preset.mensa || []).map(m => `<button class="row" data-act="mensa" data-p="${m.id}"><span class="med" style="width:46px;height:46px"><img src="disegni/categorie/piatto.svg" alt=""></span><span><b>${esc(m.nome)}</b><small class="num">${fmt(m.kcal)} kcal · ${m.prot} g (porzione normale)</small></span><span class="pill sm">Questo</span></button>`).join('')}
    <button class="row" data-act="mensa" data-p="forfait"><span class="med" style="width:46px;height:46px"><img src="disegni/categorie/piatto.svg" alt=""></span><span><b>Altro piatto della mensa</b><small class="num">stima di ${fmt(S.prog.pranzo.mensa_forfait.kcal)} kcal</small></span><span class="pill sm">Questo</span></button>`;
  }
  if (daFare.length) corpo += `<span class="lab" style="margin-top:6px">Dal ciclo</span>${daFare.map(id => rigaPiatto(id, quale)).join('')}`;
  corpo += `<div class="act" style="margin-top:4px"><button class="pill sm" data-act="altro-ric" data-q="${quale}">Dal ricettario</button><button class="pill sm" data-act="libero" data-q="${quale}">Piatto fuori ricettario</button><button class="pill sm" data-act="fuori-q" data-q="${quale}">Fuori casa</button>${giaFatto ? `<button class="link" data-act="togli-pasto" data-q="${quale}">Togli</button>` : ''}</div>`;
  if (e && e.tipo === 'fuori') corpo = campiStima(e) + corpo;
  openSheet(`<div class="picker"><span class="lab">${nomeGiorno(d)}</span><h3 style="font-size:24px">${titolo}</h3>${corpo}</div>`);
}
function sheetRicettario(quale) {
  const ids = Object.keys(S.R).filter(id => (S.R[id].pasto || []).includes(quale) || quale === 'cena');
  openSheet(`<div class="picker"><span class="lab">Dal ricettario</span><h3 style="font-size:24px">${quale === 'cena' ? 'Cena' : 'Pranzo'}</h3>${ids.map(id => rigaPiatto(id, quale)).join('')}</div>`);
}
function storicoFuori(casa) {
  const m = new Map();
  for (const d of Object.keys(S.giorni).sort()) for (const e of S.giorni[d].eventi || []) {
    if (e.tipo !== 'fuori' || e.pendente || !e.kcal || !!e.casa !== !!casa) continue;
    const k = e.nome.toLowerCase().trim(), x = m.get(k) || { nome: e.nome, kcal: e.kcal, prot: e.prot || 0, volte: 0 };
    x.volte++; x.kcal = e.kcal; x.prot = e.prot || 0; m.set(k, x);
  }
  return [...m.values()].sort((a, b) => b.volte - a.volte).slice(0, 12);
}
function campiStima(e) {
  return `<div class="form" style="border:1px solid var(--blue-l);border-radius:var(--r-s);padding:12px 14px;margin-bottom:6px"><span class="lab">${e.pendente ? 'In attesa della stima di Claude' : 'Correggi la stima'} · ${esc(e.nome)}</span>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="field"><input id="fe-kcal" inputmode="decimal" placeholder="kcal" value="${e.kcal || ''}"></div><div class="field"><input id="fe-prot" inputmode="decimal" placeholder="proteine g" value="${e.prot || ''}"></div></div>
  <div class="act" style="justify-content:flex-start;margin:0"><button class="pill sm solid" data-act="fuori-fill" data-id="${e.id}">Salva i valori</button><button class="link" data-act="del-ev" data-id="${e.id}">Elimina</button></div></div>`;
}
function sheetFuori(quale, casa = false) {
  const pz = S.ui.porz || 'normale', h = storicoFuori(casa);
  S.ui._hist = h;
  openSheet(`<div class="picker"><span class="lab">${nomeGiorno(sel())}${casa ? ' · cucinato a casa' : ' · fuori casa'}</span><h3 style="font-size:24px">${casa ? 'Un piatto fuori ricettario' : 'Cosa hai mangiato fuori?'}</h3>
  ${casa ? '' : `<div class="chiprow">${[['pranzo', 'Pranzo'], ['cena', 'Cena'], ['altro', 'Altro / bere']].map(([k, l]) => `<button class="${k === quale ? 'on' : ''}" data-act="fuori-q" data-q="${k}">${l}</button>`).join('')}</div>`}
  <div class="form" style="gap:10px">
   <div class="field"><span class="lab">Cosa ${casa ? 'hai cucinato' : 'hai mangiato'}</span><textarea id="f-nome" rows="2" placeholder="${casa ? 'es. pollo al curry con riso, la ricetta di Claude' : 'es. pizza margherita e una birra, ristorante sushi all you can eat'}" style="font:inherit;font-size:16px;padding:11px 12px;border:1px solid var(--rule);border-radius:12px;background:var(--leaf);color:var(--ink);resize:none"></textarea></div>
   <button class="pill solid" data-act="fuori-claude" data-q="${quale}" data-c="${casa ? 1 : 0}">Chiedi la stima a Claude</button>
   <p class="note" style="margin:0">Salvo il pasto come "in attesa", copio la richiesta e apro il progetto: incolla e allega la foto. Se hai la confezione, usa "Ho l'etichetta": fa il conto il sito, senza Claude.</p>
   <details><summary class="link" style="padding:0;cursor:pointer">Ho l'etichetta: calcolo io</summary><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px"><div class="field"><span class="lab">grammi</span><input id="fl-g" inputmode="decimal" placeholder="337"></div><div class="field"><span class="lab">kcal/100 g</span><input id="fl-k" inputmode="decimal" placeholder="209"></div><div class="field"><span class="lab">prot/100 g</span><input id="fl-p" inputmode="decimal" placeholder="8,7"></div></div><button class="pill sm" data-act="fuori-etichetta" data-q="${quale}" data-c="${casa ? 1 : 0}" style="margin-top:10px">Calcola e segna</button></details>
   <details><summary class="link" style="padding:0;cursor:pointer">So già le kcal</summary><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px"><div class="field"><input id="f-kcal" inputmode="decimal" placeholder="kcal"></div><div class="field"><input id="f-prot" inputmode="decimal" placeholder="proteine g"></div></div><button class="pill sm" data-act="fuori-libero" data-q="${quale}" data-c="${casa ? 1 : 0}" style="margin-top:10px">Segna con questi valori</button></details>
  </div>
  ${h.length ? `<span class="lab" style="margin-top:10px">Già mangiati</span><div class="toggles">${['piccola', 'normale', 'abbondante'].map(p => `<button class="pill sm ${pz === p ? 'solid' : ''}" data-act="porz" data-v="${p}">${p}</button>`).join('')}</div>${h.map((x, i) => `<button class="row" data-act="fuori-h" data-i="${i}" data-q="${quale}" data-c="${casa ? 1 : 0}"><span class="med" style="width:46px;height:46px">${mascot()}</span><span><b>${esc(x.nome)}</b><small class="num">${fmt(x.kcal)} kcal · ${fmt(x.prot)} g · ${x.volte} ${x.volte === 1 ? 'volta' : 'volte'}</small></span><span class="pill sm">Ancora</span></button>`).join('')}` : ''}
  ${casa ? '' : `<details style="margin-top:8px"><summary class="lab" style="cursor:pointer">Stime comuni, indicative</summary>${S.preset.fuori.map(p => `<button class="row" data-act="fuori-p" data-p="${p.id}" data-q="${quale}"><span class="med" style="width:40px;height:40px">${mascot()}</span><span><b>${esc(p.nome)}</b><small class="num">${fmt(p.kcal)} kcal · ${p.prot} g, porzione normale</small></span><span class="pill sm">Questo</span></button>`).join('')}</details>`}
  </div>`);
}
function sheetExtra() {
  const al = Object.values(S.A).filter(a => a.traccia_dispensa !== false && a.per100 && a.per100.kcal > 0).sort((a, b) => a.nome.localeCompare(b.nome));
  openSheet(`<div class="form"><span class="lab">${nomeGiorno(sel())}</span><h3 style="font-size:24px">Un extra</h3>
  <div class="field"><span class="lab">Alimento</span><select id="x-al"><option value="">Scegli…</option>${al.map(a => `<option value="${a.id}">${esc(a.nome)}${a.unita === 'pz' ? ' (pezzi)' : ''}</option>`).join('')}</select></div>
  <div class="field"><span class="lab">Quantità (grammi, o pezzi per gli alimenti a pezzi)</span><input id="x-q" inputmode="decimal" placeholder="es. 120"></div>
  <button class="pill solid" data-act="extra-salva">Segna</button></div>`);
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
