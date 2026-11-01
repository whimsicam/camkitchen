// CAM Kitchen: scheda Spesa (prepara la prossima spesa, lista a scontrino, in casa).
import { S, salvaCiclo, salvaGiorno, salvaAlias, salvaInbox, giorno, oggi, uid, nowISO, saveUI, eliminaRemoto } from './store.js';
import { fmt, addDays, dow, generaCiclo, stimaCiclo, calcolaLista, parseVoci, dispensa, cicloDi, statoCiclo, giorniTra, confezioni, macroRicetta } from './calc.js';
import { $, esc, toast, mascot, arte, tinta, breve, illo, openSheet, closeSheet, ICON } from './ui.js';

const GG = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
const corto = d => `${GG[dow(d)]} ${Number(d.slice(8))}`;
const lungo = d => `${GIORNI[dow(d)]} ${Number(d.slice(8))}`;
const ultimoCiclo = () => Object.values(S.cicli).sort((a, b) => a.dal.localeCompare(b.dal)).pop() || null;
const P = () => (S.ui.plan = S.ui.plan || { step: 0 });

function serveSpesa() {
  const L = ultimoCiclo(); if (!L) return true;
  if (L.dal > oggi()) return false;
  return giorniTra(oggi(), L.al) <= 2;
}

/* ---------- vista ---------- */
export function vistaSpesa() {
  importaInbox();
  const L = ultimoCiclo(), p = P();
  const seg = S.ui.seg || 'buy';
  return `<div><span class="lab">Conad · ogni 7–10 giorni</span><h1 class="ttl" style="margin-top:6px">La spesa</h1></div>
  ${p.step || serveSpesa() ? pianoAperto(L) : pianoChiuso(L)}
  <div class="sp-lists">
    <div class="seg" role="tablist"><button class="${seg === 'buy' ? 'on' : ''}" data-act="seg" data-v="buy">Da comprare</button><button class="${seg === 'home' ? 'on' : ''}" data-act="seg" data-v="home">In casa</button></div>
    <section ${seg === 'buy' ? '' : 'hidden'}>${scontrino(L)}</section>
    <section ${seg === 'home' ? '' : 'hidden'}>${inCasa()}</section>
  </div>`;
}

function pianoChiuso(L) {
  return `<section class="plan"><div style="display:flex;align-items:center;gap:12px">${mascot('sm')}<div style="flex:1"><span class="lab">${L.dal > oggi() ? 'Prossima spesa' : 'Spesa del ciclo in corso'}</span><h2 style="font-size:19px;margin-top:2px">${lungo(L.dal)} · ${giorniTra(L.dal, L.al) + 1} giorni</h2></div><button class="pill sm" data-act="plan-open">Rifai il menù</button></div></section>`;
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
    const c = p.draft, s = stimaCiclo(c), T = S.prog.target;
    const giud = s.kcal < T.kcal_min ? `sotto il minimo di ${fmt(T.kcal_min - s.kcal)} kcal` : s.kcal > T.kcal_max + 150 ? 'sopra il massimo' : 'in linea con il target';
    const tile = (x, i) => `<div class="mi" style="position:relative"><button class="mcard" data-act="plan-swap" data-i="${i}" style="--tint:${tinta(x.ricetta)};width:100%;margin:0"><span class="art">${arte(x.ricetta)}</span><b>${esc(breve(x.ricetta))}</b><small>${x.pasto === 'pranzo' ? 'pranzo' : 'cena'}${x.da_ciclo ? ' · riportato' : ''}</small></button><button class="x" data-act="plan-rm" data-i="${i}" aria-label="Togli">×</button>${x.nuovo ? '<span class="new">nuovo</span>' : ''}</div>`;
    body = `<span class="lab">${c.piatti.filter(x => x.pasto === 'cena').length} cene e ${c.piatti.filter(x => x.pasto === 'pranzo').length} pranzi · tocca un piatto per cambiarlo, × per toglierlo</span>
    <div class="plates">${c.piatti.map(tile).join('')}<button class="mi empty" data-act="plan-add"><span class="med">${addSvg}</span><span>aggiungi</span></button></div>
    <p class="note num" style="margin:0">Media stimata <b style="color:var(--ink);font-weight:600">${fmt(s.kcal)} kcal</b> e ${fmt(s.prot)} g di proteine al giorno · ${giud}</p>
    <div class="navrow"><button class="link" data-act="plan-step" data-s="1">← Indietro</button><button class="pill solid" data-act="plan-ok">Calcola la lista</button></div>`;
  }
  return `<section class="plan"><div style="display:flex;align-items:center;gap:12px">${mascot('sm')}<div style="flex:1"><span class="lab">${L ? (L.al >= oggi() ? `Il ciclo finisce ${lungo(L.al)}` : 'Il ciclo è finito') : 'Il primo menù'}</span><h2 style="font-size:20px;margin-top:2px">Prepara la prossima spesa</h2></div>${L ? `<button class="ib" data-act="plan-close" aria-label="Chiudi">${ICON.x}</button>` : ''}</div>
  <div class="steps">${st(1, 'Quando')}<span class="sep"></span>${st(2, 'Piatti')}<span class="sep"></span>${st(3, 'Lista')}</div>${body}</section>`;
}
const addSvg = '<svg viewBox="0 0 100 100" fill="none" stroke="#9A8F80" stroke-width="1.4"><circle cx="50" cy="50" r="22" stroke-dasharray="3 4"/><path d="M50 40v20M40 50h20"/></svg>';

