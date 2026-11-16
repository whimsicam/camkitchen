// CAM Kitchen: il Ricettario (filtri, carte da sfogliare, indice, i miei piatti, Chiedi a Claude).
import { S, giorno, salvaGiorno, salvaCiclo, oggi, saveUI, cfg } from './store.js';
import { fmt, macroRicetta, dispensa, statoIngredienti, totaliGiorno, cicloDi, quantitaTesto, tolti } from './calc.js';
import { $, esc, toast, mascot, arte, tinta, illo, closeOverlay } from './ui.js';

// restano solo i tre cursori: gli altri filtri della versione precedente si azzerano
const F = () => { const v = S.ui.rf || {}; return (S.ui.rf = { tempo: v.tempo ?? -1, voglia: v.voglia ?? -1, novita: v.novita ?? -1, casa: false, piano: 0, q: '', cap: '', pasto: '' }); };
const CH = [
  ['tempo', 'Tempo', [['Veloce', 'fino a 15′'], ['Normale', '15–30′'], ['Con calma', 'oltre 30′']]],
  ['voglia', 'Voglia', [['Poca', 'pochi passaggi'], ['Un po\'', 'qualche tecnica'], ['Tanta', 'mi impegno']]],
  ['novita', 'Novità', [['Il solito', 'già fatti'], ['Variante', 'mai fatti, non nuovi'], ['Nuovo', 'da provare']]],
];

/* ---------- storico: quante volte e che voto ---------- */
export function storico() {
  const h = {};
  for (const [d, g] of Object.entries(S.giorni)) for (const e of g.eventi || []) if (e.tipo === 'pasto') {
    const x = (h[e.ricetta] = h[e.ricetta] || { volte: 0, voti: [], ultima: '' });
    x.volte++; if (e.voto) x.voti.push(e.voto); if (d > x.ultima) x.ultima = d;
  }
  for (const x of Object.values(h)) x.voto = x.voti.length ? x.voti.reduce((a, b) => a + b, 0) / x.voti.length : null;
  return h;
}

/* ---------- filtro e punteggio ---------- */
function risultati() {
  const f = F(), disp = dispensa(), h = storico();
  const tracciata = Object.keys(disp.saldo).length > 0;
  const q = f.q.trim().toLowerCase();
  const out = [];
  for (const r of Object.values(S.R)) {
    if (f.cap && r.capitolo !== f.cap) continue;
    if (f.pasto && !(r.pasto || []).includes(f.pasto)) continue;
    if (f.tempo === 0 && r.tempo_min > 15) continue;
    if (f.tempo === 1 && (r.tempo_min <= 15 || r.tempo_min > 30)) continue;
    if (f.tempo === 2 && r.tempo_min <= 30) continue;
    if (f.voglia >= 0 && (r.sforzo || 1) !== f.voglia + 1) continue;
    const fatto = !!h[r.id];
    if (f.novita === 0 && !fatto) continue;
    if (f.novita === 1 && (fatto || r.nuovo)) continue;
    if (f.novita === 2 && (fatto || !r.nuovo) && !(r.nuovo && !fatto)) continue;
    if (f.piano === 1 && r.dentro_piano === false) continue;
    if (f.piano === 2 && r.dentro_piano !== false) continue;
    const ing = statoIngredienti(r.id, disp).filter(i => i.stato !== 'base');
    const mancanti = tracciata ? ing.filter(i => i.stato !== 'ok') : [];
    if (f.casa && tracciata && mancanti.length) continue;
    if (q) {
      const testo = [r.nome, r.sottotitolo || '', ...ing.map(i => i.nome), ...r.ingredienti.map(i => (S.A[i.alimento] && (S.A[i.alimento].alias || []).join(' ')) || '')].join(' ').toLowerCase();
      if (!q.split(/[\s,]+/).filter(Boolean).every(w => testo.includes(w))) continue;
    }
    const voto = h[r.id] && h[r.id].voto;
    out.push({ r, mancanti, tracciata, score: (tracciata ? -mancanti.length * 10 : 0) + (voto || 3) + (r.nuovo && f.novita === 2 ? 5 : 0) });
  }
  return out.sort((a, b) => b.score - a.score || a.r.nome.localeCompare(b.r.nome));
}

