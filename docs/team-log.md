# Diario del team

## 2026-11-09 · sviluppo sera
- **Nota**: il piano non aveva un compito "Sviluppo sera" (la mattina ha chiuso B-013 e B-012); ho seguito il "Prossima sessione" del mattino e la voce 1 del Backlog (B-015), più B-005 e B-006 (voce 4), piccoli e con test già pronti. Nessun CSS toccato (il designer oggi ha lavorato sul CSS del telefono).
- **Fatto** ([4c4d449](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/4c4d449), su main):
  - **B-015** · Sezione import/export. Nella finestra Export c'è "Back up every hero" con **"Export all heroes (N)"**, e lo stesso pulsante compare nell'avviso "Not saved" (B-004). Il file `grimoire-heroes-AAAA-MM-GG.json` è `{grimoire:'heroes', version:1, exported, heroes:[…]}` con `heroData` (niente campi locali); contiene solo gli eroi tuoi (`isMine`), non quelli del party. **Import** (stessa finestra di sempre) riconosce il file o un array di eroi: ogni eroe passa da `fixup`, entra con un **id nuovo**, le copie identiche già nel tomo sono saltate, le voci rotte contate e scartate; se il render fallisce si annulla tutto.
  - **B-005** · Level up: l'aumento non abbassa mai un punteggio sopra il limite; le note dicono "STR already 24" invece di "STR +2".
  - **B-006** · Combattimento e Incontro: Damage, Heal, Temp con numero negativo valgono 0 (`hpNum`).
  - `sw.js`: alzata `CACHE`.
