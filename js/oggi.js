// CAM Kitchen: scheda Oggi (la giornata in un'unica lista, varianti con un tocco, "cosa hai mangiato?").
import { S, giorno, salvaPref, oggi, uid, nowISO, cfg, syncPronto } from './store.js';
import { fmt, addDays, dow, giornataDel, totaliGiorno, vociGiornata, macroVoci, macroRicetta, cicloDi, statoCiclo, quantitaTesto, misuraTesto } from './calc.js';
import { $, esc, toast, mascot, openSheet, closeSheet, breve, ICON } from './ui.js';
import { sel, bannerIeri, bannerCoach, modifica } from './menu.js';
import { apriClaude } from './ricettario.js';

const GG = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const SESS = { armor: 'Armor', roots: 'Roots', guns: 'Guns', wings: 'Wings', breathe: 'Breathe' };
const NOMI = { pranzo: 'Pranzo', cena: 'Cena', altro: 'Extra' };
const FATT = { poco: 0.7, normale: 1, tanto: 1.4 };
const num = v => Number(String(v == null ? '' : v).replace(',', '.')) || 0;
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const dataCorta = d => `${GG[dow(d)]} ${Number(d.slice(8))} ${MM[Number(d.slice(5, 7)) - 1]}`;
const aPezzi = a => !!(a && a.unita === 'pz' && a.confezione && a.confezione.g_pz);

/* ---------- cosa c'è in un pasto ---------- */
function nelPiatto(g, q) {
  const out = [];
  for (const e of g.eventi || []) {
    const qui = q === 'altro' ? ((e.tipo === 'extra' && !e.pasto) || (e.tipo === 'fuori' && e.pasto === 'altro')) : e.pasto === q;
    if (!qui) continue;
    if (e.tipo === 'pasto') { const t = macroRicetta(e.ricetta, e.ingredienti, e.porzione || 1); out.push({ id: e.id, k: 'ricetta', nome: S.R[e.ricetta] ? S.R[e.ricetta].nome : e.ricetta, corto: breve(e.ricetta), kcal: t.kcal, prot: t.prot }); }
    else if (e.tipo === 'fuori') out.push({ id: e.id, k: 'stima', nome: e.nome, corto: e.nome, kcal: e.kcal || 0, prot: e.prot || 0, pendente: !!e.pendente });
    else if (e.tipo === 'extra') { const a = S.A[e.alimento], t = macroVoci([e]); out.push({ id: e.id, k: 'cibo', e, nome: a ? a.nome : e.alimento, corto: a ? a.nome : e.alimento, kcal: t.kcal, prot: t.prot }); }
  }
  if (q === 'pranzo' && g.pranzo && g.pranzo.tipo === 'mensa') {
    const p = (S.preset.mensa || []).find(x => x.id === g.pranzo.preset) || { nome: 'piatto della mensa', ...S.prog.pranzo.mensa_forfait };
    const f = S.preset.porzioni[g.pranzo.porzione || 'normale'] || 1;
    out.push({ id: 'mensa', k: 'mensa', nome: `Mensa · ${p.nome}`, corto: `mensa: ${p.nome.toLowerCase()}`, kcal: p.kcal * f, prot: p.prot * f });
  }
  return out;
}
const somma = xs => xs.reduce((t, x) => ({ kcal: t.kcal + x.kcal, prot: t.prot + x.prot }), { kcal: 0, prot: 0 });
const elenco = xs => xs.map(x => x.corto.toLowerCase().split(' (')[0]).join(', ');

