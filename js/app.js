// CAM Kitchen: avvio, navigazione e smistamento delle azioni.
import { S, caricaLocale, caricaProgramma, caricaGym, sincronizza, saveUI, oggi, syncPronto } from './store.js';
import { $, NAV, ICON, closeSheet, closeOverlay, mascot } from './ui.js';
import { vistaMenu, azioneMenu, initFlows } from './menu.js';
import { vistaInArrivo, azioneAltro } from './other.js';
import { vistaSpesa, azioneSpesa, inviaAggiunta } from './spesa.js';
import { vistaRicettario, azioneRicettario, cercaRicette } from './ricettario.js';
import { paginaRicetta } from './menu.js';

const VISTE = {
  menu: vistaMenu,
  ricettario: vistaRicettario,
  spesa: vistaSpesa,
  progressi: () => vistaInArrivo('Progressi', 'progressi', 'Numeri della settimana, peso da CAM Gym, insights e il brief di Camillo. In arrivo.'),
};

function vista() { return VISTE[S.ui.v] ? S.ui.v : 'menu'; }

function renderNav() {
  const v = vista();
  $('tabs').innerHTML = NAV.map(n => `<button class="tab ${n[0] === v ? 'on' : ''}" data-view="${n[0]}"><svg viewBox="0 0 24 24">${n[2]}</svg><span>${n[1]}</span></button>`).join('');
  $('sidenav').innerHTML = NAV.map(n => `<button class="${n[0] === v ? 'on' : ''}" data-view="${n[0]}"><svg viewBox="0 0 24 24">${n[2]}</svg>${n[1]}</button>`).join('');
  const st = S.sync.stato, cls = st === 'ok' ? 'ok' : st === 'err' ? 'err' : st === 'off' ? '' : 'wait';
  const txt = !syncPronto() ? 'Sync da configurare' : S.coda.length ? `${S.coda.length} da sincronizzare` : st === 'err' ? 'Sync non riuscita' : 'Sincronizzato';
  $('side-sync').innerHTML = `<button data-act="settings" style="font-size:13px;color:var(--faded)"><span class="syncdot ${cls}"></span>${txt} · impostazioni</button>`;
}

let ultimaVista = null;
let rinviato = false;
export function render() {
  if (!S.prog) { $('main').innerHTML = '<div class="wip"><b>Non riesco a caricare il programma</b><small>Controlla la connessione e riapri l\'app.</small></div>'; return; }
  const v = vista();
  const st = S.sync.stato, dot = !syncPronto() ? '' : S.coda.length ? 'wait' : st === 'err' ? 'err' : 'ok';
  const top = `<header class="top"><span class="ib" aria-hidden="true"></span><div class="word">CAM Kitchen</div><button class="ib" data-act="settings" aria-label="Impostazioni" style="position:relative">${ICON.gear}${dot ? `<span class="syncdot ${dot}" style="position:absolute;right:4px;top:6px;margin:0"></span>` : ''}</button></header>`;
  const y = window.scrollY;
  let corpo;
  try { corpo = VISTE[v](); }
  catch (err) {
    console.error(err);
    // una schermata rotta non deve bloccare l'app: si azzera solo lo stato della schermata, mai i dati
    corpo = `<div class="wip">${mascot()}<b>Questa schermata si è inceppata</b><small>I tuoi dati sono al sicuro. Tocca qui sotto per ripartire.</small><button class="pill solid" data-act="reset-ui">Ripristina la schermata</button><small style="font-size:11px">${String(err && err.message || err).replace(/</g, '&lt;')}</small></div>`;
  }
  $('main').innerHTML = top + `<div class="view ${v !== ultimaVista ? 'enter' : ''}" id="v-${v}">${corpo}</div>`;
  if (v === ultimaVista) window.scrollTo(0, y);
  ultimaVista = v;
  renderNav();
  requestAnimationFrame(initFlows);
}

document.addEventListener('click', async e => {
  const nav = e.target.closest('[data-view]');
  if (nav) { S.ui.v = nav.dataset.view; saveUI(); closeSheet(); closeOverlay(); render(); window.scrollTo(0, 0); return; }
  const go = e.target.closest('[data-go]');
  if (go) { S.ui.v = go.dataset.go; saveUI(); closeSheet(); render(); window.scrollTo(0, 0); return; }
  if (e.target.closest('[data-close]')) { closeSheet(); return; }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'reset-ui') { const v = S.ui.v; S.ui = { v: 'menu', sel: oggi(), selGiorno: oggi(), coachVisto: S.ui.coachVisto }; saveUI(); render(); return; }
  let r = azioneRicettario(act, el);
  if (r === 'recipe') { paginaRicetta(el.dataset.r); return; }
  if (r === null) r = azioneMenu(act, el);
  if (r === null) r = azioneSpesa(act, el);
  if (r === null) r = await azioneAltro(act, el);
  if (r === true) render();
});

document.addEventListener('submit', e => {
  const rq = e.target.closest('[data-form="rq"]');
  if (rq) { e.preventDefault(); const i = rq.querySelector('input'); cercaRicette(i.value); i.blur(); rinviato = false; render(); return; }
  const f = e.target.closest('[data-form="add"]'); if (!f) return;
  e.preventDefault(); const i = f.querySelector('input'); inviaAggiunta(i.value); i.value = ''; rinviato = false; render(); const n = document.getElementById('addq'); if (n) n.focus();
});

const staScrivendo = () => { const a = document.activeElement; return a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName); };
S.listeners.add(() => {
  if (document.querySelector('.sheet-wrap') || document.querySelector('#overlay .recipe') || staScrivendo()) { rinviato = true; renderNav(); return; }
  render();
});
document.addEventListener('focusout', () => setTimeout(() => { if (rinviato && !staScrivendo() && !document.querySelector('.sheet-wrap')) { rinviato = false; render(); } }, 50));
window.addEventListener('resize', () => requestAnimationFrame(initFlows));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (S.ui.selGiorno !== oggi()) { S.ui.sel = oggi(); S.ui.selGiorno = oggi(); saveUI(); } render(); sincronizza(); caricaGym(); } });

async function avvia() {
  caricaLocale();
  // all'apertura si parte sempre da oggi
  S.ui.sel = oggi(); S.ui.selGiorno = oggi(); S.ui.plan = null; saveUI();
  await caricaProgramma();
  render();
  sincronizza();
  caricaGym();
}
avvia();
