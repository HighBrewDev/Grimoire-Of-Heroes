# Bug dei beta tester

Formato: una voce per bug, la più recente in cima. Gravità: critica (perdita dati, app inutilizzabile), alta (funzione principale rotta), media, bassa.
Quando lo sviluppo lo corregge, sposta la voce in "Risolti" con il commit.

## Aperti

### B-001 [critica] Homebrew importato con nome numerico blocca l'app a ogni avvio
- Trovato da: distruttore · 2026-11-06
- Dove: X Workshop → "Share and back up" → Import file, 1440x900
- Passi: 1. Crea un file `hb.json` con `{"grimoireHomebrew":[{"cat":"spells","o":{"n":42,"lv":1}}]}` (vale anche `"n":{"a":1}`). 2. Workshop → Import file → scegli il file. 3. Ricarica la pagina.
- Atteso: il file viene rifiutato (il nome deve essere un testo) oppure il nome convertito in testo.
- Ottenuto: l'import riesce, la voce finisce in IndexedDB e da quel momento la pagina del tomo resta vuota a ogni apertura. Cancellare il localStorage non basta: bisogna svuotare IndexedDB a mano. L'utente non ha modo di rimediare dall'app.
- Console: `PAGEERROR a.n.localeCompare is not a function` (sort di ALL, index.html:790). `brewImport` (index.html:2092) controlla solo che `it.o?.n` sia "vero", non che sia una stringa.

### B-002 [critica] Due schede aperte: l'ultima che salva cancella gli eroi creati nell'altra
- Trovato da: distruttore · 2026-11-06
- Dove: qualsiasi capitolo, due schede/finestre (o app installata + browser) sullo stesso sito
- Passi: 1. Apri il sito nella scheda A e nella scheda B. 2. In A crea l'eroe "EroeTabA". 3. In B crea l'eroe "EroeTabB". 4. Torna in A e modifica qualsiasi cosa (ogni modifica salva). 5. Apri una terza scheda.
- Atteso: entrambi gli eroi presenti, o almeno un avviso che un'altra scheda ha modificato i dati.
- Ottenuto: dopo il passo 3 esiste solo EroeTabB (EroeTabA sparito); dopo il passo 4 esiste solo EroeTabA (EroeTabB sparito). Ogni scheda riscrive l'intera lista che ha in memoria (`writeLocal`, index.html:2790); non c'è ascolto dell'evento `storage` né BroadcastChannel.
- Console: nessun errore.

### B-003 [alta] Import eroe con campi del tipo sbagliato: salvato anche se il messaggio dice di no, e pagina vuota anche dopo ricarica
- Trovato da: distruttore · 2026-11-06
- Dove: I Eroe → Import, 1440x900
- Passi: 1. Import → incolla `{"name":"Rotto","abilities":{"str":10},"inventory":"spada"}` (oppure `"feats":[null,5]`, `"inventory":[null]`). 2. Premi Import. 3. Ricarica.
- Atteso: import rifiutato con un messaggio chiaro, oppure campi sbagliati sostituiti con valori vuoti.
- Ottenuto: compare "That is not a hero exported from this tome.", ma l'eroe è stato comunque aggiunto e salvato (`G.chars.push` e `save()` avvengono prima del `render()` che lancia l'errore). Alla ricarica la pagina è vuota perché l'eroe rotto è quello attivo; scegliendo un altro eroe si torna a vedere qualcosa, ma l'eroe rotto non si apre e quindi non si può cancellare. Simili: `"attacks":{}` rompe Combattimento, `"conditions":"Blinded"` rompe Combattimento, `"spells":{"known":"Fireball"}` rompe il Libro degli incantesimi. `fixup` (index.html:950) usa `x || []` invece di controllare che sia un array.
- Console: `PAGEERROR (c.inventory || []).filter is not a function`, `Cannot read properties of null (reading 'n')`, `Cannot read properties of null (reading 'worn')`