/* ---------- vista ---------- */
export function vistaOggi() {
  const d = sel(), g = giorno(d), t = totaliGiorno(g), T = S.prog.target;
  const sessioni = (S.gym.sessioni || {})[d] || [];
  const st = S.sync.stato, punto = !syncPronto() ? '' : S.coda.length ? 'wait' : st === 'err' ? 'err' : 'ok';
  const [gs, resto] = [GG[dow(d)], `${Number(d.slice(8))} ${MM[Number(d.slice(5, 7)) - 1]}`];
  const pk = Math.min(t.kcal / T.kcal, 1), pp = Math.min(t.prot / T.proteine_min, 1);
  const manca = T.kcal - t.kcal;
  const nota = t.kcal >= T.kcal_min && t.kcal <= T.kcal_max ? 'Sei dentro il target di oggi.' : t.kcal > T.kcal_max ? `Sei sopra il target di ${fmt(t.kcal - T.kcal)} kcal.` : `Mancano ${fmt(manca)} kcal${daFare(g) ? `: ${daFare(g)}` : ''}.`;
  return `<section class="oggi">
  ${bannerIeri()}${bannerCoach()}
  <div class="og-head">
    <button class="og-date" data-act="cal" aria-label="Scegli un altro giorno"><h1>${gs}<br>${resto}</h1></button>
    <button class="og-cat" data-act="settings" aria-label="Impostazioni">${mascot()}${punto ? `<span class="syncdot ${punto}"></span>` : ''}</button>
  </div>
  <div class="og-days"><button data-act="week" data-n="-1">‹ ${dataCorta(addDays(d, -1)).slice(0, -4)}</button>${d !== oggi() ? `<button data-act="day" data-d="${oggi()}"><b>torna a oggi</b></button>` : '<span>oggi</span>'}<button data-act="week" data-n="1">${dataCorta(addDays(d, 1)).slice(0, -4)} ›</button></div>
  <div class="og-rule"></div>
  <div class="og-sum">
    <div class="og-cap">
      <span><i class="k"></i>${fmt(t.kcal)} / ${fmt(T.kcal)} kcal</span>
      <span><i class="p"></i>${fmt(t.prot)} / ${T.proteine_min} g prot</span>
      <span class="m"><i></i>${sessioni.length ? `palestra · ${sessioni.map(s => SESS[s] || s).join(' + ')}` : 'giorno di riposo'}</span>
    </div>
    <svg class="og-rings" viewBox="0 0 100 100" role="img" aria-label="Completamento: kcal ${Math.round(pk * 100)}%, proteine ${Math.round(pp * 100)}%">
      <circle cx="50" cy="50" r="42" class="tr"/><circle cx="50" cy="50" r="42" class="rk" stroke-dasharray="${(263.9 * pk).toFixed(1)} 263.9" transform="rotate(-90 50 50)"/>
      <circle cx="50" cy="50" r="30" class="tr"/><circle cx="50" cy="50" r="30" class="rp" stroke-dasharray="${(188.5 * pp).toFixed(1)} 188.5" transform="rotate(-90 50 50)"/>
    </svg>
  </div>
  <p class="og-note">${nota}</p>
  <div>
    <div class="og-h"><h2>La giornata</h2><span>cerchio: fatto · nome: cambia</span></div>
    ${righe(g)}
  </div>
  <button class="og-add" data-act="o-pasto" data-q="altro">+ aggiungi qualcosa</button>
  </section>`;
}
function daFare(g) {
  const v = giornataDel(g.data).filter(m => !g.giornata[m.id]).map(m => m.nome.toLowerCase());
  for (const q of ['pranzo', 'cena']) if (!nelPiatto(g, q).length) v.push(q);
  return v.length ? `restano ${v.join(', ')}` : '';
}
function descrVoce(m, st) {
  if (!st || st === 'fatto') return m.descrizione || '';
  if (st.variante) { const v = variantiDi(m).find(x => x.id === st.variante); if (v) return v.nome; }
  return (st.voci || []).map(v => (S.A[v.alimento] ? S.A[v.alimento].nome : v.alimento).toLowerCase()).join(', ') || 'niente';
}
function righe(g) {
  const out = []; let pr = false, ce = false;
  for (const m of giornataDel(g.data)) {
    if (!pr && m.ora && m.ora >= '13:00') { out.push(rigaPasto(g, 'pranzo')); pr = true; }
    if (!ce && m.ora && m.ora >= '21:30') { out.push(rigaPasto(g, 'cena')); ce = true; }
    const st = g.giornata[m.id], t = macroVoci(vociGiornata(m, st || 'fatto'));
    out.push(`<div class="orow ${st ? 'on' : ''}"><button class="oc" data-act="tick" data-id="${m.id}" aria-label="${st ? 'Togli' : 'Segna'} ${esc(m.nome)}"></button><button class="ow" data-act="o-voce" data-id="${m.id}"><b>${esc(m.nome)}</b><small>${esc(descrVoce(m, st))}</small></button><span class="ok num">${fmt(t.kcal)}</span></div>`);
  }
  if (!pr) out.push(rigaPasto(g, 'pranzo')); if (!ce) out.push(rigaPasto(g, 'cena'));
  for (const x of nelPiatto(g, 'altro')) out.push(`<div class="orow on"><span class="oc"></span><button class="ow" data-act="o-pasto" data-q="altro"><b>${esc(x.nome)}</b><small>${x.k === 'cibo' ? esc(quantitaTesto(x.e)) : x.pendente ? 'stima in arrivo' : 'extra'}</small></button><span class="ok num">${x.pendente ? '—' : fmt(x.kcal)}</span></div>`);
  return out.join('');
}
function rigaPasto(g, q) {
  const xs = nelPiatto(g, q), t = somma(xs);
  const sub = xs.length ? elenco(xs) : q === 'cena' ? 'cosa mangi stasera?' : 'cosa hai mangiato?';
  return `<div class="orow ${xs.length ? 'on' : 'vuoto'}"><button class="oc" data-act="o-pasto" data-q="${q}" aria-label="${NOMI[q]}"></button><button class="ow" data-act="o-pasto" data-q="${q}"><b>${NOMI[q]}</b><small>${esc(sub)}</small></button>${xs.length ? `<span class="ok num">${xs.some(x => x.pendente) ? '…' : fmt(t.kcal)}</span>` : `<button class="pill sm" data-act="o-pasto" data-q="${q}">scegli</button>`}</div>`;
}

