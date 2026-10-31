// CAM Kitchen: calcoli senza AI (kcal, giornate, ciclo, dispensa).
import { S, iso } from './store.js';

export const fmt = (n, dec = 0) => {
  const v = Number(n) || 0;
  const s = v.toFixed(dec).split('.');
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return s.join(',');
};
export const addDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return iso(x); };
export const dow = d => (new Date(d + 'T12:00:00').getDay() + 6) % 7; // 0 = lunedì
export const isWeekend = d => dow(d) >= 5;
const ZERO = () => ({ kcal: 0, prot: 0, carb: 0, grassi: 0, fv: 0 });
const add = (t, u, f = 1) => { for (const k in t) t[k] += (u[k] || 0) * f; return t; };

/* ---------- grammi e macro ---------- */
export function grammi(v) {
  const a = S.A[v.alimento]; if (!a) return 0;
  if (v.g != null) return v.g;
  if (v.pz != null) return v.pz * ((a.confezione && a.confezione.g_pz) || 0);
  return 0;
}
export function macroVoci(voci) {
  const t = ZERO();
  for (const v of voci || []) {
    const a = S.A[v.alimento]; if (!a) continue;
    const g = grammi(v), p = a.per100 || {};
    t.kcal += (p.kcal || 0) * g / 100; t.prot += (p.prot || 0) * g / 100; t.carb += (p.carb || 0) * g / 100; t.grassi += (p.grassi || 0) * g / 100;
    if (a.frutta_verdura) t.fv += g / ((S.prog && S.prog.regole && S.prog.regole.porzione_frutta_verdura_g) || 80);
  }
  return t;
}
export function ingredientiEffettivi(ricettaId, diff) {
  const r = S.R[ricettaId]; if (!r) return [];
  const ing = r.ingredienti.map(i => ({ ...i }));
  for (const d of diff || []) {
    const i = ing.find(x => x.alimento === d.alimento);
    if (i) { delete i.g; delete i.pz; Object.assign(i, d); } else ing.push({ ...d });
  }
  return ing;
}
export const macroRicetta = (id, diff, porz = 1) => add(ZERO(), macroVoci(ingredientiEffettivi(id, diff)), porz);

/* ---------- giornata ---------- */
export function vociGiornata(item, stato) {
  if (!stato) return [];
  if (stato === 'fatto') return item.voci;
  return stato.voci || item.voci;
}
export function giornataDel(data) {
  const gt = (S.prog && S.prog.giornata_tipo) || [];
  return gt.filter(m => m.giorni === 'tutti' || (m.giorni === 'weekend') === isWeekend(data));
}
export function totaliGiorno(g) {
  const t = ZERO();
  for (const m of giornataDel(g.data)) add(t, macroVoci(vociGiornata(m, g.giornata[m.id])));
  const porz = S.preset ? S.preset.porzioni : { normale: 1 };
  if (g.pranzo && g.pranzo.tipo === 'mensa') {
    const p = (S.preset.mensa || []).find(x => x.id === g.pranzo.preset) || S.prog.pranzo.mensa_forfait;
    add(t, { kcal: p.kcal, prot: p.prot }, porz[g.pranzo.porzione || 'normale'] || 1);
  }
  for (const e of g.eventi || []) {
    if (e.tipo === 'pasto') add(t, macroRicetta(e.ricetta, e.ingredienti, e.porzione || 1));
    else if (e.tipo === 'fuori') add(t, { kcal: e.kcal || 0, prot: e.prot || 0 });
    else if (e.tipo === 'extra') add(t, macroVoci([{ alimento: e.alimento, g: e.g, pz: e.pz }]));
  }
  return t;
}
export const pastoDel = (g, quale) => (g.eventi || []).find(e => (e.tipo === 'pasto' || e.tipo === 'fuori') && e.pasto === quale);

export function giornoCompleto(g) {
  if (!g) return false;
  const tipo = giornataDel(g.data).every(m => g.giornata && g.giornata[m.id]);
  return tipo && !!pastoDel(g, 'cena');
}
export function nonSegnati(g) { return giornataDel(g.data).filter(m => !(g.giornata && g.giornata[m.id])); }

