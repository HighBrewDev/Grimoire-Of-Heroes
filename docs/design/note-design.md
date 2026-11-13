# Note di design · Grimoire of Heroes

Diario e guida di stile del designer. Le voci del diario sono in cima alla sezione "Diario", le più recenti prima.

## Guida di stile

### Idea
Un tomo rilegato in cuoio su una scrivania scura: segnalibri dei capitoli a sinistra (in alto su telefono e tablet), una pagina di pergamena che gira sul dorso, la barra dei dadi lungo il bordo in basso. Due temi: **pergamena** (giorno, predefinito) e **pagine notturne** (`:root[data-book="night"]`, pulsante sole/luna in alto).

### Colori (variabili in `:root`, index.html)
| Ruolo | Giorno | Notte |
|---|---|---|
| Scrivania | `--desk #140c07`, `--desk2 #2a1a10` | uguali |
| Cuoio | `--leather #3b2416`, `--leather2 #24150d`, `--leather3 #57351f` | uguali |
| Oro (bordi, bottoni) | `--gold #c9a227`, `--gold2 #f0d483`, `--gold3 #8a6c1f` | uguali |
| Pergamena | `--parch #f3e6c4`, `--parch2 #e8d3a0` | `#231c16`, `#1b1511` |
| Inchiostro | `--ink #2b1d10`, `--ink2 #5b462d`, `--ink3 #86704f` | `#eadcb8`, `#c8b48c`, `#9c8963` |
| Accenti | `--rubric #8e2219` (pericolo), `--verdigris #2f5b48` (competenza), `--lapis #284a6e` (concentrazione) | `#ec8a72`, `#86c8a6`, `#93b7e3` |
| Campi | `--field #fffaf0` | `#15110d` |

Regola: niente colori nuovi scritti a mano dentro le pagine; usare le variabili, così il tema notte funziona da solo.

### Caratteri (inclusi in base64 in index.html)
- **Cinzel** (titoli, segnalibri, dadi) · SIL Open Font License 1.1.
- **Crimson Pro** (testo, normale e corsivo) · SIL Open Font License 1.1.
- Testo base 17 px (16 px sotto 560 px). Campi di testo 15,5 px su desktop, **16 px su schermi touch** (sotto i 16 px iPhone ingrandisce la pagina al tocco).

### Componenti
- `.btn` bottone oro principale; `.btn.ghost` secondario (bordo oro, fondo trasparente); `.btn.small` compatto; `.btn.danger` rosso per cancellare.
- `.sb` bottone piccolo "di pagina" (Damage, Heal, Roll, condizioni…), fondo carta.
- `.iconBtn` bottone solo icona (tema, suono): serve sempre `aria-label`.
- `.dbtn` dadi della barra in basso; `.pip` cerchietti degli slot; `.dot` pallini di competenza.
- Icone: SVG disegnati a mano nel file (tratto `currentColor`, spessore 1,6–2), più qualche emoji per i ritratti. Nessuna risorsa esterna.
- `.sr` testo solo per lettori di schermo (ora con `left:0`, `padding:0`, `border:0`, `clip-path`, così un `input type=file` nascosto non allarga la pagina).

### Telefono e touch (`@media (pointer:coarse)`)
- Ogni controllo toccabile almeno **44×44 px**: `.btn`, `.iconBtn`, `.sb`, `.dbtn`, campi della barra dadi, + e − delle caratteristiche, slot degli incantesimi.
- Gli slot (`.pip`) restano cerchi da 26 px: l'area di tocco è il bottone da 44 px, il cerchio è disegnato da `::before`.
- Sotto 560 px i 7 dadi si dividono la prima riga della barra in parti uguali; `#app` ha spazio in fondo (175 px) per non finire sotto la barra.
- `.sb` è largo e alto almeno 44 px (2026-11-10).
- Il desktop con il mouse non cambia (screenshot a 1440 identici al pixel).

### Testo dell'utente lungo (B-019)
- Gli elementi che mostrano testo libero (nomi e note di attacchi, oggetti, slot di sintonia, titoli delle card, titolo/sottotitolo della pagina, card dello scaffale) hanno `overflow-wrap:anywhere`: a differenza di `break-word` abbassa anche la larghezza minima, quindi celle di griglia e flex si stringono invece di allargare la pagina.
- **Non** metterlo su contenitori grandi (`.pageBody`, `.modal`): spezza parole corte in righe strette ("SR D", "Train ing"). Aggiungere il selettore preciso quando nasce un nuovo campo libero.
- Card dello scaffale: nome e riga sotto al massimo 2 righe (`-webkit-line-clamp`), con 3 px di margine interno per non tagliare le grazie del Cinzel.

- `button.dot` e `.chipX` hanno area da 44 px su touch (2026-11-13); focus: `--gold3` su carta, `--gold2` su cuoio.

### Movimento
- Con `prefers-reduced-motion` le finestre si aprono senza la piega 3D (`.modal{animation:none}`).

### Controlli prima di pubblicare
`node tests/run.js telefono` (11 test: scroll orizzontale, aree di tocco, 16 px) e screenshot a 390x844, 768x1024, 1440x900 in giorno e notte. Le esecuzioni complete riscrivono `tests/risultati/AAAA-MM-GG.json`: se non sei il tester, ripristinalo con `git checkout` prima del commit.