/* ---------- ricerca nel catalogo e nel ricettario ---------- */
function cerca(testo, conRicette) {
  const n = norm(testo).trim(); if (n.length < 2) return [];
  const tk = n.split(/\s+/), out = [];
  if (conRicette) for (const r of Object.values(S.R)) { const h = norm(`${r.nome} ${r.breve || ''}`); if (tk.every(t => h.includes(t))) out.push({ k: 'r', id: r.id, nome: r.nome, p: 1 }); }
  for (const a of Object.values(S.A)) {
    if (!a.per100 || a.traccia_dispensa === false) continue;
    const nomi = [a.nome, ...(a.alias || [])].map(norm);
    if (!tk.every(t => nomi.some(x => x.includes(t)))) continue;
    out.push({ k: 'a', id: a.id, nome: a.nome, p: nomi.includes(n) ? 0 : nomi.some(x => x.startsWith(n)) ? 1 : 2 });
  }
  return out.sort((x, y) => x.p - y.p || x.nome.length - y.nome.length).slice(0, 12);
}
function rigaRisultato(x, act) {
  if (x.k === 'r') { const t = macroRicetta(x.id); return `<button class="ores" data-act="${act}" data-r="${x.id}"><span><b>${esc(x.nome)}</b><small>ricetta · ${fmt(t.kcal)} kcal</small></span><span class="pill sm">+</span></button>`; }
  const a = S.A[x.id];
  return `<button class="ores" data-act="${act}" data-a="${x.id}"><span><b>${esc(a.nome)}</b><small class="num">${fmt(a.per100.kcal)} kcal per 100 ${a.unita === 'ml' ? 'ml' : 'g'}</small></span><span class="pill sm">+</span></button>`;
}

