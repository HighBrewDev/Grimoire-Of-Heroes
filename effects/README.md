# Livello effetti (porting, fase 6)

Modulo isolato, senza dipendenze e senza build: non conosce la logica dell'app e non la tocca. Si accende solo con `html[data-effects="full|reduced|off"]`
(l'attributo lo possiede il design system / schermata "Aspetto"; se manca vale `off`).

| File | Cosa fa |
|---|---|
| `effects.js` | `init()` (braci e inclinazione sulla copertina `#coverBk`), `transition(fn)` (View Transitions), `measure(ms)` (frame time), `suggest()` (livello iniziale: telefono debole = `off`) |
| `effects.css` | luccichio titolo, pagina che si gira fra capitoli, carte che entrano scorrendo (CSS scroll-driven), stile dado |
| `dice3d.js` | `await createDie(host, {sides:6\|20})` → `{roll(valore?), el, destroy}`: dado WebGL con Three.js, caricato solo alla prima creazione (import dinamico) |
| `vendor/` | Three.js 0.160.1 (MIT) in locale, funziona offline; se `window.THREE` esiste già (HTML singolo) viene usato quello |
| `demo.html` | pagina di prova con interruttore, capitoli finti, dadi e pulsante "Misura frame time" (da usare sul telefono) |
| `bench.js` | `node effects/bench.js [cartella]`: misura e screenshot per livello (1440 e 390 con CPU 4x lenta) |

## Livelli
- **off**: nulla cambia. Default su telefono debole (coarse pointer e ≤4 GB / ≤4 core). `suggest()` lo calcola.
- **reduced**: luccichio sul titolo, dissolvenza breve fra capitoli.
- **full**: in più braci su canvas (con guardia: se il frame time sale sopra 26 ms dimezza le braci, poi le spegne ed emette `fx:degraded`), inclinazione al puntatore, pagina che si gira, carte con scroll-driven animation, dado 3D (WebGL, funziona in tutti i browser con WebGL: Chrome, Firefox, Safari, Opera).

## Aggancio all'app (da fare nel capocantiere, 3 righe)
1. `<link rel="stylesheet" href="effects/effects.css">` e `<script type="module">import Fx from './effects/effects.js'; Fx.init(); window.Fx = Fx</script>` in `index.html`; i due file nel `SHELL` di `sw.js`.
2. Cambio capitolo: `window.Fx ? Fx.transition(render) : render()` al posto di `render()`.
3. Il dado dell'app può chiamare `createDie` e poi usare il valore che l'app ha già tirato: `die.roll(valoreDellApp)` (il dado mostra, non decide).
Con HTML singolo/offline serve inlinare i tre file (build); finché non c'è la build il modulo resta fuori da `index.html`.

## Note
- GSAP non è usato: View Transitions + CSS scroll-driven + Web Animations bastano; si aggiunge solo se serve una timeline vera (level up).
- Il dado in solo CSS 3D è stato scartato: si rompeva a seconda del browser. WebGL (Three.js) è lo standard e rende uguale ovunque; costo ~670 KB solo se si crea un dado.
- I numeri del d20 non seguono la disposizione dei dadi veri (opposti = 21).
- Misure in headless sono software: confrontare i livelli, non leggere i valori assoluti. Quelle vere si fanno sul telefono con la pagina demo.
