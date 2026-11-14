// CAM Kitchen: scheda Spesa (lista unica in unità naturali, controllo prima di uscire, in casa a livelli, menù dei prossimi giorni).
import { S, salvaCiclo, salvaGiorno, salvaInbox, giorno, oggi, uid, nowISO, saveUI, eliminaRemoto } from './store.js';
import { fmt, addDays, dow, generaCiclo, calcolaLista, parseVoci, dispensa, giorniTra, macroRicetta, plurale } from './calc.js';
import { $, esc, toast, mascot, arte, tinta, breve, openSheet, closeSheet, ICON } from './ui.js';

const GG = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
const corto = d => `${GG[dow(d)]} ${Number(d.slice(8))}`;
const lungo = d => `${GIORNI[dow(d)]} ${Number(d.slice(8))}`;
const ultimoCiclo = () => Object.values(S.cicli).sort((a, b) => a.dal.localeCompare(b.dal)).pop() || null;
const P = () => (S.ui.plan = S.ui.plan || { step: 0 });

/* ---------- vista ---------- */
const pacco = a => { const c = a.confezione || {}; return c.g || (c.g_pz ? c.g_pz * (c.pz || 1) : (a.porzione_g || 100) * 4); };
// si contano a pezzi le cose che si comprano una per una (frutta, uova, vasetti); il resto va a confezioni
const aPezzi = a => { const c = a.confezione || {}; return !!c.g_pz && ((c.pz || 1) === 1 || ['frutta', 'verdura', 'uova'].includes(a.categoria)); };
export function vistaSpesa() {
  importaInbox();
  const L = ultimoCiclo(), p = P(), attivo = L && L.al >= oggi();
  const box = (testo, etichetta, act) => `<div class="sp-box"><span>${testo}</span><button class="pill sm solid" data-act="${act}">${etichetta}</button></div>`;
  const testa = p.step ? pianoAperto(L) : !attivo ? box('Prepara la lista:<br>quando fai la spesa?', 'prepara', 'plan-open') : box('Prima di uscire:<br>cosa ti è finito?', 'controlla', 'sp-ctrl');
  return `<section class="oggi spesa"><h1 class="big">la spesa</h1>
  ${testa}
  <form class="search addform" data-form="add"><svg class="ico" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><input id="addq" placeholder="aggiungi: latte, 6 uova…" autocomplete="off" enterkeyhint="done" aria-label="Aggiungi alla lista"><button class="pill sm" type="submit">aggiungi</button></form>
  ${lista(L)}
  ${attivo && !p.step ? `<button class="sp-menu" data-act="plan-open">menù fino a ${lungo(L.al)}: ${L.piatti.length} ${L.piatti.length === 1 ? 'piatto' : 'piatti'} · cambia</button>` : ''}
  ${inCasa()}
  </section>`;
}