/* ---------- vista ---------- */
let scrivo = false;
export function vistaRicettario() {
  const f = F(), res = risultati();
  const tutte = Object.values(S.R).sort((a, b) => (a.capitolo || '').localeCompare(b.capitolo || '') || a.nome.localeCompare(b.nome));
  const pagina = Object.fromEntries(tutte.map((r, i) => [r.id, String(i + 1).padStart(2, '0')]));
  const cap = r => (r.nuovo ? 'nuovo' : (r.capitolo || 'ricetta').split(' ')[0].toLowerCase());
  const card = x => {
    const r = x.r, t = macroRicetta(r.id);
    const stato = !x.tracciata ? '' : x.mancanti.length ? `manca ${x.mancanti[0].nome.toLowerCase()}${x.mancanti.length > 1 ? ` e altri ${x.mancanti.length - 1}` : ''}` : 'hai tutto in casa';
    return `<button class="rcard" data-act="recipe" data-r="${r.id}"><span class="lab">${pagina[r.id]} · ${esc(cap(r))}</span><span class="rc-b"><span class="rc-n">${esc(r.nome)}</span>${stato ? `<small>${esc(stato)}</small>` : ''}<span class="rc-m num">${fmt(t.kcal)} kcal · ${fmt(t.prot)} g prot · ${r.tempo_min}′</span></span></button>`;
  };
  const filtriAttivi = f.tempo >= 0 || f.voglia >= 0 || f.novita >= 0;
  return `<section class="oggi ric">
  <h1 class="big">ricette</h1>
  <div class="rsl">${CH.map(([k, l, ops]) => `<div class="rs"><span class="lab">${l}</span><div class="rs-l">${ops.map((o, i) => `<button class="${f[k] === i ? 'on' : ''}" data-act="rf" data-k="${k}" data-i="${i}" aria-pressed="${f[k] === i}"><i></i>${o[0].toLowerCase()}</button>`).join('')}</div></div>`).join('')}</div>
  ${res.length ? `<div class="rcards">${res.map(card).join('')}</div>` : `<p class="og-note" style="margin:0">Nessuna ricetta con questi cursori. ${filtriAttivi ? '<button class="link" data-act="rf-reset" style="padding:0">Azzera i cursori</button>, oppure chiedi a Claude.' : ''}</p>`}
  <div class="rask"><div class="rask-h">${mascot('sm')}<b>Chiedi a Claude</b></div>
    <button class="pill solid" data-act="ask">con quello che ho in casa</button>
    ${scrivo ? `<textarea id="ask-t" rows="2" placeholder="es. zucchine, uova, feta" aria-label="Cosa hai"></textarea><button class="pill" data-act="ask-invia">chiedi con questi ingredienti</button>` : `<button class="pill" data-act="ask-scrivo">ti scrivo io cosa ho</button>`}
    <small>Dispensa, cursori e ricettario li allego io al messaggio.</small></div>
  <div>
    <div class="og-h"><h2>Tutto il ricettario</h2><span class="num">${tutte.length} ricette</span></div>
    <div class="rix">${tutte.map(r => `<button data-act="recipe" data-r="${r.id}"><span class="n num">${pagina[r.id]}</span><span class="ln"><b>${esc(r.nome)}</b><i class="dots" aria-hidden="true"></i></span><span class="c">${esc(cap(r))}</span></button>`).join('')}</div>
  </div></section>`;
}

