// CAM Kitchen: riepilogo delle ultime 2 settimane, senza AI. Usato dalla scheda Piano e da tools/riepilogo.mjs (resoconto della domenica).
import { S } from './store.js';
import { fmt, addDays, dow, totaliGiorno, giornoCompleto, pastoFatto, giorniTra } from './calc.js';

const media = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const registrato = g => !!g && (Object.keys(g.giornata || {}).length > 0 || !!g.pranzo || (g.eventi || []).some(e => !['rettifica', 'carico'].includes(e.tipo)));
const completo = g => !!g && giornoCompleto(g) && pastoFatto(g, 'pranzo');

// pendenza della retta dei minimi quadrati, in kg a settimana
function pendenza(punti) {
  if (punti.length < 2) return null;
  const x0 = punti[0][0], xs = punti.map(p => giorniTra(x0, p[0])), ys = punti.map(p => p[1]);
  const mx = media(xs), my = media(ys), den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den ? xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den * 7 : null;
}

export function riepilogo(oggi, n = 14) {
  const T = S.prog.target, G = S.giorni || {}, peso = (S.gym && S.gym.peso) || {}, sess = (S.gym && S.gym.sessioni) || {};
  const giorni = [...Array(n)].map((_, i) => addDays(oggi, i - n + 1));
  const registrati = giorni.filter(d => registrato(G[d])), completi = giorni.filter(d => completo(G[d]));
  const tot = completi.map(d => totaliGiorno(G[d]));
  const vicino = d => { const t = totaliGiorno(G[d]); return t.kcal >= T.kcal_min - 100; };
  const ultimi7 = giorni.slice(-7).filter(d => completo(G[d]) && vicino(d)).length;

  const lun = addDays(oggi, -dow(oggi));
  const settimane = [-14, -7, 0].map(k => addDays(lun, k)).map(s => {
    const kg = Object.entries(peso).filter(([d]) => d >= s && d <= addDays(s, 6) && d <= oggi).map(([, v]) => v);
    const allenamenti = Object.entries(sess).filter(([d]) => d >= s && d <= addDays(s, 6) && d <= oggi).reduce((a, [, v]) => a + v.filter(x => x !== 'breathe').length, 0);
    return { dal: s, pesate: kg.length, peso: media(kg), allenamenti };
  });
  const punti = Object.entries(peso).filter(([d]) => d >= addDays(oggi, -20) && d <= oggi).sort((a, b) => a[0].localeCompare(b[0]));
  const trend = punti.length >= 4 && giorniTra(punti[0][0], punti[punti.length - 1][0]) >= 10 ? pendenza(punti) : null;

  const usati = {};
  for (const d of giorni) { const visti = new Set(); for (const e of (G[d] && G[d].eventi) || []) if (e.solito && !visti.has(e.solito + e.pasto)) { visti.add(e.solito + e.pasto); usati[e.solito] = (usati[e.solito] || 0) + 1; } }
  const piatti = Object.entries(usati).sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ id, nome: ((S.prog.abituali || []).find(x => x.id === id) || { nome: id }).nome, volte: v }));
  const inAttesa = giorni.reduce((a, d) => a + ((G[d] && G[d].eventi) || []).filter(e => e.tipo === 'fuori' && e.pendente).length, 0);

  const [a, b] = T.peso_settimana || [0.25, 0.4];
  let regola;
  if (trend == null) regola = `Pesate insufficienti (${punti.length} nelle ultime 3 settimane, ne servono almeno 4): nessun aggiustamento.`;
  else if (trend > 0.5) regola = 'Il peso sale più di 0,5 kg a settimana: se continua, −150/200 kcal.';
  else if (trend < 0.1) regola = ultimi7 >= 5 ? 'Peso fermo con almeno 5 giorni su 7 vicino al target: scatta +200 kcal.' : `Peso fermo, ma solo ${ultimi7} giorni su 7 registrati vicino al target: prima seguire il piano, niente +200 kcal.`;
  else if (trend < a) regola = 'Peso in salita ma sotto l\'obiettivo: nessun aggiustamento per ora.';
  else regola = trend <= b ? 'Peso in linea con l\'obiettivo: nessun aggiustamento.' : 'Peso un po\' sopra l\'obiettivo ma sotto 0,5 kg a settimana: nessun aggiustamento.';

  return {
    dal: giorni[0], al: oggi, registrati: registrati.length, completi: completi.length, ultimi7,
    kcal: media(tot.map(t => t.kcal)), prot: media(tot.map(t => t.prot)), fv: media(tot.map(t => t.fv)),
    inTarget: tot.filter(t => t.kcal >= T.kcal_min && t.kcal <= T.kcal_max).length, protOk: tot.filter(t => t.prot >= T.proteine_min).length,
    settimane, trend, piatti, inAttesa, regola,
  };
}

const gm = d => `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;
export function riepilogoTesto(r) {
  const T = S.prog.target, s = r.settimane;
  const pesi = s.filter(x => x.peso != null).map(x => `sett. dal ${gm(x.dal)}: ${fmt(x.peso, 1)} kg (${x.pesate} ${x.pesate === 1 ? 'pesata' : 'pesate'})`);
  return [
    `Alimentazione dal ${gm(r.dal)} al ${gm(r.al)}`,
    `- Giorni registrati: ${r.registrati}/14, completi (giornata tipo, pranzo e cena): ${r.completi}/14.`,
    r.completi ? `- Nei giorni completi: ${fmt(r.kcal)} kcal e ${fmt(r.prot)} g di proteine in media; ${r.inTarget}/${r.completi} dentro ${fmt(T.kcal_min)}–${fmt(T.kcal_max)} kcal, ${r.protOk}/${r.completi} sopra ${T.proteine_min} g di proteine; frutta e verdura ${fmt(r.fv, 1)} porzioni al giorno (obiettivo ${T.frutta_verdura_porzioni}).` : '- Nessun giorno completo: niente medie di kcal e proteine.',
    `- Peso: ${pesi.length ? pesi.join('; ') : 'nessuna pesata'}${r.trend != null ? `; andamento ${r.trend >= 0 ? '+' : '−'}${fmt(Math.abs(r.trend), 2)} kg a settimana` : ''}.`,
    `- Allenamenti: ${s.slice(1).map(x => `${x.allenamenti} nella settimana dal ${gm(x.dal)}`).join(', ')} (obiettivo 4).`,
    `- Piatti abituali: ${r.piatti.length ? r.piatti.map(p => `${p.nome} ${p.volte}×`).join(', ') : 'nessuno registrato'}.`,
    r.inAttesa ? `- Stime di Claude ancora in attesa: ${r.inAttesa}.` : '',
    `- Regola: ${r.regola}`,
  ].filter(Boolean).join('\n');
}