function scontrino(L) {
  if (!L) return `<div class="empty-st">${mascot()}<b>Nessuna lista ancora</b><small>Prepara il primo menù qui sopra: la lista si calcola dai piatti e dalla giornata tipo.</small></div>${aggiunte(null)}`;
  const items = L.lista || [];
  const conto = {}; for (const x of statoCiclo(L)) if (!x.fatto) conto[x.ricetta] = (conto[x.ricetta] || 0) + 1;
  const gruppi = {}; for (const it of items) (gruppi[it.gruppo] = gruppi[it.gruppo] || []).push(it);
  const ordine = Object.keys(gruppi).sort((a, b) => (a === 'giornata') - (b === 'giornata'));
  const tot = items.length + (L.extra || []).length, presi = items.filter(x => x.preso).length + (L.extra || []).filter(x => x.preso).length;
  const gHead = g => g === 'giornata'
    ? `<div class="grp-h"><span class="med" style="width:30px;height:30px;border-style:dashed;border-color:var(--faded)"></span><b>Giornata tipo · ${giorniTra(L.dal > oggi() ? L.dal : oggi(), L.al) + 1} giorni</b></div>`
    : `<div class="grp-h"><span class="med" style="width:30px;height:30px;background:${tinta(g)}">${arte(g)}</span><b>Per ${esc(breve(g).toLowerCase())}${conto[g] > 1 ? ` ×${conto[g]}` : ''}</b></div>`;
  return `<div class="receipt">
    <div class="rc-head"><b>Lista della spesa</b><span class="lab num">${lungo(L.dal)} · ${giorniTra(L.dal, L.al) + 1} giorni</span><div class="prog"><i style="width:${tot ? presi / tot * 100 : 0}%"></i></div><span class="lab num">${presi} di ${tot} nel carrello</span></div>
    ${ordine.map(g => `<div class="grp">${gHead(g)}${gruppi[g].map(riga).join('')}</div>`).join('')}
    ${aggiunte(L)}
    ${tot && presi === tot ? `<div class="empty-st">${mascot()}<b>Tutto nel carrello</b><small>La dispensa è già aggiornata. Buona cucina.</small></div>` : ''}
    <div style="text-align:center;margin-top:12px"><button class="link" data-act="lista-ricalcola">Ricalcola la lista</button></div>
  </div>`;
}
function riga(it) {
  return `<button class="it ${it.preso ? 'on' : ''}" data-act="lista-tick" data-id="${esc(it.id)}"><span class="box"></span><span><span class="n">${esc(it.alimento && S.A[it.alimento] ? S.A[it.alimento].nome : it.testo)}</span>${it.nota ? `<small>${esc(it.nota)}</small>` : ''}</span><span class="q num">${esc(it.testoQ || it.testo)}</span></button>`;
}
function aggiunte(L) {
  const ex = L ? (L.extra || []) : S.inbox.map(x => ({ id: x.file, testo: x.testo, provvisoria: true }));
  const form = `<form class="search addform" data-form="add"><svg class="ico" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><input id="addq" placeholder="Scrivi cosa comprare (es. 6 uova, marmellata)" autocomplete="off" enterkeyhint="done"><button class="pill sm solid" type="submit">Aggiungi</button></form>`;
  return `<div class="grp"><div class="grp-h"><span class="med" style="width:30px;height:30px;border-style:dashed;border-color:var(--blue-l)"></span><b>Aggiunte da te</b></div>
  ${form}
  ${ex.map(it => it.provvisoria
    ? `<div class="evrow"><span>${esc(it.testo)}</span><span></span><button class="del" data-act="inbox-del" data-id="${esc(it.id)}" aria-label="Togli">${ICON.x}</button></div>`
    : `<div style="display:grid;grid-template-columns:1fr auto;align-items:center"><button class="it ${it.preso ? 'on' : ''}" data-act="extra-tick" data-id="${esc(it.id)}"><span class="box"></span><span><span class="n">${esc(it.testo)}</span>${!it.alimento && !it.nonAlimentare ? '' : `<small>${it.nonAlimentare ? 'non alimentare' : esc(S.A[it.alimento] ? S.A[it.alimento].nome : '')}</small>`}</span><span class="q num">${it.g && it.alimento ? esc(confezioni(it.alimento, it.g).testo) : ''}</span></button>${!it.alimento && !it.nonAlimentare ? `<button class="assoc" data-act="assoc" data-id="${esc(it.id)}">Associa</button>` : `<button class="del" data-act="extra-del" data-id="${esc(it.id)}" aria-label="Togli" style="width:28px;height:28px;color:var(--faded)">${ICON.x}</button>`}</div>`).join('')}
  ${!L && ex.length ? '<p class="note">Entrano nella lista quando prepari il menù qui sopra.</p>' : ''}</div>`;
}

