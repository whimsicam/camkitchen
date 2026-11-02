// CAM Kitchen: stato, cache locale e sincronizzazione con GitHub (stesso schema di CAM Gym).
export const APP_NAME = 'CAM Kitchen';

const K = {
  cfg: 'ck.cfg', giorni: 'ck.giorni', cicli: 'ck.cicli', alias: 'ck.alias', shas: 'ck.shas', coda: 'ck.coda',
  pref: 'ck.pref', prog: 'ck.prog', alimenti: 'ck.alimenti', preset: 'ck.preset', ricette: 'ck.ricette', gym: 'ck.gym', ui: 'ck.ui', inbox: 'ck.inbox',
};
const leggi = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const scrivi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('localStorage', e); } };

export const S = {
  cfg: {}, prog: null, A: {}, preset: null, R: {},
  giorni: {}, cicli: {}, alias: {}, pref: { togli: {}, nonMiPiace: [] }, inbox: [], shas: {}, coda: [],
  gym: { sessioni: {}, peso: {}, quando: 0 },
  sync: { stato: 'idle', msg: '' },
  ui: {},
  listeners: new Set(),
};
export const emit = () => S.listeners.forEach(f => f());
export const saveUI = () => scrivi(K.ui, S.ui);

/* ---------- configurazione ---------- */
function cfgDefault() {
  const h = location.hostname, seg = location.pathname.split('/').filter(Boolean)[0] || '';
  return h.endsWith('.github.io') ? { owner: h.split('.')[0], repo: seg } : { owner: '', repo: '' };
}
export function cfg() { return { ...cfgDefault(), branch: 'main', token: '', gym: 'whimsicam/camgym', progetto: '01a179ad-ec7c-72e6-b1ae-1c80c855d831', ...S.cfg }; }
export function setCfg(c) { S.cfg = { ...S.cfg, ...c }; scrivi(K.cfg, S.cfg); }
export const syncPronto = () => { const c = cfg(); return !!(c.owner && c.repo && c.token); };

/* ---------- id e date ---------- */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const oggi = () => iso(new Date());
export const nowISO = () => { const d = new Date(), o = -d.getTimezoneOffset(), s = o >= 0 ? '+' : '-', p = n => String(Math.floor(Math.abs(n))).padStart(2, '0'); return `${iso(d)}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${s}${p(o / 60)}:${p(o % 60)}`; };

/* ---------- giorni e cicli ---------- */
export function giorno(data) {
  return S.giorni[data] || { data, giornata: {}, pranzo: null, eventi: [], rimossi: [] };
}
export function salvaGiorno(g) {
  g.eventi = g.eventi || []; g.rimossi = g.rimossi || []; g.giornata = g.giornata || {};
  S.giorni[g.data] = g;
  scrivi(K.giorni, S.giorni);
  accoda(`giorni/${g.data}.json`);
  emit();
}
export function salvaCiclo(c) {
  S.cicli[c.id] = c;
  scrivi(K.cicli, S.cicli);
  accoda(`cicli/${c.id}.json`);
  emit();
}
export function salvaAlias(testo, alimento) {
  S.alias[testo.toLowerCase().trim()] = alimento;
  scrivi(K.alias, S.alias);
  accoda('alias-utente.json');
}
export function salvaInbox() { scrivi(K.inbox, S.inbox); }
export function salvaPref() { scrivi(K.pref, S.pref); accoda('preferenze.json'); emit(); }
function unisciPref(a, b) {
  const togli = { ...(b.togli || {}) };
  for (const [k, v] of Object.entries(a.togli || {})) togli[k] = v;
  return { togli, nonMiPiace: [...new Set([...(a.nonMiPiace || [])])] };
}

function accoda(path) {
  if (!S.coda.includes(path)) S.coda.push(path);
  scrivi(K.coda, S.coda);
  programmaSync();
}
let timer = null;
function programmaSync() { clearTimeout(timer); timer = setTimeout(() => sincronizza(), 1500); }

function contenutoLocale(path) {
  if (path.startsWith('giorni/')) return S.giorni[path.slice(7, -5)];
  if (path.startsWith('cicli/')) return S.cicli[path.slice(6, -5)];
  if (path === 'alias-utente.json') return S.alias;
  if (path === 'preferenze.json') return S.pref;
  return null;
}