function pianoAperto(L) {
  const p = P();
  if (!p.step) p.step = 1;
  if (!p.dal || p.dal < oggi()) p.dal = L && L.al >= oggi() ? addDays(L.al, 1) : oggi();
  if (!p.n) p.n = S.prog.menu.durata_default_giorni || 9;
  if (p.step === 2 && !p.draft) p.step = 1;
  const st = (n, l) => `<span class="${p.step >= n ? 'on' : ''}"><i>${n}</i>${l}</span>`;
  let body = '';
  if (p.step === 1) {
    const date = [...Array(8)].map((_, i) => addDays(oggi(), i));
    if (!date.includes(p.dal)) date.push(p.dal);
    body = `<span class="lab">Quando vai al Conad?</span><div class="dates">${date.map(d => `<button class="${d === p.dal ? 'on' : ''}" data-act="plan-dal" data-d="${d}">${GG[dow(d)]}<b class="num">${Number(d.slice(8))}</b></button>`).join('')}</div>
    <span class="lab">Per quanti giorni?</span><div class="chiprow">${[6, 7, 8, 9, 10, 11].map(n => `<button class="${n === p.n ? 'on' : ''}" data-act="plan-n" data-n="${n}">${n} giorni</button>`).join('')}</div>
    <p class="note" style="margin:0">Il ciclo va da ${lungo(p.dal)} a ${lungo(addDays(p.dal, p.n - 1))}.${L && L.al >= p.dal ? ' I piatti non fatti del ciclo attuale passano al nuovo.' : ''}</p>
    <div class="navrow"><span></span><button class="pill solid" data-act="plan-gen">Proponi i piatti</button></div>`;
  }
  if (p.step === 2) {
    const c = p.draft;
    const tile = (x, i) => `<div class="mi" style="position:relative"><button class="mcard" data-act="plan-swap" data-i="${i}" style="--tint:${tinta(x.ricetta)};width:100%;margin:0"><span class="art">${arte(x.ricetta)}</span><b>${esc(breve(x.ricetta))}</b><small>${x.pasto === 'pranzo' ? 'pranzo' : 'cena'}${x.da_ciclo ? ' · riportato' : ''}</small></button><button class="x" data-act="plan-rm" data-i="${i}" aria-label="Togli">×</button>${x.nuovo ? '<span class="new">nuovo</span>' : ''}</div>`;
    body = `<span class="lab">${c.piatti.filter(x => x.pasto === 'cena').length} cene e ${c.piatti.filter(x => x.pasto === 'pranzo').length} pranzi · tocca un piatto per cambiarlo, × per toglierlo</span>
    <div class="plates">${c.piatti.map(tile).join('')}<button class="mi empty" data-act="plan-add"><span class="med">${addSvg}</span><span>aggiungi</span></button></div>
    <p class="note" style="margin:0">Scegli solo i piatti che pensi di fare: per gli altri giorni basta la scorta (pasta, tonno, uova).</p>
    <div class="navrow"><button class="link" data-act="plan-step" data-s="1">← Indietro</button><button class="pill solid" data-act="plan-ok">Calcola la lista</button></div>`;
  }
  return `<section class="plan"><div style="display:flex;align-items:center;gap:12px">${mascot('sm')}<div style="flex:1"><span class="lab">${L ? (L.al >= oggi() ? `Il ciclo finisce ${lungo(L.al)}` : 'Il ciclo è finito') : 'Il primo menù'}</span><h2 style="font-size:20px;margin-top:2px">Prepara la prossima spesa</h2></div>${L ? `<button class="ib" data-act="plan-close" aria-label="Chiudi">${ICON.x}</button>` : ''}</div>
  <div class="steps">${st(1, 'Quando')}<span class="sep"></span>${st(2, 'Piatti')}<span class="sep"></span>${st(3, 'Lista')}</div>${body}</section>`;
}
const addSvg = '<svg viewBox="0 0 100 100" fill="none" stroke="#9A8F80" stroke-width="1.4"><circle cx="50" cy="50" r="22" stroke-dasharray="3 4"/><path d="M50 40v20M40 50h20"/></svg>';

