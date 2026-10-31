# CAM Kitchen — specifica dell'app

Web app per iPhone (Safari, aggiunta alla schermata Home) e per PC (browser desktop), con layout adattivo, per seguire il programma alimentare, decidere cosa cucinare, gestire spesa e dispensa e imparare a cucinare piatti nuovi. Ospitata su GitHub Pages dal repo `whimsicam/camkitchen`. Lingua dell'interfaccia: italiano. Formati numerici europei (virgola decimale: 2.810 kcal, 42,5 g). Nome "CAM Kitchen" provvisorio: deve essere modificabile in un solo punto (`manifest.webmanifest` e una costante in `app.js`).

Riferimento di metodo: `whimsicam/camgym` (stessa architettura, stessa sincronizzazione con GitHub). Il programma alimentare in prosa è `claude/programma-alimentazione.md` nel progetto Claude "cam PT"; questo repo ne contiene la versione in dati.

## Principi

- **Zero build:** HTML, CSS e JavaScript vanilla, file statici. Nessun framework, nessun bundler, nessuna dipendenza npm. Si deve poter aprire `index.html` e funzionare.
- **Il programma non è nel codice.** Target, giornata tipo, regole del menù, alimenti, ricette, preset dei pasti fuori e testi vengono letti dai file JSON. Cambiare il programma deve significare cambiare solo quei file.
- **Lo script fa tutto ciò che non richiede giudizio** (conti, dispensa, menù, lista spesa, medie, insights a regole). Claude interviene solo per ricette nuove, stime dei pasti insoliti e controlli periodici: l'app non chiama mai API di AI.
- **I valori nutrizionali non si scrivono mai a mano nelle ricette:** l'app li calcola dagli ingredienti in grammi e dal catalogo `alimenti.json`.
- **La dispensa non si salva: si calcola** dai movimenti (carichi − consumi ± rettifiche). Nessuno stato "saldo" scritto nel repo.
- **Funziona senza campo.** Tutto si salva prima sul telefono; la sincronizzazione con GitHub avviene quando c'è rete (come CAM Gym). Al supermercato la lista deve funzionare anche offline.
- **Veloce da usare:** registrare una voce della giornata tipo o una cena = un tocco. Niente si registra da solo: quello che non è spuntato non conta (né nelle kcal né nella dispensa).

## Stile