/* ---------- merge ---------- */
export function unisciGiorno(loc, rem) {
  if (!loc) return rem; if (!rem) return loc;
  const rimossi = [...new Set([...(rem.rimossi || []), ...(loc.rimossi || [])])];
  const ev = new Map();
  for (const e of [...(rem.eventi || []), ...(loc.eventi || [])]) if (!rimossi.includes(e.id)) ev.set(e.id, e);
  return {
    data: loc.data,
    giornata: { ...(rem.giornata || {}), ...(loc.giornata || {}) },
    pranzo: loc.pranzo !== undefined ? loc.pranzo : rem.pranzo,
    eventi: [...ev.values()].sort((a, b) => (a.t || '').localeCompare(b.t || '')),
    rimossi,
  };
}

/* ---------- GitHub ---------- */
function erroreGH(st) {
  if (st === 401) return 'il token non è valido o è scaduto (rigeneralo su GitHub)';
  if (st === 403) return 'il token non può scrivere: su GitHub serve il permesso Contents "Read and write" sul repo camkitchen';
  if (st === 404) return 'repo o ramo non trovato, oppure il token non include il repo camkitchen';
  return `errore GitHub ${st}`;
}
async function gh(path, opts = {}) {
  const c = cfg();
  return fetch(`https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}${path}`, {
    ...opts, cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${c.token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) },
  });
}
const percorso = p => `/contents/${p.split('/').map(encodeURIComponent).join('/')}`;
const ref = () => `?ref=${encodeURIComponent(cfg().branch || 'main')}`;
function b64(str) { const b = new TextEncoder().encode(str); let s = ''; b.forEach(x => { s += String.fromCharCode(x); }); return btoa(s); }