## Diario

### 2026-11-13
- **Fatto**: focus visibile (`:focus-visible` 3 px `--gold3`, `--gold2` su superfici scure e tema notte) e `.dot`/`.chipX` a 44 px su touch (`button.dot::before` disegna il cerchio da 22 px, margine -11 px). Pulsanti a icona: `aria-label` già a posto.
- **Prima/dopo**: [prima 390](2026-11-13-a11y-prima-390.png), [dopo 390](2026-11-13-a11y-dopo-390.png), [768](2026-11-13-a11y-dopo-768.png), [1440](2026-11-13-a11y-dopo-1440.png).
- **Prossime idee**: stampa A4, indizio di scorrimento dei segnalibri, misura del contrasto dei testi `--ink3`.

### 2026-11-12
- **Fatto**: B-030 (testi lunghi su telefono, solo CSS) e B-040 (ordine dello scaffale ricordato). Il selettore `overflow-wrap:anywhere` ora copre anche `.entry .chip`, `.kv > span:first-child`, `.fold summary`, celle di tabella e nomi dell'Incontro (regola in cima al CSS, riga ~688). `savePrefs()` scrive solo le preferenze senza toccare `updatedAt` degli eroi.
- **Prima/dopo**: [prima 390](2026-11-12-testi-lunghi-prima-390.png), [dopo 390](2026-11-12-testi-lunghi-dopo-390.png), [768](2026-11-12-testi-lunghi-dopo-768.png), [1440](2026-11-12-testi-lunghi-dopo-1440.png).
- **Imparato**: all'apertura compaiono copertina e finestra "Welcome to the beta": negli script di screenshot cliccare "Open the Grimoire" e "Start writing".
- **Prossime idee**: `.dot` e "✕" a 44 px, contrasto, `aria-label`, stampa A4.

### 2026-11-11
- **Fatto**: B-014, scaffale con filtro e ordine (da 8 eroi, `SHELF_MIN`). Stato in `G.shelfQ` / `G.shelfSort`, non salvato. Su ≤560 px `.shelf.many` va a capo in 2 colonne con altezza massima 236 px e scroll verticale; da 768 px in su resta la fila orizzontale.
- **Prima/dopo**: [prima 390](2026-11-11-scaffale-prima-390.png), [dopo 390](2026-11-11-scaffale-dopo-390.png), [filtro 390](2026-11-11-scaffale-filtro-390.png), [768](2026-11-11-scaffale-dopo-768.png), [1440](2026-11-11-scaffale-dopo-1440.png).
- **Imparato**: `git pull` su checkout staccato non aggiorna: usare `git fetch origin main && git checkout -B main origin/main`.
- **Prossime idee**: B-030 solo CSS (telefono 17/17), `.dot` e "✕" a 44 px, contrasto e aria-label.

### 2026-11-10
- **Fatto**: B-019 e tocco nella finestra Level up (compito del piano, solo CSS). Testi e link lunghi vanno a capo in Combattimento, Zaino, titoli e scaffale; `.sb` a 44 px di larghezza su touch; finestre senza piega 3D con "riduci animazioni". Telefono 15/15, suite 179/186 senza regressioni.
- **Prima/dopo**: [testi lunghi 390](2026-11-10-b019-testi-lunghi-390.jpg), [Level up 390](2026-11-10-levelup-tocco-390.jpg).
- **Imparato**: gli screenshot a pagina intera con emulazione telefono variano un po' fra due esecuzioni dello stesso codice; per confrontare conviene misurare le posizioni degli elementi (`getBoundingClientRect`) oltre al confronto dei pixel.
- **Prossime idee**: proposta per B-014 (filtro e ordine dello scaffale); `.dot` e "✕" dei chip a 44 px; indizio di scorrimento sui segnalibri dei capitoli.

### 2026-11-09
- **Fatto**: telefono e tablet comodi al tocco (voce 2 del Backlog, anticipata da martedì). Tolti i 10 px di scroll orizzontale a 390 px (16 a 768): la causa era `input#f_img.sr`, che con il padding dei campi era largo più di 1 px. Aree di tocco 44 px e campi a 16 px solo su schermi touch. Nomi lunghi senza spazi vanno a capo (titolo, frase iniziale, toast) invece di allargare la pagina di 831 px.
- **Prima/dopo**: [390 giorno](2026-11-09-telefono-390-giorno.jpg), [390 notte](2026-11-09-telefono-390-notte.jpg), [dettagli: caratteristiche, PF, slot](2026-11-09-telefono-dettagli.jpg), [768 notte](2026-11-09-tablet-768-notte.jpg).
- **Da tenere d'occhio**: le card delle caratteristiche su telefono sono più alte (+ e − da 44 px, "Check" da 44 px): si scorre un po' di più.
- **Prossime idee**: pallini di competenza `.dot` (22 px) e "✕" dei chip; i segnalibri dei capitoli su telefono sono tagliati a destra senza un indizio che si scorrono; proposta per B-014 (filtro e ordine dello scaffale); contrasto e `aria-label` (Backlog 7).