/* ---------- lista unica, in unità naturali ---------- */
function naturale(it) {
  const a = it.alimento && S.A[it.alimento]; if (!a || !it.g) return null;
  const c = a.confezione || {};
  if (aPezzi(a)) { const u = a.pezzo || ''; return { n: Math.max(1, Math.round(it.g / c.g_pz)), passo: c.g_pz, u: u && !a.nome.toLowerCase().startsWith(u.slice(0, 4)) ? u : '' }; }
  const pk = c.g || (c.g_pz ? c.g_pz * (c.pz || 1) : 0);
  if (pk) { const n = Math.max(1, Math.round(it.g / pk)); return { n, passo: pk, u: n > 1 ? plurale(c.nome || 'confezione') : (c.nome || 'confezione') }; }
  return { n: Math.round(it.g), passo: 50, u: a.unita === 'ml' ? 'ml' : 'grammi' };
}
function lista(L) {
  const voci = L ? [...(L.lista || []).map(it => ({ it, k: 'l' })), ...(L.extra || []).map(it => ({ it, k: 'e' }))] : S.inbox.map(x => ({ it: { id: x.file, testo: x.testo }, k: 'i' }));
  if (!voci.length) return `<div><div class="og-h"><h2>Da comprare</h2><span></span></div><p class="og-note" style="margin:12px 0 0">La lista è vuota. Aggiungi qualcosa qui sopra${L ? '' : ' o prepara la lista dal menù'}.</p></div>`;
  voci.sort((a, b) => (!!a.it.preso) - (!!b.it.preso));
  const riga = ({ it, k }) => {
    const a = it.alimento && S.A[it.alimento], nat = naturale(it), nome = a ? a.nome : it.testo;
    const destra = it.preso ? '<span class="ok">preso</span>' : nat ? `<span class="ost"><button data-act="sp-q" data-k="${k}" data-id="${esc(it.id)}" data-n="-1" aria-label="Meno">−</button><b class="num">${fmt(nat.n)}</b><button data-act="sp-q" data-k="${k}" data-id="${esc(it.id)}" data-n="1" aria-label="Più">+</button></span>` : `<button class="del" data-act="${k === 'i' ? 'inbox-del' : 'sp-via'}" data-k="${k}" data-id="${esc(it.id)}" aria-label="Togli ${esc(nome)}">${ICON.x}</button>`;
    return `<div class="orow sp ${it.preso ? 'on off' : ''}">${k === 'i' ? '<span class="bx"></span>' : `<button class="bx" data-act="${k === 'l' ? 'lista-tick' : 'extra-tick'}" data-id="${esc(it.id)}" aria-label="${it.preso ? 'Rimetti in lista' : 'Preso'}: ${esc(nome)}"></button>`}<span class="ow"><b>${esc(nome)}</b>${nat && nat.u ? `<small>${esc(nat.u)}</small>` : it.nota ? `<small>${esc(it.nota)}</small>` : ''}</span>${destra}</div>`;
  };
  return `<div><div class="og-h"><h2>Da comprare</h2><span class="num">${voci.filter(v => v.it.preso).length} di ${voci.length}</span></div>${voci.map(riga).join('')}${L ? `<div style="text-align:center;margin-top:10px"><button class="link" data-act="lista-ricalcola">ricalcola dal menù</button></div>` : ''}</div>`;
}

