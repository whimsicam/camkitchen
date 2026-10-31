// CAM Kitchen: avvio, navigazione e smistamento delle azioni.
import { S, caricaLocale, caricaProgramma, caricaGym, sincronizza, saveUI, oggi, syncPronto } from './store.js';
import { $, NAV, ICON, closeSheet, closeOverlay } from './ui.js';
import { vistaMenu, azioneMenu, initFlows } from './menu.js';
import { vistaInArrivo, azioneAltro } from './other.js';

const VISTE = {
  menu: vistaMenu,
  ricettario: () => vistaInArrivo('Cosa cucino?', 'ricettario', 'Il ricettario con le carte da sfogliare, i filtri e "Chiedi a Claude" arriva nella prossima tappa. Le ricette si aprono già dalla scheda Menù.'),
  spesa: () => vistaInArrivo('La spesa', 'spesa', 'Qui prepari la prossima spesa: scegli il giorno, Camillo propone i piatti e calcola la lista. In arrivo nella prossima tappa.'),
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
export function render() {
  if (!S.prog) { $('main').innerHTML = '<div class="wip"><b>Non riesco a caricare il programma</b><small>Controlla la connessione e riapri l\'app.</small></div>'; return; }
  const v = vista();
  const st = S.sync.stato, dot = !syncPronto() ? '' : S.coda.length ? 'wait' : st === 'err' ? 'err' : 'ok';
  const top = `<header class="top"><span class="ib" aria-hidden="true"></span><div class="word">CAM Kitchen</div><button class="ib" data-act="settings" aria-label="Impostazioni" style="position:relative">${ICON.gear}${dot ? `<span class="syncdot ${dot}" style="position:absolute;right:4px;top:6px;margin:0"></span>` : ''}</button></header>`;
  const y = window.scrollY;
  $('main').innerHTML = top + `<div class="view ${v !== ultimaVista ? 'enter' : ''}" id="v-${v}">${VISTE[v]()}</div>`;
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
  let r = azioneMenu(act, el);
  if (r === null) r = await azioneAltro(act, el);
  if (r === true) render();
});

S.listeners.add(() => { if (!document.querySelector('.sheet-wrap') && !document.querySelector('#overlay .recipe')) render(); else renderNav(); });
window.addEventListener('resize', () => requestAnimationFrame(initFlows));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (S.ui.selGiorno !== oggi()) { S.ui.sel = oggi(); S.ui.selGiorno = oggi(); saveUI(); } render(); sincronizza(); caricaGym(); } });

async function avvia() {
  caricaLocale();
  // all'apertura si parte sempre da oggi
  S.ui.sel = oggi(); S.ui.selGiorno = oggi(); saveUI();
  await caricaProgramma();
  render();
  sincronizza();
  caricaGym();
}
avvia();