Il riferimento visivo definitivo saranno i mockup esportati da Stitch nella cartella `design/` (da seguire **solo per l'aspetto**: piatti, numeri e testi dei mockup sono inventati e vanno ignorati). Fino ad allora, direzione e token provvisori:

- Atmosfera da **libro di cucina illustrato**: fondo crema, illustrazioni a linea sottile con acquerello pastello solo dentro i piatti, molto spazio vuoto, nessuna ombra marcata.
- Titoli in **serif corsivo** (es. *Cormorant Garamond* italic 500–600); testo in serif o sans sobrio; numeri con `font-variant-numeric: tabular-nums`.
- **Tavola del piatto** (oggetto centrale, ispirata alle tavole botaniche e alle carte del tè): disegno grande al centro, nome in corsivo, sottotitolo piccolo, sotto una mini scheda tecnica a due colonne (kcal · proteine · tempo · livello).
- **Slider** del Ricettario: linea sottile orizzontale con punti; il punto attivo è più grande con un alone pastello sfumato; etichette degli estremi in maiuscoletto piccolo a sinistra e a destra.
- Pillole e card con bordo sottile 1 px in inchiostro, angoli 20–24 px.
- Colore solo nei disegni e in pochissimi accenti (alone degli slider, anelli). Nessuna dark mode.

### Layout adattivo (telefono e PC)
- **Telefono (< 900 px):** una colonna, barra delle schede in basso, gutter laterale 16 px, nessuno scroll orizzontale della pagina.
- **PC (≥ 900 px):** barra laterale a sinistra con logo e le 4 schede (come CAM Cash), contenuto centrato fino a ~1.200 px.
  - Menù: a sinistra il giorno (selettore, anelli, giornata tipo, pranzo, extra), a destra il ciclo con le tavole in griglia.
  - Ricettario: filtri in una colonna fissa a sinistra, tavole in griglia da 3–4 colonne.
  - Pagina ricetta: disegno e scheda tecnica a sinistra, ingredienti e procedimento a destra.
  - Spesa: "Da comprare" e "In casa" affiancate invece del segmento.
  - Progressi: numeri della settimana in alto su una riga, sotto grafico del peso e insights affiancati.
- Stessi dati e stesse funzioni sui due formati; cambia solo la disposizione.

| Token (provvisorio) | Hex | Uso |
|---|---|---|
| `--bg` | `#F6EDD9` | sfondo |
| `--card` | `#FBF5E8` | card, tavole |
| `--ink` | `#3A3530` | testo, linee, bordi |
| `--muted` | `#9A8F80` | etichette, testo secondario |
| `--line` | `#E2D6BE` | divisori sottili |
| `--peach` | `#F2B49A` | accento (alone slider, anello kcal) |
| `--sage` | `#B9CFA0` | accento (anello proteine, "in casa") |

## File del repo

```
index.html, app.js, style.css   app (unica pagina, viste gestite in JS)
manifest.webmanifest, sw.js     PWA; i JSON di programma sempre network-first
icons/                          icone 180/192/512 px
design/                         export di Stitch (solo riferimento visivo)

programma.json      target, giornata tipo, regole del menù, messaggio del coach   (scritto da Claude)
alimenti.json       catalogo alimenti                                             (scritto da Claude)
preset.json         pasti fuori e mensa                                           (scritto da Claude)
ricette/<id>.json   una ricetta per file                                          (scritto da Claude)
disegni/<id>.png    disegno del piatto (fondo crema, quadrato, ~800 px)           (aggiunto da Claude)
brief.md            brief del controllo periodico                                 (scritto da Claude)

giorni/AAAA-MM-GG.json   eventi del giorno                                        (scritto dall'app)
cicli/<id>.json          menù di un ciclo                                         (scritto dall'app)
alias-utente.json        voci della spesa associate da CAM ad alimenti            (scritto dall'app)
inbox/<timestamp>.json   voci aggiunte alla spesa da Siri                         (scritto dallo Shortcut, svuotato dall'app)
```

## Formato dei dati

### `programma.json`
```json
{
  "versione": "0.2",
  "aggiornato": "2026-10-31",
  "messaggio_coach": "Primo ciclo: registra tutto, anche a occhio. Le prime 2–3 settimane servono a calibrare.",
  "target": { "kcal": 2800, "kcal_min": 2700, "kcal_max": 2900, "proteine_min": 125, "frutta_verdura_porzioni": 4 },
  "data_inizio": "2026-11-03",
  "giornata_tipo": [
    { "id": "colazione", "nome": "Colazione", "ora": "08:30", "giorni": "tutti",
      "voci": [ { "alimento": "nascondini", "g": 36.6 }, { "alimento": "pane-proteico", "g": 35 }, { "alimento": "crema-arachidi", "g": 15 }, { "alimento": "confettura-fichi", "g": 15 }, { "alimento": "miele", "g": 7 } ] },
    { "id": "spuntino", "nome": "11:00", "ora": "11:00", "giorni": "tutti", "voci": [ ... ] },
    { "id": "merenda", "nome": "Merenda", "ora": "17:30", "giorni": "tutti", "voci": [ ... ] },
    { "id": "shake", "nome": "Shake", "ora": null, "giorni": "tutti", "voci": [ { "alimento": "whey-yamamoto", "g": 30 }, { "alimento": "latte-soia", "g": 250 } ] },
    { "id": "frutta", "nome": "Frutta", "ora": "23:00", "giorni": "tutti", "voci": [ { "alimento": "banana", "g": 120 } ] }
  ],
  "pranzo": { "feriali": "mensa", "weekend": "menu", "mensa_forfait": { "kcal": 750, "proteine": 32 } },
  "menu": {
    "rotazione_cene": ["pasta-pesto-tonno", "burger-pollo-patate", "burger-manzo-patate"],
    "jolly": ["toast-salmone", "kioene-patate"],
    "piatti_nuovi_per_ciclo": 1,
    "durata_default_giorni": 9
  },
  "regole": {
    "sgarro": "Un piatto marcato come sgarro è libero ma si registra: entra nelle medie.",
    "pasti_fuori": "Nessuna quota: se si mangia fuori, il piatto previsto passa al ciclo successivo."
  }
}
```
`giorni` può essere `"tutti"`, `"feriali"` o `"weekend"`.

### `alimenti.json`
```json
[
  { "id": "bresaola", "nome": "Bresaola Valtellina IGP", "marca": "Conad", "categoria": "salumi",
    "unita": "g",
    "per100": { "kcal": 163, "prot": 34, "carb": 0, "grassi": 3, "fibre": 0, "sale": 4 },
    "confezione": { "nome": "vaschetta", "g": 90 },
    "alias": ["bresaola", "bresaole"],
    "frutta_verdura": false,
    "fresco_giorni": null }
]
```
- `unita`: `"g"`, `"ml"` (valori per 100 ml) o `"pz"` (con `confezione.pz` e `g_pz`, es. uova: `g_pz: 60`).
- `frutta_verdura: true` per gli alimenti che contano come porzioni (1 porzione = 80 g, regola fissa).
- `fresco_giorni`: solo per frutta e verdura fresca (es. insalata 4, pomodorini 5). Nessun inserimento di scadenze da parte di CAM.
- Alimenti "di base" senza valori significativi (sale, spezie, aceto) hanno `"traccia_dispensa": false`: non entrano in dispensa né in lista automatica.

### `ricette/<id>.json`
```json
{
  "id": "pasta-pesto-tonno",
  "nome": "Casarecce al pesto rosso e tonno",
  "sottotitolo": "Pesto di pomodoro e olive, tonno al naturale, Grana",
  "pasto": ["cena", "pranzo"],
  "base": true,
  "dentro_piano": true,
  "porzioni": 1,
  "tempo_min": 20, "sforzo": 1, "livello": 1,
  "attrezzatura": ["pentola grande", "padella", "bilancia"],
  "ingredienti": [
    { "alimento": "pasta", "g": 180 },
    { "alimento": "pesto-rosso-mutti", "g": 90 },
    { "alimento": "tonno-naturale", "g": 80, "sostituzioni": ["grana-grattugiato:25"] }
  ],
  "preparazione": "Prima di accendere il fuoco: sgocciola il tonno e sbriciolalo con una forchetta.",
  "passaggi": [
    { "testo": "Porta a bollore 2 litri d'acqua in una pentola grande con il coperchio; quando bolle aggiungi 15 g di sale grosso.", "fuoco": "alto", "tempo_min": 10, "segnale": "bolle forte su tutta la superficie" }
  ],
  "tecnica": { "nome": "Mantecare la pasta", "spiegazione": "...", "errore_tipico": "..." },
  "disegno": "disegni/pasta-pesto-tonno.png",
  "categoria_disegno": "pasta",
  "fonte": null,
  "aggiunta": "2026-10-31"
}
```
- `sforzo`: 1 (minimo) – 3 (impegnativo). `livello`: 1–5 (difficoltà tecnica).
- Se `disegno` manca, si usa l'illustrazione generica `disegni/categorie/<categoria_disegno>.png`.
- kcal, proteine, carboidrati, grassi e porzioni di frutta/verdura **per porzione** sono calcolati dall'app.

### `preset.json`
```json
{
  "fuori": [ { "id": "pizza-margherita", "nome": "Pizza margherita", "kcal": 850, "prot": 32 }, { "id": "sushi-20", "nome": "Sushi, ~20 pezzi", "kcal": 900, "prot": 40 } ],
  "mensa": [ { "id": "riso-pollo-curry", "nome": "Riso e pollo al curry", "kcal": 780, "prot": 38 } ],
  "porzioni": { "piccola": 0.75, "normale": 1, "abbondante": 1.3 }
}
```

### `giorni/AAAA-MM-GG.json` (scritto dall'app)
```json
{
  "data": "2026-11-04",
  "giornata": { "colazione": "fatto", "spuntino": "fatto", "frutta": { "voci": [ { "alimento": "kiwi", "g": 150 } ] } },
  "pranzo": { "tipo": "mensa", "preset": "riso-pollo-curry", "porzione": "normale" },
  "eventi": [
    { "t": "2026-11-04T21:40:00+01:00", "tipo": "pasto", "ricetta": "burger-pollo-patate", "ciclo": "2026-11-03", "ingredienti": [ { "alimento": "patate", "g": 300 } ], "voto": 4, "nota": "" },
    { "t": "...", "tipo": "fuori", "preset": "pizza-margherita", "porzione": "normale", "kcal": 850, "prot": 32, "nota": "con amici" },
    { "t": "...", "tipo": "extra", "alimento": "banana", "g": 120 },
    { "t": "...", "tipo": "carico", "alimento": "uova", "pz": 6 },
    { "t": "...", "tipo": "rettifica", "alimento": "uova", "nuovo_saldo_pz": 0, "motivo": "finite" }
  ]
}
```
- In un evento `pasto`, `ingredienti` contiene **solo le differenze** rispetto alla ricetta (es. 300 g di patate invece di 250). Se assente, valgono le dosi della ricetta.
- `pranzo.tipo`: `"mensa"`, `"casa"` (ricetta dal menù), `"fuori"`, `"stima"` (valori incollati).
- In `giornata`, ogni voce della giornata tipo è `"fatto"` (dosi previste) oppure un oggetto con le `voci` effettive. Voci assenti = non registrate.
- Un giorno senza file = nulla registrato.

### `cicli/<id>.json`
```json
{
  "id": "2026-11-03", "dal": "2026-11-03", "al": "2026-11-11",
  "piatti": [
    { "ricetta": "pasta-pesto-tonno", "pasto": "cena", "fatto": "2026-11-04" },
    { "ricetta": "burger-pollo-patate", "pasto": "cena", "fatto": null },
    { "ricetta": "risotto-zucca-salsiccia", "pasto": "pranzo", "nuovo": true, "fatto": null, "da_ciclo": null }
  ]
}
```
`da_ciclo` indica i piatti riportati dal ciclo precedente.

### `inbox/<timestamp>.json` (scritto dallo Shortcut)
```json
{ "testo": "6 uova, latte e marmellata", "quando": "2026-11-05T13:02:11+01:00" }
```

## Logica dello script (senza AI)

### Giornata di oggi
- kcal e proteine di oggi = voci della giornata tipo spuntate + pranzo + eventi `pasto`/`fuori`/`extra` del giorno.
- Le voci della giornata tipo partono **non spuntate**. Un tocco sul cerchio = fatto come previsto. Un tocco sul nome = modifica quantità o alimenti (es. kiwi al posto della banana).
- **Selettore del giorno:** la registrazione funziona su qualsiasi giorno, non solo oggi (vedi Viste → Menù). Modificare un giorno passato ricalcola da sola dispensa, medie e lista spesa (sono tutte calcolate dai movimenti).
- **Promemoria di ieri:** all'apertura, se ieri ha voci della giornata tipo non spuntate, in cima compare "Ieri non hai segnato: spuntino, frutta" con "Sì, fatti" (le registra su ieri) e "No" (restano non fatte). Solo per il giorno precedente.
- Porzioni di frutta e verdura = somma grammi degli alimenti `frutta_verdura` / 80.

### Dispensa
Per ogni alimento con `traccia_dispensa` diverso da `false`:

`saldo = Σ carichi − Σ consumi + rettifiche`

- **Consumi:** voci della giornata tipo spuntate, ingredienti dei pasti fatti (dosi della ricetta corrette dalle differenze), voci `extra`. Il pranzo in mensa non consuma dispensa.
- **Rettifica:** imposta un saldo nuovo da quel momento (`nuovo_saldo`), non somma.
- Saldo negativo → mostrato come 0 con nota "probabilmente comprato senza registrarlo". Il valore reale resta nei conti.
- **Primo avvio:** schermata "Cosa hai in casa ora" con il catalogo e gli stepper (in confezioni), salvata come rettifiche alla data di oggi.
- Alimenti con `fresco_giorni`: data di carico + giorni = "da consumare entro". Solo come ordinamento (vedi Menù), nessun avviso invasivo.

### Menù del ciclo ("Prepara la prossima spesa", nella scheda Spesa)
Input: data della prossima spesa (default oggi + `durata_default_giorni`), quindi N giorni.
1. Riporta i piatti non fatti del ciclo precedente (`da_ciclo`).
2. **Cene:** completa fino a N cene continuando la sequenza di `rotazione_cene` da dove si era fermata (dopo l'ultima cena base fatta).
3. **Pranzi del weekend:** uno per ogni sabato e domenica nel periodo. Pesca dalle ricette con `pasto` che include `"pranzo"`, preferendo quelle con sforzo 2–3, voto alto e non fatte nelle ultime 3 settimane.
4. **Piatti nuovi:** `piatti_nuovi_per_ciclo` ricette mai fatte (o ricette marcate `nuovo` da Claude), sostituendo una cena di rotazione o un pranzo del weekend.
5. **Ordinamento:** in cima i piatti che usano alimenti freschi più vicini al "da consumare entro".
6. Mostra la media kcal/giorno stimata del ciclo (giornata tipo + mensa forfait + piatti) contro il target, come "in linea" / "sotto di X kcal".
7. CAM può togliere, scambiare (proposte alternative dello stesso tipo) e aggiungere dal Ricettario. Salvando si crea `cicli/<id>.json`.

### Lista della spesa ("Da comprare")
`fabbisogno = Σ ingredienti dei piatti non fatti del ciclo + giornata tipo × giorni rimanenti del ciclo − saldo in dispensa`

- Si arrotonda per eccesso alle confezioni (`confezione.g` o `pz`): "Bresaola · 2 vaschette (90 g)".
- Le voci aggiunte a mano o da Siri compaiono in una sezione "Aggiunte da te". Testo libero: l'app riconosce numero, unità e nome ("6 uova", "2 confezioni di bresaola", "marmellata") tramite gli `alias` di `alimenti.json` e `alias-utente.json`. Più voci separate da virgola o "e".
- Voce non riconosciuta: alla prima occasione l'app chiede di associarla a un alimento del catalogo, oppure "non alimentare / non tracciare". L'associazione si salva in `alias-utente.json` e non viene più chiesta.
- Gli ingredienti nuovi (per un piatto `nuovo`) hanno la nota "per provare *nome ricetta*".
- **Spuntare una voce = carico in dispensa** con la quantità della voce (modificabile prima della spunta: stepper confezioni o grammi). La spunta funziona offline e va in coda di sincronizzazione.
- L'inbox di Siri viene letta all'apertura dell'app: ogni file diventa voce "Aggiunta da te" ed è cancellato dal repo.

### Ricettario: ricerca
Filtri: tempo (≤10 · 20 · 30 · 45 · 60+ min), voglia/sforzo (1–3), novità (il solito ↔ voglio provare), pasto (cena / pranzo), "solo con ciò che ho" / "anche da comprare", "dentro il piano" / "sgarro", ingredienti scelti (chip dal catalogo).
Punteggio: copertura ingredienti in casa (peso maggiore con "solo con ciò che ho"), aderenza a tempo e sforzo, novità (mai fatto o fatto da più di 4 settimane se "voglio provare"; più fatto e voto alto se "il solito"), voto. Mostra le tavole ordinate, con per ognuna "hai tutto" / "mancano 2 ingredienti".

### Progressi
- **Settimana** (lun–dom), corrente e passata: kcal media vs target, proteine media, porzioni di frutta e verdura, giorni registrati, pasti fuori (numero e kcal stimate), piatti del menù fatti / previsti, piatti nuovi provati, peso medio della settimana e differenza dalla precedente.
- **Peso:** letto dal repo pubblico `whimsicam/camgym`, cartella `peso/` (API GitHub senza token per l'elenco, `raw.githubusercontent.com` per i file). Media mobile a 7 giorni.
- **Fabbisogno reale:** `media kcal registrate (ultimi 21 giorni) − pendenza del peso (kg/giorno, regressione lineare sulle pesate dello stesso periodo) × 7.700`. Mostrato solo con almeno 14 giorni, ≥ 80% dei giorni con giornata tipo e cena registrate e ≥ 6 pesate; altrimenti "in calibrazione (X/14 giorni)". Accanto, il target attuale.
- **Storico:** elenco delle settimane con i numeri principali.
- **Insights** (frasi generate da regole, con etichetta): proteine sotto il minimo da 3 giorni · media 7 giorni sotto `kcal_min` o sopra `kcal_max` · peso fermo da 2 settimane (media) · 3+ pasti fuori nella settimana o 2 settimane di fila con 2+ · frutta e verdura sotto target · piatto nuovo provato e voto ≥ 4 · alimento che finisce prima della fine del ciclo.
- **Brief:** contenuto di `brief.md` (scritto da Claude ai controlli), con data.

## Viste

### 1. Menù
- **Selettore del giorno** in cima: striscia della settimana (lun–dom) con il giorno selezionato evidenziato e un puntino sotto i giorni completi (giornata tipo e cena registrate); frecce ‹ › per la settimana precedente/successiva; icona calendario che apre la vista mese per saltare a un giorno qualsiasi (i giorni con dati hanno il puntino). Default: oggi. Tutta la striscia sotto si riferisce al giorno selezionato.
- **Striscia del giorno:** due anelli sottili (kcal e proteine rispetto al target) con i valori; sotto, le voci della giornata tipo come righe compatte con cerchio da spuntare (ora, nome, kcal), nell'ordine della giornata; pranzo (feriali: "Mensa" con scelta preset e porzione; weekend: piatto dal menù); pulsanti "+ Fuori casa" e "+ Extra".
- **Il ciclo:** contatore "Cene 4/9 · pranzi 1/2 · fino a mar 11"; le tavole dei piatti del ciclo (da fare in evidenza, fatti attenuati con la data). Ogni tavola: disegno, nome, kcal · proteine · tempo, eventuale "manca: uova", pulsante "Fatto". "Fatto" apre un foglio rapido: oggi / ieri, porzione standard o quantità modificate, voto 1–5 (facoltativo).
- Negli ultimi 2 giorni del ciclo (o a ciclo scaduto), in fondo una riga "Il ciclo finisce martedì · prepara la spesa →" che porta alla scheda Spesa.
- Banner con `messaggio_coach` quando `versione` cambia.

### 2. Ricettario
- In alto: barra "Cosa cucino?" con chip degli ingredienti scelti; gli slider (tempo, voglia, novità); le pillole dei filtri.
- Risultati come tavole. Toccando una tavola si apre la **pagina della ricetta**: disegno grande, nome, sottotitolo, scheda tecnica (kcal, proteine, carboidrati, grassi, tempo, sforzo, livello), ingredienti con grammi e stato "in casa" / "manca", attrezzatura, preparazione, passaggi numerati (con fuoco, tempo e segnale), box "La tecnica" con l'errore tipico, voto medio e ultime volte fatte. Pulsanti "Aggiungi al menù" e "Fatto".
- In fondo ai risultati: **"Chiedi a Claude"**. Costruisce un messaggio con: target e quanto manca oggi, alimenti in casa con quantità, ingredienti scelti, filtri, standard di dettaglio delle ricette, richiesta di 3 proposte. Apre `https://claude.ai/new?q=<messaggio codificato>`; se il testo non arriva precompilato (da verificare), copia il messaggio negli appunti e mostra "Messaggio copiato: incollalo in Claude". Le ricette scelte le salva Claude nel repo.
- Sezione "I miei piatti": ricette fatte almeno una volta, con voto; contatore dei piatti imparati.

### 3. Spesa
- In cima, il riquadro **Prepara la prossima spesa**: in evidenza negli ultimi 2 giorni del ciclo o a ciclo scaduto, altrimenti chiuso in una riga. Scelta del giorno della spesa (chip dei prossimi giorni), "Copre N giorni", elenco dei piatti proposti con scambia e togli, "+ Aggiungi dal Ricettario", media kcal stimata, "Conferma e calcola la lista".
- Segmento **Da comprare / In casa**.
- *Da comprare:* sezione "Per il menù" (calcolata), "Aggiunte da te", campo di inserimento rapido in alto. Ogni riga: nome, quantità in confezioni, nota, spunta. Voci non riconosciute con il pulsante "Associa".
- *In casa:* alimenti con saldo > 0 raggruppati per categoria, quantità in confezioni e grammi, "da consumare entro" solo per i freschi; tocco → rettifica (stepper o "finito").

### 4. Progressi
- In cima, come in CAM Cash, la scelta del periodo: chip delle settimane (corrente, precedenti, scorrevoli) e chip "Mese" con scelta del mese. Settimana: numeri della Logica. Mese: stessi numeri come medie del mese, più le settimane del mese in fila.
- Sotto: peso, fabbisogno reale, insights, brief.

### 5. Impostazioni (icona, non scheda)
- Owner, repo, branch, token GitHub fine-grained (solo `camkitchen`, Contents read/write), salvati solo in localStorage. "Prova connessione".
- Repo del peso (default `whimsicam/camgym`).
- "Cosa hai in casa ora" (rifare l'inventario).
- "Esporta tutti i dati" (JSON).

## Pasti fuori casa
"+ Fuori casa" apre: preset (`preset.fuori`) con porzione piccola / normale / abbondante; oppure **"Stima da foto o descrizione"**: costruisce un messaggio per Claude (descrizione, ora, invito ad allegare la foto) come per "Chiedi a Claude"; la stima la scrive Claude nel repo, oppure CAM incolla nel campo un blocco `{"nome": "...", "kcal": 0, "prot": 0}` che l'app valida e salva come evento `fuori`.

## Shortcut di Siri "Aggiungi alla spesa"
Da creare nell'app Comandi Rapidi (iPhone in inglese), nome esatto **Aggiungi alla spesa**:
1. *Ask for Input* (Text), prompt "Cosa aggiungo?"
2. *Format Date* → Current Date, formato `yyyyMMdd-HHmmss`
3. *Text*: `{"testo":"[Provided Input]","quando":"[Current Date ISO 8601]"}`
4. *Base64 Encode* del testo
5. *Get Contents of URL*: `https://api.github.com/repos/whimsicam/camkitchen/contents/inbox/[Formatted Date].json`, Method **PUT**, Headers `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, Request Body JSON: `message` = "spesa: siri", `content` = Base64.
6. *Speak Text* "Aggiunto alla spesa"

Uso: "Hey Siri, aggiungi alla spesa" → "Cosa aggiungo?" → "sei uova e la marmellata". Serve rete. Il token è lo stesso tipo di quello dell'app (solo questo repo).

## Sincronizzazione con GitHub
Come CAM Gym:
- Le scritture (`giorni/`, `cicli/`, `alias-utente.json`) vanno in coda in localStorage e partono con la GitHub Contents API (PUT, con `sha` per i file esistenti; in caso di conflitto si rilegge, si unisce e si riprova). Messaggi di commit: "giorno: 2026-11-04", "menù: 2026-11-03".
- All'avvio: un'unica chiamata `git/trees/main?recursive=1` per l'elenco dei file con gli `sha`; si scaricano solo i file cambiati rispetto alla cache locale.
- I file scritti da Claude (`programma.json`, `alimenti.json`, `preset.json`, `ricette/`, `brief.md`) si leggono sempre freschi (no cache del service worker).
- Nessun token nel codice o nei file del repo.

## Funzioni aggiunte dopo la revisione del prototipo

### Giornata tipo con un tocco (v1)
In cima alla timeline, il pulsante "Giornata tipo come previsto" segna in un colpo colazione, spuntino, merenda, shake e frutta del giorno selezionato. **Pranzo e cena restano esclusi**: si registrano solo scegliendo il piatto (slot). Le eccezioni si toccano una per una.

### Collegamento con CAM Gym (v1)
Kitchen legge dal repo pubblico `whimsicam/camgym` le cartelle `logs/` e `peso/`:
- **Giorno di palestra:** il sottotitolo del giorno mostra la sessione fatta (es. "Giorno di palestra · Armor") o "Riposo".
- **Shake:** nei giorni con una sessione chiusa, lo shake è evidenziato come "da segnare".
- **Peso:** una sola fonte, inserito in CAM Gym, mostrato nei Progressi di Kitchen.
- **Insights incrociati** (a regole, con dati sufficienti): carichi fermi su 2+ esercizi multiarticolari nelle ultime 2 settimane **e** kcal medie sotto `kcal_min` → "Probabile causa: mangi poco"; energia di sessione ≤ 2 in giorni preceduti da < 2.500 kcal (almeno 4 casi) → segnalazione; settimana di deload in CAM Gym → nessun aumento di target proposto.
- **Controllo periodico unico:** legge entrambi i repo e produce le proposte per tutti e due i programmi.

### Siri per i pasti (v2)
Secondo Shortcut "Ho mangiato fuori": chiede "Cosa?" e scrive `inbox/pasto-<timestamp>.json` (`{"tipo":"fuori","testo":"pizza margherita","quando":"..."}`); all'apertura l'app lo associa a un preset (o chiede quale) e lo registra sul giorno.

### Proposte di Camillo (v2)
Il controllo periodico non modifica direttamente `programma.json`: scrive `proposte/<data>.json` (`{"testo": "...", "modifiche": {...}}`). In Progressi, Camillo mostra la proposta con **Accetta / Rifiuta**. Accetta → l'app applica le modifiche a `programma.json` (commit "programma: proposta del <data> accettata") e il prossimo menù le usa. Rifiuta → la proposta resta archiviata con l'esito, letta al controllo successivo.

### Percorso di cucina (v2)
`tecniche.json` (scritto da Claude): elenco ordinato di tecniche (rosolare, mantecare, cottura della carne in padella, salse emulsionate, pasta fresca…), ciascuna con le ricette che la insegnano. Il piatto nuovo di ogni ciclo è scelto dalla prossima tecnica non ancora imparata. Una tecnica è "imparata" dopo 2 ricette fatte con voto ≥ 3. Nel Ricettario, capitolo "Le tecniche": imparate, in corso, prossima.

### Mascotte: Camillo
Gnocco tondo color burro (`--butter`) con cappello da chef e baffi a manubrio, alone sfumato, piccola animazione (oscillazione e battito di ciglia; ferma con `prefers-reduced-motion`). Parla in: Progressi (riquadro "Camillo dice" a tendina con insights e brief), Spesa ("Prepara la prossima spesa"), Ricettario ("Non trovi niente?" → messaggio per Claude), proposte.

### Pagina della ricetta (stile carta del tè)
A tutto schermo, aperta da una pagina del Ricettario o da "Apri la ricetta". Sul telefono una colonna; sul PC la carta a sinistra (fissa) e il resto a destra.
- **Carta:** capitolo e numero di pagina, "1 porzione", titolo grande in grassetto, "Tecnica · <nome>", disegno, griglia 3×2 (kcal, proteine, tempo, carboidrati, grassi, livello), pulsanti "Fatto" e "Aggiungi al menù".
- **Ingredienti** come un menù: nome, puntini, grammi allineati a destra.
- **Procedimento:** passaggi numerati 01, 02…; per ognuno il testo, il segnale visivo sotto ("→ pronte quando…") e a destra, come un prezzo, il tempo in grassetto con sotto fuoco o temperatura.
- **La tecnica:** riquadro con spiegazione ed errore tipico.

### Rifiniture dell'interfaccia
- **Illustrazione per scheda** accanto al titolo (libro aperto, cesta, bilancia), a inchiostro, dallo stesso generatore dei piatti.
- **Stati vuoti con Camillo** (lista spesa completata, nessuna ricetta per i filtri scelti, ciclo finito): disegno di Camillo, una frase, un'azione.
- **Transizioni:** cambio scheda con dissolvenza e leggero scorrimento verso l'alto; fogli e pagina ricetta che salgono dal basso. Nessun elemento inclinato.

### Riferimento visivo
Il prototipo approvato nella chat del progetto (artifact "CAM Kitchen") è il riferimento visivo al posto dei mockup di Stitch: va salvato in `design/prototipo.html`. Elementi chiave: Outfit (bold per titoli, light per il testo), carta crema con grana leggera, disegni **monocromi in blu cobalto (#24408E) su crema**, stile porcellana e libro di cucina d'epoca (prompt in `disegni-prompt.md`); l'interfaccia resta in inchiostro caldo, timeline della giornata, ciclo come carosello a carte sovrapposte in formato ridotto (cene e pranzi, timbro "fatto" sui piatti consumati, all'apertura centrato sul primo piatto da fare; tocco sulla carta centrale = scheda del piatto), Ricettario con "Sfoglia" a carte sovrapposte (carosello stile cover flow piatto, senza inclinazioni: la carta al centro grande e in primo piano, le laterali più piccole e parzialmente coperte, colore pastello tenue per carta; tocco sulla carta centrale = apre la ricetta, su una laterale = la porta al centro) e indice con puntini, scontrino della spesa raggruppato per piatto, barra delle schede a pillola flottante, fogli che salgono dal basso.

## Fuori da questa versione
Modalità cucina passo passo, avanzi, tracciamento delle scadenze inserite a mano, lista per reparti, notifiche push, costi. Versione 2: scansione del codice a barre con Open Food Facts.

## Criteri di accettazione
1. Su iPhone, aggiunta alla Home, si apre a schermo intero con icona e nome "CAM Kitchen".
2. Primo avvio: inventario "Cosa hai in casa ora"; dopo il salvataggio la vista In casa mostra quei saldi.
3. Spuntare colazione e spuntino: gli anelli di oggi salgono delle loro kcal e la dispensa scala i loro alimenti. Il giorno dopo, all'apertura, compare il promemoria per le voci di ieri non spuntate.
4. "Prepara la prossima spesa" (scheda Spesa) per 9 giorni: compaiono le cene in rotazione, i pranzi del sabato e della domenica e 1 piatto nuovo; la lista "Da comprare" contiene solo ciò che manca, arrotondato a confezioni.
5. Spuntare "uova ×6" in lista (anche in modalità aereo) → In casa: 6 uova. Fare due volte un piatto con 3 uova → In casa: 0 uova, e le uova ricompaiono in Da comprare.
6. Shortcut di Siri: "sei uova e la marmellata" → all'apertura dell'app compaiono in "Aggiunte da te" due voci; "marmellata" viene riconosciuta o chiede l'associazione una sola volta; il file sparisce da `inbox/`.
7. Ricettario: con "solo con ciò che ho" e tempo ≤ 20 min compaiono solo ricette con tutti gli ingredienti in casa e tempo ≤ 20.
8. "Chiedi a Claude" apre Claude con il messaggio precompilato oppure lo copia negli appunti.
9. Pizza registrata con "+ Fuori casa": il piatto del ciclo resta da fare; i Progressi contano 1 pasto fuori e le sue kcal nella media.
10. Modificare una dose in `ricette/` o un target in `programma.json` sul repo: dopo il ricaricamento l'app mostra i nuovi valori senza toccare il codice.
11. I Progressi mostrano il peso letto da CAM Gym e "Fabbisogno reale: in calibrazione" finché i dati non bastano.
12. Nessun token nel codice o nei file del repo.
13. Dal selettore del giorno si apre un giorno della settimana scorsa, si spunta la merenda: la dispensa e la media di quella settimana nei Progressi si aggiornano.
14. Sul PC (finestra ≥ 900 px) compare la barra laterale e le viste usano il layout a colonne; sul telefono la barra in basso. Nessuno scroll orizzontale a 390 px.