/* ---------- in casa: livelli per le cose sfuse, numero per quelle che si contano ---------- */
const LIV = [[1, 'piena'], [0.5, 'metà'], [0.2, 'poca'], [0, 'finita']];
const livello = (a, g) => { const f = g / pacco(a); return f >= 0.67 ? [3, 'piena'] : f >= 0.34 ? [2, 'metà'] : [1, 'poca']; };
const tacche = n => `<span class="lv">${[0, 1, 2].map(i => `<i class="${i < n ? 'f' : ''}"></i>`).join('')}</span>`;
function inCasa() {
  const d = dispensa(), ids = Object.keys(d.saldo).filter(id => S.A[id]);
  const h = '<div class="og-h"><h2>In casa</h2><span>tocca per correggere</span></div>';
  if (!ids.length) return `<div>${h}<div class="sp-box" style="margin-top:14px;border-style:dashed"><span>Dimmi cosa hai in casa:<br>bastano piena, metà, poca.</span><button class="pill sm solid" data-act="sp-ctrl" data-t="1">inizia</button></div></div>`;
  const pieni = ids.filter(id => d.saldo[id] > 0.5).sort((x, y) => S.A[x].nome.localeCompare(S.A[y].nome)), finiti = ids.filter(id => d.saldo[id] <= 0.5);
  const riga = id => { const a = S.A[id], g = d.saldo[id];
    if (aPezzi(a)) { const n = Math.max(0, Math.round(g / a.confezione.g_pz)); return `<div class="orow sp2"><span class="ow"><b>${esc(a.nome)}</b></span><span class="ost"><button data-act="ck-n" data-id="${id}" data-v="${n - 1}" aria-label="Meno">−</button><b class="num">${n}</b><button data-act="ck-n" data-id="${id}" data-v="${n + 1}" aria-label="Più">+</button></span></div>`; }
    const [n, t] = livello(a, g); return `<button class="orow sp2" data-act="sp-ctrl"><span class="ow"><b>${esc(a.nome)}</b></span><span class="lvt">${t}${tacche(n)}</span></button>`; };
  return `<div>${h}${pieni.map(riga).join('')}${finiti.length ? `<p class="og-note" style="margin:12px 0 0">Finiti: ${finiti.map(id => esc(S.A[id].nome.toLowerCase())).join(', ')}.</p>` : ''}
  <div style="text-align:center;margin-top:10px"><button class="link" data-act="sp-ctrl" data-t="1">aggiungi altro che ho in casa</button></div></div>`;
}
let CK = false;
function corpoControllo() {
  const d = dispensa();
  const al = Object.values(S.A).filter(a => a.traccia_dispensa !== false && a.id !== 'te' && (d.saldo[a.id] != null || (CK && !a.generico))).sort((a, b) => a.nome.localeCompare(b.nome));
  return al.map(a => { const g = d.saldo[a.id];
    if (aPezzi(a)) { const n = g == null ? 0 : Math.max(0, Math.round(g / a.confezione.g_pz)); return `<div class="orow sp2"><span class="ow"><b>${esc(a.nome)}</b></span><span class="ost"><button data-act="ck-n" data-id="${a.id}" data-v="${Math.max(0, n - 1)}" aria-label="Meno">−</button><b class="num">${n}</b><button data-act="ck-n" data-id="${a.id}" data-v="${n + 1}" aria-label="Più">+</button></span></div>`; }
    const ora = g == null ? '' : g <= 0.5 ? 'finita' : livello(a, g)[1];
    return `<div class="ckr"><b>${esc(a.nome)}</b><span class="oseg">${LIV.map(([v, t]) => `<button class="${ora === t ? 'on' : ''}" data-act="ck-l" data-id="${a.id}" data-v="${v}">${t}</button>`).join('')}</span></div>`; }).join('');
}
function sheetControllo(tutti) {
  CK = !!tutti;
  openSheet(`<div class="opasto"><span class="lab">${CK ? 'Tutto il catalogo di casa' : 'Quello che risulta in casa'}</span><h3>${CK ? 'cosa hai in casa?' : 'cosa ti è finito?'}</h3><div id="ck-body">${corpoControllo()}</div><div class="ofoot"><button class="pill solid" data-act="ck-ok">fatto</button></div></div>`);
}
function rettifica(id, nuovo) { const g = structuredClone(giorno(oggi())); g.eventi.push({ id: uid(), t: nowISO(), tipo: 'rettifica', alimento: id, ...nuovo, motivo: 'controllo' }); salvaGiorno(g); }
function ricalcola(L) { const presi = new Set(L.lista.filter(x => x.preso).map(x => x.id)); const nuova = calcolaLista(L).items.filter(x => !presi.has(x.id)); salvaCiclo({ ...L, lista: [...L.lista.filter(x => x.preso), ...nuova] }); }

/* ---------- inbox di Siri ---------- */
function importaInbox() {
  const L = ultimoCiclo(); if (!L || !S.inbox.length) return;
  const nuovi = S.inbox.flatMap(x => parseVoci(x.testo).map(v => ({ id: uid(), testo: v.testo, chiave: v.chiave, alimento: v.alimento, nonAlimentare: v.nonAlimentare, g: v.g, siri: true })));
  S.inbox = []; salvaInbox();
  salvaCiclo({ ...L, extra: [...(L.extra || []), ...nuovi] });
}