/* ---------- foglio: cosa hai mangiato? ---------- */
let P = null; // { q, rec }
function recenti(q) {
  if (q === 'altro') return [];
  const m = new Map(), d0 = sel();
  for (const d of Object.keys(S.giorni).sort()) for (const p of ['pranzo', 'cena']) {
    if (d === d0 && p === q) continue;
    const ev = (S.giorni[d].eventi || []).filter(e => e.pasto === p && (e.tipo === 'pasto' || e.tipo === 'extra' || (e.tipo === 'fuori' && !e.pendente && e.kcal)));
    if (!ev.length) continue;
    const nomi = ev.map(e => (e.tipo === 'pasto' ? breve(e.ricetta) : e.tipo === 'fuori' ? e.nome : (S.A[e.alimento] ? S.A[e.alimento].nome : e.alimento)).toLowerCase().split(' (')[0]);
    const key = [...nomi].sort().join('|'), x = m.get(key) || { volte: 0 };
    m.set(key, { nomi, ev, volte: x.volte + 1, ultimo: d });
  }
  return [...m.values()].sort((a, b) => b.volte - a.volte || b.ultimo.localeCompare(a.ultimo)).slice(0, 6);
}
function sheetPasto(q) {
  P = { q, rec: recenti(q) };
  openSheet(`<div class="opasto"><span class="lab">${dataCorta(sel())} · ${NOMI[q]}</span><h3>cosa hai mangiato?</h3>
  <div class="search"><svg class="ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg><input id="oq" placeholder="cerca: pollo, riso, pizza…" autocomplete="off" autocapitalize="off" enterkeyhint="search" aria-label="Cerca un alimento o un piatto"></div>
  <div id="o-res"></div>
  <div id="o-piatto"></div>
  <details class="oconf"><summary>Ho i numeri della confezione</summary>
    <div class="field"><label class="lab" for="c-nome">cosa</label><input id="c-nome" placeholder="es. insalata di pollo della mensa" autocomplete="off"></div>
    <div class="ogrid"><div class="field"><label class="lab" for="c-k">kcal per 100 g</label><input id="c-k" inputmode="decimal" placeholder="148"></div><div class="field"><label class="lab" for="c-g">grammi</label><input id="c-g" inputmode="decimal" placeholder="350"></div><div class="field"><label class="lab" for="c-p">proteine per 100 g</label><input id="c-p" inputmode="decimal" placeholder="9,5"></div></div>
    <div class="oconf-f"><b class="num" id="c-tot">= 0 kcal</b><button class="pill sm solid" data-act="o-conf">aggiungi</button></div>
  </details>
  <button class="link" data-act="o-claude" style="text-align:left;padding-left:0">non lo so: chiedi una stima a Claude</button>
  <div class="ofoot"><div class="otot"><span>${NOMI[q].toLowerCase()}</span><span class="num" id="o-tot"></span></div><button class="pill solid" data-act="o-fine">fatto</button></div></div>`);
  rinfresca();
}
function rinfresca() {
  if (!P || !$('o-res')) return;
  const q = P.q, g = giorno(sel()), xs = nelPiatto(g, q), t = somma(xs), testo = $('oq').value;
  let res = '';
  if (testo.trim().length >= 2) {
    const r = cerca(testo, q !== 'altro');
    res = r.length ? r.map(x => rigaRisultato(x, 'o-add')).join('') : `<p class="note">Non trovo "${esc(testo.trim())}". Usa i numeri della confezione, oppure chiedi una stima a Claude: uso quello che hai scritto qui.</p>`;
  } else {
    const c = cicloDi(sel());
    const menu = c && q !== 'altro' && sel() <= c.al ? [...new Set(statoCiclo(c).filter(p => !p.fatto).map(p => p.ricetta))].filter(id => S.R[id]) : [];
    if (P.rec.length) res += `<span class="lab">Di recente</span><div class="chiprow">${P.rec.map((x, i) => `<button data-act="o-rec" data-i="${i}">${esc(x.nomi.join(', '))}</button>`).join('')}</div>`;
    if (menu.length) res += `<span class="lab">Dal tuo menù</span><div class="chiprow">${menu.map(id => `<button data-act="o-add" data-r="${id}">${esc(breve(id).toLowerCase())}</button>`).join('')}</div>`;
  }
  $('o-res').innerHTML = res;
  $('o-piatto').innerHTML = xs.length ? `<div class="og-h"><h2>Nel piatto</h2></div>${xs.map(rigaPiatto).join('')}` : '';
  $('o-tot').textContent = `${fmt(t.kcal)} kcal · ${fmt(t.prot)} g prot`;
}
function rigaPiatto(x) {
  let mezzo = '';
  if (x.k === 'cibo') {
    const a = S.A[x.e.alimento];
    if (x.e.pz != null) mezzo = `<span class="ost"><button data-act="o-pz" data-id="${x.id}" data-n="-1" aria-label="Meno">−</button><b class="num">${fmt(x.e.pz, x.e.pz % 1 ? 1 : 0)}</b><button data-act="o-pz" data-id="${x.id}" data-n="1" aria-label="Più">+</button></span>`;
    else if (a && x.e.porz) mezzo = `<span class="oseg">${Object.keys(FATT).map(p => `<button class="${x.e.porz === p ? 'on' : ''}" data-act="o-porz" data-id="${x.id}" data-v="${p}">${p}</button>`).join('')}</span>`;
    else mezzo = `<small class="num">${esc(quantitaTesto(x.e))}</small>`;
  } else if (x.pendente) mezzo = `<button class="pill sm" data-act="o-stima" data-id="${x.id}">inserisci</button>`;
  else mezzo = '<span></span>';
  return `<div class="opr"><b>${esc(x.nome)}${x.pendente ? '<small>stima di Claude in arrivo</small>' : ''}</b>${mezzo}<span class="ok num">${x.pendente ? '—' : fmt(x.kcal)}</span><button class="del" data-act="o-del" data-id="${x.id}" aria-label="Togli ${esc(x.nome)}">${ICON.x}</button></div>`;
}
const conPasto = (e, q) => (q === 'altro' ? (e.tipo === 'extra' ? e : { ...e, pasto: 'altro' }) : { ...e, pasto: q });
function aggiungi(e) { const q = P.q; modifica(g => { g.eventi.push({ id: uid(), t: nowISO(), ...conPasto(e, q) }); }); }
function nuovoCibo(id) {
  const a = S.A[id];
  return aPezzi(a) ? { tipo: 'extra', alimento: id, pz: 1 } : { tipo: 'extra', alimento: id, g: a.porzione_g || 100, porz: 'normale' };
}
function messaggioClaude(nome, id, q) {
  const c = cfg(), d = sel(), file = `giorni/${d}.json`;
  return [`Ciao Claude, ti scrivo da CAM Kitchen. Stimami kcal e proteine di questo pasto: ${nome}.`, `Giorno ${d}, ${q === 'altro' ? 'fuori pasto' : q}. Se c'è, allego una foto o l'etichetta.`,
    `Poi aggiorna il pasto in CAM Kitchen: repo ${c.owner || 'whimsicam'}/${c.repo || 'camkitchen'}, ramo ${c.branch || 'main'}, file ${file}, evento con id "${id}": imposta kcal (intero), prot (intero) e pendente: false, senza toccare il resto del file.`,
    `Se il file non c'è ancora nel repo (il telefono non ha sincronizzato), crealo tu con questo contenuto, che è il giorno com'è adesso sul telefono, aggiornando l'evento:`,
    JSON.stringify(giorno(d)),
    `Se non riesci a scrivere nel repo, rispondimi con una riga sola nel formato "kcal: 000 · proteine: 00": li inserisco io toccando il pasto.`].join('\n');
}

