// CAM Kitchen: scheda Oggi (la giornata in un'unica lista, varianti con un tocco, "cosa hai mangiato?").
import { S, giorno, salvaPref, oggi, uid, nowISO, cfg, syncPronto, alimentoDaTotale } from './store.js';
import { fmt, addDays, dow, grammi, giornataDel, totaliGiorno, vociGiornata, macroVoci, macroRicetta, cicloDi, statoCiclo, quantitaTesto, misuraTesto } from './calc.js';
import { $, esc, toast, mascot, openSheet, closeSheet, breve, ICON } from './ui.js';
import { sel, bannerIeri, bannerCoach, modifica } from './menu.js';
import { apriClaude } from './ricettario.js';

const GG = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
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
  const [gs, resto] = [GIORNI[dow(d)], `${Number(d.slice(8))} ${MM[Number(d.slice(5, 7)) - 1]}`];
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
    <div class="og-h"><h2>La giornata</h2></div>
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

/* ---------- ricerca nel catalogo, nelle combinazioni e nel ricettario ---------- */
const cercabile = a => a.per100 && !a.nascosto && (a.traccia_dispensa !== false || a.utente || a.pronto);
function cerca(testo, conRicette, conComb = true) {
  const n = norm(testo).trim(); if (n.length < 2) return [];
  const tk = n.split(/\s+/), out = [];
  if (conComb) for (const c of combinazioni()) if (tk.every(t => norm(c.nome).includes(t))) out.push({ k: c.k, id: c.id, nome: c.nome, p: -1 });
  if (conRicette) for (const r of Object.values(S.R)) { const h = norm(`${r.nome} ${r.breve || ''}`); if (tk.every(t => h.includes(t))) out.push({ k: 'r', id: r.id, nome: r.nome, p: 1 }); }
  for (const a of Object.values(S.A)) {
    if (!cercabile(a)) continue;
    const nomi = [a.nome, ...(a.alias || [])].map(norm);
    if (!tk.every(t => nomi.some(x => x.includes(t)))) continue;
    out.push({ k: 'a', id: a.id, nome: a.nome, p: nomi.includes(n) ? 0 : nomi.some(x => x.startsWith(n)) ? 1 : 2 });
  }
  return out.sort((x, y) => x.p - y.p || x.nome.length - y.nome.length).slice(0, 12);
}
function rigaRisultato(x, act) {
  if (x.k === 'r') { const t = macroRicetta(x.id); return `<button class="ores" data-act="${act}" data-r="${x.id}"><span><b>${esc(x.nome)}</b><small>ricetta · ${fmt(t.kcal)} kcal</small></span><span class="pill sm">+</span></button>`; }
  if (x.k === 's' || x.k === 'c') { const c = combinazioni().find(z => z.id === x.id); return `<button class="ores" data-act="${x.k === 's' ? 'o-sol' : 'o-comb'}" data-id="${x.id}"><span><b>${esc(x.nome)}</b><small>combinazione · ${esc(c ? c.voci.map(nomeVoce).join(' + ') : '')}</small></span><span class="pill sm">+</span></button>`; }
  const a = S.A[x.id];
  const dose = aPezzi(a) ? `${fmt(a.per100.kcal * a.confezione.g_pz / 100)} kcal a ${a.confezione.nome === 'porzione' ? 'porzione' : 'pezzo'}` : `${fmt(a.per100.kcal)} kcal per 100 ${a.unita === 'ml' ? 'ml' : 'g'}`;
  return `<button class="ores" data-act="${act}" data-a="${x.id}"><span><b>${esc(a.nome)}</b><small class="num">${dose}</small></span><span class="pill sm">+</span></button>`;
}

