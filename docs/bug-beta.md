# Bug dei beta tester

Formato: una voce per bug, la più recente in cima. Gravità: critica (perdita dati, app inutilizzabile), alta (funzione principale rotta), media, bassa.
Quando lo sviluppo lo corregge, sposta la voce in "Risolti" con il commit.

## Aperti

### B-021 [alta] Level up: aumento dei punteggi o talento solo al livello 4: mancano 8, 12, 16 (Guerriero 6 e 14, Ladro 10) per tutte le classi
- Trovato da: power user · 2026-11-09
- Sezione: level up/multiclasse
- Dove: Level up (finestra "reaches level N"), 1440x900 e 390x844, tutte le 12 classi SRD e anche nelle multiclassi (Wizard 7 → 8)
- Passi: 1. Paladino di livello 7 (o Guerriero 5, Ladro 9, qualsiasi classe 11 o 15). 2. Level up.
- Atteso: la sezione "Ability Score Improvement or feat" con +2, +1/+1 e talento, come al livello 4 (regole 2024: livelli 4, 8, 12, 16; Guerriero anche 6 e 14; Ladro anche 10; Epic Boon al 19).
- Ottenuto: la sezione manca: si diventa livello 8 senza poter scegliere nulla. Provato con tutte le 12 classi dal livello 1 al 20: la scelta compare solo al 4 e al 19 (Epic Boon). Un eroe portato al 20 nell'app perde 3 aumenti (5 il Guerriero, 4 il Ladro). Causa probabile: `levelPlan` (index.html ~3420) cerca "Ability Score Improvement" in `clsInfo(v).f`, dove ogni privilegio compare una volta sola (al primo livello, 4); i livelli successivi sono solo nella tabella `srd.tbl[N-1].f`, che ha `"f":["Ability Score Improvement"]` agli 8, 12, 16. Le classi homebrew invece funzionano (usano `ASI_LEVELS`).
- Console: nessun errore.
- Test: `levelup` "B-021 …" (2 test).

### B-022 [media] Level up: +2 a Costituzione non alza i PF massimi dei livelli precedenti
- Trovato da: power user · 2026-11-09
- Sezione: level up/multiclasse
- Dove: Level up (livello 4, Ability Score Improvement), 1440x900
- Passi: 1. Paladino 3, Cos 14, PF 28/28. 2. Level up → PF medi → "+2 to Constitution" → Become level 4.
- Atteso: PF massimi 40 (regole 2024: quando il modificatore di Costituzione cambia, i PF massimi cambiano come se lo avessi avuto dal livello 1: 10 + 3 × 6 + 4 × 3).
- Ottenuto: PF massimi 36 (+8 calcolato con la Cos vecchia, nessun +1 per livello precedente). Il toast dice "+8 HP · CON +2". Stessa cosa con +1/+1 su Costituzione al livello 12 e con il pulsante "Raise Constitution" negli Attributi (Valeria 15 → 16: PF restano 32/32, nessun avviso). `applyLevelUp` (index.html ~3470) calcola `con` prima di applicare l'aumento e non ricalcola i PF.
- Console: nessun errore.
- Test: `levelup` "B-022 …".

### B-023 [media] Riposo breve non restituisce Second Wind, Channel Divinity e Bardic Inspiration
- Trovato da: power user · 2026-11-09
- Sezione: combattimento
- Dove: III Combattimento → Short Rest, 1440x900
- Passi: 1. Valeria (Fighter 3): usa i 2 Second Wind (segnalini). 2. Short Rest. 3. Lo stesso con un Chierico 6 (3 Channel Divinity) e un Bardo 5 (4 Bardic Inspiration).
- Atteso: regole 2024: Second Wind e Channel Divinity recuperano un uso con un riposo breve; Bardic Inspiration dal livello 5 (Font of Inspiration) torna tutta.
- Ottenuto: tutti i segnalini restano spesi fino al riposo lungo. Il riposo breve rimette solo Focus Points e slot del Patto (`SHORT_REST_RES = ['focus_points']`, index.html ~1214). Simulando una sessione di gioco con tre riposi brevi il giocatore deve ricordarsi a mano quali segnalini liberare.
- Console: nessun errore.
- Test: `combattimento` "B-023 …".

