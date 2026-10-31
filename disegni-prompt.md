# CAM Kitchen — disegni da generare

## Prompt generale

Allegare sempre **la prima reference** (La Petite Cuisine) e **la terza** (teiera e tazze in blu). Cambiare solo la parte tra parentesi quadre.

```
Hand-drawn illustration of [SOGGETTO], in the style of the two attached reference images: a vintage cookbook ink sketch, like blue-and-white porcelain decoration.
Style: single color only, cobalt blue ink (#24408E) on a plain cream background (#F6EDD9). Fine, slightly uneven pen lines, light cross-hatching and stippling for shading, no fills of other colors, no gradients, no watercolor.
Composition: the subject centered, seen from a slight three-quarter angle, with generous empty space around it; at most two or three loose raw ingredients drawn small around it in the same style.
No text, no letters, no logos, no table, no frame, no border, no shadow on the background. Square format, 1:1.
```

Se un risultato esce colorato o con ombre: rigenerare aggiungendo in fondo *"Strictly monochrome blue line art, nothing else."*

## Lista

### Piatti (una immagine ciascuno)
Nome file = id della ricetta (`disegni/<id>.png`).

| File | [SOGGETTO] |
|---|---|
| pasta-pesto-tonno | a plate of casarecce pasta with tomato and olive pesto, flakes of tuna and a few parmesan shavings, one basil leaf; around it a small cherry tomato and two olives |
| burger-pollo-patate | two chicken burgers on a plate with a fried egg and crispy potato wedges with rosemary, a small salad on the side; around it a rosemary sprig and a potato |
| burger-manzo-patate | a thick seared beef burger patty on a plate with a fried egg and crispy potato wedges, a few cherry tomatoes; around it a rosemary sprig and a pepper grinder |
| toast-salmone | two slices of toasted bread with cream cheese and smoked salmon, black pepper on top, a few salad leaves; around it a lemon wedge |
| kioene-patate | four small round vegetable burgers with potato wedges and a fried egg on a plate; around it a small pumpkin wedge and a carrot |
| frittata-patate | a thick golden potato and onion frittata on a plate with one wedge cut out, a small salad; around it two eggs and half an onion |
| pollo-limone-basmati | sliced chicken breast in a glossy lemon sauce next to a mound of basmati rice, chopped parsley on top; around it a halved lemon |
| risotto-zucca-salsiccia | a shallow bowl of creamy pumpkin risotto with crumbled sausage and parmesan; around it a small pumpkin and a sage leaf |

### Illustrazioni di categoria (riserva per le ricette senza disegno)
`disegni/categorie/<nome>.png`

| File | [SOGGETTO] |
|---|---|
| pasta | an empty pasta plate with a fork twirled in a few strands of spaghetti |
| burger | a simple burger patty on a plate with a few leaves |
| uova | two eggs, one cracked, next to a small frying pan |
| ciotola | an empty ceramic bowl with a wooden spoon |
| piatto | an empty dinner plate with knife and fork |
| toast | two slices of toasted bread on a small board |

### Illustrazioni delle schede
`disegni/schede/<nome>.png`

| File | [SOGGETTO] |
|---|---|
| menu | a set table seen from above: a plate, fork, knife and a folded napkin |
| ricettario | an open old cookbook with a ribbon bookmark and a sprig of herbs on the page |
| spesa | a wicker shopping basket with a baguette, a bunch of leaves and a few tomatoes |
| progressi | an old kitchen balance scale with two pans, a few apples on one pan |

## Come consegnarli
Mandare le immagini in una chat del progetto dicendo per quale file sono. Claude le ritaglia quadrate, porta lo sfondo esattamente a #F6EDD9, le ridimensiona a 800 px e le carica nel repo.

Da qui in poi, ogni ricetta nuova aggiunta al ricettario arriva con la sua riga [SOGGETTO] già scritta da Claude.
