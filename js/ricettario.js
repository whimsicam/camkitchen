// CAM Kitchen: il Ricettario (filtri, carte da sfogliare, indice, i miei piatti, Chiedi a Claude).
import { S, giorno, salvaGiorno, salvaCiclo, oggi, saveUI } from './store.js';
import { fmt, macroRicetta, dispensa, statoIngredienti, totaliGiorno, cicloDi, quantitaTesto } from './calc.js';
import { $, esc, toast, mascot, arte, tinta, illo, closeOverlay } from './ui.js';

const F = () => (S.ui.rf = S.ui.rf || { tempo: -1, voglia: -1, novita: -1, casa: false, piano: 0, q: '', cap: '', pasto: '' });
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
export function vistaRicettario() {
  const f = F(), res = risultati(), h = storico();
  const tutte = Object.values(S.R).sort((a, b) => (a.capitolo || '').localeCompare(b.capitolo || '') || a.nome.localeCompare(b.nome));
  const pagina = Object.fromEntries(tutte.map((r, i) => [r.id, i + 1]));
  const capitoli = [...new Set(tutte.map(r => r.capitolo || 'Altro'))];
  const card = x => {
    const r = x.r, t = macroRicetta(r.id);
    const stato = !x.tracciata ? '' : x.mancanti.length ? `<span class="st no">manca ${esc(x.mancanti[0].nome.toLowerCase())}${x.mancanti.length > 1 ? ` e altri ${x.mancanti.length - 1}` : ''}</span>` : '<span class="st ok">hai tutto</span>';
    return `<button class="page" data-act="pg" data-r="${r.id}" style="--tint:${tinta(r.id)}"><span class="pn"><span class="lab" style="color:var(--ink);opacity:.6">${esc(r.nuovo ? 'Da provare' : r.capitolo || 'Ricetta')}</span><span class="lab num" style="color:var(--ink);opacity:.6">p. ${pagina[r.id]}</span></span>${arte(r.id, 'art')}<h4>${esc(r.nome)}</h4><span class="m num">${r.tempo_min}′ · ${fmt(t.kcal)} kcal · ${fmt(t.prot)} g${h[r.id] && h[r.id].voto ? ` · ${'★'.repeat(Math.round(h[r.id].voto))}` : ''}</span>${stato}<span class="open">Apri la ricetta</span></button>`;
  };
  const filtriAttivi = f.tempo >= 0 || f.voglia >= 0 || f.novita >= 0 || f.casa || f.piano || f.q || f.cap || f.pasto;
  const miei = Object.entries(h).filter(([id]) => S.R[id]).sort((a, b) => b[1].ultima.localeCompare(a[1].ultima));
  return `<div class="two">
  <section class="col">
    <div class="hero"><div><span class="lab">Il ricettario di CAM</span><h1 class="ttl" style="margin-top:6px">Cosa cucino?</h1></div>${illo('ricettario')}</div>
    <form class="search" data-form="rq"><svg class="ico" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg><input id="rq" value="${esc(f.q)}" placeholder="Un ingrediente o un piatto" autocomplete="off" enterkeyhint="search">${f.q ? `<button type="button" class="link" data-act="rq-x">×</button>` : ''}</form>
    <div class="choose">${CH.map(([k, l, ops]) => `<div class="sl"><span class="lab">${l}</span><div class="sl-line">${ops.map((o, i) => `<button class="opt ${f[k] === i ? 'on' : ''}" data-act="rf" data-k="${k}" data-i="${i}"><i></i><span>${o[0]}</span><small>${o[1]}</small></button>`).join('')}</div></div>`).join('')}</div>
    <div class="toggles">
      <button class="pill sm ${f.casa ? 'solid' : ''}" data-act="rf-casa">Solo con ciò che ho</button>
      <button class="pill sm ${f.piano ? 'solid' : ''}" data-act="rf-piano">${f.piano === 2 ? 'Sgarro' : 'Dentro il piano'}</button>
      <button class="pill sm ${f.pasto ? 'solid' : ''}" data-act="rf-pasto">${f.pasto === 'pranzo' ? 'Pranzo' : f.pasto === 'cena' ? 'Cena' : 'Pranzo o cena'}</button>
    </div>
    ${filtriAttivi ? `<button class="link" data-act="rf-reset" style="align-self:flex-start;padding-left:0">Togli tutti i filtri</button>` : ''}
  </section>
  <section class="col">
    <div>
      <div class="bhead"><h2>Sfoglia</h2><span class="lab num">${res.length} ${res.length === 1 ? 'ricetta' : 'ricette'}${f.cap ? ` · ${esc(f.cap)}` : ''}</span></div>
      ${res.length ? `<div class="book" data-flow>${res.map(card).join('')}</div>` : `<div class="empty-st">${mascot()}<b>Niente con questi filtri</b><small>Allarga un filtro, oppure chiedo a Claude qualcosa di adatto.</small><button class="pill solid" data-act="ask">Chiedi a Claude</button></div>`}
    </div>
    <div>
      <div class="bhead"><h2>Indice</h2><span class="lab num">${tutte.length} ricette</span></div>
      <ul class="index">${capitoli.map(c => { const rs = tutte.filter(r => (r.capitolo || 'Altro') === c); return `<li><button data-act="rf-cap" data-c="${esc(c)}" style="${f.cap === c ? 'font-weight:600' : ''}"><b>${esc(c)}</b><span class="dots"></span><span class="pg num">${rs.length} · p. ${pagina[rs[0].id]}</span></button></li>`; }).join('')}</ul>
    </div>
    ${miei.length ? `<div><div class="bhead"><h2>I miei piatti</h2><span class="lab num">${miei.length} cucinati</span></div><ul class="index">${miei.map(([id, x]) => `<li><button data-act="recipe" data-r="${id}"><b>${esc(S.R[id].nome)}</b><span class="dots"></span><span class="pg num">${x.volte}× ${x.voto ? '· ' + '★'.repeat(Math.round(x.voto)) : ''}</span></button></li>`).join('')}</ul></div>` : ''}
    <button class="ask" data-act="ask">${mascot('sm')}<span><b>Non trovi niente?</b><small>Camillo prepara la domanda per Claude con quello che hai in casa, i filtri scelti e quanto ti manca oggi.</small></span></button>
  </section></div>`;
}

