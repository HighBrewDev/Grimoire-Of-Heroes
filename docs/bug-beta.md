# Bug dei beta tester

Formato: una voce per bug, la più recente in cima. Gravità: critica (perdita dati, app inutilizzabile), alta (funzione principale rotta), media, bassa.
Quando lo sviluppo lo corregge, sposta la voce in "Risolti" con il commit.

## Aperti

### B-044 [alta] Biblioteca: un file 5etools con `source` (o `cls`) come oggetto con `toString` blocca l'avvio dell'app per sempre
- Trovato da: distruttore · 2026-11-14
- Sezione: import/export
- Dove: Biblioteca → Import, 1440x900
- Passi: 1. Biblioteca → Import → scegli un file `{"spell":[{"name":"Strano","source":{"toString":1},"level":1,"school":"E","entries":["x"]}]}`. 2. Ricarica la pagina (anche una seconda volta).
- Atteso: voce scartata o convertita in testo, app avviata.
- Ottenuto: l'import riesce (e va in IndexedDB), ma `buildIndex()` (riga ~910, `e.o.cls || e.o.source` concatenato) lancia a ogni avvio, `boot()` si ferma prima di `wire()`/`render()`: nessun segnalibro, nessuna scheda; gli eroi restano in localStorage (3/3) ma non si raggiungono né si esportano. Si recupera solo cancellando i dati del sito. Stessa famiglia di B-043 ma persistente. Nota: con `level`, `school`, `rarity`, `className` ecc. come oggetti con `toString` lancia invece `key5` già all'import e l'import sparisce senza messaggio (nessuna persistenza).
- Console: `PAGEERROR Cannot convert object to primitive value` (buildIndex ← boot)
- Test: `tests/sezioni/robustezza.test.js` · "B-044 …" (oggi fallisce).
- Suggerimento: in `ingest5` ridurre `source`, `cls`, `level`, `school`, `rarity`, `className`… a testo (`typeof === 'string'`) prima di `key5` e dell'id; proteggere `buildIndex` con try/catch per voce così un pacchetto malformato non blocca l'avvio.

### B-047 [bassa] Import homebrew: oggetti con `toString` in altri campi (incantesimi `cls`/`lv`, talenti) fanno sparire l'import senza messaggio (resto di B-043)
- Trovato da: distruttore · 2026-11-14
- Sezione: workshop
- Dove: Workshop → Import file, 1440x900
- Passi: 1. Importa `{"grimoireHomebrew":[{"id":"x","cat":"spells","o":{"n":"Z","lv":{"toString":1},"cls":{"toString":1}}}]}` (oppure `cat:"feats"` con tutti i campi `{"toString":1}`).
- Atteso: finestra di verifica o messaggio.
- Ottenuto: nessuna finestra, nessun messaggio; l'app resta viva e nulla viene salvato (provati 8 valori strani per ogni campo di ogni tipo: 4 casi su 64, nessuna esecuzione di codice, nessun blocco all'avvio).
- Console: `PAGEERROR Cannot convert object to primitive value` (brewKey, `String`/`join`)
- Test: nessuno ancora.
- Suggerimento: ridurre a testo ogni campo in `cleanBrew`/`checkBrew` come per `sc`.

### B-045 [bassa] Biblioteca: una voce 5etools con un campo del tipo sbagliato (`ac: 15`, `trait` non array, `will` non array…) non si apre e non dice nulla
- Trovato da: distruttore · 2026-11-14
- Sezione: biblioteca
- Dove: Biblioteca → Mostri, 1440x900
- Passi: 1. Importa `{"monster":[{"name":"Goblin Capo","source":"HB","size":["S"],"type":"humanoid","ac":15,"hp":{"average":20},"str":10,"dex":14,"con":10,"int":10,"wis":10,"cha":8}]}`. 2. Cerca "Goblin Capo" e cliccalo.
- Atteso: scheda del mostro (CA 15) o un avviso.
- Ottenuto: il riquadro resta "Choose an entry to read it here." senza messaggio. Stessa cosa con `a.from` non array, `trait`/`action`/`legendary` non array, `spellcasting` non array, `daily`/`will` non array, `entries` con `colLabels` non array, `hp` come testo. Dopo la ricarica l'app parte (non è persistente). Nessuna esecuzione di codice in 8 tipi di voce × ogni campo × 16 valori strani (B-042 regge).
- Console: `PAGEERROR (o.ac || []).map is not a function`
- Test: `tests/sezioni/robustezza.test.js` · "B-045 …" (oggi fallisce).
- Suggerimento: avvolgere `entryCard` in try/catch con un messaggio "Questa voce non si può mostrare", o usare `[].concat(x)` / `Array.isArray` nei punti di `extBody` e `r5`.