/* ---------- Chiedi a Claude ---------- */
function messaggio(liberi = '') {
  const f = F(), disp = dispensa(), g = giorno(oggi()), t = totaliGiorno(g), T = S.prog.target;
  const casa = Object.entries(disp.saldo).filter(([id, v]) => v > 0.5 && S.A[id]).map(([id, v]) => { const a = S.A[id], c = a.confezione || {}; return `${a.nome} (${c.g_pz ? fmt(v / c.g_pz, 0) + ' pz' : fmt(v) + (a.unita === 'ml' ? ' ml' : ' g')})`; });
  const filtri = CH.filter(([k]) => f[k] >= 0).map(([k, l, ops]) => `${l.toLowerCase()}: ${ops[f[k]][0].toLowerCase()} (${ops[f[k]][1]})`);
  const ora = new Date().getHours(), pasto = f.pasto || (ora < 15 ? 'pranzo' : 'cena');
  return [
    `Ciao Claude, ti scrivo da CAM Kitchen (progetto cam PT). Proponimi 3 ricette per ${pasto}.`,
    filtri.length ? `Filtri: ${filtri.join('; ')}.` : '',
    liberi ? `Ho questi ingredienti e voglio usarli: ${liberi}.` : '',
    f.piano === 2 ? 'Stavolta è uno sgarro: niente vincoli di kcal.' : `Oggi ho già mangiato ${fmt(t.kcal)} kcal e ${fmt(t.prot)} g di proteine; il target è ${fmt(T.kcal)} kcal e ${T.proteine_min} g. Il piatto deve stare nel piano.`,
    liberi ? '' : casa.length ? `In casa ho: ${casa.join(', ')}.` : 'Non ho ancora segnato cosa ho in casa.',
    'Sono a casa e non esco a fare la spesa: usa solo quello che ho (sale, olio, pepe e spezie ci sono sempre).',
    S.pref.nonMiPiace.length ? `Non mi piacciono: ${S.pref.nonMiPiace.map(id => S.A[id] ? S.A[id].nome.toLowerCase() : id).join(', ')}.` : '',
    `Nel ricettario ho già: ${Object.values(S.R).map(r => r.nome).join('; ')}. Puoi propormi una di queste se è adatta, ma almeno una proposta deve essere nuova.`,
    'Segui lo standard del ricettario: ingredienti in grammi, passaggi con fuoco, tempo e segnale visivo, la tecnica che insegna e l\'errore tipico. Cerca ricette vere online e adattale.',
    'Se una mi piace e ti dico "aggiungila", salvala nel repo camkitchen (ricette/ e indice).',
  ].filter(Boolean).join('\n');
}
export function apriClaude(m) {
  const c = cfg();
  const copia = navigator.clipboard ? navigator.clipboard.writeText(m).then(() => true, () => false) : Promise.resolve(false);
  copia.then(ok => toast(ok ? 'Messaggio copiato: incollalo in una chat nuova del progetto' : 'Non sono riuscito a copiare il messaggio'));
  const web = c.progetto ? `https://claude.ai/project/${c.progetto}` : 'https://claude.ai/new';
  setTimeout(() => { location.href = c.claudeShortcut === false ? web : `shortcuts://run-shortcut?name=${encodeURIComponent('Apri cam PT')}`; }, 150);
}
function chiedi() { apriClaude(messaggio()); }

/* ---------- voto e menù (dalla pagina ricetta) ---------- */
export function vota(id, n) {
  const giorni = Object.keys(S.giorni).sort().reverse();
  for (const d of giorni) {
    const e = (S.giorni[d].eventi || []).slice().reverse().find(x => x.tipo === 'pasto' && x.ricetta === id);
    if (e) { const g = structuredClone(S.giorni[d]); g.eventi.find(x => x.id === e.id).voto = n; salvaGiorno(g); toast(`Voto ${n}/5 salvato`); return true; }
  }
  toast('Il voto si dà dopo averlo cucinato'); return false;
}
export function aggiungiAlMenu(id, quale) {
  const c = cicloDi(oggi());
  if (!c) { toast('Prima prepara un menù nella scheda Spesa'); return false; }
  salvaCiclo({ ...c, piatti: [...c.piatti, { ricetta: id, pasto: quale || 'cena', ...(S.R[id].nuovo ? { nuovo: true } : {}) }] });
  toast('Aggiunto al ciclo: gli ingredienti mancanti vanno in lista con "Ricalcola"'); return true;
}

/* ---------- azioni ---------- */
export function azioneRicettario(act, el) {
  const f = F();
  switch (act) {
    case 'rf': { const k = el.dataset.k, i = Number(el.dataset.i); f[k] = f[k] === i ? -1 : i; saveUI(); return true; }
    case 'rf-reset': S.ui.rf = null; saveUI(); return true;
    case 'ask': chiedi(); return false;
    case 'ask-scrivo': scrivo = true; return true;
    case 'ask-invia': { const t = $('ask-t').value.trim(); if (!t) { toast('Scrivi cosa hai'); return false; } scrivo = false; apriClaude(messaggio(t)); return true; }
    case 'vota': vota(el.dataset.r, Number(el.dataset.n)); closeOverlay(); return true;
    case 'al-menu': if (aggiungiAlMenu(el.dataset.r, el.dataset.q)) { closeOverlay(); return true; } return false;
  }
  return null;
}