/* ---------- Chiedi a Claude ---------- */
function messaggio() {
  const f = F(), disp = dispensa(), g = giorno(oggi()), t = totaliGiorno(g), T = S.prog.target;
  const casa = Object.entries(disp.saldo).filter(([id, v]) => v > 0.5 && S.A[id]).map(([id, v]) => { const a = S.A[id], c = a.confezione || {}; return `${a.nome} (${c.g_pz ? fmt(v / c.g_pz, 0) + ' pz' : fmt(v) + (a.unita === 'ml' ? ' ml' : ' g')})`; });
  const filtri = CH.filter(([k]) => f[k] >= 0).map(([k, l, ops]) => `${l.toLowerCase()}: ${ops[f[k]][0].toLowerCase()} (${ops[f[k]][1]})`);
  const ora = new Date().getHours(), pasto = f.pasto || (ora < 15 ? 'pranzo' : 'cena');
  return [
    `Ciao Claude, ti scrivo da CAM Kitchen (progetto cam PT). Proponimi 3 ricette per ${pasto}.`,
    filtri.length ? `Filtri: ${filtri.join('; ')}.` : '',
    f.q ? `Voglio usare: ${f.q}.` : '',
    f.piano === 2 ? 'Stavolta è uno sgarro: niente vincoli di kcal.' : `Oggi ho già mangiato ${fmt(t.kcal)} kcal e ${fmt(t.prot)} g di proteine; il target è ${fmt(T.kcal)} kcal e ${T.proteine_min} g. Il piatto deve stare nel piano.`,
    casa.length ? `In casa ho: ${casa.join(', ')}.` : 'Non ho ancora fatto l\'inventario della dispensa.',
    f.casa ? 'Usa solo quello che ho in casa (sale, olio, spezie ci sono sempre).' : 'Puoi proporre al massimo 2 ingredienti da comprare.',
    'Segui lo standard del ricettario: ingredienti in grammi, passaggi con fuoco, tempo e segnale visivo, la tecnica che insegna e l\'errore tipico. Cerca ricette vere online e adattale.',
    'Se una mi piace e ti dico "aggiungila", salvala nel repo camkitchen (ricette/ e indice) con la riga per il disegno.',
  ].filter(Boolean).join('\n');
}
async function chiedi() {
  const m = messaggio();
  let copiato = false;
  try { await navigator.clipboard.writeText(m); copiato = true; } catch { /* non disponibile */ }
  const url = `https://claude.ai/new?q=${encodeURIComponent(m)}`;
  const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  toast(copiato ? 'Messaggio copiato: se non compare già scritto, incollalo' : 'Apro Claude');
}

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
    case 'rf-casa': f.casa = !f.casa; saveUI(); return true;
    case 'rf-piano': f.piano = (f.piano + 1) % 3; saveUI(); return true;
    case 'rf-pasto': f.pasto = f.pasto === '' ? 'cena' : f.pasto === 'cena' ? 'pranzo' : ''; saveUI(); return true;
    case 'rf-cap': f.cap = f.cap === el.dataset.c ? '' : el.dataset.c; saveUI(); return true;
    case 'rf-reset': S.ui.rf = null; saveUI(); return true;
    case 'rq-x': f.q = ''; saveUI(); return true;
    case 'pg': if (el.classList.contains('center')) return 'recipe'; { const b = el.parentElement; b.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - b.clientWidth / 2, behavior: 'smooth' }); } return false;
    case 'ask': chiedi(); return false;
    case 'vota': vota(el.dataset.r, Number(el.dataset.n)); closeOverlay(); return true;
    case 'al-menu': if (aggiungiAlMenu(el.dataset.r, el.dataset.q)) { closeOverlay(); return true; } return false;
  }
  return null;
}
export function cercaRicette(testo) { F().q = testo; saveUI(); }