/* ---------- foglio: una voce della giornata, con varianti ---------- */
let V = null; // { id, righe: [{ alimento, on, pz | n,u | g }], variante, nome }
const variantiDi = m => [...(m.varianti || []), ...(((S.pref.varianti || {})[m.id]) || [])];
const chiave = v => `${v.alimento}`;
const qta = v => (v.pz != null ? { pz: v.pz } : v.n != null ? { n: v.n, u: v.u } : { g: v.g });
function righeDa(m, voci) {
  const base = m.voci.map(v => ({ alimento: v.alimento, on: false, ...qta(v) }));
  for (const v of voci) { const r = base.find(x => chiave(x) === chiave(v)); if (r) Object.assign(r, qta(v), { on: true }); else base.push({ alimento: v.alimento, on: true, ...qta(v) }); }
  return base;
}
function sheetVoce(id) {
  const m = giornataDel(sel()).find(x => x.id === id); if (!m) return;
  const st = giorno(sel()).giornata[id];
  V = { id, righe: righeDa(m, vociGiornata(m, st || 'fatto')), variante: st && st !== 'fatto' ? (st.variante || '*') : '' };
  openSheet(`<div class="ovoce"><span class="lab">${dataCorta(sel())}</span><h3>${esc(m.nome.toLowerCase())}</h3><div id="v-body"></div></div>`);
  disegnaVoce();
}
function disegnaVoce() {
  const m = giornataDel(sel()).find(x => x.id === V.id), vs = variantiDi(m), st = giorno(sel()).giornata[V.id];
  const on = V.righe.filter(r => r.on), t = macroVoci(on);
  const riga = (r, i) => {
    const a = S.A[r.alimento], unita = r.pz != null ? (a && a.pezzo) || 'pezzi' : r.n != null ? r.u : (a && a.unita === 'ml' ? 'ml' : 'grammi');
    const val = r.pz != null ? fmt(r.pz, r.pz % 1 ? 1 : 0) : r.n != null ? misuraTesto(r.n, r.u).split(' ')[0] : fmt(r.g);
    return `<div class="orow vr ${r.on ? '' : 'off'}"><button class="osw ${r.on ? 'on' : ''}" data-act="v-sw" data-i="${i}" role="switch" aria-checked="${r.on}" aria-label="${esc(a ? a.nome : r.alimento)}"></button><span class="ow"><b>${esc(a ? a.nome : r.alimento)}</b><small>${esc(r.n != null && r.n > 1 ? misuraTesto(r.n, r.u).split(' ').slice(1).join(' ') : unita)}</small></span>${r.on ? `<span class="ost"><button data-act="v-st" data-i="${i}" data-n="-1" aria-label="Meno">−</button><b class="num">${val}</b><button data-act="v-st" data-i="${i}" data-n="1" aria-label="Più">+</button></span>` : '<span class="ok">—</span>'}</div>`;
  };
  $('v-body').innerHTML = `<div class="chiprow">${[{ id: '', nome: 'la solita' }, ...vs].map(v => `<button class="${V.variante === v.id ? 'on' : ''}" data-act="v-var" data-v="${esc(v.id)}">${esc(v.nome)}</button>`).join('')}</div>
  <div>${V.righe.map(riga).join('')}</div>
  <div class="search"><svg class="ico" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><input id="vq" placeholder="aggiungi un alimento…" autocomplete="off" autocapitalize="off" aria-label="Aggiungi un alimento"></div>
  <div id="v-res"></div>
  <div class="ofoot"><div class="otot"><span>totale</span><span class="num">${fmt(t.kcal)} kcal · ${fmt(t.prot)} g prot</span></div>
  <button class="pill solid" data-act="v-ok">fatto</button>
  <div class="ovar"><input id="v-nome" placeholder="nome della variante" autocomplete="off" aria-label="Nome della variante"><button class="link" data-act="v-salva">salva come variante</button>${st ? `<button class="link" data-act="v-no">non fatto</button>` : ''}</div></div>`;
}
const vociDa = righe => righe.filter(r => r.on).map(r => ({ alimento: r.alimento, ...qta(r) }));
const uguali = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- azioni ---------- */
export function azioneOggi(act, el) {
  const d = sel();
  switch (act) {
    case 'o-pasto': sheetPasto(el.dataset.q); return false;
    case 'o-fine': closeSheet(); P = null; return true;
    case 'o-add': {
      if (el.dataset.r) { const id = el.dataset.r, c = cicloDi(d), nel = c && c.piatti.some(p => p.ricetta === id); aggiungi({ tipo: 'pasto', ricetta: id, porzione: 1, ...(nel ? { ciclo: c.id } : {}) }); }
      else aggiungi(nuovoCibo(el.dataset.a));
      $('oq').value = ''; rinfresca(); return true; }
    case 'o-rec': { const x = P.rec[Number(el.dataset.i)]; if (!x) return false;
      modifica(g => { for (const e of x.ev) { const { id, t, ciclo, voto, rif, ...resto } = e; g.eventi.push({ id: uid(), t: nowISO(), ...conPasto(resto, P.q) }); } });
      rinfresca(); toast('Aggiunto'); return true; }
    case 'o-porz': modifica(g => { const e = g.eventi.find(x => x.id === el.dataset.id); if (!e) return; const a = S.A[e.alimento]; e.porz = el.dataset.v; e.g = Math.round((a.porzione_g || 100) * FATT[e.porz]); }); rinfresca(); return true;
    case 'o-pz': modifica(g => { const e = g.eventi.find(x => x.id === el.dataset.id); if (e) e.pz = Math.max(1, (e.pz || 1) + Number(el.dataset.n)); }); rinfresca(); return true;
    case 'o-del': modifica(g => { if (el.dataset.id === 'mensa') { g.pranzo = null; return; } g.eventi = g.eventi.filter(e => e.id !== el.dataset.id); g.rimossi = [...(g.rimossi || []), el.dataset.id]; }); rinfresca(); return true;
    case 'o-conf': { const n = $('c-nome').value.trim() || 'Piatto confezionato', k = num($('c-k').value), gr = num($('c-g').value), p = num($('c-p').value);
      if (!k || !gr) { toast('Scrivi le kcal per 100 g e i grammi'); return false; }
      aggiungi({ tipo: 'fuori', nome: n, kcal: Math.round(k * gr / 100), prot: Math.round(p * gr / 100), etichetta: { g: gr, kcal100: k, prot100: p } });
      for (const i of ['c-nome', 'c-k', 'c-g', 'c-p']) $(i).value = ''; $('c-tot').textContent = '= 0 kcal'; el.closest('details').open = false; rinfresca(); toast('Aggiunto'); return true; }
    case 'o-claude': { const n = $('oq').value.trim() || $('c-nome').value.trim();
      if (!n) { toast('Scrivi prima nel campo di ricerca cosa hai mangiato'); $('oq').focus(); return false; }
      const id = uid(), q = P.q;
      modifica(g => { g.eventi.push({ id, t: nowISO(), tipo: 'fuori', pasto: q, nome: n, kcal: null, prot: null, pendente: true }); });
      const msg = messaggioClaude(n, id, q); closeSheet(); P = null; apriClaude(msg); return true; }
    case 'o-stima': { const e = giorno(d).eventi.find(x => x.id === el.dataset.id); if (!e) return false;
      $('o-res').innerHTML = `<div class="oconf" style="padding:12px 14px"><span class="lab">${esc(e.nome)}</span><div class="ogrid" style="grid-template-columns:1fr 1fr"><div class="field"><label class="lab" for="s-k">kcal</label><input id="s-k" inputmode="decimal"></div><div class="field"><label class="lab" for="s-p">proteine g</label><input id="s-p" inputmode="decimal"></div></div><div class="oconf-f"><span></span><button class="pill sm solid" data-act="o-stima-ok" data-id="${e.id}">salva</button></div></div>`;
      $('s-k').focus(); return false; }
    case 'o-stima-ok': { const k = Math.round(num($('s-k').value)), p = Math.round(num($('s-p').value)); if (!k) { toast('Inserisci le kcal'); return false; }
      modifica(g => { const e = g.eventi.find(x => x.id === el.dataset.id); if (e) { e.kcal = k; e.prot = p; e.pendente = false; } }); rinfresca(); return true; }

    case 'o-voce': sheetVoce(el.dataset.id); return false;
    case 'v-sw': { const r = V.righe[Number(el.dataset.i)]; r.on = !r.on; V.variante = '*'; disegnaVoce(); return false; }
    case 'v-st': { const r = V.righe[Number(el.dataset.i)], n = Number(el.dataset.n);
      if (r.pz != null) r.pz = Math.max(1, r.pz + n);
      else if (r.n != null) { const passo = r.n < 1 || (r.n === 1 && n < 0) ? 0.5 : 1; r.n = Math.max(0.5, r.n + n * passo); }
      else { const passo = r.g >= 100 ? 10 : 5; r.g = Math.max(passo, r.g + n * passo); }
      V.variante = '*'; disegnaVoce(); return false; }
    case 'v-var': { const m = giornataDel(d).find(x => x.id === V.id), v = variantiDi(m).find(x => x.id === el.dataset.v);
      V.righe = righeDa(m, v ? v.voci : m.voci); V.variante = v ? v.id : ''; disegnaVoce(); return false; }
    case 'v-add': { const a = S.A[el.dataset.a]; if (!a) return false;
      const u = a.misure ? Object.keys(a.misure)[0] : null;
      V.righe.push({ alimento: a.id, on: true, ...(aPezzi(a) ? { pz: 1 } : u ? { n: 1, u } : { g: a.porzione_g || 100 }) }); V.variante = '*'; disegnaVoce(); return false; }
    case 'v-ok': { const m = giornataDel(d).find(x => x.id === V.id), voci = vociDa(V.righe);
      const std = uguali(voci, m.voci.map(v => ({ alimento: v.alimento, ...qta(v) })));
      modifica(g => { g.giornata[V.id] = std ? 'fatto' : { voci, ...(V.variante && V.variante !== '*' ? { variante: V.variante } : {}) }; });
      closeSheet(); V = null; toast(std ? 'Segnato' : 'Segnato con le tue modifiche'); return true; }
    case 'v-no': modifica(g => { delete g.giornata[V.id]; }); closeSheet(); V = null; return true;
    case 'v-salva': { const nome = $('v-nome').value.trim(); if (!nome) { toast('Dai un nome alla variante'); $('v-nome').focus(); return false; }
      const voci = vociDa(V.righe), id = `u-${uid()}`;
      S.pref.varianti = S.pref.varianti || {}; S.pref.varianti[V.id] = [...(S.pref.varianti[V.id] || []).filter(x => x.nome.toLowerCase() !== nome.toLowerCase()), { id, nome, voci }];
      salvaPref(); V.variante = id; disegnaVoce(); toast('Variante salvata'); return false; }
  }
  return null;
}

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'oq') rinfresca();
  else if (t.id === 'vq') { const r = cerca(t.value, false); $('v-res').innerHTML = r.map(x => rigaRisultato(x, 'v-add')).join(''); }
  else if (t.id === 'c-k' || t.id === 'c-g') $('c-tot').textContent = `= ${fmt(num($('c-k').value) * num($('c-g').value) / 100)} kcal`;
});
