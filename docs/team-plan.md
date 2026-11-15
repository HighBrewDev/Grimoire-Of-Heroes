# Piano del team · domenica 15 novembre 2026

## Regole di squadra
Chi chiude o cambia qualcosa aggiorna da sé le proprie voci, senza aspettare il giro del punteggio. A fine lavoro: (1) in docs/bug-beta.md sposta in 'Bug risolti' i bug che hai chiuso (ID, data, chi, commit) o correggi stato e gravità di quelli che hai toccato; (2) se hai cambiato lo stato di bug, compiti, PR o decisioni, ritocca le voci corrispondenti della Sala del Team: leggi la pagina pubblicata con Artifact (action read, url https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv), modifica SOLO le voci toccate dell'oggetto DATA (bugs, solved, running, decisions, la riga del tuo ruolo in team) nel file docs/sala/sala-team.html di main copiato fuori dal repo, controlla che il JavaScript resti valido e ripubblica con Artifact sullo stesso url, senza icona nuova e senza commit del file. Fallo solo se qualcosa è davvero cambiato, in una modifica sola, e nel diario scrivi 'Sala aggiornata' o il motivo se non ci sei riuscito. Vale per sviluppo, designer, tester e leader.

## Stato dell'app
- Live = main (`CACHE` `grimoire-ds1114a`, commit ff6a170). Controllo con Chromium a 1440x900 e 390x844 in locale: carica, scrollWidth uguale alla finestra, console senza errori. Niente di rotto da ieri.
- Punteggio totale **+244, tendenza ↓** (ieri +253; calo dovuto ai 27 test nuovi che cercano bug). Test **274/281**; nessuna sezione rossa, nessuna regressione. Sette sezioni VERDI, sette GIALLE.
- Aperti: **B-044 [alta, l'app non si avvia più dopo un import 5etools con `source`/`cls` oggetto]**, B-045, B-046, B-047, B-048 [UX], B-031, B-032, B-020, B-011. B-042 e B-043 e B-033/B-034 sono chiusi da ieri.
- Tutti i bug di robustezza di ieri hanno la stessa radice: campi importati usati senza ridurli al tipo atteso.

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| Import/export e salvataggio | 🟡 GIALLO | **ALTO** (priorità: B-044 alta) | backend | B-044 |
| Robustezza | 🟡 GIALLO | **ALTO** (peggiore, +10) | backend | B-044..B-047, 4 test rossi |
| Telefono | 🟡 GIALLO | MEDIO | frontend + designer | B-048 |
| Caratteristiche | 🟡 GIALLO | MEDIO | frontend | B-032 |
| Level up e multiclasse | 🟡 GIALLO | MEDIO | frontend | B-031 |
| Eroe | 🟡 GIALLO | MEDIO | frontend | 21/21, passa a BASSO appena VERDE per 3 giorni |
| Combattimento, Incontro, Tratti, Incantesimi, Zaino, Cronaca, Biblioteca, Workshop | 🟢 VERDE | BASSO | designer / tester | solo controlli leggeri; B-045/B-046 (Biblioteca) e B-047 (Workshop) sono bassi ma stessa causa di B-044: li chiude il backend |

## Oggi
Zone di index.html oggi: **Backend** (per primo) possiede `ingest5`, `key5`, `buildIndex`, `libFiltered`, `entryCard`, `extMeta`, `extBody`, `r5`, `brewImport`, `cleanBrew`/`checkBrew`, `brewKey`, `boot`. **Frontend** (dopo) possiede `conHp`/`hp.conAdj` e il ramo `feat` di `applyLevelUp` con la finestra Level up, più il CSS dei pulsanti dadi/chip nei capitoli Tratti e Zaino. **Designer** solo CSS e `docs/design/`, fuori da Tratti/Zaino (li ha il frontend). Nessuno esce dalla propria zona.

- **Sviluppo 10:23, una sessione, prima BACKEND** · **B-044** [alta]: in `ingest5` ridurre a testo `source`, `cls`, `level`, `school`, `rarity`, `className` prima di `key5`/id; try/catch per voce in `buildIndex` così un pacchetto malformato non blocca mai l'avvio (e un pacchetto già salvato non rompe più). Poi **B-046** (`key5`), **B-045** (`entryCard` in try/catch con messaggio + `Array.isArray` in `extBody`/`r5`), **B-047** (`cleanBrew`/`checkBrew`). *Fatto* = i test B-044..B-047 in `robustezza` verdi, `importexport`, `biblioteca`, `workshop` senza regressioni, bug in "Risolti", `CACHE` alzata.
- **Sviluppo, poi FRONTEND** · **B-048** (`min-height:44px` per dadi dei tratti; chip regole ≥32 px con spazio), poi **B-032** (`hp.conAdj` valido anche dopo un danno), poi B-031 finché c'è tempo. *Fatto* = test `telefono`/`caratteristiche`/`levelup` verdi, suite completa senza regressioni, log.
- **Designer 14:13 · indizio di scorrimento sui segnalibri a 390 px** (backlog 9), solo CSS, senza toccare Tratti/Zaino; se resta tempo "Death Saves" tagliato in stampa. *Fatto* = screenshot in docs/design/, `telefono` senza nuove rotture.
- **Distruttore 21:07 · Biblioteca e avvio**: con il fix di B-044 prova pacchetti salvati già rotti, `source`/`cls`/`level` di ogni tipo, ricarica ripetuta, import homebrew Markdown con valori strani. *Fatto* = diario, bug nuovi con passi e test.
- **Power user 21:37 · Zaino e Tratti a 390 px**: eroe Fighter 5 / Rogue 3, verifica dei bersagli 44 px dopo B-048, una serata di gioco con riposi e dadi. *Fatto* = diario con numeri, bug solo se riproducibili.
- **Test e punteggio (domani 8:47)**: test nuovi per ciò che si chiude oggi; niente test nuovi nelle sezioni VERDI.

## Backlog (ordinato)
**Backend**
1. B-044/B-046/B-045/B-047 (oggi). 2. B-020 `brewImport` con `Map`, 20.000 voci sotto 5 s. 3. Avviso "New version available" quando sw.js trova un index.html nuovo. 4. Prova di login e sync reali (sola lettura, serve rete verso Supabase). 5. B-011: l'import deve rispettare `FREE_BREW`? (oggi app gratuita, non applicabile).
**Frontend**
6. B-048 (oggi). 7. B-032. 8. B-031.
**Design**
9. Indizio di scorrimento sui segnalibri (oggi). 10. "Death Saves" tagliato in stampa A4.
11. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali con brevi spiegazioni, avvio dal menu, saltabile): designer + frontend dopo il 23/11, o prima se tutte le sezioni sono VERDI (oggi 8 su 14: no).
12. Bozza di post in docs/promo/ quando non ci sono più bug alti (solo bozza; B-044 è aperto).

## Regole per tutti
- Solo SRD 5.2.1; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- Nessuna PR aperta (ultima unita: #23). Keep-alive Supabase: workflow già su main; da controllare quando puoi: GitHub → Actions → "supabase-keepalive" → Run workflow, deve rispondere 2xx (da qui non raggiungo Supabase).
- Decisione facoltativa: aprire nella rete dell'ambiente l'host Supabase per provare login e sync.
