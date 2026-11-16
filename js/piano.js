// CAM Kitchen: scheda Piano (andamento del peso, target, cosa mangiare, regole). Tutto letto da programma.json e da CAM Gym.
import { S, oggi } from './store.js';
import { fmt, addDays, macroVoci, macroRicetta, giornataDel, giornoCompleto, giorniTra } from './calc.js';
import { esc, mascot, breve } from './ui.js';
import { riepilogo } from './riepilogo.js';

const MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const gm = d => `${Number(d.slice(8))} ${MM[Number(d.slice(5, 7)) - 1]}`;
const kg = v => fmt(v, 1);
const h2 = (t, s = '') => `<div class="og-h"><h2>${t}</h2><span>${s}</span></div>`;

function grafico(pesi) {
  if (!pesi.length) return `<p class="og-note" style="margin:12px 0 0">Nessuna pesata ancora: si registrano in CAM Gym, al mattino.</p>`;
  const W = 346, x0 = 22, x1 = W - 22, d0 = pesi[0][0], span = Math.max(1, giorniTra(d0, pesi[pesi.length - 1][0]));
  const vs = pesi.map(p => p[1]), lo = Math.min(...vs) - 0.4, hi = Math.max(...vs) + 0.4;
  const X = d => x0 + (x1 - x0) * giorniTra(d0, d) / span, Y = v => 100 - (v - lo) / (hi - lo) * 70;
  const pt = pesi.map(([d, v]) => [X(d), Y(v), d, v]), ult = pt.length - 1;
  const etichette = pt.map(([x, y, d, v], i) => (i === 0 || i === ult || pt.length <= 4) ? `<text x="${x.toFixed(1)}" y="${(y - 12).toFixed(1)}" text-anchor="${i === 0 ? 'start' : i === ult ? 'end' : 'middle'}" ${i === ult ? 'font-weight="500"' : ''}>${kg(v)}${i === ult ? ' kg' : ''}</text>` : '').join('');
  const date = pt.map(([x, , d], i) => (i === 0 || i === ult || pt.length <= 4) ? `<text x="${x.toFixed(1)}" y="126" class="f" text-anchor="${i === 0 ? 'start' : i === ult ? 'end' : 'middle'}">${gm(d)}</text>` : '').join('');
  return `<svg class="pchart" viewBox="0 0 ${W} 132" role="img" aria-label="Peso: ${pesi.map(([d, v]) => `${kg(v)} kg il ${gm(d)}`).join(', ')}">
  <path d="M${x0} 110H${x1}" class="ax"/>${pt.length > 1 ? `<path d="M${pt.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}" class="ln"/>` : ''}
  ${pt.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === ult ? 5 : 4}" class="${i === ult ? 'pu' : 'pp'}"/>`).join('')}${etichette}${date}</svg>`;
}
function andamento(pesi, T) {
  const [a, b] = T.peso_settimana || [0.25, 0.4], ob = `Obiettivo: da +${fmt(a, 2)} a +${fmt(b, 1)} kg a settimana.`;
  if (!pesi.length) return ob;
  const giorni = giorniTra(pesi[0][0], pesi[pesi.length - 1][0]);
  if (pesi.length < 4 || giorni < 14) return `${pesi.length} ${pesi.length === 1 ? 'pesata' : `pesate in ${giorni} giorni`}: troppo poche per decidere. ${ob}`;
  const xs = pesi.map(p => giorniTra(pesi[0][0], p[0])), ys = pesi.map(p => p[1]), n = xs.length, mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
  const pend = xs.reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0) / xs.reduce((s, v) => s + (v - mx) ** 2, 0) * 7;
  const giud = pend < a ? 'sotto l\'obiettivo' : pend > 0.5 ? 'sopra l\'obiettivo' : 'in linea';
  return `Andamento: ${pend >= 0 ? '+' : '−'}${fmt(Math.abs(pend), 2)} kg a settimana, ${giud}. ${ob}`;
}

function controllo(c) {
  if (!c || !c.data) return '';
  const pr = c.proposte || [];
  return `<div class="pctl"><div class="og-h"><h2>Ultimo controllo</h2><span>${gm(c.data)}</span></div>
  ${(c.testo || '').split(/\n+/).filter(Boolean).map(t => `<p class="og-note" style="margin:12px 0 0;color:var(--ink)">${esc(t)}</p>`).join('')}
  ${pr.length ? `<span class="lab" style="display:block;margin-top:14px">Proposte, da accettare in chat</span>${pr.map(x => `<div class="prow r2"><span>${esc(x)}</span></div>`).join('')}` : ''}</div>`;
}
function quadro(r, T) {
  const riga = (a, b) => `<div class="prow r3"><span>${a}</span><b class="num">${b}</b></div>`;
  const s = r.settimane;
  return `<div class="pbar-h"><span>giorni completi, ultimi 14</span><span class="num">${r.completi} di 14</span></div><div class="pbar"><i style="width:${r.completi / 14 * 100}%"></i></div>
  <div style="margin-top:8px">
  ${riga('giorni registrati', `${r.registrati} di 14`)}
  ${r.completi ? riga('media nei giorni completi', `${fmt(r.kcal)} kcal · ${fmt(r.prot)} g`) + riga('dentro il target', `${r.inTarget} di ${r.completi}`) + riga('frutta e verdura', `${fmt(r.fv, 1)} porzioni`) : ''}
  ${riga('allenamenti', `${s[1].allenamenti} + ${s[2].allenamenti} (su 4 + 4)`)}
  </div>
  <p class="og-note" style="margin:12px 0 0;color:var(--ink)"><b style="font-weight:500">Regola:</b> ${esc(r.regola)}</p>`;
}
export function vistaPiano() {
  const p = S.prog, T = p.target;
  const pesi = Object.entries(S.gym.peso || {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  const ultimi = [...Array(14)].map((_, i) => addDays(oggi(), -i));
  const R = riepilogo(oggi()), registrati = R.completi;
  const pasto = (n, quando, testo, k) => `<div class="prow"><span><b>${esc(n)}</b>${quando ? `<i>${esc(quando)}</i>` : ''}<small>${esc(testo)}</small></span><span class="ok num">${k}</span></div>`;
  const rot = (p.menu.rotazione_cene || []).filter(id => S.R[id]), kc = rot.map(id => macroRicetta(id).kcal);
  const cenaTesto = `a scelta: ${rot.map(id => breve(id).toLowerCase()).join(', ')}, oppure una ricetta dentro il piano`;
  const righe = []; let tot = 0, pr = false, ce = false;
  const pranzo = () => { tot += p.pranzo.mensa_forfait.kcal; return pasto('Pranzo', '', p.pranzo.mensa_schema || '', fmt(p.pranzo.mensa_forfait.kcal)); };
  const cena = () => { if (!kc.length) return ''; tot += kc.reduce((s, v) => s + v, 0) / kc.length; return pasto('Cena', '', cenaTesto, `${fmt(Math.min(...kc))}–${fmt(Math.max(...kc))}`); };
  for (const m of giornataDel(oggi())) {
    if (!pr && m.ora && m.ora >= '13:00') { righe.push(pranzo()); pr = true; }
    if (!ce && m.ora && m.ora >= '21:30') { righe.push(cena()); ce = true; }
    const k = macroVoci(m.voci).kcal; tot += k;
    righe.push(pasto(m.nome, m.ora ? `alle ${m.ora.replace(/^0/, '')}` : '', m.piano || m.descrizione || '', fmt(k)));
  }
  if (!pr) righe.push(pranzo()); if (!ce) righe.push(cena());
  const regole = (p.regole && p.regole.aggiustamento) || [];
  return `<section class="oggi piano">
  <div><h1 class="big">il piano</h1><p class="og-note" style="margin:10px 0 0">versione ${esc(p.versione)} · aggiornato il ${gm(p.aggiornato)}</p></div>
  ${controllo(p.controllo)}
  <div>${h2('Come sta andando', 'peso da CAM Gym')}${grafico(pesi)}
    <p class="og-note" style="margin:12px 0 0">${andamento(pesi, T)}</p>
    ${quadro(R, T)}
  </div>
  <div class="pfig"><div><b class="num">${fmt(T.kcal)}</b><small>kcal al giorno</small></div><div><b class="num">${T.proteine_min} g</b><small>proteine, minimo</small></div><div><b class="num">${T.frutta_verdura_porzioni}</b><small>porzioni di frutta e verdura</small></div></div>
  <div>${h2('Cosa mangiare', 'ogni giorno')}${righe.join('')}
    <div class="otot" style="border:0"><span>totale</span><span class="num">circa ${fmt(Math.round(tot / 50) * 50)} kcal</span></div></div>
  ${regole.length ? `<div>${h2('Come si aggiusta')}${regole.map(([q, c]) => `<div class="prow r2"><span>${esc(q)}</span><b>${esc(c)}</b></div>`).join('')}</div>` : ''}
  <div class="pcam">${mascot()}<span>${registrati >= 14 ? 'Hai due settimane registrate: chiedimi il controllo e ricalibro il piano.' : 'Registra due settimane di fila: poi ricalibro il piano sui tuoi numeri veri.'}</span></div>
  </section>`;
}