/* ---------- ciclo ---------- */
export function cicloDi(data) {
  const cs = Object.values(S.cicli).filter(c => c.dal <= data).sort((a, b) => a.dal.localeCompare(b.dal));
  return cs.length ? cs[cs.length - 1] : null;
}
export function statoCiclo(c) {
  if (!c) return [];
  const fatti = [];
  for (const [d, g] of Object.entries(S.giorni)) {
    if (d < c.dal) continue;
    for (const e of g.eventi || []) if (e.tipo === 'pasto' && e.ciclo === c.id) fatti.push({ ricetta: e.ricetta, data: d, id: e.id });
  }
  fatti.sort((a, b) => a.data.localeCompare(b.data));
  const usati = new Set();
  return c.piatti.map(p => {
    const f = fatti.find(x => x.ricetta === p.ricetta && !usati.has(x.id));
    if (f) usati.add(f.id);
    return { ...p, fatto: f ? f.data : null };
  });
}

/* ---------- dispensa (calcolata dai movimenti) ---------- */
export function dispensa(finoA) {
  const saldo = {};      // grammi; assente = mai registrato
  const ultimoCarico = {};
  const giorni = Object.keys(S.giorni).filter(d => !finoA || d <= finoA).sort();
  const consuma = voci => { for (const v of voci) { const a = S.A[v.alimento]; if (!a || a.traccia_dispensa === false) continue; if (saldo[v.alimento] == null) continue; saldo[v.alimento] -= grammi(v); } };
  for (const d of giorni) {
    const g = S.giorni[d];
    const ev = [...(g.eventi || [])].sort((a, b) => (a.t || '').localeCompare(b.t || ''));
    for (const e of ev) {
      if (e.tipo === 'carico') { saldo[e.alimento] = Math.max(0, saldo[e.alimento] || 0) + grammi(e); ultimoCarico[e.alimento] = d; }
      if (e.tipo === 'rettifica') saldo[e.alimento] = grammi({ alimento: e.alimento, g: e.nuovo_g, pz: e.nuovo_pz });
    }
    for (const m of giornataDel(d)) consuma(vociGiornata(m, g.giornata && g.giornata[m.id]));
    for (const e of ev) {
      if (e.tipo === 'pasto') consuma(ingredientiEffettivi(e.ricetta, e.ingredienti).map(i => ({ ...i, g: grammi(i) * (e.porzione || 1), pz: undefined })));
      if (e.tipo === 'extra') consuma([{ alimento: e.alimento, g: e.g, pz: e.pz }]);
    }
  }
  return { saldo, ultimoCarico };
}
export function statoIngredienti(ricettaId, disp) {
  const r = S.R[ricettaId]; if (!r) return [];
  return r.ingredienti.map(i => {
    const a = S.A[i.alimento];
    const serve = grammi(i);
    let stato = 'nd';
    if (!a || a.traccia_dispensa === false || !serve) stato = 'base';
    else if (disp.saldo[i.alimento] != null) stato = disp.saldo[i.alimento] >= serve - 0.5 ? 'ok' : 'no';
    return { ...i, nome: a ? a.nome : i.alimento, serve, stato };
  });
}
export function quantitaTesto(i) {
  const a = S.A[i.alimento];
  if (i.pz != null) {
    const n = i.pz;
    if (i.alimento === 'uova') return `${fmt(n, n % 1 ? 1 : 0)}`;
    const c = a && a.confezione;
    return c && c.g_pz && a.unita === 'pz' && !['uova'].includes(i.alimento) ? `${fmt(n, n % 1 ? 1 : 0)} × ${fmt(c.g_pz)} g` : `${fmt(n, n % 1 ? 2 : 0)}`;
  }
  if (i.g != null) return `${fmt(i.g)} ${a && a.unita === 'ml' ? 'ml' : 'g'}`;
  return 'q.b.';
}