/* ---------- i tuoi: gli stessi per ogni pasto, ordinati da quanto li usi ---------- */
let P = null; // { q }
const nomeVoce = v => (v.alimento ? (S.A[v.alimento] ? S.A[v.alimento].nome : v.alimento) : v.ricetta ? breve(v.ricetta) : v.nome || '').toLowerCase().split(' (')[0].split(',')[0];
// combinazioni: quelle del piano (abituali con più voci) e quelle salvate da CAM
function combinazioni() {
  const out = [];
  for (const x of (S.prog && S.prog.abituali) || []) if ((x.voci || []).length > 1) out.push({ k: 's', id: x.id, nome: x.nome, voci: x.voci });
  for (const c of Object.values(S.pref.combinazioni || {})) if (!c.nascosto) out.push({ k: 'c', id: c.id, nome: c.nome, voci: c.voci, mia: true });
  return out;
}
function usi(q) {
  const u = {}, da = addDays(sel(), -60);
  for (const [d, g] of Object.entries(S.giorni)) {
    if (d < da) continue; const visti = new Set();
    for (const e of g.eventi || []) {
      const w = e.pasto === q ? 3 : 1;
      if (e.tipo === 'extra' && e.alimento) u[`a:${e.alimento}`] = (u[`a:${e.alimento}`] || 0) + w;
      const c = e.comb || e.solito; if (c && !visti.has(c + e.pasto)) { visti.add(c + e.pasto); u[`c:${c}`] = (u[`c:${c}`] || 0) + w; }
    }
  }
  return u;
}
function tuoi(q) {
  const u = usi(q), mensa = q === 'pranzo' && dow(sel()) < 5, visti = new Set(), out = [];
  for (const x of (S.prog && S.prog.abituali) || []) {
    if ((x.voci || []).length !== 1) continue; const v = x.voci[0];
    if (v.alimento && (!S.A[v.alimento] || S.A[v.alimento].nascosto)) continue;
    if (v.alimento) visti.add(v.alimento);
    out.push({ k: 's', id: x.id, nome: x.nome, n: (u[`a:${v.alimento}`] || 0) + (u[`c:${x.id}`] || 0) + (x.mensa && mensa ? 1.5 : 0) });
  }
  for (const a of Object.values(S.pref.alimenti || {})) if (!a.nascosto && !a.ritocco && !visti.has(a.id)) { visti.add(a.id); out.push({ k: 'a', id: a.id, nome: a.nome, n: (u[`a:${a.id}`] || 0) + 0.5 }); }
  for (const [k, n] of Object.entries(u)) {
    if (!k.startsWith('a:') || n < 2) continue; const id = k.slice(2), a = S.A[id];
    if (a && !a.nascosto && !visti.has(id) && cercabile(a)) { visti.add(id); out.push({ k: 'a', id, nome: a.nome.toLowerCase(), n }); }
  }
  return out.sort((x, y) => y.n - x.n || x.nome.localeCompare(y.nome));
}
const chip = x => x.k === 's' ? `<button data-act="o-sol" data-id="${x.id}">${esc(x.nome)}</button>` : x.k === 'c' ? `<button data-act="o-comb" data-id="${x.id}">${esc(x.nome)}</button>` : `<button data-act="o-add" data-a="${x.id}">${esc(x.nome)}</button>`;
function sheetPasto(q) {
  P = { q }; ED = null; GEST = false; NF = null; SC = false; TUTTI = false;
  openSheet(`<div class="opasto"><span class="lab">${dataCorta(sel())} · ${NOMI[q]}</span><h3>cosa hai mangiato?</h3>
  <p class="note" id="o-intro">Componi il pasto un pezzo alla volta: riso, poi pollo, poi l'olio.</p>
  <div id="o-piatto"></div>
  <div class="search"><svg class="ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg><input id="oq" placeholder="cerca: riso, pesto, pollo al curry…" autocomplete="off" autocapitalize="off" enterkeyhint="search" aria-label="Cerca un alimento, una combinazione o una ricetta"></div>
  <div id="o-res"></div>
  <div class="ofoot"><div class="otot"><span>${NOMI[q].toLowerCase()}</span><span class="num" id="o-tot"></span></div><button class="pill solid" data-act="o-fine">fatto</button></div></div>`);
  rinfresca();
}
// il riquadro per le cose nuove: sempre visibile, con etichetta o stima di Claude
function boxNuovo(testo) {
  const t = testo.trim();
  return `<div class="onuovo"><b>${t.length >= 2 ? `“${esc(t)}” non c'è o è diverso?` : 'Hai mangiato qualcosa di nuovo?'}</b>
  <small>${t.length >= 2 ? 'Lo aggiungi una volta sola: poi lo ritrovi cercandolo e tra i tuoi, con i suoi valori.' : 'Scrivine il nome qui sopra, poi aggiungilo con l\'etichetta o chiedi i valori a Claude.'}</small>
  <div class="onuovo-b"><button class="pill sm" data-act="n-apri" data-ctx="o" data-t="${esc(t)}">ho l'etichetta</button><button class="pill sm solid" data-act="o-claude">chiedi a Claude</button></div></div>`;
}
function rinfresca() {
  if (!P || !$('o-res')) return;
  const q = P.q, g = giorno(sel()), xs = nelPiatto(g, q), t = somma(xs), testo = $('oq').value;
  let res = '';
  if (testo.trim().length >= 2) {
    const r = cerca(testo, q !== 'altro');
    res = r.map(x => rigaRisultato(x, 'o-add')).join('') + (NF && NF.ctx === 'o' ? formNuovo() : boxNuovo(testo));
  } else if (NF && NF.ctx === 'o') res = formNuovo();
  else {
    const c = cicloDi(sel());
    const menu = c && q !== 'altro' && sel() <= c.al ? [...new Set(statoCiclo(c).filter(p => !p.fatto).map(p => p.ricetta))].filter(id => S.R[id]) : [];
    const u = usi(q), comb = combinazioni().map(x => ({ ...x, n: (u[`c:${x.id}`] || 0) + (x.mia ? 0.5 : 0) })).sort((x, y) => y.n - x.n || x.nome.localeCompare(y.nome));
    const tu = tuoi(q), MAX = 14;
    if (GEST) {
      const mie = comb.filter(x => x.mia), miei = Object.values(S.pref.alimenti || {}).filter(x => !x.nascosto && !x.ritocco);
      res += `<span class="lab">Tocca per togliere</span>`;
      if (mie.length) res += `<span class="lab">Le tue combinazioni</span><div class="chiprow">${mie.map(x => `<button data-act="o-comb-via" data-id="${x.id}">${esc(x.nome)} ×</button>`).join('')}</div>`;
      if (miei.length) res += `<span class="lab">Aggiunti da te</span><div class="chiprow">${miei.map(x => `<button data-act="o-alim-via" data-id="${x.id}">${esc(x.nome)} ×</button>`).join('')}</div>`;
      res += `<button class="link" data-act="o-gest" style="align-self:flex-start;padding-left:0">fine</button>`;
    } else {
      if (comb.length) res += `<span class="lab">Combinazioni</span><div class="chiprow">${comb.map(chip).join('')}</div>`;
      if (tu.length) res += `<span class="lab">I tuoi</span><div class="chiprow">${(TUTTI ? tu : tu.slice(0, MAX)).map(chip).join('')}${tu.length > MAX ? `<button class="altri" data-act="o-tutti">${TUTTI ? 'meno' : `altri ${tu.length - MAX}…`}</button>` : ''}</div>`;
      if (menu.length) res += `<span class="lab">Dal tuo menù</span><div class="chiprow">${menu.map(id => `<button data-act="o-add" data-r="${id}">${esc(breve(id).toLowerCase())}</button>`).join('')}</div>`;
      if (Object.values(S.pref.alimenti || {}).some(x => !x.nascosto && !x.ritocco) || comb.some(x => x.mia)) res += `<button class="link" data-act="o-gest" style="align-self:flex-start;padding-left:0">togli combinazioni o cose aggiunte da te</button>`;
    }
    res += boxNuovo('');
  }
  $('o-res').innerHTML = res;
  const salvabili = xs.filter(x => x.k !== 'mensa' && !x.pendente);
  $('o-piatto').innerHTML = xs.length ? `<div class="og-h"><h2>Nel piatto</h2><span>tocca un nome per cambiare dose o valori</span></div>${xs.map(rigaPiatto).join('')}${salvabili.length >= 2 ? (SC ? `<div class="osalva"><input id="sc-nome" value="${esc(salvabili.map(x => nomeVoce(x.e || { nome: x.corto })).join(' + '))}" autocomplete="off" aria-label="Nome della combinazione"><button class="pill sm solid" data-act="o-comb-salva">salva</button></div>` : `<button class="link" data-act="o-comb-apri" style="align-self:flex-start;padding-left:0">salva come combinazione</button>`) : ''}` : '';
  $('o-intro').hidden = xs.length > 0;
  $('o-tot').textContent = `${fmt(t.kcal)} kcal · ${fmt(t.prot)} g prot`;
}
let ED = null; // voce del piatto aperta in modifica
let GEST = false; // modalità per togliere combinazioni e alimenti aggiunti
let SC = false; // campo "salva come combinazione" aperto
let TUTTI = false; // tutti i chip dei tuoi
let NF = null; // modulo "nuovo alimento": { ctx: 'o' | 'v', nome, modo: 'pz' | '100' }
const slug = t => norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
function bottoneNuovo(testo, ctx) { return `<button class="pill sm" data-act="n-apri" data-ctx="${ctx}" data-t="${esc(testo.trim())}" style="align-self:flex-start">+ aggiungi "${esc(testo.trim())}" come nuovo</button>`; }
function formNuovo() {
  const pz = NF.modo === 'pz';
  return `<div class="oconf oed nf"><span class="lab">Nuovo, dall'etichetta</span>
  <div class="field"><label class="lab" for="n-nome">nome</label><input id="n-nome" value="${esc(NF.nome)}" placeholder="es. risotto alla zucca Esselunga" autocomplete="off"></div>
  <div class="chiprow"><button class="${pz ? '' : 'on'}" data-act="n-modo" data-v="100">valori per 100 g</button><button class="${pz ? 'on' : ''}" data-act="n-modo" data-v="pz">valori per pezzo</button></div>
  <div class="ogrid">${campo('n-k', pz ? 'kcal per pezzo' : 'kcal per 100 g', '')}${campo('n-p', pz ? 'proteine per pezzo' : 'proteine per 100 g', '')}${campo('n-q', pz ? 'pezzi mangiati' : 'grammi mangiati', pz ? 1 : '')}</div>
  <div class="oconf-f"><button class="link" data-act="n-x" style="padding-left:0">annulla</button><button class="pill sm solid" data-act="n-ok">aggiungi</button></div></div>`;
}
const campo = (id, lab, v) => `<div class="field"><label class="lab" for="${id}">${lab}</label><input id="${id}" inputmode="decimal" value="${v ?? ''}" autocomplete="off"></div>`;
function editor(x) {
  const e = giorno(sel()).eventi.find(z => z.id === x.id); if (!e) return '';
  let campi = '', scala = '';
  if (x.k === 'cibo') {
    const a = S.A[e.alimento], q = e.pz != null ? e.pz : Math.round(grammi(e)), k = Math.round(x.kcal), p = Math.round(x.prot);
    campi = (e.pz != null ? campo('ed-pz', (a && a.pezzo) || 'pezzi', q) : campo('ed-g', a && a.unita === 'ml' ? 'ml' : 'grammi', q)) + campo('ed-k', 'kcal', k) + campo('ed-p', 'proteine g', p);
    if (q) scala = ` data-q="${q}" data-k="${k}" data-p="${p}"`;
  } else if (x.k === 'stima') { campi = campo('ed-g', 'grammi', e.g) + campo('ed-k', 'kcal', e.kcal) + campo('ed-p', 'proteine g', e.prot); if (e.g && e.kcal != null) scala = ` data-q="${e.g}" data-k="${e.kcal}" data-p="${e.prot || 0}"`; }
  else if (x.k === 'ricetta') campi = campo('ed-por', 'porzioni', e.porzione || 1);
  const nota = x.k === 'ricetta' ? '' : '<small class="note">Se cambi kcal o proteine, li ricordo anche per le prossime volte.</small>';
  return `<div class="oconf oed"${scala}><span class="lab">${esc(x.nome)}</span><div class="ogrid">${campi}</div>${nota}<div class="oconf-f"><button class="link" data-act="o-ed-x" style="padding-left:0">annulla</button><button class="pill sm solid" data-act="o-ed-ok" data-id="${x.id}">salva</button></div></div>`;
}
function rigaPiatto(x) {
  if (ED === x.id) return editor(x);
  let mezzo = '';
  if (x.k === 'cibo') {
    const a = S.A[x.e.alimento];
    if (x.e.pz != null) mezzo = `<span class="ost"><button data-act="o-pz" data-id="${x.id}" data-n="-1" aria-label="Meno">−</button><b class="num">${fmt(x.e.pz, x.e.pz % 1 ? 1 : 0)}</b><button data-act="o-pz" data-id="${x.id}" data-n="1" aria-label="Più">+</button></span>`;
    else if (a && x.e.porz) mezzo = `<span class="oseg">${Object.keys(FATT).map(p => `<button class="${x.e.porz === p ? 'on' : ''}" data-act="o-porz" data-id="${x.id}" data-v="${p}">${p}</button>`).join('')}</span>`;
    else mezzo = `<small class="num">${esc(quantitaTesto(x.e))}</small>`;
  } else if (x.pendente) mezzo = `<button class="pill sm" data-act="o-stima" data-id="${x.id}">inserisci</button>`;
  else { const e = x.k === 'stima' && giorno(sel()).eventi.find(z => z.id === x.id); mezzo = e && e.g ? `<small class="num">${fmt(e.g)} g</small>` : '<span></span>'; }
  const nome = `${esc(x.nome)}${x.pendente ? '<small>stima di Claude in arrivo</small>' : ''}`;
  return `<div class="opr">${x.k === 'mensa' ? `<b>${nome}</b>` : `<button class="oed-n" data-act="o-ed" data-id="${x.id}"><b>${nome}</b></button>`}${mezzo}<span class="ok num">${x.pendente ? '—' : fmt(x.kcal)}</span><button class="del" data-act="o-del" data-id="${x.id}" aria-label="Togli ${esc(x.nome)}">${ICON.x}</button></div>`;
}
const conPasto = (e, q) => (q === 'altro' ? (e.tipo === 'extra' ? e : { ...e, pasto: 'altro' }) : { ...e, pasto: q });
function aggiungi(e) { const q = P.q; modifica(g => { g.eventi.push({ id: uid(), t: nowISO(), ...conPasto(e, q) }); }); }
function nuovoCibo(id) {
  const a = S.A[id];
  return aPezzi(a) ? { tipo: 'extra', alimento: id, pz: 1 } : { tipo: 'extra', alimento: id, g: a.porzione_g || 100, porz: 'normale' };
}
const daVoce = v => (v.ricetta ? { tipo: 'pasto', ricetta: v.ricetta, porzione: v.porzione || 1 } : daSolito(v));
const daSolito = v => (v.alimento ? { tipo: 'extra', alimento: v.alimento, ...(v.g != null ? { g: v.g } : v.pz != null ? { pz: v.pz } : { n: v.n, u: v.u }), ...(v.porz ? { porz: v.porz } : {}) } : { tipo: 'fuori', nome: v.nome, kcal: v.kcal, prot: v.prot, ...(v.g ? { g: v.g } : {}) });
// voce di una combinazione da un evento del pasto
function voceDa(e) {
  if (e.tipo === 'pasto') return { ricetta: e.ricetta, ...(e.porzione && e.porzione !== 1 ? { porzione: e.porzione } : {}) };
  if (e.tipo === 'extra') return { alimento: e.alimento, ...(e.g != null ? { g: e.g } : e.pz != null ? { pz: e.pz } : { n: e.n, u: e.u }), ...(e.porz ? { porz: e.porz } : {}) };
  if (e.tipo === 'fuori' && !e.pendente && e.kcal != null) return { nome: e.nome, kcal: e.kcal, prot: e.prot || 0, ...(e.g ? { g: e.g } : {}) };
  return null;
}
// un valore inserito a mano (stima o correzione) diventa un alimento del catalogo, che resta per le volte dopo
function salvaAlimento(a) { S.pref.alimenti = S.pref.alimenti || {}; S.pref.alimenti[a.id] = a; salvaPref(); }
function idNuovo(nome) { const b = `u-${slug(nome) || uid()}`; return S.A[b] && !S.A[b].utente ? `${b}-${uid().slice(-3)}` : b; }
function inAlimento(e, kcal, prot, g) {
  const id = idNuovo(e.nome || 'piatto');
  salvaAlimento(alimentoDaTotale(id, e.nome || 'piatto', kcal, prot, g));
  for (const k of ['nome', 'kcal', 'prot', 'g', 'pendente', 'piatto', 'etichetta', 'solito', 'preset', 'porzione']) delete e[k];
  e.tipo = 'extra'; e.alimento = id; if (g) { e.g = Math.round(g); e.porz = 'normale'; } else e.pz = 1;
}
function messaggioClaude(nome, id, q) {
  const c = cfg(), d = sel(), file = `giorni/${d}.json`;
  return [`Ciao Claude, ti scrivo da CAM Kitchen. Stimami kcal e proteine di questo: ${nome}.`, `Giorno ${d}, ${q === 'altro' ? 'fuori pasto' : q}. Se c'è, allego una foto o l'etichetta.`,
    `Poi salvalo in CAM Kitchen come ingrediente da ritrovare le prossime volte (repo ${c.owner || 'whimsicam'}/${c.repo || 'camkitchen'}, ramo ${c.branch || 'main'}, vedi SPEC.md, "Stima di Claude"):`,
    `1) in preferenze.json → alimenti aggiungi un alimento con id "u-…", nome breve, per100 (kcal, prot), utente: true, traccia_dispensa: false e porzione_g (oppure unita "pz" se ha senso a pezzi);`,
    `2) in ${file} trasforma l'evento con id "${id}" in { tipo: "extra", alimento: <id>, g: <grammi> } (o pz), tenendo id, t e pasto, senza toccare il resto del file.`,
    `Se il file del giorno non c'è ancora nel repo (il telefono non ha sincronizzato), crealo tu con questo contenuto, che è il giorno com'è adesso sul telefono:`,
    JSON.stringify(giorno(d)),
    `Se non riesci a scrivere nel repo, rispondimi con una riga sola nel formato "grammi: 000 · kcal: 000 · proteine: 00": li inserisco io toccando la voce.`].join('\n');
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
  NF = null;
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
// ridisegna i risultati con il modulo "nuovo alimento" dove serve
function disegnaNF() {
  if ($('v-res') && (!NF || NF.ctx === 'v')) { const t = $('vq').value, r = cerca(t, false, false);
    $('v-res').innerHTML = NF ? formNuovo() : t.trim().length >= 2 ? (r.length ? r.map(x => rigaRisultato(x, 'v-add')).join('') : `<p class="note">Non trovo "${esc(t.trim())}" nel catalogo.</p>`) + bottoneNuovo(t, 'v') : ''; }
  else rinfresca();
  const f = $('n-k'); if (f && NF) f.focus();
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
    case 'o-sol': { const x = (S.prog.abituali || []).find(a => a.id === el.dataset.id); if (!x) return false;
      modifica(g => { for (const v of x.voci) g.eventi.push({ id: uid(), t: nowISO(), ...conPasto(daSolito(v), P.q), solito: x.id }); });
      $('oq').value = ''; rinfresca(); toast('Aggiunto'); return true; }
    case 'o-comb': { const x = (S.pref.combinazioni || {})[el.dataset.id]; if (!x) return false;
      modifica(g => { for (const v of x.voci) g.eventi.push({ id: uid(), t: nowISO(), ...conPasto(daVoce(v), P.q), comb: x.id }); });
      $('oq').value = ''; rinfresca(); toast('Aggiunto'); return true; }
    case 'o-comb-apri': SC = true; rinfresca(); { const f = $('sc-nome'); if (f) f.focus(); } return false;
    case 'o-comb-salva': { const nome = $('sc-nome').value.trim(); if (!nome) { toast('Dai un nome alla combinazione'); return false; }
      const voci = (giorno(d).eventi || []).filter(e => e.pasto === P.q || (P.q === 'altro' && e.tipo === 'extra' && !e.pasto)).map(voceDa).filter(Boolean);
      if (voci.length < 2) { toast('Servono almeno due cose nel piatto'); return false; }
      const vecchia = Object.values(S.pref.combinazioni || {}).find(c => c.nome.toLowerCase() === nome.toLowerCase());
      const id = vecchia ? vecchia.id : `k-${slug(nome).slice(0, 30)}-${uid().slice(-3)}`;
      S.pref.combinazioni = S.pref.combinazioni || {}; S.pref.combinazioni[id] = { id, nome, voci }; salvaPref();
      SC = false; rinfresca(); toast(`Combinazione salvata: ${nome}`); return false; }
    case 'o-comb-via': { const x = (S.pref.combinazioni || {})[el.dataset.id]; if (!x) return false; x.nascosto = true; salvaPref(); rinfresca(); toast(`Tolta: ${x.nome}`); return false; }
    case 'o-tutti': TUTTI = !TUTTI; rinfresca(); return false;
    case 'o-ed': ED = el.dataset.id; rinfresca(); const f = document.querySelector('.oed input'); if (f) f.focus(); return false;
    case 'o-ed-x': ED = null; rinfresca(); return false;
    case 'o-ed-ok': { const v = id => { const i = $(id); return i && i.value.trim() !== '' ? num(i.value) : null; };
      let msg = '';
      modifica(g => { const e = g.eventi.find(z => z.id === el.dataset.id); if (!e) return;
        if (e.tipo === 'extra') {
          const pz = v('ed-pz'), gr = v('ed-g'), k = v('ed-k'), pr = v('ed-p');
          if (pz != null) e.pz = Math.max(0.5, pz); else if (gr != null) { e.g = Math.max(1, Math.round(gr)); delete e.n; delete e.u; delete e.porz; delete e.pz; }
          const a = S.A[e.alimento], t = macroVoci([e]), gg = grammi(e);
          if (a && gg > 0 && k != null && (Math.abs(k - t.kcal) > 1.5 || (pr != null && Math.abs(pr - t.prot) > 0.6))) {
            const per100 = { ...a.per100, kcal: Math.round(k * 100 / gg), prot: Math.round((pr != null ? pr : t.prot) * 1000 / gg) / 10 };
            salvaAlimento(a.utente ? { ...a, per100 } : { ...a, per100, utente: true, ritocco: true });
            msg = `${a.nome}: valori aggiornati anche per le prossime volte`;
          }
          if (a && a.utente && !a.ritocco && e.g != null && S.pref.alimenti[a.id]) { S.pref.alimenti[a.id].porzione_g = e.g; salvaPref(); }
        } else if (e.tipo === 'fuori') { const gr = v('ed-g'), k = v('ed-k'), pr = v('ed-p'); if (k != null) { inAlimento(e, k, pr || 0, gr); msg = 'Salvato: lo ritrovi cercandolo'; } }
        else if (e.tipo === 'pasto') { const por = v('ed-por'); if (por) e.porzione = Math.max(0.25, por); } });
      ED = null; rinfresca(); if (msg) toast(msg); return true; }
    case 'o-gest': GEST = !GEST; rinfresca(); return false;
    case 'o-alim-via': { const x = (S.pref.alimenti || {})[el.dataset.id]; if (!x) return false; x.nascosto = true; salvaPref(); rinfresca(); toast(`Tolto: ${x.nome}`); return false; }
    case 'n-apri': NF = { ctx: el.dataset.ctx, nome: el.dataset.t || '', modo: '100' }; disegnaNF(); return false;
    case 'n-modo': NF.nome = $('n-nome').value; NF.modo = el.dataset.v; disegnaNF(); return false;
    case 'n-x': NF = null; disegnaNF(); return false;
    case 'n-ok': { const nome = $('n-nome').value.trim(), k = num($('n-k').value), pr = num($('n-p').value), q = num($('n-q').value);
      if (!nome || !k || !q) { toast('Scrivi nome, kcal e quantità'); return false; }
      const pz = NF.modo === 'pz', id = idNuovo(nome);
      const a = { id, nome, marca: '—', categoria: 'aggiunti', unita: pz ? 'pz' : 'g', per100: { kcal: k, prot: pr, carb: 0, grassi: 0, fibre: 0 }, confezione: pz ? { nome: 'pezzo', pz: 1, g_pz: 100 } : null, alias: [], traccia_dispensa: false, utente: true, ...(pz ? { pezzo: 'pezzi' } : { porzione_g: q }) };
      salvaAlimento(a);
      const ctx = NF.ctx; NF = null;
      if (ctx === 'v') { V.righe.push({ alimento: id, on: true, ...(pz ? { pz: q } : { g: q }) }); V.variante = '*'; disegnaVoce(); }
      else { aggiungi({ tipo: 'extra', alimento: id, ...(pz ? { pz: q } : { g: q, porz: 'normale' }) }); $('oq').value = ''; rinfresca(); }
      toast(`${nome}: aggiunto, lo ritrovi tra i tuoi`); return true; }
    case 'o-porz': modifica(g => { const e = g.eventi.find(x => x.id === el.dataset.id); if (!e) return; const a = S.A[e.alimento]; e.porz = el.dataset.v; e.g = Math.round((a.porzione_g || 100) * FATT[e.porz]); }); rinfresca(); return true;
    case 'o-pz': modifica(g => { const e = g.eventi.find(x => x.id === el.dataset.id); if (e) e.pz = Math.max(1, (e.pz || 1) + Number(el.dataset.n)); }); rinfresca(); return true;
    case 'o-del': modifica(g => { if (el.dataset.id === 'mensa') { g.pranzo = null; return; } g.eventi = g.eventi.filter(e => e.id !== el.dataset.id); g.rimossi = [...(g.rimossi || []), el.dataset.id]; }); rinfresca(); return true;
    case 'o-claude': { const n = $('oq').value.trim() || ($('n-nome') ? $('n-nome').value.trim() : '');
      if (!n) { toast('Scrivi prima nella ricerca cosa hai mangiato'); $('oq').focus(); return false; }
      const id = uid(), q = P.q;
      modifica(g => { g.eventi.push({ id, t: nowISO(), tipo: 'fuori', pasto: q, nome: n, kcal: null, prot: null, pendente: true }); });
      const msg = messaggioClaude(n, id, q); closeSheet(); P = null; apriClaude(msg); return true; }
    case 'o-stima': { const e = giorno(d).eventi.find(x => x.id === el.dataset.id); if (!e) return false;
      $('o-res').innerHTML = `<div class="oconf oed" style="padding:12px 14px"><span class="lab">${esc(e.nome)}</span><div class="ogrid">${campo('s-g', 'grammi', '')}${campo('s-k', 'kcal', '')}${campo('s-p', 'proteine g', '')}</div><small class="note">I grammi servono per ritrovarlo e cambiare la porzione le prossime volte.</small><div class="oconf-f"><span></span><button class="pill sm solid" data-act="o-stima-ok" data-id="${e.id}">salva</button></div></div>`;
      $('s-g').focus(); return false; }
    case 'o-stima-ok': { const k = Math.round(num($('s-k').value)), p = num($('s-p').value), gr = num($('s-g').value); if (!k) { toast('Inserisci le kcal'); return false; }
      modifica(g => { const e = g.eventi.find(x => x.id === el.dataset.id); if (e) inAlimento(e, k, p, gr || null); }); rinfresca(); toast('Salvato: lo ritrovi cercandolo'); return true; }

    case 'o-voce': sheetVoce(el.dataset.id); return false;
    case 'v-sw': { const r = V.righe[Number(el.dataset.i)]; r.on = !r.on; V.variante = '*'; disegnaVoce(); return false; }
    case 'v-st': { const r = V.righe[Number(el.dataset.i)], n = Number(el.dataset.n);
      if (r.pz != null) r.pz = Math.max(1, r.pz + n);
      else if (r.n != null) { const pa = (S.A[r.alimento] && S.A[r.alimento].passo && S.A[r.alimento].passo[r.u]); const passo = pa || (r.n < 1 || (r.n === 1 && n < 0) ? 0.5 : 1); r.n = Math.max(pa || 0.5, r.n + n * passo); }
      else { const passo = r.g >= 100 ? 10 : 5; r.g = Math.max(passo, r.g + n * passo); }
      V.variante = '*'; disegnaVoce(); return false; }
    case 'v-var': { const m = giornataDel(d).find(x => x.id === V.id), v = variantiDi(m).find(x => x.id === el.dataset.v);
      V.righe = righeDa(m, v ? v.voci : m.voci); V.variante = v ? v.id : ''; disegnaVoce(); return false; }
    case 'v-add': { const a = S.A[el.dataset.a]; if (!a) return false;
      const u = a.misure ? Object.keys(a.misure)[0] : null, pa = u && a.passo && a.passo[u];
      V.righe.push({ alimento: a.id, on: true, ...(aPezzi(a) ? { pz: 1 } : u ? { n: pa || 1, u } : { g: a.porzione_g || 100 }) }); V.variante = '*'; disegnaVoce(); return false; }
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
  if (t.id === 'oq') { NF = null; rinfresca(); }
  else if (t.id === 'vq') { NF = null; disegnaNF(); }
  else if (t.id === 'ed-g' || t.id === 'ed-pz') { const b = t.closest('.oed'); if (b && b.dataset.q) { const r = num(t.value) / num(b.dataset.q); if (r > 0) { $('ed-k').value = Math.round(num(b.dataset.k) * r); $('ed-p').value = Math.round(num(b.dataset.p) * r); } } }
});