/* ---------- in casa ---------- */
const AREA = { carne: 'Frigo', salumi: 'Frigo', latticini: 'Frigo', pesce: 'Frigo', uova: 'Frigo', bevande: 'Frigo', verdura: 'Frutta e verdura', frutta: 'Frutta e verdura' };
function inCasa() {
  const d = dispensa(), ids = Object.keys(d.saldo).filter(id => S.A[id]);
  if (!ids.length) return `<div class="empty-st">${mascot()}<b>Cosa hai in casa ora?</b><small>Un inventario veloce dà il punto di partenza: da lì la dispensa si aggiorna da sola con la spesa e i pasti.</small><button class="pill solid" data-act="inv">Fai l'inventario</button></div>`;
  const per = {};
  for (const id of ids) { if (d.saldo[id] <= 0.5) continue; const area = AREA[S.A[id].categoria] || 'Dispensa'; (per[area] = per[area] || []).push(id); }
  const fin = ids.filter(id => d.saldo[id] <= 0.5 && d.ultimoCarico[id]);
  const jar = id => {
    const a = S.A[id], c = a.confezione || {}, pack = c.g || (c.g_pz ? c.g_pz * (c.pz || 1) : 0), g = d.saldo[id];
    const q = c.g_pz ? `${fmt(g / c.g_pz, g / c.g_pz % 1 ? 1 : 0)} ${id === 'uova' ? '' : 'pz'}` : `${fmt(g)} ${a.unita === 'ml' ? 'ml' : 'g'}`;
    const fr = a.fresco_giorni && d.ultimoCarico[id] ? giorniTra(oggi(), addDays(d.ultimoCarico[id], a.fresco_giorni)) : null;
    return `<button class="jar" data-act="rett" data-id="${id}"><span>${esc(a.nome)}${fr != null && fr <= 1 ? `<small>${fr < 0 ? 'forse da buttare' : fr === 0 ? 'da consumare oggi' : 'da consumare entro domani'}</small>` : ''}</span><span class="g ${pack && g / pack < 0.25 ? 'low' : ''}"><i style="width:${pack ? Math.min(100, g / pack * 100) : 50}%"></i></span><span class="q num">${q}</span></button>`;
  };
  return `<div class="bhead"><h2>In casa</h2><span class="lab">tocca per correggere</span></div><div class="shelf">
  ${['Frigo', 'Frutta e verdura', 'Dispensa'].filter(a => per[a]).map(a => `<div class="cat"><span class="lab">${a}</span></div>${per[a].sort((x, y) => S.A[x].nome.localeCompare(S.A[y].nome)).map(jar).join('')}`).join('')}
  ${fin.length ? `<div class="cat"><span class="lab">Finiti</span></div><p class="note" style="margin:0">${fin.map(id => esc(S.A[id].nome)).join(' · ')}</p>` : ''}
  </div><div style="text-align:center;margin-top:16px"><button class="link" data-act="inv">Rifai l'inventario</button></div>`;
}

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
  if (/^(lista-tick|lista-ricalcola|extra-tick|extra-del|assoc|assoc-ok)$/.test(act) && !L) { closeSheet(); return true; }
  if (act === 'lista-tick' && !(L.lista || []).some(x => x.id === el.dataset.id)) return true;
  if (/^(extra-tick|assoc|assoc-ok)$/.test(act) && !(L.extra || []).some(x => x.id === el.dataset.id)) { closeSheet(); return true; }
  if (act === 'plan-pick' && Number(el.dataset.i) >= p.draft.piatti.length) { closeSheet(); return true; }
  switch (act) {
    case 'seg': S.ui.seg = el.dataset.v; saveUI(); return true;
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
      salvaCiclo(c); S.ui.plan = { step: 0 }; S.ui.seg = 'buy'; saveUI(); toast('Menù e lista pronti'); return true; }
    case 'lista-tick': { const it = L.lista.find(x => x.id === el.dataset.id); it.preso = !it.preso; caricoPer(it, it.preso); salvaCiclo({ ...L }); return true; }
    case 'lista-ricalcola': { const presi = new Set(L.lista.filter(x => x.preso).map(x => x.id)); const nuova = calcolaLista(L).items.filter(x => !presi.has(x.id)); salvaCiclo({ ...L, lista: [...L.lista.filter(x => x.preso), ...nuova] }); toast('Lista ricalcolata'); return true; }
    case 'extra-tick': { if (!L) return false; const it = L.extra.find(x => x.id === el.dataset.id); it.preso = !it.preso; caricoPer(it, it.preso); salvaCiclo({ ...L }); return true; }
    case 'inbox-del': S.inbox = S.inbox.filter(x => x.file !== el.dataset.id); salvaInbox(); return true;
    case 'extra-del': { if (!L) return false; salvaCiclo({ ...L, extra: L.extra.filter(x => x.id !== el.dataset.id) }); return true; }
    case 'assoc': sheetAssocia(el.dataset.id); return false;
    case 'assoc-ok': { const it = L.extra.find(x => x.id === el.dataset.id), v = $('as-al').value; if (!v) { toast('Scegli un alimento'); return false; }
      salvaAlias(it.chiave || it.testo, v);
      if (v === '-') { it.nonAlimentare = true; } else { it.alimento = v; const c = S.A[v].confezione || {}; it.g = it.g || c.g || (c.g_pz ? c.g_pz * (c.pz || 1) : 0); }
      salvaCiclo({ ...L }); closeSheet(); toast('Associato: la prossima volta lo riconosco'); return true; }
    case 'rett': sheetRettifica(el.dataset.id); return false;
    case 'rett-ok': case 'rett-fin': { const id = el.dataset.id, a = S.A[id], c = a.confezione || {};
      const v = act === 'rett-fin' ? 0 : Number(String($('rt-q').value).replace(',', '.')) || 0;
      const nuovo = c.g_pz ? { nuovo_pz: v } : { nuovo_g: v };
      const g = structuredClone(giorno(oggi())); g.eventi.push({ id: uid(), t: nowISO(), tipo: 'rettifica', alimento: id, ...nuovo, motivo: act === 'rett-fin' ? 'finito' : 'correzione' }); salvaGiorno(g);
      closeSheet(); toast('Dispensa corretta'); return true; }
    case 'inv': sheetInventario(); return false;
    case 'inv-ok': { const g = structuredClone(giorno(oggi())); let n = 0;
      document.querySelectorAll('[data-inv]').forEach(i => { const q = Number(String(i.value).replace(',', '.')) || 0, id = i.dataset.inv, a = S.A[id], c = a.confezione || {};
        const gg = i.dataset.u === 'pz' ? q * (c.g_pz || 0) : i.dataset.u === 'conf' ? q * (c.g || 0) : q;
        g.eventi.push({ id: uid(), t: nowISO(), tipo: 'rettifica', alimento: id, nuovo_g: Math.round(gg), motivo: 'inventario' }); n++; });
      salvaGiorno(g); closeSheet(); S.ui.seg = 'home'; saveUI(); toast(`Inventario salvato: ${n} alimenti`); return true; }
  }
  return null;
}
export function inviaAggiunta(testo) {
  const L = ultimoCiclo(); if (!testo.trim()) return;
  if (!L) { S.inbox.push({ file: uid(), testo: testo.trim(), quando: nowISO() }); salvaInbox(); toast('Aggiunto'); return; }
  const nuovi = parseVoci(testo).map(v => ({ id: uid(), testo: v.testo, chiave: v.chiave, alimento: v.alimento, nonAlimentare: v.nonAlimentare, g: v.g }));
  salvaCiclo({ ...L, extra: [...(L.extra || []), ...nuovi] });
  const ign = nuovi.filter(x => !x.alimento && !x.nonAlimentare).length;
  toast(ign ? 'Aggiunto · tocca "Associa" per le voci nuove' : 'Aggiunto alla lista');
}