/* ---------- menù del ciclo ---------- */
export const giorniTra = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
function ricetteFatte() {
  const s = new Set();
  for (const g of Object.values(S.giorni)) for (const e of g.eventi || []) if (e.tipo === 'pasto') s.add(e.ricetta);
  return s;
}
function ultimaCenaBase() {
  const rot = S.prog.menu.rotazione_cene;
  const giorni = Object.keys(S.giorni).sort().reverse();
  for (const d of giorni) for (const e of [...(S.giorni[d].eventi || [])].reverse()) if (e.tipo === 'pasto' && rot.includes(e.ricetta)) return e.ricetta;
  return null;
}
export function generaCiclo(dal, nGiorni) {
  const al = addDays(dal, nGiorni - 1), M = S.prog.menu;
  const prec = cicloDi(addDays(dal, -1));
  const riportati = prec ? statoCiclo(prec).filter(p => !p.fatto && !p.da_scartare).map(p => ({ ricetta: p.ricetta, pasto: p.pasto, ...(p.nuovo ? { nuovo: true } : {}), da_ciclo: prec.id })) : [];
  const piatti = [...riportati];
  // cene in rotazione, ripartendo dopo l'ultima cena base fatta
  const rot = M.rotazione_cene; let i = (rot.indexOf(ultimaCenaBase()) + 1) % rot.length;
  while (piatti.filter(p => p.pasto === 'cena').length < nGiorni) { piatti.push({ ricetta: rot[i], pasto: 'cena' }); i = (i + 1) % rot.length; }
  // pranzi del weekend
  const weekend = [...Array(nGiorni)].map((_, k) => addDays(dal, k)).filter(isWeekend);
  const pw = M.pranzi_weekend.filter(id => S.R[id] && !S.R[id].nuovo); let j = 0;
  while (piatti.filter(p => p.pasto === 'pranzo').length < weekend.length && pw.length) { piatti.push({ ricetta: pw[j % pw.length], pasto: 'pranzo' }); j++; }
  // piatti nuovi: ricette marcate nuove e mai fatte
  const fatte = ricetteFatte(), giaDentro = new Set(piatti.filter(p => p.nuovo).map(p => p.ricetta));
  const nuovi = Object.values(S.R).filter(r => r.nuovo && !fatte.has(r.id) && !giaDentro.has(r.id)).map(r => r.id);
  for (let k = 0; k < Math.max(0, (M.piatti_nuovi_per_ciclo || 0) - giaDentro.size) && k < nuovi.length; k++) {
    const id = nuovi[k], quale = (S.R[id].pasto || []).includes('pranzo') && piatti.some(p => p.pasto === 'pranzo' && !p.da_ciclo && !p.nuovo) ? 'pranzo' : 'cena';
    const idx = piatti.map((p, x) => [p, x]).reverse().find(([p]) => p.pasto === quale && !p.da_ciclo && !p.nuovo);
    if (idx) piatti[idx[1]] = { ricetta: id, pasto: quale, nuovo: true }; else piatti.push({ ricetta: id, pasto: quale, nuovo: true });
  }
  return { id: dal, dal, al, piatti, lista: [], creato: new Date().toISOString() };
}
export function stimaCiclo(c) {
  const n = giorniTra(c.dal, c.al) + 1; let k = 0, p = 0;
  for (let x = 0; x < n; x++) {
    const d = addDays(c.dal, x);
    const t = macroVoci(giornataDel(d).flatMap(m => m.voci)); k += t.kcal; p += t.prot;
    if (!isWeekend(d)) { k += S.prog.pranzo.mensa_forfait.kcal; p += S.prog.pranzo.mensa_forfait.prot; }
  }
  for (const pi of c.piatti) { const t = macroRicetta(pi.ricetta); k += t.kcal; p += t.prot; }
  return { kcal: k / n, prot: p / n, giorni: n };
}

