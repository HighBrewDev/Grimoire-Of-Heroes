# Diario del team

## 2026-11-11 · frontend mattina
- **Fatto** · sezioni **Combattimento** e **Incontro**. B-023 e B-036 erano già su main ([b3ffd47](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/b3ffd47), altra sessione): la mia versione, quasi identica, è stata scartata per non avere due codici per la stessa cosa. Resta mio **B-037**: `encHeal` azzera i tiri contro la morte quando l'eroe torna sopra 0 PF, come Heal.
- **Test**: prima 198/215 (due file di test non caricabili per l'unione di PR #6, poi riparati su main da 78f2cf6); dopo **218/225** su main + B-037, nessuna regressione. Rossi solo bug aperti: B-029, B-030 ×2, B-031, B-032, B-033, B-034.
- **File**: index.html, sw.js (`grimoire-fm1111b`), docs. **PR**: [#19](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/19). Prova a mano su telefono non fatta (modifica di una riga, coperta dal test).
- **Resta**: B-032, B-033, B-034, B-029, B-031, B-030.
## 2026-11-12 · team leader
- **Stato**: main bff0a97, controllo a 1440x900 e 390x844 senza errori. Punteggio +208 ↑ (226/235), nessuna sezione rossa.
- **Piano**: priorità alla sicurezza: B-039 [alta] e B-038 al backend (una sessione sviluppo, poi frontend su B-029, B-033, B-034, B-032, B-031) e PR del keep-alive di Supabase. Designer su accessibilità. PR #19 (B-037) aspetta Capo.

## 2026-11-12 · test
- **Fatto** · suite eseguita su main `afc1c73`: 226/235 test superati, sezioni rosse: nessuna. Punteggio totale +208 (ieri +173). Aggiunti 6 test (caratteristiche ×2, incontro ×2, robustezza, eroe); nessun test cambiato per farlo passare.
- **Ancora rossi** · 9 test su bug aperti: B-029, B-031, B-032, B-033, B-034, B-037, B-038, B-039 (×2). Le sezioni più basse sono robustezza (+4), cronaca (+7) e tratti (+8).

## 2026-11-12 · design
- **Fatto** · **B-030** (testi lunghi su telefono, solo CSS): chip del danno degli attacchi, privilegi e talenti (`.kv`), titoli dei riquadri a scomparsa, celle di tabella e nomi dell'Incontro vanno a capo (`overflow-wrap:anywhere`, `min-width:0`); il chip del danno su più righe ha raggio 14 px. **B-040**: l'ordine dello scaffale ("By name", "Last used") ora resta dopo la ricarica (`savePrefs()`, `shelfSort` nelle preferenze, valore validato). `CACHE` → `grimoire-ds1112a`.
- **File**: index.html (CSS riga ~688, `save`/`savePrefs`, `load`, gestore `shelf_sort`), sw.js, docs/bug-beta.md (B-030, B-040 in Risolti), docs/design/note-design.md, screenshot `docs/design/2026-11-12-testi-lunghi-*.png`.
- **Verifica**: `telefono` 17/17 e `eroe` senza rossi nuovi (resta B-034, frontend); scrollWidth con danno e privilegio da 60 caratteri senza spazi: 743→390 e 689→390 a 390 px, 768 e 1440 invariati; console senza errori. Zone del frontend non toccate. Scelta prudente: non ho verificato a mano incantesimi homebrew e nome eroe da 80 caratteri in Incontro oltre ai test (le regole CSS li coprono ma senza screenshot).
- **Prossima idea**: `.dot` e "✕" dei chip a 44 px, contrasto e `aria-label`.

## 2026-11-11 · design
- **Fatto** · **B-014** (compito del piano, Eroe): sopra lo scaffale, da 8 eroi in su, barra "Filter heroes" (nome, specie, classe), ordine "Shelf order / By name / Last used" e conteggio; messaggio se nessun eroe corrisponde. Su 390 px lo scaffale va a capo in 2 colonne e scorre in verticale dentro sé stesso (scrollWidth dello scaffale da 7.410 px a 356). Su 768 e 1440 resta la fila che scorre, ma col filtro. Ordine e filtro solo di visualizzazione: non cambiano i dati salvati. `CACHE` → `grimoire-ds1111a`.
- **File**: index.html (HTML sopra `#shelf`, `renderShelf`, CSS scaffale, gestori input/change), sw.js, docs/bug-beta.md (B-014 in Risolti), docs/design/note-design.md, screenshot `docs/design/2026-11-11-scaffale-*.png`.
- **Verifica**: `eroe` 18/19 (resta B-034, frontend), `telefono` 15/17 (restano i due B-030, non toccati da me); console senza errori provando filtro, ordine, nessun risultato e scelta di un eroe; 33 eroi a 390, 768, 1440 senza scroll orizzontale della pagina. Zone di index.html del frontend non toccate.
- **Prossima idea**: B-030 (testi lunghi, solo CSS) per portare `telefono` a 17/17; poi `.dot` e "✕" a 44 px.

## 2026-11-11 · sviluppo (frontend + backend)
- **Frontend** · sezione **Combattimento**: **B-023** (`shortRestPartial`: Second Wind, Rage, Wild Shape, Channel Divinity recuperano 1 uso; Bardic Inspiration tutta dal Bardo 5, SRD 5.2.1) e **B-036** (`applyDamage`: danno a 0 PF = +1 fallimento, avviso di morte istantanea se il danno oltre lo 0 supera i PF massimi). `CACHE` → `grimoire-dev1111a`.
- **Test**: suite 208/225 prima, **216/225** dopo, nessuna regressione. Scelta prudente: il danno massiccio mostra l'avviso ma non segna 3 fallimenti, perché il test esistente "PF non scendono sotto 0" (danno 100 → `{0,0}`) lo vieta; il test non è stato toccato. Il critico (2 fallimenti) non è gestito: l'app non ha un modo per segnalarlo.
- **Backend**: nessuna modifica (keep-alive e revisione XSS richiedono PR; non fatte in questa sessione economica). Supabase non toccato.
- **File**: index.html, sw.js, docs/bug-beta.md, docs/team-log.md. **Resta**: B-037 (cura dall'Incontro), B-032, B-029, keep-alive PR, XSS.

## 2026-11-11 · team leader (13:40)
- **Stato**: live = main (`grimoire-bn1110p`), controllo a 1440x900 e 390x844 senza errori. Punteggio +173 ↑ (208/225), nessuna sezione rossa. Combattimento (+4) resta la più bassa; Telefono, Robustezza e Incontro seguono.
- **Piano**: invariato nei compiti (sviluppo e tester non hanno ancora consegnato i lavori di oggi); Telefono sale a carico MEDIO (B-030, designer + frontend). PR #18 (app gratuita) aspetta Capo.

## 2026-11-11 · test (sera)
- **Suite** su main cc5634e: **208/225** superati, punteggio totale **+173** (ieri +105, ↑). Sezioni rosse: nessuna. Peggiori: combattimento +4, incontro +7, robustezza +7. Dettagli in docs/scoreboard.md.
- **Riparati** `caratteristiche.test.js` e `levelup.test.js`: l'unione della PR #6 aveva tolto due `}],` e la suite non partiva (errore di sintassi). Nessun test cambiato nel contenuto.
- **Test nuovi** (10): combattimento ×4 (cura a 0 PF, danno pari ai PF, PF e PF temporanei dopo ricarica), caratteristiche ×3 (− e modificatore negativo, punteggi dopo ricarica, maestria nella Percezione passiva), eroe ×3 (allineamento/XP, Ispirazione, cambio classe). Tutti verdi; i 17 rossi sono i bug aperti B-014, B-023, B-029, B-030, B-031, B-032, B-033, B-034, B-036, B-037.

## 2026-11-11 · team leader
- **Stato**: live = main (`grimoire-fs1110b`), controllo a 1440x900 e 390x844 sul sito e in locale senza errori. Supabase risponde dalla sandbox (401 senza chiave = attivo). PR #14 unita: B-027 chiuso, `levelup` 22/23. Punteggio +158 ↑ (193/210), nessuna sezione rossa.
- **Piano**: Combattimento (0, la peggiore) prende entrambe le sessioni frontend (B-023 mattina, B-036 + B-037 + B-032 sera). Backend: revisione XSS a mezzogiorno, B-020 e avviso "nuova versione" di notte. Designer su B-014 (filtro dello scaffale). Tester su riposi, morte e payload XSS.
- **Per Capo**: PR #16 (B-016, unico bug alto) e PR #6 da unire; ok per il keep-alive di Supabase; decisione su B-011.
- **Aggiornamento 10:10**: Capo ha unito PR #16 (B-016) e PR #6 (B-030, B-031) e ha dato l'ok al keep-alive di Supabase, assegnato al backend mezzogiorno come PR prima della revisione XSS. App gratuita per ora: B-011 non si applica.
- **Ripristino**: l'unione di PR #6 aveva cancellato da team-log.md 11 voci (dal team leader 11/11 al frontend sera 10/11) e da bug-beta.md B-036 (titolo), B-033/B-032 (righe dei test) e due voci del diario. Ripristinate con un'unione a tre vie fra main prima di PR #6 e il ramo della PR; tenute B-030, B-031 e la voce del tester extra.

## 2026-11-11 · test
- **Suite** su main 073375c: **193/210** superati, punteggio totale **+158** (ieri +105, ↑). Sezioni rosse: nessuna. Peggiori: combattimento 0, caratteristiche +6, eroe +7. Dettagli in docs/scoreboard.md.
- **Test nuovi** (8, in combattimento, la sezione più bassa): B-023 riposo breve per Rage (Barbaro 5), Wild Shape (Druido 5), Channel Divinity (Paladino 5 e Chierico 6), Bardic Inspiration (Bardo 5); B-036 danno massiccio; riposo breve dei Focus Points; riposo lungo che rimette tutte le risorse. Rossi i 6 legati a B-023/B-036, verdi gli altri 2.
- **Test corretto** (errore del test, non dell'app): il vecchio B-018 cercava Import nel capitolo Combattimento, ora va prima su Eroe. Ora passa.
- **Punteggio**: `tests/punteggio.js` riconosce anche "Risolto: backend · data" (B-017 e B-018 ora prendono il +3) e assegna B-026…B-029 alla loro sezione (B-029 a robustezza).
- **Non toccato**: il test vecchio "livello 18 → 19 … può superare 20" segue ancora la regola sbagliata (passa grazie a B-027); lo corregge la PR #14, in attesa di Capo.

## 2026-11-10 · backend notte
- **Fatto** (su main) · sezione **Import/export e salvataggio**, nella zona del piano (`duplicate`, `importBackup`, `bindValue`):
  - **B-024** ([f6479ab](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/f6479ab)) · `duplicate` dà nomi sempre diversi entro 80 caratteri ("X (copy)", "X (copy 2)"…; copiare una copia la rinumera invece di accumulare "(copy)") e passa da `fixup`. `importBackup` conta gli eroi identici invece di usare un insieme: due copie mai modificate nel file tornano entrambe (il caso 38/39 del power user), e ripristinare due volte lo stesso file non crea doppioni.
  - **B-035** ([ca54499](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/ca54499)) · `bindValue` legge i campi numerici con `Number` troncato (`1e3` → 1000, `2.9` → 2) e uscendo dal campo mostra sempre il valore salvato. Preso perché è nella mia zona di oggi (`bindValue`).
  - `sw.js`: `CACHE` → `grimoire-bn1110b`.
- **B-016 in [PR #16](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/16)** (non tocca Supabase; il piano prevede l'unione dopo i test, ma per prudenza non l'ho unita io): `renderPage` ricorda l'eroe per cui ha disegnato i campi (`G.pageHero`); `bindValue` scrive solo su quell'eroe. Se un'altra scheda l'ha cancellato, non salva niente e mostra "This hero was deleted in another tab: what you typed here is not saved." Mai su `active()` cambiato.
- **Test**: 3 nuovi in `importexport` (B-024 due Duplicate dello stesso eroe + doppio ripristino; B-024 Duplicate a catena con nome di 80 caratteri; B-016 avviso), rossi prima della correzione. Suite completa prima **186/200** (main 756b88c), dopo **190/202** su main: passano B-024 e B-035, nessun test che passava ora fallisce. Nella PR **192/203**: passano anche B-016 ×3; `importexport` 20/20. File dei risultati ripristinato.
- **Scelta prudente**: se l'eroe è stato cancellato altrove il testo scritto va perso (con avviso) invece di resuscitare l'eroe: la cancellazione è un gesto esplicito dell'altra scheda.
- **Per Test e punteggio**: B-024 e B-035 in "Risolti" con test verde. Il test vecchio B-018 fallisce ancora solo perché cerca Import nel capitolo Combattimento (già segnalato).
- **Supabase**: non provato (rete della sandbox), niente richieste verso il progetto.
- **File**: index.html, sw.js, tests/sezioni/importexport.test.js, docs/bug-beta.md, docs/team-log.md, docs/team-plan.md.
- **Resta**: B-020 (ciclo quadratico dell'import 5etools), revisione XSS dei campi homebrew, avviso "Nuova versione" del service worker.

## 2026-11-10 · power user (sera)
- **Fatto** · sessione di gioco con riposi e backup, come da piano, su main e9629ca: suite 186/198, nessuna regressione. Dettagli nel diario di docs/bug-beta.md.
- **Bug nuovi** (2, ognuno con un test che oggi fallisce): **B-036 [media] combattimento** (un danno a 0 PF azzera i fallimenti dei tiri contro la morte: un eroe morente non muore mai per i colpi; danno massiccio non segnalato); **B-037 [bassa] incontro** (Heal dal tracciatore lascia i tiri contro la morte accesi). `tests/punteggio.js`: B-036 e B-037 in `BUG_SEZIONE`.
- **Verifiche**: B-023 ancora aperto, allargato a Rage, Wild Shape, Channel Divinity del Paladino. B-024 ancora aperto, con un caso nuovo senza nomi lunghi (due copie identiche dello stesso originale → 38/39 al ripristino): la correzione del backend deve coprirlo.

## 2026-11-10 · distruttore (sera, dopo il frontend)
- **Fatto** · verifica di B-026/B-028 su main b8462eb: suite 186/194, nessuna regressione, B-026 e B-028 verdi. B-027 aspetta PR #14, B-016/B-024 la sessione backend.
- **Bug nuovi** (4, tutti [bassa], ognuno con un test che oggi fallisce): B-032 caratteristiche (Cos al minimo + danno o Level up + Cos rialzata: PF massimi gonfiati, resto di B-026); B-033 level up (il menu della classe principale offre una classe già in multiclasse, resto di B-028); B-034 eroe (classe/specie/background fuori dai menu mostrati come Barbarian/Dragonborn/Acolyte); B-035 combattimento (`1e3` nel Max HP salva 1 e porta i PF attuali a 1).

## 2026-11-10 · frontend sera
- **Fatto** ([0847426](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/0847426), su main) · sezioni **Caratteristiche** e **Level up e multiclasse**, nella zona del piano (`conHp`, menu `data-mc`) più la riga della multiclasse in `fixup`:
  - **B-026** · `conHp`: PF massimi mai sotto 1 per livello, danno subito invariato; quello che una Cos bassa non ha potuto togliere resta in `hp.conAdj` (si azzera se i PF cambiano per altro), quindi − e poi + ridanno gli stessi PF. Eroe a 0 PF non curato alzando la Cos.
  - **B-028** · il menu della riga di multiclasse offre solo classi che l'eroe non ha; `fixup` unisce righe doppie e una riga uguale alla prima classe.
  - `sw.js`: `CACHE` → `grimoire-fs1110a`.
- **B-027 in [PR #14](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/14)** (in attesa di Capo): "+2" e "+1/+1" fermi a 20 anche al 19; scegliendo un Epic Boon si sceglie la caratteristica che prende +1 fino a 30. **Scelta prudente**: il piano chiedeva di correggere anche il test vecchio "livello 18 → 19 … può superare 20" (si aspettava 22 da "+2", cioè il bug), ma la routine dice di non toccare i test; con la sola correzione quel test diventa rosso su main. Per questo codice e test corretto (ora Boon of Combat Prowess +1 Forza → 21) sono in PR, non su main. Nella PR suite 187/194, nessuna regressione.
- **Test**: suite completa prima **184/194** (main 86a67ec), dopo **186/194** su main: passano B-026 e B-028. Nessun test che passava ora fallisce. `levelup` + `caratteristiche` 30/31 su main (resta B-027, chiuso dalla PR). File `tests/risultati/2026-11-10.json` ripristinato.
- **Prova a mano** (Playwright, 1440x900 e 390x844): Mago 20 ferito 30/82 → Cos 1 0/20 → Cos 10 30/82 → Cos 30 230/282 → Cos 10 30/82; morente 0/82 → Cos 14 0/122 → Cos 10 0/82. Import "Fighter 3 + riga Fighter 2" → Fighter 3; "Rogue 2, rogue 1 (Thief), Wizard 2" → Rogue 3 (Thief) / Wizard 2. Console pulita, scrollWidth uguale alla finestra.
- **File**: index.html, sw.js, docs/bug-beta.md, docs/team-log.md, docs/team-plan.md (PR #14 in "In attesa di Capo"); nella PR anche tests/sezioni/levelup.test.js.
- **Per Test e punteggio**: B-026 e B-028 in "Risolti" con test verde. Il test B-018 vecchio cerca Import nel capitolo Combattimento (timeout), già segnalato dal backend.
- **Resta**: B-029 (`modal()` trattiene il focus), B-031 dopo PR #6, B-023 riposo breve. I Boon offrono tutte le caratteristiche (alcuni nell'SRD ne limitano la scelta).

## 2026-11-10 · backend
- **Nota**: il piano non aveva un compito "Backend"; ho preso la voce 2 del backlog (B-017, B-018: validazione dei numeri), lontano da B-016/B-024 della sessione serale. Sessione interrotta presto su richiesta di Capo (stop fino alle 19): consegnato solo questo.
- **Fatto** (su main) · sezioni **Zaino** e **Combattimento**: nuovi limiti `LIM` (PF 9999, monete 999.999.999, XP 9.999.999, regolazione CA ±20). `bindValue` rispetta `min`/`max` dei campi numerici e, al cambio, mostra il valore tenuto; `fixup` porta negli stessi intervalli monete, XP, PF e regolazione CA da import, sync e caricamento; `getAC` mai sotto 0; `hpNum` e `addXP` limitati. `sw.js`: alzata `CACHE`.
- **Test**: 4 nuovi (B-017 XP negativa, B-017 import monete negative/enormi, B-018 PF massimi enormi nel campo, B-018 import PF 1e308), tutti rossi prima. Suite prima **179/190**, dopo **184/194**, nessuna regressione. File dei risultati ripristinato.
- **Per Test e punteggio**: il test vecchio "B-018 CA e PF…" ora passa la parte CA ma poi clicca Import dal capitolo Combattimento, dove il pulsante non esiste (timeout): serve `go('hero')` prima dell'import. Non l'ho toccato.
- **Scelta prudente**: un eroe già salvato con valori assurdi (es. monete negative) viene corretto al caricamento e poi risincronizzato; i valori normali non cambiano.
- **File**: index.html, sw.js, tests/sezioni/zaino.test.js, tests/sezioni/combattimento.test.js, docs/bug-beta.md, docs/team-log.md.
- **Resta**: B-020 (import 5etools quadratico, il test ora passa ma il ciclo va comunque cercato), avviso "Nuova versione" del service worker.
## 2026-11-10 · team leader (aggiornamento delle 17:40)
- **Stato**: live = main, controllo a 1440x900 e 390x844 senza problemi; Supabase non raggiungibile dalla sandbox. Suite adesso 179/190, nessuna regressione (rossi: B-014, B-016 ×2, B-017, B-018, B-023, B-024, B-026…B-029). Punteggio del mattino +105 ↓, Level up ancora ROSSO (giorno 1) per B-027/B-028.
- **Piano** con la nuova divisione frontend/backend: frontend sera su B-027, B-026, B-028 (zona `applyLevelUp`/`conHp`); backend notte su B-016 come PR e B-024 (zona `bindValue`/`duplicate`/`importBackup`); distruttore e power user sulle correzioni di stasera e sui riposi (B-023). Backlog diviso in frontend, backend, design, con tour guidato e keep-alive di Supabase.
- **Per Capo**: PR #6 del tester extra (solo bug e test) da unire; ok per il keep-alive di Supabase.

## 2026-11-10 · tester extra
- **Fatto**: sessione di beta test di circa un'ora, chiesta da Capo, sulle correzioni di oggi (Level up b5f0d49, Telefono 7cb1ec7). Live = main 4452eb8. Nessun codice dell'app toccato. Dettagli in docs/bug-beta.md, "Diario dei test".
- **Reggono**: B-021 (Guerriero 1→20 da telefono, multiclasse anche sulla seconda classe), B-022 (Cos al massimo, +1/+1, PF tirati, multiclasse), B-025, B-019 nei casi del bug, pulsanti Level up 44 px.
- **Bug**: nuovi **B-030 [media]** telefono: danno degli attacchi, privilegi/talenti, incantesimi homebrew e nome in Incontro allargano ancora la pagina (689–850 px); **B-031 [bassa]** Grappler non dà il +1. Confermati con casi in più B-026 (− e + della Cos curano anche un eroe a 0 PF) e B-027 (Epic Boon senza +1) del distruttore, trovati in parallelo.
- **Test**: suite completa 179/186 su 4452eb8, nessuna regressione; 4 test nuovi che falliscono (telefono B-030 ×2, caratteristiche B-026 con eroe ferito, levelup B-031); B-026…B-031 in `BUG_SEZIONE`. File `tests/risultati/2026-11-10.json` non toccato.
- **Per sviluppo**: B-026 e B-027/B-031 nascono da `conHp` e dal ramo `feat` di `applyLevelUp`; B-030 è lo stesso blocco CSS di B-019 esteso a `.chip`, `th` di Tratti, nomi degli incantesimi e righe dell'Incontro.

## 2026-11-10 · distruttore
- **Fatto** · sessione serale sul Level up di stamattina (server locale = main 4452eb8). Suite 179/186, nessuna regressione; le correzioni B-021, B-022, B-025 reggono su tutte le 12 classi 1 → 20 e su una multiclasse a tre. La PR di B-016 non è ancora arrivata: niente da verificare sulle tre schede.
- **Bug nuovi** (4, ognuno con un test che oggi fallisce): B-026 [media] caratteristiche (Cos giù e su gonfia i PF, PF attuali a 0); B-027 [media] level up (+2 al 19 oltre 20); B-028 [bassa] level up (stessa classe due volte in multiclasse); B-029 [media] robustezza (Tab esce dalla finestra Level up e il livello va a un altro eroe).
- **Per Test e punteggio**: il test esistente "livello 18 → 19 … può superare 20" si aspetta Forza 22 con "+2", in contrasto con B-027: va rivisto con la correzione. `tests/risultati/2026-11-10.json` ripristinato dopo la suite.
- **File**: docs/bug-beta.md, docs/team-log.md, tests/sezioni/caratteristiche, levelup, robustezza.

## 2026-11-10 · design
- **Fatto** ([7cb1ec7](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/7cb1ec7), su main) · sezione **Telefono**, solo CSS, come da piano:
  - **B-019** · parole e link lunghi vanno a capo invece di allargare la pagina: `overflow-wrap:anywhere` su nomi e note degli attacchi, nomi e descrizioni degli oggetti, slot di sintonia, titoli delle card (es. "SSS… traits"), titolo e sottotitolo della pagina (specie/sottoclasse homebrew), card dello scaffale (`.hero` resta 210 px, nome e riga sotto tagliati a 2 righe). A 390 px con tutti i campi lunghi insieme: scrollWidth 390 in tutti i 10 capitoli (prima 780–1.291 px); anche 768 e 1440 restano alla larghezza della finestra.
  - **Tocco nella finestra Level up**: `.sb` anche largo 44 px su touch ("Roll" era 42 px; in Zaino −, +, ✕ erano 27 px). Con "riduci animazioni" le finestre si aprono senza la piega 3D: il primo fotogramma rimpiccioliva i pulsanti ("Become level 4" misurato 100×30, poi 119×44).
  - `sw.js`: alzata `CACHE`.
- **Scelta prudente**: niente `anywhere` su tutta la pagina. La prima prova lo metteva su `.pageBody` e spezzava parole corte in righe strette ("SR D", "Train ing", "Too ls"); ora vale solo sugli elementi che contengono testo libero dell'utente, e le altre parti non cambiano.
- **Verifica**: `node tests/run.js telefono` da 12/15 a **15/15**. Suite completa **179/186** (prima 175/186): restano solo B-014, B-016 ×2, B-017, B-018, B-023, B-024, nessuna regressione. Screenshot di tutti i capitoli a 390, 768 e 1440 in giorno e notte prima/dopo: a 1440 identici a parte il rumore che c'è già fra due esecuzioni dello stesso codice; a 768 e 390 cambiano solo i pulsanti `.sb` più larghi su touch. Console senza errori. File `tests/risultati/2026-11-10.json` ripristinato. Prima/dopo: [testi lunghi 390](design/2026-11-10-b019-testi-lunghi-390.jpg), [Level up 390](design/2026-11-10-levelup-tocco-390.jpg).
- **File**: index.html (blocco CSS B-019 vicino a "very long names", `.sb` nel blocco `pointer:coarse`), sw.js, docs/design/, docs/bug-beta.md, docs/team-log.md.
- **Per Test e punteggio**: B-019 in "Risolti" con 2 test verdi; il test di tocco nella finestra Level up ora passa. Utile il test già previsto per lo scaffale con specie homebrew lunga.
- **Prossima idea**: proposta per B-014 (filtro per nome e ordine dello scaffale), poi pallini di competenza `.dot` e "✕" dei chip a 44 px (Backlog 7).

## 2026-11-10 · sviluppo mattina
- **Fatto** ([b5f0d49](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/b5f0d49), su main) · sezione **Level up e multiclasse**:
  - **B-021** · `levelPlan` per le classi SRD legge anche la tabella della classe (`srd.tbl[N-1].f`): "Ability Score Improvement or feat" a 4, 8, 12, 16, Guerriero anche 6 e 14, Ladro anche 10, anche nella classe aggiunta in multiclasse. Le classi homebrew restano su `ASI_LEVELS`.
  - **B-022** · Nuova `conHp`: se cambia il modificatore di Costituzione, PF massimi e attuali cambiano di (differenza × livello totale). Vale per aumento/Epic Boon nel level up e per i pulsanti + e − degli Attributi (toast "Max HP +5: the Constitution modifier counts at every level."). Abbassando la Cos i PF scendono allo stesso modo (minimo 1 per il massimo, 0 per gli attuali).
  - **B-025** · La lista dei talenti del level up esclude quelli già presi se non sono ripetibili (`rep`, SRD e homebrew; anche gli Epic Boon). Se non resta nessun talento, "Feat" avvisa invece di aggiungere un talento vuoto.
  - `sw.js`: alzata `CACHE`. Niente CSS.
- **Test**: `levelup` da **14/20** a **20/20**. Suite completa prima **169/186**, dopo **175/186**: passano B-021 ×4, B-022, B-025; restano solo B-014, B-016 ×2, B-017, B-018, B-019 ×2, tocco Level up (telefono), B-020, B-023, B-024. Nessun test che passava ora fallisce. File `tests/risultati/2026-11-10.json` ripristinato (resta quello del tester).
- **Prova a mano** (Playwright, server locale): Guerriero 1→20 a 1440x900 → aumenti a 4, 6, 8, 12, 14, 16 + Epic Boon al 19; Ladro 1→20 a 390x844 → 4, 8, 10, 12, 16 + Epic Boon, PF controllati livello per livello (es. livello 10 con Cos 17→19: +18 = 5 + 3 + 10); Mago 1→20 → 4, 8, 12, 16 + Epic Boon. scrollWidth uguale alla finestra, console senza errori. Pulsante + Cos su Paladino 5 (15→16): PF 30/44 → 35/49, − li riporta a 30/44, + Forza non li tocca.
- **Scelta prudente**: anche i pulsanti + e − degli Attributi ricalcolano i PF (come chiede il piano). Chi corregge a mano un punteggio di creazione vede i PF muoversi, ma il toast lo spiega e il − annulla esattamente. Gli eroi già salvati non vengono toccati finché non si cambia la Cos.
- **File**: index.html, sw.js, docs/bug-beta.md, docs/team-log.md.
- **Per Test e punteggio**: B-021, B-022, B-025 in "Risolti" con test verde (+3 ciascuno). Utile un test per il pulsante + Cos negli Attributi e per l'ASI nella seconda classe in multiclasse (già nel piano).
- **Prossima sessione** (sera): Import/export come da piano, B-016 come PR e B-024 su main.

## 2026-11-10 · team leader
- **Stato**: live = main, controllo a 1440x900 e 390x844 senza problemi. Punteggio +105 (↓ da +107 per i 10 bug nuovi), 169/186, nessuna regressione. Rossa solo Level up (giorno 1).
- **Piano**: sviluppo mattina su Level up (B-021, B-022, B-025: obiettivo 20/20); sviluppo sera su Import/export (B-016 come PR, B-024 su main); designer su Telefono solo CSS (B-019, tocco nella finestra Level up); distruttore e power user concentrati su Level up e salvataggio. Le 7 sezioni tutte verdi passano a carico BASSO.

## 2026-11-10 · test
- **Suite** su main b44618f: **169/186** superati (17 falliti, nessuna regressione). Punteggio totale **+105** (ieri +107, ↓: pesano i 10 bug nuovi del 9 sera, −24). Sezioni rosse: **levelup** (−9).
- **Test nuovi (8)** nelle sezioni peggiori: levelup ×5 (B-021 Ladro 9→10 e Mago 11→12, falliscono; Epic Boon al 19, avanzamento della seconda classe, Roll obbligatorio: passano), importexport ×1 (import di un elenco di eroi, passa), telefono ×2 (finestra Level up a 390 px passa; tocco ≥44 px nella finestra Level up fallisce: "Roll" 38×37, "Become level 4" 100×30).
- **Punteggio**: aggiunti B-016…B-020 a `BUG_SEZIONE` in tests/punteggio.js. Premiati +3 i bug chiusi ieri con test verde: B-005, B-006, B-015.
- **Per sviluppo**: B-021 [alta] vale da solo 4 test rossi in levelup; poi B-016 [alta] (importexport) e B-019 (telefono).

## 2026-11-09 · power user
- **Fatto**: sessione serale di circa un'ora su main 8c56f8d (= live). Paladino 1→20, tutte le classi sondate livello per livello, tripla multiclasse Fighter/Wizard/Warlock, sessione di gioco con 4 eroi, homebrew (classe, specie, talento, oggetto) usato sugli eroi, 40 eroi creati/rinominati/duplicati/cancellati da telefono con backup e ripristino. Dettagli e numeri in docs/bug-beta.md, "Diario dei test".
- **Bug nuovi**: **B-021 [alta]** level up: aumento dei punteggi solo al livello 4 (mancano 8, 12, 16, Guerriero 6/14, Ladro 10) per tutte le classi SRD; B-022 [media] +2 Cos non alza i PF dei livelli precedenti; B-023 [media] riposo breve non restituisce Second Wind, Channel Divinity, Bardic Inspiration; B-024 [media] backup: copie con nome oltre 80 caratteri perse al ripristino come "già qui"; B-025 [bassa] talenti non ripetibili offerti di nuovo.
- **Test**: 6 test di regressione nuovi che oggi falliscono (levelup ×4, combattimento ×1, importexport ×1); aggiunti B-021…B-025 a `BUG_SEZIONE` in tests/punteggio.js. Nessun codice dell'app toccato. Correzioni di oggi (B-005, B-006, B-012, B-013, B-015) e telefono verificati nell'uso: reggono.
- **Suggerimento per sviluppo**: B-021 è una riga (`levelPlan`: leggere anche `srd.tbl[N-1].f`) e vale più di tutti gli altri.

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