### B-004 [alta] Memoria piena: il nuovo eroe sembra salvato ma sparisce alla ricarica
- Trovato da: distruttore · 2026-11-06
- Dove: Nuovo eroe, 1440x900
- Passi: 1. Riempi il localStorage del sito (in un caso reale: tanti eroi con note lunghe o import enormi). 2. Crea un nuovo eroe "PienoStorage". 3. Ricarica.
- Atteso: un avviso visibile che il salvataggio non è riuscito.
- Ottenuto: compare solo "PienoStorage joins the tome."; l'avviso "This device is out of storage space for the tome." di `writeLocal` viene subito sovrascritto dal toast di `doWizard`. Alla ricarica l'eroe non c'è più. Lo stesso succede con Import e con ogni modifica.
- Console: nessun errore (l'eccezione di quota viene catturata).

### B-005 [media] Aumento dei punteggi +2 abbassa un punteggio sopra 20 a 20
- Trovato da: distruttore · 2026-11-06
- Dove: Level up (livello 4, Ability Score Improvement), 1440x900
- Passi: 1. Valeria Thorne (Fighter 3): in II Attributi porta Forza a 24 con il pulsante +. 2. Level up → "+2 to Strength" → Become level 4.
- Atteso: Forza resta 24 (il limite 20 vale solo per l'aumento) o il level up avvisa che non si può.
- Ottenuto: Forza scende a 20, mentre il toast dice "STR +2". `up()` fa `Math.min(cap, valore + n)` (index.html:2339).
- Console: nessun errore.

### B-006 [media] Danni negativi danno PF temporanei, cura negativa porta i PF sotto zero
- Trovato da: distruttore · 2026-11-06
- Dove: III Combattimento → Punti ferita, 1440x900
- Passi: 1. Valeria (32/32 PF). 2. Scrivi `-50` e premi Damage. 3. Scrivi `-100` e premi Heal.
- Atteso: valori negativi ignorati o trattati come positivi.
- Ottenuto: dopo il passo 2 ha 50 PF temporanei; dopo il passo 3 ha -68/32 PF, salvati anche dopo ricarica. `applyDamage` (index.html:2181) e `heal` (index.html:2476) non controllano il segno.
- Console: nessun errore.

### B-007 [media] Import eroe accetta valori impossibili (livello 39, PF negativi, punteggi 999999)
- Trovato da: distruttore · 2026-11-06
- Dove: I Eroe → Import, 1440x900
- Passi: 1. Importa `{"name":"MultiOver","abilities":{"str":10},"class":"Fighter","level":5,"multi":[{"class":"Wizard","level":19},{"class":"Rogue","level":19}]}`. 2. Importa `{"name":"LvHuge","abilities":{"str":999999,"dex":-50},"level":1000000000,"hp":{"cur":-999,"max":-5,"temp":"x"}}`.
- Atteso: livelli totali al massimo 20, PF e punteggi riportati in un intervallo valido.
- Ottenuto: MultiOver ha livello totale 39 (Fighter 1 / Wizard 19 / Rogue 19). LvHuge mostra -999 / -5 PF, CA -20, iniziativa -30, e senza classe l'intestazione dice "Level 20 undefined". `fixup` limita ogni multiclasse a 19 ma non la somma.
- Console: nessun errore.

### B-008 [media] Il wizard accetta un livello decimale
- Trovato da: distruttore · 2026-11-06
- Dove: Nuovo eroe, 1440x900
- Passi: 1. Nuovo eroe → Level `2.7` (si può scrivere a mano nel campo numerico) → Inscribe hero.
- Atteso: livello 2 o 3 (intero), oppure errore.
- Ottenuto: eroe di livello 2.7, PF massimi 25.6, XP `undefined` (`XP_TABLE[1.7]`). `clamp(+valore, 1, 20)` non arrotonda (index.html:2629). Livelli -1, 0, 21, "abc" e 1e3 invece vengono gestiti bene.
- Console: nessun errore.

### B-009 [bassa] Nome eroe senza limite di lunghezza: pagina larga 358.000 px
- Trovato da: distruttore · 2026-11-06
- Dove: Nuovo eroe e campo Nome, 1440x900
- Passi: 1. Nuovo eroe con un nome di 20.000 caratteri (incollato).
- Atteso: limite di lunghezza (es. 80 caratteri) o testo che va a capo.
- Ottenuto: `document.documentElement.scrollWidth` = 358.897 px: scroll orizzontale enorme su tutta l'app. Nessun `maxlength` su `#w_name`.
- Console: nessun errore.

### B-010 [bassa] "Download .json" non fa nulla se il nome dell'eroe è un numero
- Trovato da: distruttore · 2026-11-06
- Dove: Export, 1440x900
- Passi: 1. Importa `{"name":12345,"abilities":{"str":10}}`. 2. Export → Download .json.
- Atteso: scarica `12345.json`.
- Ottenuto: non succede nulla. `downloadChar` (index.html:2568) chiama `c.name.replace` su un numero. Anche il nome `{"x":1}` viene accettato e mostrato come "[object Object]".
- Console: `PAGEERROR c.name.replace is not a function`

### B-011 [bassa · da verificare] L'import homebrew ignora il limite di 3 elementi gratuiti
- Trovato da: distruttore · 2026-11-06
- Dove: X Workshop → Import file
- Passi: 1. Con il paywall attivo (oggi è spento in beta, `plusOK()` è vero), importa un file con 50 talenti homebrew.
- Atteso: lo stesso limite di `FREE_BREW = 3` che vale per "Save" nel modulo.
- Ottenuto (dal codice): `brewImport` (index.html:2092) non chiama `plusOK()`, quindi l'import aggiunge tutte le voci. Verificato solo che l'import di 50 voci riesce con il paywall spento. Da decidere se è voluto.
- Console: nessun errore.

<!-- Modello:
### [gravità] Titolo breve
- Trovato da: distruttore | power user · data
- Dove: capitolo/schermata, 1440x900 o 390x844
- Passi: 1. … 2. …
- Atteso / Ottenuto:
- Console:
-->

## Risolti

_(nessuno ancora)_

## Diario dei test

- 2026-11-06 · distruttore · Prima sessione (Playwright/Chromium, server locale, stesso codice del sito live). Import eroe con 15 JSON malformati (tipi sbagliati, null, valori enormi, multiclasse oltre 20, XSS in nome/classe/specie/note); wizard con nomi vuoti, di soli spazi, da 20.000 caratteri, emoji composte, HTML, livelli -1/0/21/2.7/abc/1e3; PF con danni/cure/temporanei negativi; due schede aperte insieme; level up 1→20 per tutte le 12 classi alternando ASI e talenti; doppio clic su "Become level"; ASI su punteggio sopra 20; import homebrew con nome numerico/oggetto, campi del tipo sbagliato, XSS, 50 voci, categorie `__proto__`/`constructor`; offline con service worker; localStorage pieno; ripristino da eroe rotto. Nessun XSS riuscito (tutto passa da `esc`), offline ok, doppio clic non applica due livelli, level up fino a 20 senza errori. Trovati B-001…B-011.