### B-024 [media] Backup: eroi duplicati più volte persi al ripristino ("già qui")
- Trovato da: power user · 2026-11-09
- Sezione: import/export
- Dove: I Eroe → Duplicate, poi Export → "Export all heroes" e Import del file, 390x844 e 1440x900
- Passi: 1. Eroe con nome di 70 caratteri (o un nome normale duplicato più volte partendo dall'ultima copia: ogni copia aggiunge " (copy)"). 2. Duplicate tre volte. 3. Export all heroes. 4. In un altro browser (o dopo aver cancellato gli eroi) Import del file.
- Atteso: tornano tutti e 4 gli eroi.
- Ottenuto: "3 heroes back in the tome (1 already here)": una copia è persa e il messaggio dice che c'era già. `duplicate` (index.html ~3700) allunga il nome oltre il limite di 80 caratteri (B-009) senza passare da `fixup`; all'import `fixup` taglia i nomi a 80, due copie diventano identiche e `importBackup` (~3818) scarta la seconda come "già qui". Nella mia sessione: 43 eroi nel backup, 5 persi così (nomi da 81 a 123 caratteri). Anche il nome mostrato cresce senza limite: "Rinominato 9 Àèìòù (copy) (copy) … (copy)" con 15 duplicati.
- Console: nessun errore.
- Test: `importexport` "B-024 …".

### B-025 [bassa] Level up: un talento non ripetibile già preso viene offerto e preso di nuovo
- Trovato da: power user · 2026-11-09
- Sezione: level up/multiclasse
- Dove: Level up (livello 4, scelta "Feat"), 1440x900
- Passi: 1. Valeria (ha già Alert e Savage Attacker). 2. Level up → Feat → Alert → Become level 4.
- Atteso: Alert e Savage Attacker non compaiono nella lista (solo i talenti ripetibili, come Skilled o Magic Initiate, possono tornare).
- Ottenuto: compaiono e vengono aggiunti: Valeria ha due volte Alert ("Human (Versatile)" e "Level 4") e il toast dice "+9 HP · Alert". Stesso comportamento con un talento homebrew senza "Repeatable" (preso al 4 e all'8). `featList` (index.html ~3435) non toglie i talenti già presi.
- Console: nessun errore.
- Test: `levelup` "B-025 …".

### B-016 [alta] Due schede: se una cancella l'eroe che l'altra sta scrivendo, il testo finisce su un altro eroe
- Trovato da: distruttore · 2026-11-09
- Sezione: import/export (salvataggio con più schede)
- Dove: I Eroe (campo Nome) e VIII Cronaca (note), 1440x900, due schede sullo stesso sito
- Passi: 1. Apri il sito nelle schede A e B, entrambe su Valeria Thorne. 2. In B apri Chronicle e scrivi qualcosa nella storia di Valeria (o cambia il Nome nella scheda Eroe senza uscire dal campo). 3. In A cancella Valeria (Delete → conferma). 4. Torna in B e continua a scrivere, poi esci dal campo.
- Atteso: B si accorge che Valeria non c'è più (avviso, il testo non viene salvato su nessun altro eroe) oppure Valeria resta perché era in modifica.
- Ottenuto: la storia di **Eldrin** diventa "A city guardsman who took up the adventuring road. scrive ancora" (testo di Valeria + quello scritto): la sua storia vera ("Apprentice of the Spire.") è persa senza avviso. Con il Nome: Eldrin si chiama "Valeria EDITATA in B". La pagina di B mostra ancora "Valeria Thorne · Chronicle". Causa probabile: `otherTabSaved`/`mergeStored` (index.html ~4015) tolgono l'eroe e spostano `G.activeId` sul primo eroe mentre si scrive (`isTyping` rimanda solo il render), poi `bindValue` (~4333) scrive su `active()`, che ora è un altro eroe.
- Console: nessun errore.
- Test: `importexport` "B-016 …" (2 test).

### B-017 [bassa] Monete negative accettate nello Zaino
- Trovato da: distruttore · 2026-11-09
- Sezione: zaino
- Dove: VII Pack & Riches → monete, 1440x900
- Passi: 1. Scrivi `-100` in GP e `-3` in PP.
- Atteso: valore portato a 0 (o rifiutato).
- Ottenuto: salvati `gp:-100, pp:-3`. Anche l'import accetta `"currency":{"sp":-5}` e `"gp":1e308` (mostrato "≈ 1e+308 gp"). `bindValue` con `data-type="int"` non ha minimo; stessa cosa per XP (`-5000` salvato).
- Console: nessun errore.
- Test: `zaino` "B-017 …".

### B-018 [bassa] CA e PF senza limite superiore/inferiore: CA -981, PF 1e+308
- Trovato da: distruttore · 2026-11-09
- Sezione: combattimento
- Dove: III Combattimento, 1440x900
- Passi: 1. AC adjustment `-999`. 2. Oppure Import `{"name":"Enorme","abilities":{"str":10},"class":"Fighter","level":20,"hp":{"cur":1e308,"max":1e308,"temp":1e308}}`. 3. Oppure PF massimi `999999999999` nel campo.
- Atteso: CA mai sotto 0 e PF entro un massimo ragionevole (B-007 ha messo solo i minimi).
- Ottenuto: CA mostrata -981; PF "1e+308 / 1e+308 · 1e+308 temp" (i danni non li scalfiscono); 999999999999 accettato dal campo.
- Console: nessun errore.
- Test: `combattimento` "B-018 …".

### B-019 [media] Telefono: un link o una parola lunga in oggetti e attacchi allarga la pagina fino a 1.400 px
- Trovato da: distruttore · 2026-11-09
- Sezione: telefono
- Dove: VII Pack & Riches e III Combattimento, 390x844
- Passi: 1. Pack & Riches → Custom → nome "Mappa", descrizione `Vedi https://example.com/mappe/abcdefghij…` (un link di ~180 caratteri) → Add. 2. Guarda la larghezza della pagina.
- Atteso: il testo va a capo (`overflow-wrap:anywhere`), nessuno scroll orizzontale.
- Ottenuto: `scrollWidth` 1.054 px dall'interfaccia (1.400 px con un link di 200 caratteri). Stessa cosa con un nome di attacco di 80 caratteri senza spazi (Combattimento 1.291 px), un nome di oggetto (Zaino 1.325 px), una nota di attacco con link (1.365 px), e con specie o sottoclasse homebrew di 80 caratteri (tutti i capitoli ~1.190–1.290 px; lo scaffale `.hero` è largo 1.225 px). Note e talenti invece vanno a capo bene.
- Console: nessun errore.
- Test: `telefono` "B-019 …" (2 test).

### B-020 [bassa] Import 5etools enorme: tempo quadratico, 20.000 voci bloccano la pagina per quasi 2 minuti
- Trovato da: distruttore · 2026-11-09
- Sezione: workshop
- Dove: X Workshop → Import file, 1440x900
- Passi: 1. File `{"spell":[…]}` con N incantesimi validi e diversi. 2. Import file.
- Atteso: tempo che cresce in proporzione alle voci (o un limite con messaggio).
- Ottenuto: 1.000 voci 0,38 s, 2.000 0,9 s, 4.000 2,5 s, 20.000 **109 s** prima della finestra di scelta (pagina ferma). I file veri di 5etools (fino a ~1.800 voci) restano sotto il secondo, quindi gravità bassa. Il resto dell'import ha retto: liste non array, `null`, nomi numerici/oggetto/HTML, tag `{@` non chiusi, 3.000 tag annidati, `entries` annidate 5.000 volte, `_copy` circolari, chiavi `__proto__`: nessun errore.
- Console: nessun errore.
- Test: `workshop` "B-020 …".

### B-014 [bassa] [UX] Con 30+ eroi lo scaffale non ha ricerca né ordine: su telefono la fila è larga 7.400 px
- Trovato da: power user · 2026-11-08
- Dove: scaffale degli eroi, 390x844 (anche 1440x900)
- Passi: 1. Tomo con 33 eroi. 2. Su telefono cerca il trentesimo eroe.
- Atteso: un filtro per nome o la possibilità di riordinare/fissare gli eroi in uso.
- Ottenuto: scaffale orizzontale con `scrollWidth` 7.410 px su 356 visibili: il 30° eroe è a 6.600 px, solo scorrendo. Gli eroi restano nell'ordine di creazione; non esistono riordino, ordinamento o ricerca (la ricerca Ctrl+K cerca solo le regole).
- Console: nessun errore.

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

### B-015 [bassa] [UX] Nessun backup di tutti gli eroi insieme
- **Risolto 2026-11-09** in [4c4d449](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/4c4d449): "Export all heroes (N)" nella finestra Export e nell'avviso "Not saved" scarica un file `grimoire-heroes-AAAA-MM-GG.json` con tutti i tuoi eroi (senza campi locali). Import accetta quel file (o un array): ogni eroe entra con un id nuovo, le copie identiche già nel tomo sono saltate, le voci rotte contate e scartate. Verificato: 12 eroi esportati, stesso file reimportato → "già nel tomo"; cancellati 5 → tornano solo i 5; con memoria piena l'export include anche l'eroe non salvato. Test `importexport` B-015 ora passa.
- Trovato da: power user · 2026-11-08
- Dove: I Eroe → Export / Import
- Passi: 1. Tomo con 33 eroi. 2. Cerca un modo per salvarli tutti prima di liberare spazio (come chiede l'avviso "Not saved… Export your heroes").
- Atteso: "Esporta tutti" in un file e import dello stesso file.
- Ottenuto: Export e Download .json lavorano un eroe alla volta: servono 33 export e 33 import. L'homebrew invece ha già "Export homebrew" in blocco. Con l'avviso di memoria piena è la prima cosa che l'utente cerca.
- Console: nessun errore.

### B-005 [media] Aumento dei punteggi +2 abbassa un punteggio sopra 20 a 20
- **Risolto 2026-11-09** in [4c4d449](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/4c4d449): l'aumento non abbassa mai un punteggio (`max(valore, min(limite, valore + n))`); le note del level up dicono "STR already 24" invece di "STR +2". Test `levelup` B-005 ora passa.
- Trovato da: distruttore · 2026-11-06
- Dove: Level up (livello 4, Ability Score Improvement), 1440x900
- Passi: 1. Valeria Thorne (Fighter 3): in II Attributi porta Forza a 24 con il pulsante +. 2. Level up → "+2 to Strength" → Become level 4.
- Atteso: Forza resta 24 (il limite 20 vale solo per l'aumento) o il level up avvisa che non si può.
- Ottenuto: Forza scende a 20, mentre il toast dice "STR +2". `up()` fa `Math.min(cap, valore + n)` (index.html:2339).
- Console: nessun errore.

### B-006 [media] Danni negativi danno PF temporanei, cura negativa porta i PF sotto zero
- **Risolto 2026-11-09** in [4c4d449](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/4c4d449): Damage, Heal e Temp (scheda e incontro) trattano un numero negativo come 0 (`hpNum`). Entrambi i test `combattimento` B-006 ora passano.
- Trovato da: distruttore · 2026-11-06
- Dove: III Combattimento → Punti ferita, 1440x900
- Passi: 1. Valeria (32/32 PF). 2. Scrivi `-50` e premi Damage. 3. Scrivi `-100` e premi Heal.
- Atteso: valori negativi ignorati o trattati come positivi.
- Ottenuto: dopo il passo 2 ha 50 PF temporanei; dopo il passo 3 ha -68/32 PF, salvati anche dopo ricarica. `applyDamage` (index.html:2181) e `heal` (index.html:2476) non controllano il segno.
- Console: nessun errore.

### B-012 [media] Ogni eroe è salvato due volte: la copia `_sig` raddoppia localStorage e i file di export
- **Risolto 2026-11-09** con la PR [#3](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/3) (commit [7107250](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/7107250), unita da sviluppo dopo i test): `_sig` è un'impronta corta (due hash cyrb53); i `_sig` vecchi vengono convertiti senza toccare `updatedAt`/`_dirty`; Export e Download .json senza campi locali. 33 eroi pesanti: da 1.556.502 a 754.604 caratteri.
- Trovato da: power user · 2026-11-08
- Dove: salvataggio automatico ed Export, 1440x900 e 390x844 (sito live)
- Passi: 1. Importa 24 eroi di livello 10–20 con 80 oggetti, ~50 incantesimi e note lunghe (33 eroi in tutto). 2. Leggi `grimoire-heroes-v1` in localStorage. 3. Su un eroe: Export → guarda il testo.
- Atteso: ogni eroe salvato una volta; l'export contiene solo i dati dell'eroe.
- Ottenuto: 1.460.000 caratteri in localStorage, di cui 749.600 (51%) sono il campo `_sig` (l'eroe intero ri-serializzato come stringa). `writeLocal` (index.html ~2866) salva `G.chars` così com'è, senza togliere i `LOCAL_FIELDS`. Con il limite misurato di ~5,24 milioni di caratteri ci stanno circa 118 eroi così invece di ~230: l'avviso "Not saved" (B-004) arriva al doppio della velocità. Anche l'Export (`export`/`downloadChar`, ~2581) include `_sig`, `updatedAt`, `editedOn` (nome del dispositivo) e `createdAt`: file da 60.789 caratteri, 29.555 sono `_sig`. Il re-import funziona (dati identici).
- Console: nessun errore.


### B-013 [media] Oggetti con una categoria sconosciuta sono invisibili nello Zaino e non si possono cancellare
- **Risolto 2026-11-09** in [9c791c1](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/9c791c1): `fixup` porta ogni categoria sconosciuta al gruppo più vicino ("Treasure" → "Treasure & Valuables", "Weapon" → "Weapons", ecc.) o a "Quest & Misc"; anche `itemInfo` lo fa al render, quindi nessun oggetto resta senza riga. Verificato: eroe dei passi importato → 83 righe su 83, filtro "trophy" trova 25 oggetti, modifica e cancellazione ok, anche con il salvataggio già in localStorage.
- Trovato da: power user · 2026-11-08
- Dove: VII Pack & Riches, 1440x900 e 390x844
- Passi: 1. Importa un eroe con oggetti personalizzati che hanno `"cat":"Treasure"` (es. `{"n":"Trophy 1","q":1,"custom":true,"cat":"Treasure","d":"…"}`; succede con file scritti a mano, da altri strumenti o da versioni con nomi di categoria diversi). 2. Apri Pack & Riches. 3. Scrivi "trophy" nel filtro.
- Atteso: gli oggetti compaiono (in "Quest & Misc" o con la categoria normalizzata da `fixup`).
- Ottenuto: l'intestazione dice "Inventory 80 entries · 482.5 / 165 lb" ma le righe sono 55: i 25 oggetti "Treasure" non compaiono in nessun gruppo, il filtro dice "Nothing matches this filter.", il loro peso conta per il sovraccarico e non c'è modo di modificarli o cancellarli dall'app. Il render raggruppa solo per `INV_CATS` (index.html ~1714) e `fixup` non controlla `it.cat` (il nome giusto sarebbe "Treasure & Valuables").
- Console: nessun errore.


### B-002 [critica] Due schede aperte: l'ultima che salva cancella gli eroi creati nell'altra
- **Risolto 2026-11-08** con la PR [#1](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/1) (commit [55d1dda](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/55d1dda), unita da Capo): le schede uniscono le liste per `id` tramite l'evento `storage` e prima di ogni salvataggio.
- Trovato da: distruttore · 2026-11-06
- Dove: qualsiasi capitolo, due schede/finestre (o app installata + browser) sullo stesso sito
- Passi: 1. Apri il sito nella scheda A e nella scheda B. 2. In A crea l'eroe "EroeTabA". 3. In B crea l'eroe "EroeTabB". 4. Torna in A e modifica qualsiasi cosa (ogni modifica salva). 5. Apri una terza scheda.
- Atteso: entrambi gli eroi presenti, o almeno un avviso che un'altra scheda ha modificato i dati.
- Ottenuto: dopo il passo 3 esiste solo EroeTabB (EroeTabA sparito); dopo il passo 4 esiste solo EroeTabA (EroeTabB sparito). Ogni scheda riscrive l'intera lista che ha in memoria (`writeLocal`, index.html:2790); non c'è ascolto dell'evento `storage` né BroadcastChannel.
- Console: nessun errore.

### B-004 [alta] Memoria piena: il nuovo eroe sembra salvato ma sparisce alla ricarica
- **Risolto 2026-11-08** in [8e79163](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/8e79163): se il salvataggio fallisce resta in basso un avviso "Not saved" con il pulsante Try again, che sparisce solo quando un salvataggio riesce; Nuovo eroe e Import non dicono più "joins the tome".
- Trovato da: distruttore · 2026-11-06
- Dove: Nuovo eroe, 1440x900
- Passi: 1. Riempi il localStorage del sito (in un caso reale: tanti eroi con note lunghe o import enormi). 2. Crea un nuovo eroe "PienoStorage". 3. Ricarica.
- Atteso: un avviso visibile che il salvataggio non è riuscito.
- Ottenuto: compare solo "PienoStorage joins the tome."; l'avviso "This device is out of storage space for the tome." di `writeLocal` viene subito sovrascritto dal toast di `doWizard`. Alla ricarica l'eroe non c'è più. Lo stesso succede con Import e con ogni modifica.
- Console: nessun errore (l'eccezione di quota viene catturata).

### B-009 [bassa] Nome eroe senza limite di lunghezza: pagina larga 358.000 px
- **Risolto 2026-11-08** in [8e79163](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/8e79163): `maxlength="80"` su `#w_name` e `#f_name`.
- Nota sviluppo 2026-11-07: dal wizard e dall'import il nome ora viene tagliato a 80 caratteri da `fixup`; resta da mettere `maxlength` sul campo Nome della scheda (modifica diretta).
- Trovato da: distruttore · 2026-11-06
- Dove: Nuovo eroe e campo Nome, 1440x900
- Passi: 1. Nuovo eroe con un nome di 20.000 caratteri (incollato).
- Atteso: limite di lunghezza (es. 80 caratteri) o testo che va a capo.
- Ottenuto: `document.documentElement.scrollWidth` = 358.897 px: scroll orizzontale enorme su tutta l'app. Nessun `maxlength` su `#w_name`.
- Console: nessun errore.

### B-001 [critica] Homebrew importato con nome numerico blocca l'app a ogni avvio
- Trovato da: distruttore · 2026-11-06
- Dove: X Workshop → "Share and back up" → Import file, 1440x900
- Passi: 1. Crea un file `hb.json` con `{"grimoireHomebrew":[{"cat":"spells","o":{"n":42,"lv":1}}]}` (vale anche `"n":{"a":1}`). 2. Workshop → Import file → scegli il file. 3. Ricarica la pagina.
- Atteso: il file viene rifiutato (il nome deve essere un testo) oppure il nome convertito in testo.
- Ottenuto: l'import riesce, la voce finisce in IndexedDB e da quel momento la pagina del tomo resta vuota a ogni apertura. Cancellare il localStorage non basta: bisogna svuotare IndexedDB a mano. L'utente non ha modo di rimediare dall'app.
- Console: `PAGEERROR a.n.localeCompare is not a function` (sort di ALL, index.html:790). `brewImport` (index.html:2092) controlla solo che `it.o?.n` sia "vero", non che sia una stringa.
- **Risolto** il 2026-11-07 da sviluppo in [1a09890](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/1a09890): `cleanBrew` accetta solo voci con categoria nota e nome testo (max 80 caratteri), il toast dice quante ne ha scartate; le voci rotte già in IndexedDB vengono scartate all'avvio e il sort di ALL è tollerante. Verificato: file dei passi importato (1 voce buona, 3 scartate), ricarica con voce `n:42` già salvata in IndexedDB → tomo visibile, nessun PAGEERROR.

### B-003 [alta] Import eroe con campi del tipo sbagliato: salvato anche se il messaggio dice di no, e pagina vuota anche dopo ricarica
- Trovato da: distruttore · 2026-11-06
- Dove: I Eroe → Import, 1440x900
- Passi: 1. Import → incolla `{"name":"Rotto","abilities":{"str":10},"inventory":"spada"}` (oppure `"feats":[null,5]`, `"inventory":[null]`). 2. Premi Import. 3. Ricarica.
- Atteso: import rifiutato con un messaggio chiaro, oppure campi sbagliati sostituiti con valori vuoti.
- Ottenuto: compare "That is not a hero exported from this tome.", ma l'eroe è stato comunque aggiunto e salvato (`G.chars.push` e `save()` avvengono prima del `render()` che lancia l'errore). Alla ricarica la pagina è vuota perché l'eroe rotto è quello attivo; scegliendo un altro eroe si torna a vedere qualcosa, ma l'eroe rotto non si apre e quindi non si può cancellare. Simili: `"attacks":{}` rompe Combattimento, `"conditions":"Blinded"` rompe Combattimento, `"spells":{"known":"Fireball"}` rompe il Libro degli incantesimi. `fixup` (index.html:950) usa `x || []` invece di controllare che sia un array.
- Console: `PAGEERROR (c.inventory || []).filter is not a function`, `Cannot read properties of null (reading 'n')`, `Cannot read properties of null (reading 'worn')`
- **Risolto** il 2026-11-07 da sviluppo in [1a09890](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/1a09890): `fixup` forza liste e oggetti al tipo giusto (scarta null/numeri), `doImport` salva solo dopo un render riuscito e annulla altrimenti. Verificato con i 4 JSON dei passi e con un eroe rotto già salvato in localStorage: tutti i capitoli si aprono, nessun PAGEERROR dopo ricarica.

### B-007 [media] Import eroe accetta valori impossibili (livello 39, PF negativi, punteggi 999999)
- Trovato da: distruttore · 2026-11-06
- Dove: I Eroe → Import, 1440x900
- Passi: 1. Importa `{"name":"MultiOver","abilities":{"str":10},"class":"Fighter","level":5,"multi":[{"class":"Wizard","level":19},{"class":"Rogue","level":19}]}`. 2. Importa `{"name":"LvHuge","abilities":{"str":999999,"dex":-50},"level":1000000000,"hp":{"cur":-999,"max":-5,"temp":"x"}}`.
- Atteso: livelli totali al massimo 20, PF e punteggi riportati in un intervallo valido.
- Ottenuto: MultiOver ha livello totale 39 (Fighter 1 / Wizard 19 / Rogue 19). LvHuge mostra -999 / -5 PF, CA -20, iniziativa -30, e senza classe l'intestazione dice "Level 20 undefined". `fixup` limita ogni multiclasse a 19 ma non la somma.
- Console: nessun errore.
- **Risolto** il 2026-11-07 da sviluppo in [1a09890](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/1a09890): `fixup`: livelli multiclasse tagliati perché il totale resti 20, punteggi 1–30, PF massimi ≥1, PF attuali e temporanei ≥0, classe mancante → testo vuoto (niente più "undefined"). MultiOver ora Fighter 1 / Wizard 19, LvHuge 0/1 PF e Forza 30.

### B-008 [media] Il wizard accetta un livello decimale
- Trovato da: distruttore · 2026-11-06
- Dove: Nuovo eroe, 1440x900
- Passi: 1. Nuovo eroe → Level `2.7` (si può scrivere a mano nel campo numerico) → Inscribe hero.
- Atteso: livello 2 o 3 (intero), oppure errore.
- Ottenuto: eroe di livello 2.7, PF massimi 25.6, XP `undefined` (`XP_TABLE[1.7]`). `clamp(+valore, 1, 20)` non arrotonda (index.html:2629). Livelli -1, 0, 21, "abc" e 1e3 invece vengono gestiti bene.
- Console: nessun errore.
- **Risolto** il 2026-11-07 da sviluppo in [1a09890](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/1a09890): Il wizard arrotonda il livello: 2.7 → 3 (XP 900, PF corretti).

### B-010 [bassa] "Download .json" non fa nulla se il nome dell'eroe è un numero
- Trovato da: distruttore · 2026-11-06
- Dove: Export, 1440x900
- Passi: 1. Importa `{"name":12345,"abilities":{"str":10}}`. 2. Export → Download .json.
- Atteso: scarica `12345.json`.
- Ottenuto: non succede nulla. `downloadChar` (index.html:2568) chiama `c.name.replace` su un numero. Anche il nome `{"x":1}` viene accettato e mostrato come "[object Object]".
- Console: `PAGEERROR c.name.replace is not a function`
- **Risolto** il 2026-11-07 da sviluppo in [1a09890](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/1a09890): `fixup` converte il nome in testo (numero → "12345", oggetto → "Nameless"); Download .json funziona.

## Diario dei test

- 2026-11-06 · distruttore · Prima sessione (Playwright/Chromium, server locale, stesso codice del sito live). Import eroe con 15 JSON malformati (tipi sbagliati, null, valori enormi, multiclasse oltre 20, XSS in nome/classe/specie/note); wizard con nomi vuoti, di soli spazi, da 20.000 caratteri, emoji composte, HTML, livelli -1/0/21/2.7/abc/1e3; PF con danni/cure/temporanei negativi; due schede aperte insieme; level up 1→20 per tutte le 12 classi alternando ASI e talenti; doppio clic su "Become level"; ASI su punteggio sopra 20; import homebrew con nome numerico/oggetto, campi del tipo sbagliato, XSS, 50 voci, categorie `__proto__`/`constructor`; offline con service worker; localStorage pieno; ripristino da eroe rotto. Nessun XSS riuscito (tutto passa da `esc`), offline ok, doppio clic non applica due livelli, level up fino a 20 senza errori. Trovati B-001…B-011.
- 2026-11-08 · power user · Sito live, Playwright/Chromium, 1440x900 e 390x844, anche CPU 4x. Tomo con 33 eroi: 3 di esempio, 6 dal wizard (livelli 11–20), 24 importati dalla finestra Import (livelli 10–20, 80 oggetti, 45–60 incantesimi, 8 attacchi, note da ~6.500 caratteri). Numeri (desktop / telefono, mediana): apertura del tomo fino allo scaffale completo 0,81 s / 0,79 s, con CPU 4x 2,0 s / 2,0 s; cambio eroe 65–105 ms / 42–61 ms (CPU 4x 210–290 ms, Zaino il più lento fino a 490 ms); cambio capitolo 140–220 ms / 90–120 ms (CPU 4x 410–690 ms); level up apertura 129 ms, conferma 149 ms (CPU 4x 115 / 269 ms); wizard 90 ms; import di un eroe pesante 94 ms; cancellazione 55 ms; filtro dello zaino 37–90 ms a tasto. Memoria JS 4 MB a vuoto → 11,3 MB con 33 eroi, stabile dopo 200 cambi eroe (nessuna perdita). localStorage 1,46 milioni di caratteri (~44 KB per eroe pesante), libero 3,78 milioni: limite ~5,24 milioni, circa 118 eroi così; IndexedDB 72 KB. Verificati sul live: B-004 (avviso "Not saved" resta, Try again lo toglie, eroi presenti dopo ricarica), B-003 (4 JSON rotti, tutti i capitoli aperti, nessun errore), B-001 (voce `n:42` scartata, tomo ok dopo ricarica), B-002 (EroeTabA ed EroeTabB entrambi presenti nella terza scheda). Export → re-import identico; 20 eroi cancellati, ricarica ok. Console pulita. Ancora 10 px di scroll orizzontale a 390 px (già nel backlog). Trovati B-012…B-015.
- 2026-11-09 · distruttore · Sessione serale sul salvataggio nuovo (Playwright/Chromium, server locale = stesso codice di main a814a69). Suite completa 164/165 (resta solo B-014): B-005, B-006, B-012, B-013, B-015 e i test del telefono reggono. Tecniche nuove: tre schede con 60 operazioni casuali (crea, cancella, danni, cambio capitolo) → nessun eroe perso né resuscitato, 4ª scheda identica; memoria piena in due schede → avviso in entrambe, liberato lo spazio in B "Try again" salva, A unisce e alla modifica successiva salva anche il suo eroe (nessuna perdita); cancellazione in una scheda mentre l'altra sta scrivendo → **B-016**. "Export all"/import di backup con `[]`, `{"heroes":[]}`, `[null,5,"x"]`, doppioni nel file, id già presenti, nome `__proto__`, JSON annidato 3.000 livelli, valori 1e308: nessun errore, doppioni saltati. Import 5etools con 11 file malformati e fino a 20.000 voci (**B-020**). Campi numerici con negativi ed enormi (**B-017**, **B-018**). Telefono 390 px con testi lunghi senza spazi in ogni campo (**B-019**). Tastiera: Esc annulla la conferma di cancellazione, Invio ripetuto non cancella. Console pulita in tutte le prove. Nota: un eroe singolo con un campo `heroes:[]` viene letto come backup vuoto ("no heroes"), caso improbabile e non registrato.
- 2026-11-09 · power user · Sessione serale (Playwright/Chromium, server locale = main 8c56f8d, identico al live). Suite completa 164/172 (falliscono solo i test dei bug aperti B-014, B-016…B-020). Scenari: **Paladino dal livello 1 al 20** con sottoclasse, PF medi, +2 Cos, talenti ed Epic Boon (apertura level up 69–132 ms, conferma 51–252 ms) → **B-021**, **B-022**; sondaggio di tutte le 12 classi per ogni livello 2–20; **tripla multiclasse** Fighter 5 → Wizard 8 / Warlock 7 (livello 20): slot multiclasse, slot del Patto, Dadi Vita per tipo, PF (d6 +6, d8 +7) e competenze tutti corretti; **sessione di gioco** con 4 eroi: 10 danni di fila (64–154 ms), PF temporanei, cure, Dado Vita, 5 condizioni, Second Wind/Channel Divinity/Bardic Inspiration, slot, riposi breve e lungo, 30 tiri di dado (1–6 ms) → **B-023**; **homebrew sugli eroi**: classe mezza incantatrice d10 con aumenti a 4 e 8, specie velocità 40, talento e oggetto, eroe portato dal 2 all'8 (PF, slot e aumenti giusti) → **B-025**; **tutto da telefono 390x844**: 40 eroi dal wizard (tutte le classi, livelli 1–20), 10 rinominati con accenti, 15 duplicati a catena, 15 cancellati, incontro con 20 creature e 25 turni, tutti i capitoli senza scroll orizzontale; "Export all" di 43 eroi (56 KB) e import in un tomo vuoto in 0,37 s → **B-024**. Numeri: apertura del tomo 0,76 s, ricarica con 41 eroi 0,5–0,7 s, localStorage 39.700 caratteri per 43 eroi leggeri (~920 a eroe: B-012 regge), memoria JS 10 MB. Correzioni di oggi verificate nell'uso: B-005, B-006, B-012, B-013, B-015 reggono. Console pulita in tutte le prove.
