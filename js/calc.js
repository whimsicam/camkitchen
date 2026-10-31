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