### B-046 [bassa] Biblioteca: una voce 5etools con `source` non testuale (numero, array) rompe la ricerca della sua categoria
- Trovato da: distruttore · 2026-11-14
- Sezione: biblioteca
- Dove: Biblioteca → Talenti (o Specie, Background, Oggetti…), 1440x900
- Passi: 1. Importa `{"feat":[{"name":"Dono Strano","source":5,"entries":["x"]}]}`. 2. Talenti → scrivi "alert" nella ricerca.
- Atteso: ricerca normale.
- Ottenuto: errore a ogni tasto, la lista non si aggiorna come dovrebbe (`key5` restituisce `o.source` com'è e `libFiltered` chiama `.toLowerCase()`).
- Console: `PAGEERROR (e.k || "").toLowerCase is not a function`
- Test: `tests/sezioni/robustezza.test.js` · "B-046 …" (oggi fallisce).
- Suggerimento: come B-044, ridurre `source` a testo in `key5` (`String(...)` solo se `typeof` è string/number).

### B-031 [bassa] Level up: un talento generale con aumento di caratteristica (Grappler) non dà il +1
- Trovato da: tester extra · 2026-11-10
- Sezione: level up/multiclasse
- Dove: Level up, livello 4 (o 8, 12, 16), scelta "Feat", 1440x900
- Passi: 1. Valeria (Guerriero 3, For 16, Des 14). 2. Level up → Feat → Grappler → Become level 4.
- Atteso: regole 2024: Grappler dà +1 a Forza o Destrezza (massimo 20), come dice il suo testo nell'app ("Ability Score Increase").
- Ottenuto: il talento viene aggiunto ma For e Des restano 16 e 14. Stessa causa dell'Epic Boon in B-027: il ramo `feat` di `applyLevelUp` fa solo `c.feats.push`. Serve anche una scelta della caratteristica nella finestra.
- Console: nessun errore.
- Test: `levelup` "B-031 …".


### B-032 [bassa] Cos al minimo, poi danno o Level up, poi Cos rialzata: PF massimi gonfiati (resto di B-026)
- Trovato da: distruttore · 2026-11-10
- Sezione: caratteristiche
- Dove: II Caratteristiche → − / + della Costituzione, con III Combattimento → Damage o Level up nel mezzo, 1440x900
- Passi: 1. Mago 20, Cos 10, PF 82/82. 2. Premi − sulla Costituzione 9 volte (Cos 1, PF 20/20: corretto, minimo 1 per livello). 3. Combattimento → Damage 5 (PF 15/20). 4. Torna a Caratteristiche e premi + 9 volte (Cos 10). Variante: Mago 10 (42 PF), Cos 1, Level up all'11 (+1 PF, corretto), poi Cos 10.
- Atteso: 77/82 (danno 5 sui PF di partenza); nella variante 46 PF massimi (6 + 10 × 4).
- Ottenuto: **115/120** (+38 PF massimi dal nulla); variante **66/66** (+20). Con riposo lungo o cura nel mezzo invece torna giusto (82/82). La memoria `hp.conAdj` di B-026 vale solo se i PF non sono cambiati (`a.m === max0 && a.c === cur0`): un danno o un livello la cancellano e la differenza tolta dal minimo (qui 38) viene restituita due volte. Serve una Cos 1–3 a livello alto, quindi gravità bassa.
- Console: nessun errore.
- Test: `caratteristiche` "B-032 …".

### B-020 [bassa] Import 5etools enorme: tempo quadratico, 20.000 voci bloccano la pagina per quasi 2 minuti
- Trovato da: distruttore · 2026-11-09
- Sezione: workshop
- Dove: X Workshop → Import file, 1440x900
- Passi: 1. File `{"spell":[…]}` con N incantesimi validi e diversi. 2. Import file.
- Atteso: tempo che cresce in proporzione alle voci (o un limite con messaggio).
- Ottenuto: 1.000 voci 0,38 s, 2.000 0,9 s, 4.000 2,5 s, 20.000 **109 s** prima della finestra di scelta (pagina ferma). I file veri di 5etools (fino a ~1.800 voci) restano sotto il secondo, quindi gravità bassa. Il resto dell'import ha retto: liste non array, `null`, nomi numerici/oggetto/HTML, tag `{@` non chiusi, 3.000 tag annidati, `entries` annidate 5.000 volte, `_copy` circolari, chiavi `__proto__`: nessun errore.
- Console: nessun errore.
- Test: `workshop` "B-020 …".

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

### B-043 [bassa] Import homebrew: un incantesimo con la scuola (`sc`) come oggetto con `toString` blocca l'import senza messaggio — RISOLTO 2026-11-14 (sviluppo)
- Trovato da: power user · 2026-11-13
- Sezione: robustezza
- Dove: Workshop → Import file, 1440x900
- Passi: 1. Workshop → Import file → `{"grimoireHomebrew":[{"id":"x","cat":"spells","o":{"n":"Scuola strana","lv":1,"sc":{"toString":1},"cls":["Wizard"],"x":"Un lampo."}}]}`.
- Atteso: finestra di verifica con la voce segnalata (o scartata) e un messaggio.
- Ottenuto: non si apre nulla e nessun messaggio; l'import sparisce nel nulla. Gli stessi oggetti in `lv`, `cls`, `x`, `ac`, `rar`, `pre` e `sc: {"a":1}` non danno errore: solo `sc` viene trattato come testo (conversione implicita) nella verifica.
- Console: `PAGEERROR Cannot convert object to primitive value`
- Test: `tests/sezioni/robustezza.test.js` · "B-043 …" (oggi fallisce).
- Suggerimento: ridurre ogni campo a testo con `typeof === 'string'` prima di confrontarlo o concatenarlo.

### B-042 [alta] XSS: `page` e `passive` di un file 5etools importato nella Biblioteca eseguono codice (resto di B-041) — RISOLTO 2026-11-14 (sviluppo)
- Trovato da: distruttore · 2026-11-13
- Sezione: robustezza
- Dove: Biblioteca → Import → file `.json`, poi aprire la voce o scorrere l'elenco, 1440x900
- Passi: 1. Biblioteca → Import → file `{"spell":[{"name":"Sonda","source":"X","page":"<img src=x onerror=…>","level":1,"school":"E","entries":["x"]}],"monster":[{"name":"Mostro","source":"X","size":["M"],"type":"beast","str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10,"ac":[10],"hp":{"average":10},"senses":["darkvision 60 ft."],"passive":"<img src=x onerror=…>"}]}`. 2. Aprire le categorie Spells e Monsters e la voce.
- Atteso: il testo compare escapato (o `page` e `passive` sono ridotti a numeri).
- Ottenuto: `onerror` viene eseguito. `extMeta` (index.html ~2092) scrive `o.page` senza `esc` (`' p.' + o.page`), `extBody` (~2120) scrive `o.passive` senza `esc` nella riga dei sensi. Colpisce ogni categoria con `source` e `page` (incantesimi, talenti, oggetti, mostri…). Il resto di B-041 (level, school, roll, str, slots, chiavi) regge; anche l'import eroe con ogni foglia e ogni chiave avvelenata non esegue nulla.
- Console: nessun errore.
- Test: `tests/sezioni/robustezza.test.js` · "B-042 …" (oggi fallisce).
- Suggerimento: passare in `esc` ogni valore di `o.*` interpolato in `extMeta`/`extBody`, non solo quelli già trovati; è la terza volta che resta un campo (B-039, B-041, B-042).

### B-034 [bassa] Classe, specie o background fuori dai menu (homebrew cancellato, eroe importato): i menu mostrano Barbarian, Dragonborn, Acolyte — RISOLTO 2026-11-14 (sviluppo)
- Trovato da: distruttore · 2026-11-10
- Sezione: eroe
- Dove: I Eroe → menu Class, Species, Background e righe della multiclasse, 1440x900
- Passi: 1. Workshop → Import file di una classe homebrew in Markdown ("# Class: Runecarver", d8, tiri salvezza Int e Cos). 2. Valeria Fighter 3 / Rogue 1: nella riga della multiclasse scegli Runecarver. 3. Workshop → cancella Runecarver (conferma). 4. Torna a Eroe. Oppure importa un eroe con classe "Artificer", specie "Popolo del Muschio", background "Pirata".
- Atteso: il menu mostra ancora il valore dell'eroe (anche come voce "Runecarver (non più disponibile)"), come fa l'intestazione.
- Ottenuto: intestazione "Fighter (Champion) 3 / Runecarver 1", ma il menu della riga mostra **Barbarian**; per l'eroe importato i menu mostrano Barbarian / Dragonborn / Acolyte mentre i dati dicono Artificer / Popolo del Muschio / Pirata. Il giocatore legge una classe sbagliata, e scegliere davvero Barbarian (la voce già mostrata) non fa partire il cambio. I dati non cambiano da soli e il Level up funziona ancora (Runecarver 1 → 2, +7 PF), nessun errore. `opt()` marca `selected` solo se il valore è nell'elenco (`names('classes')`, index.html ~1650 e ~1656).
- Console: nessun errore.
- Test: `eroe` "B-034 …".

### B-033 [bassa] Multiclasse: il menu della classe principale offre una classe già presente nelle righe (resto di B-028) — RISOLTO 2026-11-14 (sviluppo)
- Trovato da: distruttore · 2026-11-10
- Sezione: level up/multiclasse
- Dove: I Eroe → menu Class (classe principale), 1440x900
- Passi: 1. Valeria Fighter 3 / Rogue 1 (livello 4). 2. Nel menu Class (la classe principale, non la riga) scegli Rogue. 3. Apri Level up. 4. Ricarica la pagina.
- Atteso: il menu Class non offre Rogue (come fa ora la riga, B-028) oppure unisce i livelli dicendolo.
- Ottenuto: intestazione "Rogue 3 / Rogue 1"; Level up offre due righe "Rogue 3 → 4" e "Rogue 1 → 2" (aumenti e privilegi contati da due classi separate, come in B-028). Alla ricarica `fixup` scarta la riga doppia: l'eroe diventa "Rogue 4" e i 3 livelli da Guerriero spariscono senza avviso. La correzione di B-028 ha filtrato solo il menu `data-mc`; `bindValue` per `class` (index.html ~4384) non guarda la multiclasse.
- Console: nessun errore.
- Test: `levelup` "B-033 …".


### B-016 [alta] Due schede: se una cancella l'eroe che l'altra sta scrivendo, il testo finisce su un altro eroe
- Trovato da: distruttore · 2026-11-09
- Sezione: import/export (salvataggio con più schede)
- Dove: I Eroe (campo Nome) e VIII Cronaca (note), 1440x900, due schede sullo stesso sito
- Passi: 1. Apri il sito nelle schede A e B, entrambe su Valeria Thorne. 2. In B apri Chronicle e scrivi qualcosa nella storia di Valeria (o cambia il Nome nella scheda Eroe senza uscire dal campo). 3. In A cancella Valeria (Delete → conferma). 4. Torna in B e continua a scrivere, poi esci dal campo.
- Atteso: B si accorge che Valeria non c'è più (avviso, il testo non viene salvato su nessun altro eroe) oppure Valeria resta perché era in modifica.
- Ottenuto: la storia di **Eldrin** diventa "A city guardsman who took up the adventuring road. scrive ancora" (testo di Valeria + quello scritto): la sua storia vera ("Apprentice of the Spire.") è persa senza avviso. Con il Nome: Eldrin si chiama "Valeria EDITATA in B". La pagina di B mostra ancora "Valeria Thorne · Chronicle". Causa probabile: `otherTabSaved`/`mergeStored` (index.html ~4015) tolgono l'eroe e spostano `G.activeId` sul primo eroe mentre si scrive (`isTyping` rimanda solo il render), poi `bindValue` (~4333) scrive su `active()`, che ora è un altro eroe.
- Console: nessun errore.
- Test: `importexport` "B-016 …" (2 test).
- Risolto: 2026-11-10 · PR #16 (un campo scrive solo sull'eroe per cui è stato aperto); test `importexport` B-016 verdi. Registro corretto dal team leader 2026-11-14.

### B-041 [alta] XSS guardado: un file 5etools importato nella Biblioteca con HTML in livello, scuola, tabelle, forza o slot esegue codice a ogni apertura della voce
- Trovato da: distruttore · 2026-11-12
- Sezione: robustezza
- Dove: Biblioteca → Import → file `.json` (o URL), poi aprire la voce, 1440x900
- Passi: 1. Biblioteca → Import → scegli un file `{"spell":[{"name":"Sonda","level":"<img src=x onerror=…>","school":"<img …>","entries":[{"type":"table","rows":[[{"roll":{"exact":"<img …>"}}]]}]}],"monster":[{"name":"Mostro","str":"<img …>",…,"spellcasting":[{"daily":{"<img …>":["a"]},"spells":{"<img …>":{"slots":"<img …>","spells":["a"]}}}]}]}`. 2. Apri "Sonda" tra gli incantesimi e "Mostro" tra i mostri.
- Atteso: il testo compare escapato (o i campi numerici sono ridotti a numeri).
- Ottenuto: `onerror` viene eseguito per `level`, `school`, `roll.exact`, `roll.min/max`, `str` (e le altre caratteristiche), `daily` (chiave), `spells` (chiave) e `slots`. `ingest5` (index.html ~2068) salva il JSON grezzo, `extMeta` (~2079) e `extBody` (~2108) inseriscono quei campi nell'HTML senza `esc`, e `r5` (~1007, ~1021–1022) fa lo stesso per le celle `roll` e le chiavi di spellcasting. Il file resta in IndexedDB, quindi il codice viene eseguito di nuovo a ogni apertura della voce finché la fonte non viene rimossa. Stessa classe di B-039 ma altra via d'ingresso: la correzione di B-039 non la copre. Un file 5etools condiviso in un forum può eseguire codice nell'origine dell'app. Provati anche i campi di rarità, tipo, `from` dell'armatura, velocità, `cr`: sono già escapati. L'import homebrew (JSON Grimoire con 11 categorie e 60 chiavi) regge.
- Console: nessun errore.
- Test: `robustezza` "B-041 …".
- Risolto: 2026-11-13 · sviluppo · escape di level, school, roll, str, chiavi e slots in `extMeta`/`extBody`/`r5`.

### B-039 [alta] XSS guardado: l'import di un eroe con `q` (quantità di un oggetto) o `condDur` (durata di una condizione) come testo HTML esegue codice
- Trovato da: distruttore · 2026-11-11
- Sezione: robustezza
- Dove: Import (eroe da file o testo), poi Zaino / Combattimento, 1440x900
- Passi: 1. Importa `{"name":"X","inventory":[{"n":"Corda","q":"<img src=x onerror=\"window.__xq=1\">"}]}`. 2. Apri Zaino. Stesso con `conditions:["Poisoned"], condDur:{"Poisoned":"<img …>"}` e apri Combattimento.
- Atteso: il testo compare escapato o `q` e `condDur` sono ridotti a numeri da `fixup`.
- Ottenuto: `onerror` viene eseguito. `objList` (index.html ~1074) copia gli oggetti senza ripulire i campi diversi da `n`; `×${it.q || 1}` (~1867) e `(${c.condDur[n]} rd)` (~1767) entrano nell'HTML senza `esc`. Un eroe condiviso come file può eseguire codice nell'origine dell'app. Provati 19 campi con 4 payload: gli altri (nome, specie, classe, note, attacchi, talenti, incantesimi, monete, PF, `conc`, id, multiclasse) sono escapati o ripuliti. Lo stesso `fixup` non ripulisce nemmeno `res`, vedi B-038.
- Console: nessun errore.
- Test: `robustezza` "B-039 …" (×2).
- Risolto: 2026-11-13 · sviluppo · `fixup` riduce `q` e `condDur` a interi.

### B-038 [bassa] Import: i contatori delle risorse (`res`) accettano negativi, frazioni e testo
- Trovato da: distruttore · 2026-11-11
- Sezione: import/export
- Dove: Import di un eroe con `res`, poi Combattimento → Short Rest, 1440x900
- Passi: 1. Importa un Chierico 6 con `res:{channel_divinity_charges:2.5, second_wind_uses:-3, rage_count:"x"}`. 2. Combattimento → Short Rest.
- Atteso: `res` ridotto a interi 0–20 all'import.
- Ottenuto: `fixup` (index.html ~1086) fa solo `objOr` su `res`: i valori restano e dopo il riposo breve `channel_divinity_charges` vale 1.5 e un contatore -3 resta -3.
- Console: nessun errore.
- Test: `importexport` "B-038 …".
- Risolto: 2026-11-13 · sviluppo · `fixup` riduce `res` a interi 0-20.

### B-029 [media] Solo tastiera: Tab esce dalla finestra Level up e il livello finisce su un altro eroe
- Trovato da: distruttore · 2026-11-10
- Sezione: robustezza
- Dove: finestra Level up (vale per tutte le finestre di `modal()`), 1440x900, solo tastiera
- Passi: 1. Eroe attivo Eldrin (Wizard 4), apri Level up: titolo "Eldrin Moonwhisper reaches level 5". 2. Premi Tab: dopo "Not yet" il focus esce dalla finestra e passa ai controlli coperti (ricerca, tema, wizard, capitoli, poi i ritratti dello scaffale). 3. Arrivato sul ritratto di Kessa premi Invio. 4. Premi "Become level 5".
- Atteso: il focus resta nella finestra (`aria-modal="true"` lo promette) e il livello va a Eldrin.
- Ottenuto: con la finestra ancora aperta e il titolo ancora "Eldrin … level 5", Invio sul ritratto cambia l'eroe attivo; "Become level 5" porta **Kessa** dal 2 al 3 ("Kessa Quickpaw is now level 3: +6 HP"), Eldrin resta 4. Non esiste un modo per togliere un livello. `modal()` (index.html ~1290) mette il focus nella finestra ma non lo trattiene e lo sfondo non è `inert`; `applyLevelUp` usa `active()` invece dell'eroe per cui la finestra è stata aperta. Col mouse non succede (lo sfondo copre).
- Console: nessun errore.
- Test: `robustezza` "B-029 …".
- Risolto: 2026-11-13 · sviluppo · `modal()` mette `inert` sul resto della pagina finché è aperta.

### B-037 [bassa] Cura dal tracciatore dell'Incontro a un eroe a 0 PF: i tiri contro la morte restano segnati
- Trovato da: power user · 2026-11-10
- Sezione: incontro
- Dove: IV Encounter → Heal sulla riga di un eroe, poi III Combattimento → Death saves, 1440x900
- Passi: 1. Lio a 0 PF con 1 successo e 2 fallimenti. 2. Encounter → aggiungi Lio → nella sua riga scrivi 5 → Heal. 3. Apri Combattimento.
- Atteso: come con Heal nel Combattimento: a 5 PF i tiri contro la morte si azzerano.
- Ottenuto: PF 5/33 ma Death saves mostra ancora **1 successo e 2 fallimenti** accesi (`death {s:1,f:2}`). `encHeal` (index.html ~3622) aggiorna solo `hp.cur`, mentre `heal()` azzera `death`. Si sistema da solo al colpo successivo solo per via di B-036.
- Console: nessun errore.
- Test: `incontro` "B-037 …".
- Risolto: 2026-11-11 · sviluppo frontend · commit bc4640f (PR #19 unita il 12/11); test `incontro` B-037 verde (verifica del leader 13/11).

- **Risolto 2026-11-11** in [PR #19](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/19) (frontend): B-037, `encHeal` azzera i tiri contro la morte quando l'eroe supera 0 PF. Test `incontro` B-037 verde.
### B-040 [bassa] [UX] Lo scaffale: l'ordine scelto ("By name", "Last used") torna a "Shelf order" a ogni ricarica
- **Risolto 2026-11-12** (designer): `G.shelfSort` entra nelle preferenze (`savePrefs()`, valori ammessi manual/name/recent); l'ordine sopravvive alla ricarica.
- **Data / tester / sezione**: 2026-11-11 · power user · eroe
- **Passi**: tomo con 33 eroi; nel menu sopra lo scaffale scegli "By name"; ricarica la pagina.
- **Atteso**: l'ordine scelto resta (come capitolo e preferenze), o almeno si ripete con un clic solo.
- **Ottenuto**: il menu torna a "Shelf order" (`G.shelfSort` vive solo in memoria, riga ~4489 di index.html); con 30+ eroi va rifatto a ogni apertura, su telefono compreso.
- **Errore in console**: nessuno.
- **Test**: `tests/sezioni/eroe.test.js` · "B-040 …" (oggi fallisce).


### B-030 [media] Telefono: B-019 non copre danno degli attacchi, privilegi e talenti, incantesimi e nome in Incontro
- **Risolto 2026-11-12** (designer, solo CSS): `overflow-wrap:anywhere` e `min-width:0` su chip degli attacchi, `.kv` (privilegi, talenti), titoli dei `fold`, celle delle tabelle e nomi dell'Incontro; il chip del danno va a capo con raggio 14 px. `telefono` 17/17.
- Trovato da: tester extra · 2026-11-10
- Sezione: telefono (seguito di B-019)
- Dove: III Combattimento, V Tratti, VI Incantesimi, IV Incontro, 390x844
- Passi: 1. Combattimento → attacco personalizzato "Spada", +5, danno `1d8+3 https://example.com/regole/abcdefghij…` (60 caratteri senza spazi) → Add custom. 2. Tratti → "Add a feature" con un link lungo → Add.
- Atteso: il testo va a capo, nessuno scroll orizzontale (come per nome e note degli attacchi dopo 7cb1ec7).
- Ottenuto: `scrollWidth` 743 px in Combattimento (il `chip light` del danno non va a capo), 689 px in Tratti (`th` della tabella privilegi). Stesso problema con dati da import o homebrew: talento o fonte del talento di 80 caratteri (Tratti 772–850 px), incantesimo homebrew di 80 caratteri (Incantesimi 819 px), nome eroe di 80 caratteri senza spazi, permesso dal `maxlength` (Incontro 806 px; con 43 caratteri già 405 px). Eroe, Zaino, Cronaca, Biblioteca, Workshop restano a 390.
- Console: nessun errore.
- Test: `telefono` "B-030 …" (2 test).



### B-014 [bassa] [UX] Con 30+ eroi lo scaffale non ha ricerca né ordine: su telefono la fila è larga 7.400 px
- **Risolto 2026-11-11** (designer): sopra lo scaffale, da 8 eroi in su, compare la barra "Filter heroes" (nome, specie, classe) con ordine "Shelf order / By name / Last used" e il conteggio; su 390 px lo scaffale va a capo in 2 colonne e scorre in verticale dentro sé stesso (non più 7.400 px di fila). Test `eroe` B-014 verde, `telefono` senza nuovi rossi.
- Trovato da: power user · 2026-11-08
- Dove: scaffale degli eroi, 390x844 (anche 1440x900)
- Passi: 1. Tomo con 33 eroi. 2. Su telefono cerca il trentesimo eroe.
- Atteso: un filtro per nome o la possibilità di riordinare/fissare gli eroi in uso.
- Ottenuto: scaffale orizzontale con `scrollWidth` 7.410 px su 356 visibili: il 30° eroe è a 6.600 px, solo scorrendo. Gli eroi restano nell'ordine di creazione; non esistono riordino, ordinamento o ricerca (la ricerca Ctrl+K cerca solo le regole).
- Console: nessun errore.


### B-023 [media] Riposo breve non restituisce Second Wind, Channel Divinity e Bardic Inspiration
- Trovato da: power user · 2026-11-09
- Sezione: combattimento
- Dove: III Combattimento → Short Rest, 1440x900
- Passi: 1. Valeria (Fighter 3): usa i 2 Second Wind (segnalini). 2. Short Rest. 3. Lo stesso con un Chierico 6 (3 Channel Divinity) e un Bardo 5 (4 Bardic Inspiration).
- Atteso: regole 2024: Second Wind e Channel Divinity recuperano un uso con un riposo breve; Bardic Inspiration dal livello 5 (Font of Inspiration) torna tutta.
- Ottenuto: tutti i segnalini restano spesi fino al riposo lungo. Il riposo breve rimette solo Focus Points e slot del Patto (`SHORT_REST_RES = ['focus_points']`, index.html ~1214). Simulando una sessione di gioco con tre riposi brevi il giocatore deve ricordarsi a mano quali segnalini liberare.
- Console: nessun errore.
- Test: `combattimento` "B-023 …".
- Aggiornamento power user 2026-11-10 sera (sessione con 3 incontri e 2 riposi brevi): ancora così su main e9629ca. Stessa causa, anche **Rage** (Barbaro 5), **Wild Shape** (Druido 5) e **Channel Divinity del Paladino** (5) restano spesi dopo il riposo breve (regole 2024: recuperano un uso). Tornano solo Focus Points e slot del Patto (corretto). Sorcery Points restano spesi: giusto, salvo Sorcerous Restoration del 5° livello che l'app non ha.
- Risolto: sviluppo · 2026-11-11 · `shortRestPartial`: un uso di Second Wind, Rage, Wild Shape, Channel Divinity; Bardic Inspiration tutta dal Bardo 5; test B-023 ×6 verdi.


### B-036 [media] Danno a un eroe già a 0 PF: i fallimenti dei tiri contro la morte tornano a zero invece di salire
- Trovato da: power user · 2026-11-10
- Sezione: combattimento
- Dove: III Combattimento → Damage e Death saves (anche il Danno dal tracciatore dell'Incontro, che usa la stessa funzione), 1440x900
- Passi: 1. Lio (Bardo 5, 33 PF): Damage 33 → 0 PF. 2. Death saves → segna 2 fallimenti (o tirali con "Roll death save"). 3. Un nemico lo colpisce ancora: Damage 3.
- Atteso: regole 2024: un danno mentre si è a 0 PF dà un fallimento (due se critico), quindi 3 fallimenti, l'eroe muore; e un danno che, dopo averlo portato a 0, supera i PF massimi (danno massiccio) lo uccide subito, almeno con un avviso.
- Ottenuto: fallimenti **0/3** e successi azzerati: l'eroe morente torna "fresco" a ogni colpo e non può morire per i danni. `applyDamage` (index.html ~3342) fa `if (c.hp.cur === 0) c.death = {s:0, f:0}` anche se l'eroe era già a 0. Danno 90 a un Paladino da 40 PF: 0 PF, nessun avviso di morte istantanea. In una sessione simulata con 3 incontri il Bardo è "sopravvissuto" a 4 colpi da morente.
- Console: nessun errore.
- Test: `combattimento` "B-036 …".
- Risolto: sviluppo · 2026-11-11 · `applyDamage` suma un fallimento se il danno arriva a 0 PF e avvisa della morte istantanea (danno oltre i PF massimi); test B-036 ×2 verdi. Cura dall'Incontro (B-037) ancora aperta.


### B-027 [media] Livello 19: "+2" porta un punteggio oltre 20 e l'Epic Boon scelto come talento non dà +1
- **Risolto 2026-11-11** in [PR #14](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/14) (unita da Capo): "+2" e "+1/+1" fermi a 20 a ogni livello; un talento Epic Boon al 19 chiede la caratteristica e dà +1 fino a 30. Il test vecchio "livello 18 → 19" ora sceglie Boon of Combat Prowess e si aspetta 21. Test `levelup` B-027 ora passa.
- Trovato da: distruttore · 2026-11-10
- Sezione: level up/multiclasse
- Dove: finestra Level up, livello 18 → 19 (qualsiasi classe), 1440x900
- Passi: 1. Mago 18 con Intelligenza 20. 2. Level up: sezione "Epic Boon or Ability Score Improvement", lascia "+2 to Intelligence". 3. Become level 19. 4. Rifai scegliendo "Feat: Boon of …".
- Atteso: regole 2024: l'aumento dei punteggi (talento Ability Score Improvement) arriva al massimo a 20; solo il talento Epic Boon dà +1 a un punteggio fino a 30.
- Ottenuto: Intelligenza **22** (anche +1/+1 fino a 30); scegliendo invece un vero Epic Boon dal menu il talento viene aggiunto ma nessun punteggio sale (dal codice: il ramo `feat` fa solo `c.feats.push`). In `applyLevelUp` `cap = P.boon ? 30 : 20` vale per tutte le scelte. Nota per Test e punteggio: il test esistente "livello 18 → 19: si sceglie un Epic Boon e il punteggio può superare 20" si aspetta Forza 22 con "+2", cioè la regola sbagliata: va rivisto insieme alla correzione (non l'ho toccato).
- Console: nessun errore.
- Test: `levelup` "B-027 …".


### B-024 [media] Backup: eroi duplicati più volte persi al ripristino ("già qui")
- **Risolto 2026-11-10** in [f6479ab](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/f6479ab): Duplicate dà nomi sempre diversi entro 80 caratteri ("X (copy)", "X (copy 2)"…, una copia di una copia viene numerata invece di accumulare "(copy)") e passa da `fixup`; `importBackup` conta gli eroi identici, quindi due copie mai modificate tornano entrambe, e ripristinare due volte lo stesso file non crea doppioni. Test `importexport` B-024 (3) verdi.
- Trovato da: power user · 2026-11-09
- Sezione: import/export
- Dove: I Eroe → Duplicate, poi Export → "Export all heroes" e Import del file, 390x844 e 1440x900
- Passi: 1. Eroe con nome di 70 caratteri (o un nome normale duplicato più volte partendo dall'ultima copia: ogni copia aggiunge " (copy)"). 2. Duplicate tre volte. 3. Export all heroes. 4. In un altro browser (o dopo aver cancellato gli eroi) Import del file.
- Atteso: tornano tutti e 4 gli eroi.
- Ottenuto: "3 heroes back in the tome (1 already here)": una copia è persa e il messaggio dice che c'era già. `duplicate` (index.html ~3700) allunga il nome oltre il limite di 80 caratteri (B-009) senza passare da `fixup`; all'import `fixup` taglia i nomi a 80, due copie diventano identiche e `importBackup` (~3818) scarta la seconda come "già qui". Nella mia sessione: 43 eroi nel backup, 5 persi così (nomi da 81 a 123 caratteri). Anche il nome mostrato cresce senza limite: "Rinominato 9 Àèìòù (copy) (copy) … (copy)" con 15 duplicati.
- Console: nessun errore.
- Test: `importexport` "B-024 …".
- Aggiornamento power user 2026-11-10 sera (preparazione della verifica): ancora così su main e9629ca. Si perde un eroe anche **senza nomi lunghi**: due Duplicate dello stesso originale (non a catena) danno due "Eroe 11 Warlock (copy)" identici; backup di 39 eroi → "38 heroes back in the tome (1 already here)". `sameHeroKey` confronta tutto tranne l'id, quindi due copie mai modificate sono "lo stesso eroe". Le copie a catena con nomi corti (fino a 37 caratteri) tornano tutte. Ripristinare due volte lo stesso file: "Every hero in that file is already in the tome", nessun doppione (corretto).

### B-035 [bassa] PF massimi scritti come "1e3": il campo mostra 1e3, salva 1 e i PF attuali crollano a 1
- **Risolto 2026-11-10** in [ca54499](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/ca54499): `bindValue` legge i campi numerici con `Number` (troncato): `1e3` → 1000, `2.9` → 2; uscendo dal campo mostra sempre il valore salvato. Test `combattimento` B-035 verde.
- Trovato da: distruttore · 2026-11-10
- Sezione: combattimento
- Dove: III Combattimento → campo Max HP (vale per tutti i campi numerici con `data-type="int"`: monete, XP, livello, regolazione CA), 1440x900
- Passi: 1. Valeria 32/32. 2. Nel campo Max HP scrivi `1e3` (il campo numerico del browser lo accetta: vuol dire 1000) ed esci dal campo. 3. Nello Zaino scrivi `1e3` o `2.9` nelle monete d'oro.
- Atteso: 1000 PF massimi (32/1000), oppure il valore rifiutato senza toccare i PF attuali; il campo mostra ciò che è stato salvato.
- Ottenuto: PF **1/1**: i 32 PF attuali sono persi (si rimette solo a mano). Nello Zaino il campo resta "1e3" / "2.9" ma vengono salvati **1** e **2** gp, senza segnale. `bindValue` (index.html ~4373) usa `parseInt` (1e3 → 1) e corregge il campo solo se il limite min/max ha cambiato il numero; per `hp.max` poi taglia `hp.cur` al nuovo massimo.
- Console: nessun errore.
- Test: `combattimento` "B-035 …".

### B-026 [media] Costituzione giù e su con − / +: PF massimi gonfiati e PF attuali a 0
- **Risolto 2026-11-10** in [0847426](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/0847426): `conHp` tiene i PF massimi ad almeno 1 per livello e lascia uguale il danno subito; quello che una Costituzione bassa non ha potuto togliere (massimo fermo al minimo, danno oltre 0 PF) resta in `hp.conAdj`, così − e poi + ridanno gli stessi PF. Un eroe a 0 PF non viene curato alzando la Cos. La memoria si azzera appena i PF cambiano per altro. Mago 20: 82/82 → Cos 1 20/20 → Cos 10 82/82; ferito 30/82 → 0/20 → 30/82; morente 0/82 resta a 0. Test `caratteristiche` B-026 ora passa.
- Trovato da: distruttore · 2026-11-10
- Sezione: caratteristiche
- Dove: II Caratteristiche → pulsanti − / + della Costituzione, 1440x900 (correzione B-022 di stamattina)
- Passi: 1. Mago 20, Cos 10, PF 82/82. 2. Premi − sulla Costituzione 9 volte (Cos 1). 3. Premi + 9 volte (Cos 10).
- Atteso: a Cos 1 PF massimi 20 (almeno 1 per livello); tornati a Cos 10, di nuovo 82/82.
- Ottenuto: a Cos 1 PF **0/1** (l'eroe è a terra per un clic di troppo); tornati a Cos 10 PF **100/101** (+19 dal nulla). Con Cos 30 e ritorno a 10 resta 100/101. Anche un clic sbagliato su un eroe ferito lo cura: PF attuali portati a 0 dal −, poi il + li alza di livello × 1. `conHp` (index.html ~3416) taglia i massimi a 1 con `Math.max(1, …)` e i PF attuali a 0, poi il ritorno aggiunge l'intera differenza.
- Console: nessun errore.
- Test: `caratteristiche` "B-026 …".

### B-028 [bassa] Multiclasse: la stessa classe può comparire due volte (pagina Eroe e import)
- **Risolto 2026-11-10** in [0847426](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/0847426): il menu della riga di multiclasse (`data-mc`) offre solo la classe della riga e quelle che l'eroe non ha; `fixup` (import, sync) unisce le righe ripetute e restituisce alla prima classe i livelli di una riga uguale a lei (Fighter 3 con riga Fighter 2 → Fighter 3; Rogue 2 + rogue 1 → Rogue 3). Test `levelup` B-028 ora passa.
- Trovato da: distruttore · 2026-11-10
- Sezione: level up/multiclasse
- Dove: I Eroe → righe della multiclasse, 1440x900; anche Import
- Passi: 1. Fighter 3 / Rogue 4 / Wizard 4 (preso dal Level up). 2. Nella pagina Eroe cambia la riga "Rogue" in "Wizard" (o in "Fighter"). 3. Apri Level up. Oppure importa `{"name":"Neg","class":"Fighter","level":3,"abilities":{"str":10},"multi":[{"class":"Fighter","level":2}]}`.
- Atteso: il menu della riga offre solo classi che l'eroe non ha (o unisce i livelli), l'import unisce i doppioni.
- Ottenuto: l'eroe diventa "Fighter 3 / Wizard 4 / Wizard 4"; Level up offre due volte "Wizard 4 → 5", quindi due volte l'aumento del livello 4, privilegi e incantesimi contati da due classi separate. Import: "Fighter 1 / … / Fighter 2" accettato. Il menu `data-mc="i:class"` (index.html ~1645) elenca tutte le classi, anche quella principale.
- Console: nessun errore.
- Test: `levelup` "B-028 …".

### B-017 [bassa] Monete negative accettate nello Zaino
- Trovato da: distruttore · 2026-11-09
- Sezione: zaino
- Dove: VII Pack & Riches → monete, 1440x900
- Passi: 1. Scrivi `-100` in GP e `-3` in PP.
- Atteso: valore portato a 0 (o rifiutato).
- Ottenuto: salvati `gp:-100, pp:-3`. Anche l'import accetta `"currency":{"sp":-5}` e `"gp":1e308` (mostrato "≈ 1e+308 gp"). `bindValue` con `data-type="int"` non ha minimo; stessa cosa per XP (`-5000` salvato).
- Console: nessun errore.
- Test: `zaino` "B-017 …".
- Risolto: backend · 2026-11-10. Monete 0…999.999.999 e XP 0…9.999.999 nei campi (min/max rispettati da `bindValue`, il campo mostra il valore tenuto), in `addXP` e in `fixup` (import, sync, caricamento). Test: `zaino` "B-017 …" ×3.

### B-018 [bassa] CA e PF senza limite superiore/inferiore: CA -981, PF 1e+308
- Trovato da: distruttore · 2026-11-09
- Sezione: combattimento
- Dove: III Combattimento, 1440x900
- Passi: 1. AC adjustment `-999`. 2. Oppure Import `{"name":"Enorme","abilities":{"str":10},"class":"Fighter","level":20,"hp":{"cur":1e308,"max":1e308,"temp":1e308}}`. 3. Oppure PF massimi `999999999999` nel campo.
- Atteso: CA mai sotto 0 e PF entro un massimo ragionevole (B-007 ha messo solo i minimi).
- Ottenuto: CA mostrata -981; PF "1e+308 / 1e+308 · 1e+308 temp" (i danni non li scalfiscono); 999999999999 accettato dal campo.
- Console: nessun errore.
- Test: `combattimento` "B-018 …".
- Risolto: backend · 2026-11-10. PF massimi/attuali/temporanei 0…9999 (campo, Damage/Heal/Temp, `fixup` per import e sync), regolazione CA −20…+20, CA mostrata mai sotto 0. Test: `combattimento` "B-018 …" (i due nuovi passano; quello vecchio clicca Import dal capitolo Combattimento, dove il pulsante non c'è: va corretto dal tester).

### B-019 [media] Telefono: un link o una parola lunga in oggetti e attacchi allarga la pagina fino a 1.400 px
- **Risolto 2026-11-10** in [7cb1ec7](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/7cb1ec7) (designer, solo CSS): `overflow-wrap:anywhere` su nomi e note degli attacchi, nomi e descrizioni degli oggetti, slot di sintonia, titoli delle card, titolo e sottotitolo della pagina e card dello scaffale (`.hero` resta 210 px, nome e riga sotto al massimo 2 righe). A 390 px con specie, sottoclasse, attacco, nota, oggetto e link lunghissimi: scrollWidth 390 in tutti i 10 capitoli (prima 780–1.291). Test `telefono` B-019 ×2 ora passano.
- Trovato da: distruttore · 2026-11-09
- Sezione: telefono
- Dove: VII Pack & Riches e III Combattimento, 390x844
- Passi: 1. Pack & Riches → Custom → nome "Mappa", descrizione `Vedi https://example.com/mappe/abcdefghij…` (un link di ~180 caratteri) → Add. 2. Guarda la larghezza della pagina.
- Atteso: il testo va a capo (`overflow-wrap:anywhere`), nessuno scroll orizzontale.
- Ottenuto: `scrollWidth` 1.054 px dall'interfaccia (1.400 px con un link di 200 caratteri). Stessa cosa con un nome di attacco di 80 caratteri senza spazi (Combattimento 1.291 px), un nome di oggetto (Zaino 1.325 px), una nota di attacco con link (1.365 px), e con specie o sottoclasse homebrew di 80 caratteri (tutti i capitoli ~1.190–1.290 px; lo scaffale `.hero` è largo 1.225 px). Note e talenti invece vanno a capo bene.
- Console: nessun errore.
- Test: `telefono` "B-019 …" (2 test).

### B-021 [alta] Level up: aumento dei punteggi o talento solo al livello 4: mancano 8, 12, 16 (Guerriero 6 e 14, Ladro 10) per tutte le classi
- **Risolto 2026-11-10** in [b5f0d49](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/b5f0d49): `levelPlan` legge anche la tabella della classe SRD (`srd.tbl[N-1].f`), quindi "Ability Score Improvement or feat" compare a 4, 8, 12, 16, Guerriero anche 6 e 14, Ladro anche 10, pure nella classe aggiunta in multiclasse. Verificato portando 1→20 Guerriero (6 aumenti + Epic Boon), Ladro a 390 px (5 + Epic Boon) e Mago (4 + Epic Boon). Test `levelup` B-021 (4) ora passano.
- Trovato da: power user · 2026-11-09
- Sezione: level up/multiclasse
- Dove: Level up (finestra "reaches level N"), 1440x900 e 390x844, tutte le 12 classi SRD e anche nelle multiclassi (Wizard 7 → 8)
- Passi: 1. Paladino di livello 7 (o Guerriero 5, Ladro 9, qualsiasi classe 11 o 15). 2. Level up.
- Atteso: la sezione "Ability Score Improvement or feat" con +2, +1/+1 e talento, come al livello 4 (regole 2024: livelli 4, 8, 12, 16; Guerriero anche 6 e 14; Ladro anche 10; Epic Boon al 19).
- Ottenuto: la sezione manca: si diventa livello 8 senza poter scegliere nulla. Provato con tutte le 12 classi dal livello 1 al 20: la scelta compare solo al 4 e al 19 (Epic Boon). Un eroe portato al 20 nell'app perde 3 aumenti (5 il Guerriero, 4 il Ladro). Causa probabile: `levelPlan` (index.html ~3420) cerca "Ability Score Improvement" in `clsInfo(v).f`, dove ogni privilegio compare una volta sola (al primo livello, 4); i livelli successivi sono solo nella tabella `srd.tbl[N-1].f`, che ha `"f":["Ability Score Improvement"]` agli 8, 12, 16. Le classi homebrew invece funzionano (usano `ASI_LEVELS`).
- Console: nessun errore.
- Test: `levelup` "B-021 …" (2 test).

### B-022 [media] Level up: +2 a Costituzione non alza i PF massimi dei livelli precedenti
- **Risolto 2026-11-10** in [b5f0d49](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/b5f0d49): quando il modificatore di Costituzione cambia (aumento o Epic Boon nel level up, pulsanti + e − negli Attributi) i PF massimi e attuali cambiano di (differenza del modificatore × livello totale), come dalle regole 2024. Paladino 3 Cos 14 → 16 al livello 4: 28 → 40. Il toast lo dice ("+12 HP (+4 from Constitution, all levels)", "Max HP +5…"). Test `levelup` B-022 ora passa.
- Trovato da: power user · 2026-11-09
- Sezione: level up/multiclasse
- Dove: Level up (livello 4, Ability Score Improvement), 1440x900
- Passi: 1. Paladino 3, Cos 14, PF 28/28. 2. Level up → PF medi → "+2 to Constitution" → Become level 4.
- Atteso: PF massimi 40 (regole 2024: quando il modificatore di Costituzione cambia, i PF massimi cambiano come se lo avessi avuto dal livello 1: 10 + 3 × 6 + 4 × 3).
- Ottenuto: PF massimi 36 (+8 calcolato con la Cos vecchia, nessun +1 per livello precedente). Il toast dice "+8 HP · CON +2". Stessa cosa con +1/+1 su Costituzione al livello 12 e con il pulsante "Raise Constitution" negli Attributi (Valeria 15 → 16: PF restano 32/32, nessun avviso). `applyLevelUp` (index.html ~3470) calcola `con` prima di applicare l'aumento e non ricalcola i PF.
- Console: nessun errore.
- Test: `levelup` "B-022 …".

### B-025 [bassa] Level up: un talento non ripetibile già preso viene offerto e preso di nuovo
- **Risolto 2026-11-10** in [b5f0d49](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/b5f0d49): la lista dei talenti del level up toglie quelli che l'eroe ha già, salvo quelli ripetibili (`rep`, SRD e homebrew con "Repeatable"). Vale anche per gli Epic Boon. Test `levelup` B-025 ora passa.
- Trovato da: power user · 2026-11-09
- Sezione: level up/multiclasse
- Dove: Level up (livello 4, scelta "Feat"), 1440x900
- Passi: 1. Valeria (ha già Alert e Savage Attacker). 2. Level up → Feat → Alert → Become level 4.
- Atteso: Alert e Savage Attacker non compaiono nella lista (solo i talenti ripetibili, come Skilled o Magic Initiate, possono tornare).
- Ottenuto: compaiono e vengono aggiunti: Valeria ha due volte Alert ("Human (Versatile)" e "Level 4") e il toast dice "+9 HP · Alert". Stesso comportamento con un talento homebrew senza "Repeatable" (preso al 4 e all'8). `featList` (index.html ~3435) non toglie i talenti già presi.
- Console: nessun errore.
- Test: `levelup` "B-025 …".
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
- 2026-11-10 · distruttore · Sessione serale sulla correzione del Level up (Playwright/Chromium, server locale = main 4452eb8, identico al live). Suite completa 179/186: falliscono solo i test dei bug aperti B-014, B-016 (×2), B-017, B-018, B-023, B-024; B-020 oggi passa (3,9 s, nessun commit lo tocca: probabile macchina più veloce, resta aperto). La PR di B-016 di stasera non c'è ancora, quindi niente da verificare sulle tre schede. **Correzioni di stamattina reggono**: tutte le 12 classi portate 1 → 20 dal Level up con +1/+1 a ogni scelta: aumenti a 4, 8, 12, 16 (Guerriero anche 6 e 14, Ladro 10) ed Epic Boon a 19, PF finali esatti (Barbaro 183, Mago 126 da 12 PF iniziali); multiclasse a tre Fighter 3 → Rogue 4 / Wizard 4 con aumenti al 4° livello di ciascuna classe e +2 Cos che alza i PF di 11 (91 esatti); Alert già preso non offerto; Magic Initiate e Skilled (ripetibili) offerti. Import di eroi già al 20 con multiclasse oltre 20 o negativa: livelli riportati a 20, nessun pulsante Level up, nessun errore. Tecniche nuove: Costituzione 10 → 1 → 30 → 10 coi pulsanti (**B-026**); scelta "+2" al 19 (**B-027**); righe della multiclasse cambiate in una classe già presente (**B-028**); solo tastiera dentro la finestra Level up (**B-029**); 320x640 e 720x450 (zoom 200%) su tutti i capitoli e nella finestra: nessuno scroll orizzontale; Esc chiude. Controllo leggero sulle sezioni verdi: suite verde. Console pulita in tutte le prove.
- 2026-11-10 · tester extra · Sessione pomeridiana sulle correzioni di oggi (Playwright/Chromium, server locale = main 4452eb8, identico al live: stesso `index.html` e `CACHE` di sw.js). **Level up**: B-021 regge in tutti i casi provati: Guerriero 1→20 a 390x844 (aumenti a 4, 6, 8, 12, 14, 16 + Epic Boon al 19, nessun talento ripetuto), multiclasse Mago 7 / Guerriero 5 (8 e 6 entrambi con la scelta), Guerriero 3 / Ladro 9 (Ladro 10 e Guerriero 4 ok). B-022 regge: Cos 15 → 17, 19 → 20 (solo +1 di modificatore), 20 → "already 20" (nessun cambio), +1/+1 su For e Cos, PF tirati con eroe ferito e PF temporanei (temporanei intatti), multiclasse livello 13 (+13). B-025 regge: talenti già presi tolti anche scritti in minuscolo o con uno spazio finale; Skilled e Magic Initiate restano. Confermati B-026 e B-027 del distruttore con casi in più; nuovo **B-031** (Grappler senza +1). **Telefono**: i casi di B-019 reggono (Zaino, nome e note degli attacchi, scaffale) e "Roll"/"Become level" sono 44 px; ma testo lungo senza spazi allarga ancora Combattimento, Tratti, Incantesimi e Incontro (**B-030**). Nella finestra Level up a 390 px i `select` sono alti 33 px e le righe dei radio 23–33 px, come i `select` delle pagine: non registrato come bug. Suite completa 179/186 come dopo il commit del designer (nessuna regressione), più 4 test nuovi che oggi falliscono (B-026 eroe ferito, B-030 ×2, B-031). Console pulita in tutte le prove.
- 2026-11-10 · distruttore · Seconda sessione serale, sulle correzioni del frontend sera (Playwright/Chromium, server locale = main b8462eb, identico al live). Suite completa **186/194**, nessuna regressione: B-026 e B-028 passano; rossi solo B-014, B-016 ×2, B-018 (test vecchio che cerca Import in Combattimento), B-023, B-024, B-027 (PR #14 non unita), B-029. B-016 e B-024 non verificabili: la sessione backend è più tardi. **B-026 regge** nel giro − / + puro, anche con cura o riposo lungo nel mezzo; si rompe con un danno o un Level up nel mezzo (**B-032**). **B-028 regge** nel menu della riga e all'import (test B-028 e prova a mano con Fighter 3 / Rogue 1), ma il menu della classe principale offre ancora le classi della multiclasse (**B-033**). Tecniche nuove: classe homebrew da Markdown usata in multiclasse e poi cancellata, eroe importato con classe/specie/background sconosciuti (**B-034**: i menu mostrano la prima voce; Level up e capitoli senza errori); numeri in notazione `1e3`, `2.9`, `0x10`, `-0`, 20 cifre nei campi Max HP e monete (**B-035**); Max HP riscritto a tastiera (Ctrl+A, cancella, 35): PF attuali intatti; doppio clic su "Become level" con tre classi: un solo livello. Telefono 390x844 con tre classi su 5 capitoli e nella finestra Level up: nessuno scroll orizzontale. Console pulita in tutte le prove.
- 2026-11-10 · power user · Sessione serale sui riposi e sul backup (Playwright/Chromium, server locale = main e9629ca, identico al live). Suite completa **186/198**, nessuna regressione: rossi solo i bug aperti (B-014, B-016 ×2, B-018 test vecchio, B-023, B-024, B-027 in PR #14, B-029, B-032…B-035). **Party di 4** (Guerriero 5 Champion, Chierico 6 Life, Bardo 5 Lore, Monaco 5 Open Hand) per **3 incontri con 2 riposi brevi**: 60 colpi di danno, PF temporanei, cure, 8 Dadi Vita spesi, 4 slot, condizioni Poisoned e Prone, poi riposo lungo e ricarica (0,64 s, dati identici). Dopo ogni riposo breve: Second Wind 0/3, Channel Divinity 0/3, Bardic Inspiration 0/3 (B-023 confermato), Focus Points 5/5 (giusto); stesso difetto per Rage, Wild Shape e Channel Divinity del Paladino (aggiunto a B-023); slot del Patto del Warlock tornano (giusto); riposo lungo rimette PF, Dadi Vita, slot, risorse. Tiri contro la morte: un danno a 0 PF azzera i fallimenti (**B-036**), cura dall'Incontro li lascia accesi (**B-037**), danno massiccio non segnalato. **Backup**: 20 eroi pesanti (30 oggetti, storia da 2.800 caratteri) + 22 copie (5 eroi duplicati a catena ×3, 7 copie singole), 4 rinominati con accenti, 3 cancellati = 39 eroi; Export all 256 KB; ripristino in un tomo vuoto 0,19 s ma **38 su 39**: due copie identiche dello stesso originale contano come una (aggiunto a B-024); secondo ripristino dello stesso file: nessun doppione. **Telefono 390x844** con i 39 eroi: 8 capitoli 50–100 ms, cambio eroe mediana 24 ms (max 88), scrollWidth 390 ovunque. Numeri: danno 25 ms mediana (max 64), Duplicate 13–17 ms, ricarica con 39 eroi 0,69 s, localStorage 209.000 caratteri (~5.300 a eroe pesante), memoria JS 9,5–11,3 MB. Console pulita in tutte le prove.
- 2026-11-11 · distruttore · Sessione serale su riposi, morte e XSS (Playwright/Chromium, server locale = main 3efdbe5). Suite `combattimento` 33/33: **B-023 e B-036 reggono**. Provati: 12 riposi brevi di fila su Guerriero 10 / Chierico 5 con contatori anomali; danni 1, 10, `1e1`, 9.999.999.999 con PF temporanei e fallimenti già segnati (nessun fallimento oltre 3, cura azzera, PF temporanei ok, nessun errore); danno massiccio solo segnalato (scelta del team, non registrato). **XSS**: 19 campi × 4 payload (`<img onerror>`, `"><svg onload>`, `javascript:` Markdown e HTML) su tutti i capitoli: escapati tutti tranne `q` e `condDur` (**B-039**, alta) e `res` non ripulito (**B-038**, bassa). Un 404 in console sull'avvio con eroi seminati non è dell'app (risorsa mancante del server di prova), da ricontrollare. Sezioni verdi non toccate.
- 2026-11-11 · power user · Serata di gioco con l'Incontro e scaffale con 33 eroi (Playwright/Chromium, server locale = main 069b1e6). Party di 4 livello 5 (Guerriero, Mago, Ladro, Chierico) con 3 creature personalizzate: setup dell'incontro 1,1 s, danno dal tracciatore 16 ms; un eroe da 30 PF a 0 con 35 danni (0 PF, nessun fallimento: giusto), altro danno a 0 PF = 1 fallimento (B-036 regge), cura di 6 PF dal tracciatore: PF 6 ma fallimenti ancora 1 (B-037 ancora aperto); 50 danni a un eroe da 44 PF: 0 PF, nessuna morte istantanea (l'eccesso è sotto i PF massimi, giusto); ricarica a metà incontro: round, turno e 7 combattenti intatti; svuotato l'incontro e rifatto con gli stessi 4 eroi, 8 turni → round 3 senza errori; riposo breve a 0 PF lascia i tiri contro la morte (regola), riposo lungo li azzera. **Scaffale con 33 eroi** (1440 e 390 px): barra filtro visibile, "zara" → 11 di 33, "xyz" → "No hero matches" con "＋ New hero", ordine per nome/ultimo usato/manuale, cambio eroe da filtro attivo 66–73 ms; a 1440 lo scaffale scorre dentro sé stesso (7.410 px in 1.286), a 390 va a capo (scrollWidth 390, nessun scroll della pagina): **B-014 regge**. Ricarica con 33 eroi 0,6–0,65 s, localStorage 17.100 caratteri (eroi leggeri), memoria JS 18 MB. L'ordine scelto non sopravvive alla ricarica (**B-040**). Console pulita in tutte le prove.
- 2026-11-12 · distruttore · Sessione serale sulla sicurezza dell'import (Playwright/Chromium, server locale = main 7adeed5). **B-039 e B-038 non sono ancora corretti** (il backend non è passato): `robustezza` B-039 ×2 rossi come previsto. Sonda sistematica su un eroe importato: ognuna delle 87 foglie dell'eroe (nome, note, oggetti, attacchi, talenti, incantesimi, monete, `res`, `condDur`…) sostituita a turno con `<img onerror>` e visitati tutti i capitoli → eseguono codice solo `inventory.*.q` e `condDur.*` (B-039), nessun campo nuovo, nessun errore JS. Import homebrew Grimoire con `<img onerror>` in 60 chiavi × 11 categorie, poi Workshop e Biblioteca → ripulito da `checkBrew`, nessuna esecuzione. **Biblioteca, import 5etools: trovato B-041 [alta]** (level, school, roll.exact/min/max, str, chiavi di `daily`/`spells`, slots eseguono codice, resta in IndexedDB), test scritto. Non provati per tempo: Markdown homebrew, import da URL, 5etools `table`/`list` annidati più a fondo.
- 2026-11-12 · power user · Sessione serale sul Level up/multiclasse, sul backup e sull'Incontro (Playwright/Chromium, server locale = main f3c56ce). Sezioni `levelup`, `importexport`, `incontro`, `caratteristiche`: 71/75, falliscono solo i test dei bug già aperti (B-031, B-033 e due altri già elencati), nessuna regressione. **Eroe 1 → 20 in tre classi** (Fighter 9 / Rogue 4 / Wizard 7 con +1/+1 ad ogni scelta, sottoclassi Thief ed Evoker): 19 level up di fila, livello sempre quello atteso, aperture+conferma 120–480 ms (mediana ~220 ms), PF finali 184, Costituzione 19, Forza 20 (tetto rispettato), console pulita. **Telefono 390x844 con 24 eroi pesanti** (20 oggetti ciascuno): 15 Duplicate (mediana 68 ms, max 159), 10 cancellazioni (102 ms, max 146), 10 rinomine con accenti (28 ms), 20 danni/cure (58 ms, max 145), riposo breve e lungo ok; "Export all" di 29 eroi 70 KB e ripristino in un tomo con un eroe: 630 ms, 30 eroi, nessuno mancante, nessun doppione; ricarica 0,6 s, localStorage 47.300 caratteri (~1.600 a eroe), memoria JS 13,6 MB, scrollWidth 390. **Incontro**: eroi aggiunti al tracciatore, poi uno cancellato dal tomo (la riga sparisce, nessun errore), un altro rinominato (nome aggiornato nel tracciatore), 15 turni di fila fino al round 6 senza errori. Nessun problema nuovo; B-037 ancora aperto (test rosso). Console pulita in tutte le prove.
- 2026-11-13 · distruttore · Sessione serale sulla sicurezza dell'import dopo le correzioni (Playwright/Chromium, server locale = main 69a3e3a). Suite completa 243/247: rossi solo B-031, B-032, B-033, B-034. **B-039 e B-038 reggono**: eroe importato con ogni foglia (valori) e poi con ogni chiave di inventario/condDur/res/slots/note avvelenata con `<img onerror>`, tutti i 10 capitoli visitati → nessuna esecuzione, nessun errore. **B-041 regge solo in parte**: pacchetto 5etools con ogni campo avvelenato (spell, monster, item, feat, race, background, class, subclass, features, condition, rules, deity, baseitem; 14 categorie) → eseguono ancora `page` (riga della fonte, 3 categorie) e `passive` (mostri): **B-042** [alta], test scritto. Altre tecniche: localStorage cancellato mentre l'app è aperta e poi una modifica (riscrive tutti gli eroi dalla memoria, nessun errore); import eroe con JSON troncato, vuoto, solo spazi, `[`, livello 1e20/PF NaN/For -5/Des 1e999 (accettato e ripulito, nessun errore nei capitoli) e nome da 3 MB (rifiutato, finestra aperta senza messaggio chiaro: non registrato). B-016 non riprovato per tempo. Console pulita (solo il 404 del server di prova). Sezioni verdi: suite verde.
- 2026-11-13 · power user · Sessione serale su Robustezza, Import/export, Level up/multiclasse ed Eroe (Playwright/Chromium, server locale = main 1d661a4). **Homebrew sugli eroi**: classe Artificer importata da .md (artificer-armorer), usata come classe principale a livello 5 (slot 4/2, mezzo incantatore, giusto); **multiclasse a tre classi** Fighter 4 / Wizard 5 / Artificer 3: livello totale 12, slot 4/3/3/1 (livello incantatore 7: giusto), poi 3 level up di fila a livello 15 con PF 32 → 56 (+8 a livello), console pulita. **XSS dall'homebrew**: file homebrew con `"><img onerror>` in ogni campo di testo di tutte le categorie (le voci con selezioni non valide sono scartate dalla verifica; entrate 4: sottoclasse, talento, specie, oggetto), usate su un eroe e aperte in Workshop, Biblioteca ed Eroe: nessun codice eseguito. **Scaffale da telefono (390x844, tocco)**: 40 eroi dal wizard (mediana 355 ms, max 440), 15 duplicati (87 ms, max 115), 15 rinomine con HTML e accenti (51 ms), 15 cancellazioni con conferma (308 ms), 43 eroi → localStorage 38.800 caratteri; livello 5 dal Level up, 30 danni/cure di fila (83 ms, max 276), 20 dadi (42 ms), 5 riposi brevi + lunghi: PF tornati al massimo, scrollWidth 390. **Backup**: Export all 43 eroi 55 KB, import in un tomo con un eroe 605 ms → 44 eroi, nomi e livelli uguali; secondo import dello stesso file → "già nel tomo", nessun doppione; ricarica 0,73 s, localStorage 40.400, memoria JS 9,4 MB, cambio capitolo 124–195 ms. Un problema nuovo: **B-043** (robustezza, bassa: homebrew con `sc` oggetto). B-042 ancora aperto. Console pulita altrove.
- 2026-11-14 · distruttore · Sessione serale sull'import dopo le correzioni di B-042/B-043 (Playwright/Chromium, server locale = main a188552). **B-042 e B-043 reggono**: 8 tipi di voce 5etools (incantesimi, mostri, oggetti, talenti, specie, background, tratti di classe/sottoclasse) con ogni campo sostituito da 16 valori strani (HTML con onerror, `toString`, array, oggetti, numeri, null, 200.000 caratteri, tabelle/liste annidate) e homebrew JSON (ogni campo di ogni tipo × 8 valori): nessun codice eseguito. Trovato invece il blocco dell'avvio: **B-044 [alta]** (`source` come oggetto con `toString` → app morta a ogni ricarica), **B-045** (campi del tipo sbagliato, es. `ac: 15`, la voce non si apre), **B-046** (ricerca rotta con `source` non testuale), **B-047** (import homebrew silenzioso, resto di B-043). Test rossi B-044/045/046 in robustezza. Non provati stasera: sezioni verdi, due schede, offline.