- **Scelte prudenti**: l'import del backup non sovrascrive mai un eroe e non riusa gli id (niente conflitti con sync/eroi cancellati in Supabase); il prezzo è che un eroe cambiato dopo il backup torna come secondo eroe invece di sostituire quello attuale. Il distruttore può dire se serve una scelta "sostituisci".
- **Test**: suite completa prima **160/165**, dopo **164/165**: ora passano B-015 (importexport), B-005 (levelup), B-006 ×2 (combattimento); resta solo B-014 (eroe). Nessun test che passava ora fallisce. File dei risultati di oggi ripristinato (resta quello del tester).
- **Prova a mano** (Playwright, server locale, 1440x900 e 390x844): 12 eroi → Export all (12, senza `_sig`/`updatedAt`) → reimport stesso file "Every hero in that file is already in the tome" → cancellati 5 → reimport "5 heroes back in the tome (7 already here)" → file misto con `null`, numeri, eroe senza caratteristiche e campi rotti "2 heroes back (3 damaged skipped)" → array semplice ok → `{"heroes":[]}` messaggio chiaro; dopo ricarica tutti presenti. Memoria piena: l'avviso mostra "Export all heroes" e il file contiene anche l'eroe non salvato (16). Console senza errori, scrollWidth uguale alla finestra.
- **File**: index.html, sw.js, docs/bug-beta.md, docs/team-log.md.
- **Prossima sessione**: B-014 (filtro per nome e ordine dello scaffale, l'ultimo test rosso), ma il piano lo vuole prima proposto dal designer; poi l'avviso "Nuova versione, ricarica" del service worker (Backlog 5).

## 2026-11-09 · design
- **Nota**: il piano diceva "designer oggi non lavora", ma la routine gira ogni giorno; ho preso la voce 2 del Backlog (telefono, già destinata al designer per martedì), solo CSS e lontano dalle parti toccate oggi dallo sviluppo (fixup, Zaino, export, Homebrew).
- **Fatto** ([3baa416](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/3baa416), su main):
  - **Scroll orizzontale sparito**: a 390 px era 400 (768 → 784). Causa: `input#f_img` con classe `.sr`, largo più di 1 px per il padding dei campi; `.sr` ora ha `left:0`, `padding:0`, `border:0`, `clip-path`.
  - **Tocco ≥44 px** solo su schermi touch (`pointer:coarse`): pulsanti in alto, frecce di pagina, dadi (sotto 560 px i 7 dadi riempiono la prima riga in parti uguali), Damage/Heal/Temp/riposi, + e − delle caratteristiche, slot degli incantesimi (il cerchio resta 26 px, l'area di tocco è 44). Spazio in fondo alla pagina aumentato perché la barra dadi non copra l'ultima riga.
  - **Campi a 16 px** su touch: niente zoom automatico di iPhone.
  - **Nomi lunghi senza spazi** (80 caratteri) vanno a capo nel titolo, nella frase iniziale e nel toast: prima allargavano la pagina di 831 px.
  - `sw.js`: alzata `CACHE`.
- **File**: index.html (`.sr` e un blocco CSS in fondo allo stile), sw.js, docs/design/ (nuovo: note-design.md e 4 screenshot prima/dopo), docs/team-log.md.
- **Verifica**: Playwright/Chromium in locale, 390x844, 768x1024, 1440x900, giorno e notte. Sezione `telefono` da 3/11 a **11/11**; robustezza "nome lungo" ora passa. Suite completa **160/165**: restano solo B-005, B-006 (2), B-014, B-015, già noti. Screenshot a 1440 identici al pixel prima e dopo (desktop invariato). Console senza errori. Prima/dopo: [390 giorno](design/2026-11-09-telefono-390-giorno.jpg), [390 notte](design/2026-11-09-telefono-390-notte.jpg), [dettagli](design/2026-11-09-telefono-dettagli.jpg), [768 notte](design/2026-11-09-tablet-768-notte.jpg). Il file `tests/risultati/2026-11-09.json` riscritto dalla mia esecuzione è stato ripristinato (resta quello del tester).
- **Da sapere**: su telefono le card delle caratteristiche sono più alte e il "Check" è un bottone pieno da 44 px. Il toast di salvataggio fallito (B-004) resta sopra la barra dadi, come scelto dallo sviluppo.
- **Prossima idea**: proposta per B-014 (filtro e ordine dello scaffale), poi pallini di competenza e "✕" dei chip a 44 px, e un indizio che i segnalibri dei capitoli si scorrono su telefono.

## 2026-11-09 · sviluppo (richiesta di Capo: import homebrew da Markdown, con controlli seri su tutte le import)
- **Fatto**: homebrew scritto in **Markdown** (.md) e **controlli delle regole** comuni a ogni ingresso: file Markdown, file 5etools, export Grimoire e editor.
  - **Formato**: una voce per titolo `# Tipo: Nome` (Spell, Feat, Species, Background, Class, Subclass, Item, Creature, anche in italiano), poi `- Campo: valore`, poi il testo; `##` per slot superiori, tratti, privilegi per livello (`### Level 3: Nome`) e sezioni dello statblock. Funzionano anche nomi italiani di campi, scuole, taglie, rarità e caratteristiche.
  - **Pagina Homebrew**: l'area Import accetta .md, "Paste Markdown", "Markdown template" (un esempio completo per ogni tipo), "Export as Markdown" (stesso formato: andata e ritorno identici) e una guida apribile.
  - **Controlli** (`checkBrew`): errori bloccano la voce, avvisi la lasciano passare. Incantesimi (livello 0–9, scuola, tempo di lancio, gittata, componenti V/S/M e materiale, durata/concentrazione, classi esistenti), talenti (categoria, prerequisiti di livello e caratteristica, ASI), specie (taglia, velocità, tipo di creatura, tratti), background (tre caratteristiche, talento esistente e di Origine, due abilità valide, strumento delle regole), classi (dado vita, caratteristiche, due TS, competenze riconosciute, "Choose N: …" con abilità valide, incantatore e caratteristica, privilegi 1–20, livello della sottoclasse), sottoclassi (classe esistente, privilegi da livello 3), oggetti (tipo, rarità, sintonia), creature (taglia, tipo, allineamento, CA, PF contro la formula dei dadi e il mod. di COS, punteggi 1–30, GS, TS e abilità contro mod.+competenza, Percezione passiva, bonus d'attacco e CD, tipi di danno/condizioni). Su tutto il testo: dadi insoliti; nome uguale a una voce SRD. Suggerimento "Did you mean…" per i refusi.
  - **Finestra di revisione** unica per tutte le import (anche l'export Grimoire, prima entrava senza conferma): contatori pronte/avvisi/errori, messaggi per ogni voce, filtro "Only problems"; le voci con errori non si possono spuntare.
  - **Editor**: riquadro "Checks" sopra l'anteprima, aggiornato mentre scrivi; con un errore "Add/Save" si ferma e dice perché.
- **Taratura**: sui file veri di 5etools (3.400+ voci fra incantesimi, creature, talenti, specie, background, oggetti, classi) **0 errori**; restano avvisi utili (es. CD che non tornano, background 2014 senza caratteristiche).
- **B-011 non toccato** (in alpha è tutto libero, il paywall è spento).
- `sw.js`: alzata la versione di `CACHE`.
- **Test**: sezione `workshop` da 14 a 25 test (modello che passa tutti i controlli, errori/avvisi con suggerimenti, classe, creatura, talento/specie/oggetto/sottoclasse, Markdown in italiano, export .md e reimport, incolla, file senza voci, editor bloccato da un errore, voci 5etools controllate). `node tests/run.js workshop`: 25/25. Resto della suite: stessi 14 fallimenti già noti di main (B-005, B-006, B-014, B-015, telefono), nessuno nuovo.

## 2026-11-09 · test
- **Fatto**: costruita da zero la suite automatica in `tests/` (Playwright, server locale, niente rete né Supabase, dadi con seme fisso): 154 test in 14 sezioni, con test di regressione per B-001…B-010, B-012, B-013 e per i bug aperti B-005, B-006, B-014, B-015 (B-011 non automatizzabile finché il paywall è spento). Eseguita su main `1028d8d` (con la nuova pagina Homebrew della PR #4). Punteggi in [docs/scoreboard.md](scoreboard.md), comandi in `tests/README.md`.
- **Risultato**: 140/154 superati, punteggio totale **+107** (primo giorno, nessuna tendenza). **Sezioni rosse: telefono** (−21: 8 test falliti su 11, aree di tocco sotto 44 px in barra in alto, barra dadi, frecce, PF, stepper, slot; carattere 15,5 px nei campi, che su iPhone fa scattare lo zoom; 10 px di scroll orizzontale a 390 px).
- **Nuovo trovato dai test**: un nome di 80 caratteri senza spazi allarga la pagina desktop di 831 px (lo scaffale non va a capo), test in robustezza. Falliscono come previsto B-005, B-006 (2 test), B-014, B-015.
- **Prossima volta**: almeno 5 test nuovi nelle sezioni più basse (telefono, combattimento, level up).

## 2026-11-09 · sviluppo (richiesta di Capo: pagina Homebrew dedicata)
- **Fatto**: il vecchio "Workshop" (un unico modulo con le schede per tipo) diventa la pagina **Homebrew**, raggiungibile dal pulsante "Homebrew" in alto (evidenziato quando sei nella pagina) e dal capitolo X, ora "Homebrew · create · import · manage".
  - **Pagina principale**: introduzione con "＋ Create new", "Import file", "Export all"; "Create something new" con 8 riquadri (icona, nome, a cosa serve, quanti ne hai fatti); "Your homebrew" con ricerca e filtri per tipo e per ogni voce Edit / Duplicate / Delete; "Import" con area di trascinamento per file Grimoire e 5etools e il rimando a "Copy to Homebrew" nella Library. Stato vuoto con istruzioni.
  - **Editor** separato: briciole "← Homebrew › New spell", scelta del tipo solo per le voci nuove, modulo a sinistra e **anteprima dal vivo** a destra (sotto il modulo su telefono), Add/Save, Cancel, Delete. Dopo il salvataggio si torna alla pagina principale.
  - "Duplicate" crea "Copy of …" e rispetta il limite gratuito come "Add". **B-011 non toccato**: l'import resta com'era.
  - Testi "Workshop" sostituiti con "Homebrew"; corretto "()" vuoto nella riga di un incantesimo senza liste di classi.
- `sw.js`: alzata la versione di `CACHE`.
- **Test** (Playwright/Chromium, server locale, 1440x900 e 390x844): pulsante in alto con `aria-current`; nuovo incantesimo con anteprima aggiornata a ogni tasto e salvataggio; nuova creatura; import 5etools dall'area della pagina (8 voci); ricerca senza perdere il fuoco; filtro Creature; Duplicate, Edit e Delete dall'editor; Copy to Homebrew da Acid Arrow nella Library apre l'editor. Console senza errori, scrollWidth uguale alla finestra.

## 2026-11-09 · sviluppo
- **Fatto**: i due passi del piano, nessun CSS toccato.
  1. **B-013 su main** ([9c791c1](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/9c791c1)): nuova `invCat` porta ogni categoria sconosciuta al gruppo più vicino ("Treasure" → "Treasure & Valuables", "Weapon" → "Weapons", "Instrument" → "Tools & Kits"…) o a "Quest & Misc"; la usano `fixup` (import, avvio, unione schede) e `itemInfo` (render), quindi nessun oggetto resta senza riga. Categoria `null`/vuota viene tolta (vale la categoria del libro).
  2. **B-012 come PR** [#3](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/3), **unita da sviluppo** dopo i test (non tocca Supabase/pagamenti): `_sig` = due hash cyrb53 dei dati dell'eroe; `normSig` converte i `_sig` vecchi (iniziano con `{`) all'avvio, in `markBase` e nella lista di un'altra scheda; Export e Download .json usano `heroData(c)`. `CACHE` di sw.js alzata (porta online anche B-013). Funzioni push/pull Supabase non toccate.
- **File**: index.html, sw.js, docs/bug-beta.md, docs/team-log.md.
- **Test** (Playwright/Chromium, server locale, service worker bloccato, 1440x900 e 390x844, main e branch affiancati su due porte):
  - B-013 riprodotto prima (83 oggetti, 56 righe, "trophy" → "Nothing matches this filter."); dopo: 83 righe, 25 trovati, modifica (categoria "Treasure & Valuables") e cancellazione ok, anche con l'eroe già salvato in localStorage.
  - B-012: 33 eroi pesanti salvati da main = 1.556.502 caratteri (753.436 di `_sig`); stesso salvataggio aperto col branch e risalvato = 754.604 (48%). 0 `updatedAt` cambiati, 0 `_dirty`; una modifica dopo timbra solo quell'eroe. Export senza campi locali, re-import identico.
  - B-002 ripetuto (schede A, B, C) con risultato identico a main; corsa con un salvataggio non ancora visto di un'altra scheda, sia con `_sig` vecchio sia nuovo: vince l'ultima modifica con avviso, eroe nuovo dell'altra scheda tenuto. Console senza errori.
- **Nota prudenza**: se un'app con la cache vecchia e la nuova sono aperte insieme, la vecchia vede una volta tutti gli eroi come "cambiati" e risolve per ultima modifica; la `CACHE` alzata accorcia questa finestra. Il distruttore può provarlo stasera.
- **Prossima sessione**: B-015 "Esporta tutti gli eroi" (ora l'export è pulito e si può riusare `heroData`).

## 2026-11-09 · team leader
- Controllo app live (Playwright 1440x900 e 390x844): copertina, nuovo eroe e level up 1→2 ok; console pulita a parte Supabase; a 390 px ancora 10 px di scroll orizzontale. Il lavoro del weekend (B-002, B-004, B-009) è online.
- Weekend valutato: prestazioni buone con 33 eroi; nuovi B-012 (`_sig` raddoppia lo spazio), B-013 (oggetti invisibili), B-014, B-015. Stamattina unita anche la PR [#2](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/2) (import 5etools nel Workshop, richiesta di Capo).
- Obiettivo della settimana (7–13/11), confermato: nessuna perdita di dati; ora il "fatto" è B-012, B-013, B-015 chiusi.
- Oggi: sviluppo → B-013 su main, poi B-012 come PR (unione automatica dopo i test). Stasera: distruttore sul salvataggio con più schede, memoria piena, import strani e il nuovo import 5etools.

## 2026-11-09 · sviluppo (richiesta di Capo: homebrew da 5etools)
- **Fatto**: il Workshop ora trasforma file JSON in formato 5etools in homebrew modificabile.
  - **Workshop → Import file** accetta, oltre all'export Grimoire, un file 5etools (`spell`, `feat`, `race`, `background`, `item`/`magicvariant`, `monster`, `class` con `classFeature`, `subclass` con `subclassFeature`). Si apre una finestra con le voci divise per tipo, filtro per nome, "Tick shown"/"Untick all"; sopra 60 voci non è spuntato nulla. Le voci scelte entrano con la stessa unione dell'import Grimoire (`mergeBrew`: stesso tipo e nome → sostituita) e si modificano con i moduli esistenti.
  - **Copy to Workshop** su ogni voce SRD o di una fonte importata in Library (dei tipi che hanno un modulo): apre il modulo già compilato come bozza; si salva con "Add", quindi passa dal normale controllo del limite gratuito di `brewSave`.
  - Modulo Creatura: nuovi campi tiri salvezza, abilità, resistenze, immunità, azioni bonus, reazioni, azioni leggendarie (lo statblock li mostrava già); taglia "Small or Medium".
  - Conversione testo: tag `{@…}` in testo semplice (i dadi restano "2d6 + 3" e si tirano), sotto-voci come "**Nome.** testo", liste e tabelle nel formato di `md()`; capacità/tratti/azioni su una riga per restare modificabili nei campi "uno per riga".
- **B-011 non toccato**: l'import da 5etools segue la stessa strada dell'import homebrew esistente (nessun controllo del limite di 3); la decisione di Capo varrà per entrambi.
- `sw.js`: alzata la versione di `CACHE`.
- **Test** (Playwright/Chromium, server locale, service worker bloccato, 1440x900 e 390x844) con i file veri di 5etools (spells-xphb 391, bestiary-xmm 503, feats 317, races 177, backgrounds 175, items 1820, class-fighter 2+26): ogni voce convertita passa `cleanBrew` e si apre nella scheda senza `undefined`/`[object`/`{@`. Flusso: file misto → finestra → 8 voci aggiunte → Adult Red Dragon modificato e salvato con le azioni leggendarie intatte; file da 391 incantesimi → 0 spuntati; Copy to Workshop da Acid Arrow (SRD) e da Psi Warrior (fonte importata). Import Grimoire esistente invariato (1 aggiunta, 1 scartata). Console senza errori, scrollWidth uguale alla finestra.

## 2026-11-08 · sviluppo
- **Fatto**: i due passi del piano.
  1. **B-004 e B-009 su main** ([8e79163](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/8e79163)): `writeLocal` imposta `G.saveFailed`; se il salvataggio fallisce compare in basso un avviso `role="alert"` ("Not saved… Try again") separato dal toast, quindi `toast()` non lo copre né lo sostituisce; sparisce appena un salvataggio riesce (anche da sola, alla prossima modifica). Nuovo eroe e Import dicono "is on the page but could not be saved" invece di "joins the tome". `maxlength="80"` su `#w_name` e `#f_name`.
  2. **B-002 come PR** [#1](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/1) (unita da Capo alle 13:32, B-002 spostato in "Risolti"): ogni scheda ricorda l'ultima lista letta/scritta; all'evento `storage` (e prima di ogni salvataggio, se la lista salvata è cambiata) unisce per `id`: nuovi da entrambe le parti tenuti, cancellati restano cancellati, stesso eroe cambiato in due schede → vince l'ultima modifica con avviso. Supabase non toccato.
- **CSS**: nessuna regola nuova; l'avviso riusa le classi `toast fumble` con uno stile inline (in basso, larghezza `min(640px, 92vw)`). Nota prudenza: su telefono copre la barra dadi finché il salvataggio fallisce, scelto apposta perché è un'emergenza.
- **File**: index.html, docs/bug-beta.md, docs/team-log.md.
- **Test** (Playwright/Chromium, server locale, service worker bloccato, 1440x900 e 390x844): B-004 riprodotto su main prima del fix (solo "PienoStorage joins the tome.", eroe perso); dopo: avviso visibile anche dopo 3,5 s e un altro toast, liberato lo spazio → "Try again" → avviso sparito, eroe presente dopo la ricarica. B-002 riprodotto prima del fix (passo 3 solo EroeTabB, passo 4 solo EroeTabA); con la PR: entrambi presenti nelle tre schede, eroe cancellato in C non risorge, corsa simulata con avviso. Console senza errori. scrollWidth a 390 px ancora 400 (problema già noto, non toccato).
- **Prossima sessione**: B-005 (ASI sopra 20) e B-006 (danni/cure negativi), oppure la versione di `CACHE` in sw.js per far arrivare subito i fix.

## 2026-11-08 · team leader
- Controllo app live (Playwright 1440x900 e 390x844): i fix di ieri sono online; copertina, nuovo eroe e level up 1→2 ok; console pulita a parte Supabase; a 390 px ancora 10 px di scroll orizzontale.
- Obiettivo della settimana (7–13/11), confermato: nessuna perdita di dati. Chiusi B-001/B-003; restano B-002 e B-004.
- Oggi: sviluppo → B-004 (avviso di memoria piena persistente) e `maxlength` sul Nome (B-009) su main, poi B-002 (due schede) come PR. Stasera: power user su prestazioni con 20+ eroi e verifica dei fix sul sito live.

## 2026-11-07 · sviluppo
- **Fatto**: B-001 e B-003 come da piano, più B-007, B-008 e B-010 (stessa zona: import/fixup). Nessun CSS toccato.
  - Homebrew: nuova `cleanBrew` usata sia dall'import sia all'avvio (IndexedDB), accetta solo categoria nota (`Object.hasOwn`, quindi niente `__proto__`) e nome testo ≤80 caratteri; il toast dice quante voci ha scartato. Sort di ALL tollerante.
  - Eroi: `fixup` riscritta con controlli di tipo (liste → array del tipo giusto, oggetti → oggetti, nomi/classe → testo, punteggi 1–30, PF ≥0, max ≥1, multiclasse con totale ≤20, sfinimento 0–6). `doImport` salva solo dopo un render riuscito, altrimenti annulla e avvisa. `load` scarta eroi `null`. Wizard: livello arrotondato.
- **File**: index.html, docs/bug-beta.md, docs/team-log.md.
- **Test** (Playwright/Chromium, server locale, service worker bloccato, 1440x900 e 390x844): prima della correzione riprodotti tutti i PAGEERROR di B-001/B-003/B-010 e i valori di B-007/B-008; dopo, i JSON dei passi di B-001, B-003, B-007, B-010 importati, tutti i 10 capitoli aperti, pagina ricaricata (anche con homebrew rotto già in IndexedDB e un eroe rotto già in localStorage): 0 errori, tomo visibile, scrollWidth uguale alla finestra. Eroi di esempio identici prima e dopo `fixup` (nessun cambiamento per i dati validi).
- **Commit**: [1a09890](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/1a09890).
- **Nota prudenza**: `fixup` gira anche sui salvataggi esistenti all'avvio, ma cambia solo valori non validi (verificato sugli eroi di esempio); il piano chiedeva questi fix su main.
- **Prossima sessione**: B-004 (avviso di memoria piena che resta visibile) oppure B-002 (due schede, evento `storage`); poi `maxlength` sul campo Nome della scheda per chiudere B-009.

## 2026-11-07 · team leader
- Controllo app live (Playwright 1440x900 e 390x844): tomo, nuovo eroe e level up 1→2 ok; console pulita a parte Supabase; a 390 px ancora 10 px di scroll orizzontale.
- Venerdì sviluppo e designer non hanno lasciato commit né note; segnalato a Capo.
- Obiettivo della settimana (7–13/11): nessuna perdita di dati (B-001…B-004).
- Oggi: sviluppo → B-001 e B-003 (validazione import homebrew ed eroe), poi B-008/B-010. Domenica: power user su prestazioni con 20+ eroi.

## 2026-11-06 · team leader
- Avvio del team: creati docs/team-plan.md, docs/team-log.md, docs/bug-beta.md, cartelle docs/design e docs/promo.
- Controllo app live (Playwright 1440x900 e 390x844): crea eroe e level up ok; console pulita a parte Supabase bloccato dalla sandbox; 10 px di scroll orizzontale su telefono da `input#f_img`.
- Obiettivo della settimana: app comoda su telefono (390x844).
- Oggi: sviluppo → scroll orizzontale a 390 px; designer → barra dadi e toast su telefono + note-design.md; distruttore → wizard e import/export.

## In attesa di Capo
- Nessuna PR aperta: la PR [#3](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/3) (B-012) è stata unita da sviluppo il 2026-11-09 dopo i test, come da regola del team.
- Bozze promo: nessuna.