/* ---------- fogli ---------- */
function sheetScelta(i) {
  const p = P(), x = i >= 0 ? p.draft.piatti[i] : null, q = x ? x.pasto : 'cena';
  const ids = Object.keys(S.R).sort((a, b) => S.R[a].nome.localeCompare(S.R[b].nome));
  const row = (id, quale) => { const t = macroRicetta(id); return `<button class="row" data-act="plan-pick" data-i="${i}" data-r="${id}" data-q="${quale}"><span class="med" style="width:46px;height:46px;background:${tinta(id)}">${arte(id)}</span><span><b>${esc(S.R[id].nome)}</b><small class="num">${fmt(t.kcal)} kcal · ${fmt(t.prot)} g · ${S.R[id].tempo_min}′${S.R[id].nuovo ? ' · nuovo' : ''}</small></span><span class="pill sm">${quale}</span></button>`; };
  openSheet(`<div class="picker"><span class="lab">${x ? `Al posto di: ${esc(S.R[x.ricetta] ? S.R[x.ricetta].nome : x.ricetta)}` : 'Aggiungi al ciclo'}</span><h3 style="font-size:24px">${x ? 'Cambia piatto' : 'Quale piatto?'}</h3>
  ${x ? ids.filter(id => (S.R[id].pasto || []).includes(q)).map(id => row(id, q)).join('') : `<span class="lab">Cena</span>${ids.filter(id => (S.R[id].pasto || []).includes('cena')).map(id => row(id, 'cena')).join('')}<span class="lab" style="margin-top:8px">Pranzo</span>${ids.filter(id => (S.R[id].pasto || []).includes('pranzo')).map(id => row(id, 'pranzo')).join('')}`}</div>`);
}
const opzioniAlimenti = (selv = '') => Object.values(S.A).filter(a => a.traccia_dispensa !== false).sort((a, b) => a.nome.localeCompare(b.nome)).map(a => `<option value="${a.id}" ${a.id === selv ? 'selected' : ''}>${esc(a.nome)}</option>`).join('');
function sheetAssocia(id) {
  const it = ultimoCiclo().extra.find(x => x.id === id);
  openSheet(`<div class="form"><span class="lab">Voce nuova</span><h3 style="font-size:24px">"${esc(it.testo)}" è…</h3>
  <div class="field"><select id="as-al"><option value="">Scegli dal catalogo…</option><option value="-">Non è un alimento (non tracciare)</option>${opzioniAlimenti()}</select></div>
  <p class="note">Me lo ricordo: la prossima volta che scrivi o detti "${esc(it.chiave || it.testo)}" lo riconosco da solo. Se l'alimento non c'è, chiedi a Claude di aggiungerlo al catalogo.</p>
  <button class="pill solid" data-act="assoc-ok" data-id="${esc(id)}">Associa</button></div>`);
}
function sheetRettifica(id) {
  const a = S.A[id], c = a.confezione || {}, saldo = Math.max(0, dispensa().saldo[id] || 0);
  const pz = !!c.g_pz, val = pz ? Math.round(saldo / c.g_pz * 10) / 10 : Math.round(saldo);
  openSheet(`<div class="form"><span class="lab">In casa</span><h3 style="font-size:24px">${esc(a.nome)}</h3>
  <div class="field"><span class="lab">Quanto ne hai davvero (${pz ? 'pezzi' : a.unita === 'ml' ? 'ml' : 'grammi'})</span><div class="stepper"><button data-act="stp" data-t="rt-q" data-s="${pz ? 1 : (c.g && c.g < 200 ? 10 : 50)}" data-n="-1">−</button><b><input id="rt-q" value="${String(val).replace('.', ',')}" inputmode="decimal" style="width:90px;border:0;background:transparent;text-align:center;font:inherit;font-weight:600;font-size:20px"></b><button data-act="stp" data-t="rt-q" data-s="${pz ? 1 : (c.g && c.g < 200 ? 10 : 50)}" data-n="1">+</button></div></div>
  <div class="act"><button class="pill solid" data-act="rett-ok" data-id="${id}">Salva</button><button class="pill" data-act="rett-fin" data-id="${id}">È finito</button></div></div>`);
}
function sheetInventario() {
  const d = dispensa();
  const al = Object.values(S.A).filter(a => a.traccia_dispensa !== false && a.id !== 'te').sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));
  const riga = a => { const c = a.confezione || {}, u = c.g_pz ? 'pz' : c.g ? 'conf' : 'g';
    const cur = d.saldo[a.id] != null ? (u === 'pz' ? d.saldo[a.id] / c.g_pz : u === 'conf' ? d.saldo[a.id] / c.g : d.saldo[a.id]) : 0;
    const lab = u === 'pz' ? (a.id === 'uova' ? 'uova' : 'pezzi') : u === 'conf' ? `${c.nome || 'confezione'} da ${fmt(c.g)} ${a.unita === 'ml' ? 'ml' : 'g'}` : 'grammi';
    return `<div class="evrow"><span>${esc(a.nome)}<small style="display:block">${lab}</small></span><span class="stepper" style="gap:6px"><button data-act="stp" data-t="inv-${a.id}" data-s="${u === 'conf' ? 0.5 : 1}" data-n="-1" style="width:30px;height:30px">−</button><input id="inv-${a.id}" data-inv="${a.id}" data-u="${u}" value="${String(Math.round(cur * 10) / 10).replace('.', ',')}" inputmode="decimal" style="width:46px;border:0;background:transparent;text-align:center;font:inherit;font-weight:600"><button data-act="stp" data-t="inv-${a.id}" data-s="${u === 'conf' ? 0.5 : 1}" data-n="1" style="width:30px;height:30px">+</button></span><span></span></div>`; };
  openSheet(`<div class="form"><span class="lab">Inventario</span><h3 style="font-size:24px">Cosa hai in casa ora?</h3><p class="note" style="margin:0">A occhio va benissimo: mezza confezione = 0,5. Lascia 0 quello che non hai.</p>
  <div>${al.map(riga).join('')}</div><button class="pill solid" data-act="inv-ok">Salva l'inventario</button></div>`);
}