/* ---------- azioni ---------- */
function caricoPer(it, on) {
  const g = giorno(oggi()); const copia = structuredClone(g);
  const rif = `lista:${it.id}`;
  if (on && it.alimento && it.g) copia.eventi.push({ id: uid(), t: nowISO(), tipo: 'carico', alimento: it.alimento, g: it.g, rif });
  if (!on) { const via = copia.eventi.filter(e => e.rif === rif).map(e => e.id); copia.eventi = copia.eventi.filter(e => !via.includes(e.id)); copia.rimossi = [...(copia.rimossi || []), ...via]; }
  salvaGiorno(copia);
}
export function azioneSpesa(act, el) {
  const p = P(), L = ultimoCiclo();
  // azioni che richiedono una bozza o una lista: se non ci sono più (foglio rimasto aperto, riavvio) non si fa nulla
  if (/^plan-(rm|swap|pick)$/.test(act) && !p.draft) { closeSheet(); return true; }
  if (act === 'plan-ok' && !p.draft) { S.ui.plan = { step: 0 }; return true; }
  if (/^(lista-tick|lista-ricalcola|extra-tick|extra-del|sp-q|sp-via)$/.test(act) && !L) { closeSheet(); return true; }
  if (act === 'lista-tick' && !(L.lista || []).some(x => x.id === el.dataset.id)) return true;
  if (act === 'extra-tick' && !(L.extra || []).some(x => x.id === el.dataset.id)) return true;
  if (act === 'plan-pick' && Number(el.dataset.i) >= p.draft.piatti.length) { closeSheet(); return true; }
  switch (act) {
    case 'lista-ricalcola': ricalcola(L); toast('Lista ricalcolata'); return true;
    case 'sp-q': { const arr = el.dataset.k === 'l' ? L.lista : L.extra, it = arr.find(x => x.id === el.dataset.id), nat = it && naturale(it); if (!nat) return false;
      const n = nat.n + Number(el.dataset.n);
      if (n < 1) salvaCiclo({ ...L, [el.dataset.k === 'l' ? 'lista' : 'extra']: arr.filter(x => x !== it) }); else { it.g = n * nat.passo; delete it.testoQ; salvaCiclo({ ...L }); }
      return true; }
    case 'sp-via': salvaCiclo({ ...L, [el.dataset.k === 'l' ? 'lista' : 'extra']: (el.dataset.k === 'l' ? L.lista : L.extra).filter(x => x.id !== el.dataset.id) }); return true;
    case 'sp-ctrl': sheetControllo(el.dataset.t === '1'); return false;
    case 'ck-l': { const a = S.A[el.dataset.id]; rettifica(a.id, { nuovo_g: Math.round(pacco(a) * Number(el.dataset.v)) }); if ($('ck-body')) $('ck-body').innerHTML = corpoControllo(); return !$('ck-body'); }
    case 'ck-n': { rettifica(el.dataset.id, { nuovo_pz: Math.max(0, Number(el.dataset.v)) }); if ($('ck-body')) { $('ck-body').innerHTML = corpoControllo(); return false; } return true; }
    case 'ck-ok': closeSheet(); if (L && L.al >= oggi()) { ricalcola(L); toast('Dispensa aggiornata, lista ricalcolata'); } return true;
    case 'plan-open': S.ui.plan = { step: 1 }; return true;
    case 'plan-close': S.ui.plan = { step: 0 }; return true;
    case 'plan-dal': p.dal = el.dataset.d; return true;
    case 'plan-n': p.n = Number(el.dataset.n); return true;
    case 'plan-gen': p.draft = generaCiclo(p.dal, p.n); p.step = 2; return true;
    case 'plan-step': p.step = Number(el.dataset.s); return true;
    case 'plan-rm': p.draft.piatti.splice(Number(el.dataset.i), 1); return true;
    case 'plan-swap': sheetScelta(Number(el.dataset.i)); return false;
    case 'plan-add': sheetScelta(-1); return false;
    case 'plan-pick': { const i = Number(el.dataset.i), id = el.dataset.r, q = el.dataset.q;
      const x = { ricetta: id, pasto: q, ...(S.R[id].nuovo ? { nuovo: true } : {}) };
      if (i >= 0) p.draft.piatti[i] = { ...x, ...(p.draft.piatti[i].da_ciclo ? { da_ciclo: p.draft.piatti[i].da_ciclo } : {}) }; else p.draft.piatti.push(x);
      closeSheet(); return true; }
    case 'plan-ok': {
      const c = p.draft; c.lista = calcolaLista(c).items; c.extra = (L && L.id === c.id ? L.extra : []) || [];
      for (const vecchio of Object.values(S.cicli)) if (vecchio.dal > oggi() && vecchio.id !== c.id) { delete S.cicli[vecchio.id]; eliminaRemoto(`cicli/${vecchio.id}.json`, 'menù: ciclo sostituito').catch(() => {}); }
      salvaCiclo(c); S.ui.plan = { step: 0 }; saveUI(); toast('Menù e lista pronti'); return true; }
    case 'lista-tick': { const it = L.lista.find(x => x.id === el.dataset.id); it.preso = !it.preso; caricoPer(it, it.preso); salvaCiclo({ ...L }); return true; }
    case 'extra-tick': { if (!L) return false; const it = L.extra.find(x => x.id === el.dataset.id); it.preso = !it.preso; caricoPer(it, it.preso); salvaCiclo({ ...L }); return true; }
    case 'inbox-del': S.inbox = S.inbox.filter(x => x.file !== el.dataset.id); salvaInbox(); return true;
    case 'extra-del': { if (!L) return false; salvaCiclo({ ...L, extra: L.extra.filter(x => x.id !== el.dataset.id) }); return true; }
  }
  return null;
}
export function inviaAggiunta(testo) {
  const L = ultimoCiclo(); if (!testo.trim()) return;
  if (!L) { S.inbox.push({ file: uid(), testo: testo.trim(), quando: nowISO() }); salvaInbox(); toast('Aggiunto'); return; }
  const nuovi = parseVoci(testo).map(v => ({ id: uid(), testo: v.testo, chiave: v.chiave, alimento: v.alimento, nonAlimentare: v.nonAlimentare, g: v.g }));
  // un alimento già in lista non si duplica: si somma alla voce che c'è
  const resto = [];
  for (const v of nuovi) { const gia = v.alimento && [...(L.lista || []), ...(L.extra || [])].find(x => x.alimento === v.alimento && !x.preso); if (gia && v.g) { gia.g = (gia.g || 0) + v.g; delete gia.testoQ; } else resto.push(v); }
  salvaCiclo({ ...L, extra: [...(L.extra || []), ...resto] });
  const ign = nuovi.filter(x => !x.alimento && !x.nonAlimentare).length;
  toast('Aggiunto alla lista');
}