async function leggiRemoto(path) {
  const r = await gh(percorso(path) + ref(), { headers: { Accept: 'application/vnd.github.raw+json' } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(erroreGH(r.status));
  return r.json();
}
async function infoRemoto(path) {
  const r = await gh(percorso(path) + ref());
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(erroreGH(r.status));
  return r.json();
}
async function scriviRemoto(path, dati, msg, sha) {
  const body = { message: msg, content: b64(JSON.stringify(dati, null, 1) + '\n'), branch: cfg().branch || 'main' };
  if (sha) body.sha = sha;
  return gh(percorso(path), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
export async function eliminaRemoto(path, msg) {
  const info = await infoRemoto(path); if (!info) return;
  const r = await gh(percorso(path), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, sha: info.sha, branch: cfg().branch || 'main' }) });
  if (!r.ok && r.status !== 404) throw new Error(erroreGH(r.status));
}

function messaggio(path) {
  if (path.startsWith('giorni/')) return `giorno: ${path.slice(7, -5)}`;
  if (path.startsWith('cicli/')) return `menù: ciclo ${path.slice(6, -5)}`;
  if (path === 'preferenze.json') return 'preferenze: ingredienti tolti';
  return `dati: ${path}`;
}

async function invia(path) {
  let dati = contenutoLocale(path);
  if (!dati) return;
  for (let tent = 0; tent < 3; tent++) {
    const r = await scriviRemoto(path, dati, messaggio(path), S.shas[path]);
    if (r.ok) { const j = await r.json(); S.shas[path] = j.content.sha; return; }
    if (r.status === 409 || r.status === 422) {
      // il file è cambiato altrove: si rilegge, si unisce e si riprova
      const info = await infoRemoto(path);
      const rem = info ? await leggiRemoto(path) : null;
      S.shas[path] = info ? info.sha : undefined;
      if (path.startsWith('giorni/') && rem) { dati = unisciGiorno(dati, rem); S.giorni[dati.data] = dati; scrivi(K.giorni, S.giorni); }
      if (path === 'alias-utente.json' && rem) { S.alias = { ...rem, ...S.alias }; dati = S.alias; scrivi(K.alias, S.alias); }
      if (path === 'preferenze.json' && rem) { S.pref = unisciPref(S.pref, rem); dati = S.pref; scrivi(K.pref, S.pref); }
      continue;
    }
    throw new Error(erroreGH(r.status));
  }
  throw new Error('conflitto non risolto');
}

async function scarica() {
  const c = cfg();
  const r = await gh(`/git/trees/${encodeURIComponent(c.branch || 'main')}?recursive=1`);
  if (!r.ok) throw new Error(erroreGH(r.status));
  const albero = (await r.json()).tree || [];
  let cambi = 0;
  const inboxRemota = [];
  for (const f of albero) {
    if (f.type !== 'blob' || !f.path.endsWith('.json')) continue;
    const p = f.path;
    if (p.startsWith('inbox/')) { inboxRemota.push(f); continue; }
    if (!(p.startsWith('giorni/') || p.startsWith('cicli/') || p === 'alias-utente.json' || p === 'preferenze.json')) continue;
    if (S.shas[p] === f.sha) continue;
    const rem = await leggiRemoto(p).catch(() => null);
    S.shas[p] = f.sha; if (!rem) continue;
    if (p.startsWith('giorni/')) { const d = p.slice(7, -5); S.giorni[d] = unisciGiorno(S.coda.includes(p) ? S.giorni[d] : null, rem) || rem; }
    else if (p.startsWith('cicli/')) { const id = p.slice(6, -5); if (!S.coda.includes(p)) S.cicli[id] = rem; }
    else if (p === 'preferenze.json') S.pref = S.coda.includes(p) ? unisciPref(S.pref, rem) : { togli: rem.togli || {}, nonMiPiace: rem.nonMiPiace || [] };
    else S.alias = { ...rem, ...S.alias };
    cambi++;
  }
  // voci della spesa arrivate da Siri: entrano nella lista locale e il file si cancella dal repo
  for (const f of inboxRemota) {
    const rem = await leggiRemoto(f.path).catch(() => null);
    if (rem && rem.testo && !S.inbox.some(x => x.file === f.path)) { S.inbox.push({ file: f.path, testo: rem.testo, quando: rem.quando || nowISO() }); cambi++; }
    try { await eliminaRemoto(f.path, 'spesa: voce da Siri importata'); } catch { /* si riprova alla prossima */ }
  }
  if (cambi) { scrivi(K.giorni, S.giorni); scrivi(K.cicli, S.cicli); scrivi(K.alias, S.alias); scrivi(K.pref, S.pref); salvaInbox(); }
  scrivi(K.shas, S.shas);
  return cambi;
}

let inCorso = false;
export async function sincronizza(manuale = false) {
  if (inCorso) return;
  if (!syncPronto()) { S.sync = { stato: 'off', msg: 'Sincronizzazione non configurata' }; emit(); return; }
  if (!navigator.onLine) { S.sync = { stato: 'wait', msg: 'Offline: dati salvati sul telefono' }; emit(); return; }
  inCorso = true; S.sync = { stato: 'sync', msg: 'Sincronizzo…' }; emit();
  try {
    while (S.coda.length) {
      const p = S.coda[0];
      await invia(p);
      S.coda = S.coda.filter(x => x !== p); scrivi(K.coda, S.coda); scrivi(K.shas, S.shas);
    }
    await scarica();
    S.sync = { stato: 'ok', msg: 'Sincronizzato' };
  } catch (err) {
    S.sync = { stato: 'err', msg: `Sync non riuscita: ${err.message || err}` };
  } finally {
    inCorso = false; emit();
    if (manuale) return S.sync;
  }
}
export async function provaConnessione() {
  if (!syncPronto()) return 'Compila owner, repo e token.';
  try {
    const r = await gh('');
    if (!r.ok) return `Non riesco a collegarmi: ${erroreGH(r.status)}.`;
    const j = await r.json();
    if (j.permissions && j.permissions.push === false) return `Connesso a ${j.full_name}, ma il token non può scrivere.`;
    // la lettura non basta: si prova davvero a inviare quello che è in coda (o il giorno di oggi)
    if (!S.coda.length) { const d = oggi(); if (S.giorni[d]) accoda(`giorni/${d}.json`); }
    clearTimeout(timer); await sincronizza(true);
    return S.sync.stato === 'ok' ? `OK: connesso a ${j.full_name} e dati inviati.` : `Connesso a ${j.full_name}, ma l'invio non riesce: ${S.sync.msg.replace('Sync non riuscita: ', '')}.`;
  } catch (e) { return `Errore: ${e.message || e}`; }
}

/* ---------- file del programma (scritti da Claude) ---------- */
async function getJSON(p) {
  const r = await fetch(`${p}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return r.json();
}
export async function caricaProgramma() {
  try {
    const [prog, alimenti, preset, indice] = await Promise.all([getJSON('programma.json'), getJSON('alimenti.json'), getJSON('preset.json'), getJSON('ricette/indice.json')]);
    const ric = await Promise.all(indice.map(id => getJSON(`ricette/${id}.json`).catch(() => null)));
    S.prog = prog; S.preset = preset;
    S.A = Object.fromEntries(alimenti.map(a => [a.id, a]));
    S.R = Object.fromEntries(ric.filter(Boolean).map(r => [r.id, r]));
    if (!localStorage.getItem(K.pref)) { const pr = await getJSON('preferenze.json').catch(() => null); if (pr) { S.pref = { togli: pr.togli || {}, nonMiPiace: pr.nonMiPiace || [] }; scrivi(K.pref, S.pref); } }
    scrivi(K.prog, prog); scrivi(K.preset, preset); scrivi(K.alimenti, alimenti); scrivi(K.ricette, Object.values(S.R));
  } catch (e) {
    console.warn('programma offline', e);
    S.prog = leggi(K.prog, null); S.preset = leggi(K.preset, null);
    S.A = Object.fromEntries((leggi(K.alimenti, [])).map(a => [a.id, a]));
    S.R = Object.fromEntries((leggi(K.ricette, [])).map(r => [r.id, r]));
  }
}

/* ---------- CAM Gym (repo pubblico, sola lettura) ---------- */
export async function caricaGym(forza = false) {
  const c = cfg(); if (!c.gym) return;
  if (!forza && Date.now() - (S.gym.quando || 0) < 30 * 60 * 1000) return;
  try {
    const [owner, repo] = c.gym.split('/');
    const lista = async dir => { const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${dir}`, { cache: 'no-store' }); return r.ok ? r.json() : []; };
    const [logs, peso] = await Promise.all([lista('logs'), lista('peso')]);
    const sessioni = {};
    for (const f of Array.isArray(logs) ? logs : []) {
      const m = f.name.match(/^(\d{4}-\d{2}-\d{2})-([a-z]+)/); if (m) (sessioni[m[1]] = sessioni[m[1]] || []).push(m[2]);
    }
    const pesoMap = { ...(S.gym.peso || {}) };
    const recenti = (Array.isArray(peso) ? peso : []).filter(f => f.name.endsWith('.json')).map(f => f.name.slice(0, 10)).filter(d => !pesoMap[d]).sort().slice(-90);
    await Promise.all(recenti.map(async d => {
      try { const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/peso/${d}.json`, { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (j.kg) pesoMap[d] = j.kg; } } catch { /* niente */ }
    }));
    S.gym = { sessioni, peso: pesoMap, quando: Date.now() };
    scrivi(K.gym, S.gym); emit();
  } catch (e) { console.warn('CAM Gym non raggiungibile', e); }
}

/* ---------- avvio ---------- */
export function caricaLocale() {
  S.cfg = leggi(K.cfg, {}); S.giorni = leggi(K.giorni, {}); S.cicli = leggi(K.cicli, {}); S.alias = leggi(K.alias, {});
  S.inbox = leggi(K.inbox, []); S.shas = leggi(K.shas, {}); S.coda = leggi(K.coda, []); S.gym = leggi(K.gym, { sessioni: {}, peso: {}, quando: 0 });
  S.ui = leggi(K.ui, {});
  S.pref = leggi(K.pref, null) || { togli: {}, nonMiPiace: [] };
}
export function esporta() {
  return JSON.stringify({ giorni: S.giorni, cicli: S.cicli, alias: S.alias, inbox: S.inbox }, null, 1);
}
window.addEventListener('online', () => sincronizza());
