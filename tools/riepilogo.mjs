// Riepilogo alimentazione delle ultime 2 settimane, con gli stessi calcoli del sito.
// Uso: node tools/riepilogo.mjs <cartella del clone di camgym> [AAAA-MM-GG] [--json]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const mem = {};
globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.window = { addEventListener() {}, removeEventListener() {} };
globalThis.location = { hostname: 'localhost', pathname: '/' };
if (!globalThis.navigator) Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leggi = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const [gymDir, dataArg] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const json = process.argv.includes('--json');
if (!gymDir) { console.error('Uso: node tools/riepilogo.mjs <cartella camgym> [AAAA-MM-GG] [--json]'); process.exit(1); }

const { S, oggi } = await import('../js/store.js');
const { riepilogo, riepilogoTesto } = await import('../js/riepilogo.js');

S.prog = leggi('programma.json'); S.preset = leggi('preset.json');
S.A = Object.fromEntries(leggi('alimenti.json').map(a => [a.id, a]));
S.R = Object.fromEntries(leggi('ricette/indice.json').map(id => leggi(`ricette/${id}.json`)).map(r => [r.id, r]));
const pr = leggi('preferenze.json'); S.pref = { togli: pr.togli || {}, nonMiPiace: pr.nonMiPiace || [], varianti: pr.varianti || {} };
S.giorni = Object.fromEntries(fs.readdirSync(path.join(root, 'giorni')).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(f => [f.slice(0, 10), leggi(`giorni/${f}`)]));
const sessioni = {}, peso = {};
for (const f of fs.existsSync(path.join(gymDir, 'logs')) ? fs.readdirSync(path.join(gymDir, 'logs')) : []) { const m = f.match(/^(\d{4}-\d{2}-\d{2})-([a-z]+)/); if (m) (sessioni[m[1]] = sessioni[m[1]] || []).push(m[2]); }
for (const f of fs.existsSync(path.join(gymDir, 'peso')) ? fs.readdirSync(path.join(gymDir, 'peso')) : []) { if (!f.endsWith('.json')) continue; try { const j = JSON.parse(fs.readFileSync(path.join(gymDir, 'peso', f), 'utf8')); if (j.kg) peso[f.slice(0, 10)] = j.kg; } catch { /* file illeggibile */ } }
S.gym = { sessioni, peso, quando: Date.now() };

const r = riepilogo(dataArg || oggi());
console.log(json ? JSON.stringify(r, null, 1) : riepilogoTesto(r));