/* ---------- fogli ---------- */
function sheetScelta(i) {
  const p = P(), x = i >= 0 ? p.draft.piatti[i] : null, q = x ? x.pasto : 'cena';
  const ids = Object.keys(S.R).sort((a, b) => S.R[a].nome.localeCompare(S.R[b].nome));
  const row = (id, quale) => { const t = macroRicetta(id); return `<button class="row" data-act="plan-pick" data-i="${i}" data-r="${id}" data-q="${quale}"><span class="med" style="width:46px;height:46px;background:${tinta(id)}">${arte(id)}</span><span><b>${esc(S.R[id].nome)}</b><small class="num">${fmt(t.kcal)} kcal · ${fmt(t.prot)} g · ${S.R[id].tempo_min}′${S.R[id].nuovo ? ' · nuovo' : ''}</small></span><span class="pill sm">${quale}</span></button>`; };
  openSheet(`<div class="picker"><span class="lab">${x ? `Al posto di: ${esc(S.R[x.ricetta] ? S.R[x.ricetta].nome : x.ricetta)}` : 'Aggiungi al ciclo'}</span><h3 style="font-size:24px">${x ? 'Cambia piatto' : 'Quale piatto?'}</h3>
  ${x ? ids.filter(id => (S.R[id].pasto || []).includes(q)).map(id => row(id, q)).join('') : `<span class="lab">Cena</span>${ids.filter(id => (S.R[id].pasto || []).includes('cena')).map(id => row(id, 'cena')).join('')}<span class="lab" style="margin-top:8px">Pranzo</span>${ids.filter(id => (S.R[id].pasto || []).includes('pranzo')).map(id => row(id, 'pranzo')).join('')}`}</div>`);
}