/* ---------- lista della spesa ---------- */
export function confezioni(alimento, g) {
  const a = S.A[alimento], c = (a && a.confezione) || {};
  if (c.g_pz && c.pz) { const pz = Math.ceil(g / c.g_pz - 0.05); const n = Math.max(1, Math.ceil(pz / c.pz)); return { n, g: n * c.pz * c.g_pz, testo: alimento === 'uova' ? `${n * c.pz}` : n === 1 ? `1 ${c.nome}` : `${n} ${plurale(c.nome)}` }; }
  if (c.g_pz) { const n = Math.max(1, Math.ceil(g / c.g_pz - 0.05)); return { n, g: n * c.g_pz, testo: `${n}` }; }
  if (c.g) { const n = Math.max(1, Math.ceil(g / c.g - 0.05)); return { n, g: n * c.g, testo: n === 1 ? `1 ${c.nome || 'confezione'}` : `${n} ${plurale(c.nome || 'confezione')}` }; }
  return { n: 1, g: Math.ceil(g), testo: `${fmt(g)} g` };
}
function plurale(s) {
  const irr = { vasetto: 'vasetti', pacco: 'pacchi', confezione: 'confezioni', vaschetta: 'vaschette', busta: 'buste', bottiglia: 'bottiglie', brick: 'brick', scatola: 'scatole', barattolo: 'barattoli', retina: 'retine', casco: 'caschi', sacchetto: 'sacchetti', spicchio: 'spicchi', hamburger: 'hamburger' };
  return irr[s] || s;
}
export function calcolaLista(c) {
  const disp = dispensa(), oggiD = iso(new Date());
  const need = {}, gruppo = {}, perNuovo = {};
  const addNeed = (al, g, grp) => { const a = S.A[al]; if (!a || a.traccia_dispensa === false || !g) return; need[al] = (need[al] || 0) + g; if (!gruppo[al]) gruppo[al] = grp; };
  const st = statoCiclo(c).filter(p => !p.fatto);
  const conto = {};
  st.forEach(p => { conto[p.ricetta] = (conto[p.ricetta] || 0) + 1; });
  for (const p of st) for (const i of S.R[p.ricetta] ? S.R[p.ricetta].ingredienti : []) { addNeed(i.alimento, grammi(i), p.ricetta); if (p.nuovo) perNuovo[i.alimento] = p.ricetta; }
  const da = c.dal > oggiD ? c.dal : oggiD, n = Math.max(0, giorniTra(da, c.al) + 1);
  for (let x = 0; x < n; x++) for (const m of giornataDel(addDays(da, x))) for (const v of m.voci) addNeed(v.alimento, grammi(v), 'giornata');
  const items = [];
  for (const [al, g] of Object.entries(need)) {
    const saldo = Math.max(0, disp.saldo[al] || 0), manca = g - saldo;
    if (manca <= 0.5) continue;
    const conf = confezioni(al, manca);
    const nuovo = perNuovo[al] && !Object.values(S.R).some(r => !r.nuovo && conto[r.id] && r.ingredienti.some(i => i.alimento === al));
    items.push({ id: al, alimento: al, g: conf.g, testo: conf.testo, gruppo: gruppo[al], nota: nuovo ? `per provare ${S.R[perNuovo[al]].nome.toLowerCase()}` : '', preso: false });
  }
  const ordGr = g => g === 'giornata' ? 'zz' : g;
  items.sort((a, b) => ordGr(a.gruppo).localeCompare(ordGr(b.gruppo)) || S.A[a.alimento].nome.localeCompare(S.A[b.alimento].nome));
  return { items, conto };
}

/* ---------- testo libero (spesa e Siri) ---------- */
const NUM = { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, dodici: 12 };
export function trovaAlimento(nome) {
  const n = nome.toLowerCase().trim().replace(/^(di|del|della|dei|delle|lo|la|il|le|gli|i)\s+/, '');
  if (S.alias && S.alias[n]) return S.alias[n] === '-' ? '-' : S.alias[n];
  let best = null;
  for (const a of Object.values(S.A)) for (const al of [...(a.alias || []), a.nome.toLowerCase()]) {
    if (n === al) return a.id;
    if (!best && (n.startsWith(al + ' ') || n === al + 'e' || n === al + 'i' || al.startsWith(n + ' '))) best = a.id;
  }
  return best;
}
export function parseVoci(testo) {
  return String(testo).split(/,|;|\s+e\s+|\n/i).map(s => s.trim()).filter(Boolean).map(s => {
    let t = s.toLowerCase(), qta = null, unita = null;
    const m = t.match(/^(\d+(?:[.,]\d+)?|un|uno|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|dodici)\s+(.*)$/);
    if (m) { qta = isNaN(parseFloat(m[1].replace(',', '.'))) ? NUM[m[1]] : parseFloat(m[1].replace(',', '.')); t = m[2]; }
    const u = t.match(/^(kg|g|grammi|chili|confezioni|confezione|pacchi|pacco|vaschette|vaschetta|vasetti|vasetto|scatolette|bottiglie|buste|pezzi)\s+(?:di\s+)?(.*)$/);
    if (u) { unita = u[1]; t = u[2]; }
    t = t.replace(/^(di|del|della|dei|delle|lo|la|il|le|gli|i|l')\s*/, '').trim();
    const al = trovaAlimento(t);
    let g = null;
    if (al && al !== '-' && qta) {
      const a = S.A[al], c = a.confezione || {};
      if (unita === 'kg' || unita === 'chili') g = qta * 1000; else if (unita === 'g' || unita === 'grammi') g = qta;
      else if (unita && c.pz && c.g_pz) g = qta * c.pz * c.g_pz; else if (unita && c.g) g = qta * c.g;
      else if (c.g_pz) g = qta * c.g_pz; else if (c.g) g = qta * c.g;
    }
    if (al && al !== '-' && !g) { const c = S.A[al].confezione || {}; g = c.g || (c.g_pz ? c.g_pz * (c.pz || 1) : null); }
    const nomeVoce = s.charAt(0).toUpperCase() + s.slice(1);
    return { testo: nomeVoce, chiave: t, alimento: al === '-' ? null : al, nonAlimentare: al === '-', g };
  });
}
