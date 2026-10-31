// CAM Kitchen: impostazioni e schede ancora in costruzione.
import { S, cfg, setCfg, sincronizza, provaConnessione, esporta, caricaGym } from './store.js';
import { $, esc, toast, mascot, illo, openOverlay, closeOverlay } from './ui.js';

export function vistaInArrivo(nome, illoNome, testo) {
  return `<div class="hero"><div><span class="lab">CAM Kitchen</span><h1 class="ttl" style="margin-top:6px">${nome}</h1></div>${illo(illoNome)}</div>
  <div class="wip">${mascot()}<b>Camillo ci sta lavorando</b><small>${testo}</small></div>`;
}

export function apriImpostazioni(msg = '') {
  const c = cfg();
  openOverlay(`<div class="recipe"><div class="recipe-in" style="max-width:520px">
  <div class="r-top"><button class="link" data-act="close-r" style="padding-left:0">← Indietro</button><span class="lab">Impostazioni</span></div>
  <h1 class="ttl">Impostazioni</h1>
  <div class="form">
   <span class="lab">Sincronizzazione con GitHub</span>
   <div class="field"><span class="lab">Owner</span><input id="c-owner" value="${esc(c.owner)}" autocapitalize="off" autocomplete="off"></div>
   <div class="field"><span class="lab">Repo</span><input id="c-repo" value="${esc(c.repo)}" autocapitalize="off" autocomplete="off"></div>
   <div class="field"><span class="lab">Branch</span><input id="c-branch" value="${esc(c.branch || 'main')}" autocapitalize="off" autocomplete="off"></div>
   <div class="field"><span class="lab">Token (fine-grained · solo camkitchen · Contents read/write)</span><input id="c-token" type="password" value="${esc(c.token)}" autocomplete="off"></div>
   <p class="note">Il token resta solo su questo dispositivo: non finisce mai nel repo.</p>
   <div class="field"><span class="lab">Repo di CAM Gym (peso e sessioni)</span><input id="c-gym" value="${esc(c.gym)}" autocapitalize="off" autocomplete="off"></div>
   <div class="act" style="justify-content:flex-start"><button class="pill solid" data-act="cfg-salva">Salva</button><button class="pill" data-act="cfg-prova">Prova connessione</button><button class="pill" data-act="cfg-sync">Sincronizza ora</button></div>
   <p class="note" id="cfg-msg">${esc(msg || S.sync.msg || '')}</p>
   <span class="lab" style="margin-top:14px">Dati</span>
   <div class="act" style="justify-content:flex-start"><button class="pill" data-act="cfg-export">Copia tutti i dati (backup)</button></div>
   <p class="note">Programma ${esc(S.prog ? S.prog.versione : '—')} del ${esc(S.prog ? S.prog.aggiornato : '—')} · ${Object.keys(S.R).length} ricette · ${Object.keys(S.A).length} alimenti · ${S.coda.length} modifiche in attesa di sincronizzazione.</p>
  </div></div></div>`);
}
function leggiForm() {
  const v = id => ($(id) ? $(id).value.trim() : '');
  setCfg({ owner: v('c-owner'), repo: v('c-repo'), branch: v('c-branch') || 'main', token: v('c-token'), gym: v('c-gym') });
}
export async function azioneAltro(act) {
  switch (act) {
    case 'settings': apriImpostazioni(); return false;
    case 'cfg-salva': leggiForm(); toast('Salvato'); sincronizza(); caricaGym(true); return false;
    case 'cfg-prova': leggiForm(); $('cfg-msg').textContent = 'Prova in corso…'; $('cfg-msg').textContent = await provaConnessione(); return false;
    case 'cfg-sync': leggiForm(); $('cfg-msg').textContent = 'Sincronizzo…'; await sincronizza(true); $('cfg-msg').textContent = S.sync.msg; return false;
    case 'cfg-export': try { await navigator.clipboard.writeText(esporta()); toast('Dati copiati negli appunti'); } catch { toast('Copia non riuscita'); } return false;
  }
  return null;
}
