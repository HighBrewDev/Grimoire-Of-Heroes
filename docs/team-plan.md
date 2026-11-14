# Piano del team · sabato 14 novembre 2026

## Regole di squadra
Chi chiude o cambia qualcosa aggiorna da sé le proprie voci, senza aspettare il giro del punteggio. A fine lavoro: (1) in docs/bug-beta.md sposta in 'Bug risolti' i bug che hai chiuso (ID, data, chi, commit) o correggi stato e gravità di quelli che hai toccato; (2) se hai cambiato lo stato di bug, compiti, PR o decisioni, ritocca le voci corrispondenti della Sala del Team: leggi la pagina pubblicata con Artifact (action read, url https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv), modifica SOLO le voci toccate dell'oggetto DATA (bugs, solved, running, decisions, la riga del tuo ruolo in team) nel file docs/sala/sala-team.html di main copiato fuori dal repo, controlla che il JavaScript resti valido e ripubblica con Artifact sullo stesso url, senza icona nuova e senza commit del file. Fallo solo se qualcosa è davvero cambiato, in una modifica sola, e nel diario scrivi 'Sala aggiornata' o il motivo se non ci sei riuscito. Vale per sviluppo, designer, tester e leader.

## Stato dell'app
- Live = main (`CACHE` `grimoire-ds1113a`, commit 3061ea8). Controllo con Chromium a 1440x900 e 390x844 in locale: carica, scrollWidth uguale alla finestra, console senza errori. Niente di rotto da ieri.
- Punteggio totale **+237, tendenza ↑** (ieri +206). Test **249/255**; nessuna sezione rossa, nessuna regressione. Sette sezioni VERDI, sette GIALLE.
- Ieri sono arrivati sviluppo (PR #23 unita: XSS B-038/B-039/B-041, B-029, workflow keep-alive) e designer. Restano aperti **B-042 [alta, XSS: `page` e `passive` 5etools]**, B-043, B-031, B-032, B-033, B-034, B-020.
- Registro corretto: B-016 [alta] era già risolto da PR #16 (test `importexport` verdi), spostato in "Risolti".

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| Import/export e salvataggio | 🟡 GIALLO | **ALTO** | backend | B-042 [alta] (terza volta che resta un campo senza `esc`) |
| Robustezza | 🟡 GIALLO | **ALTO** | backend | B-042, B-043 |
| Level up e multiclasse | 🟡 GIALLO | MEDIO | frontend | B-031, B-033 |
| Eroe | 🟡 GIALLO | MEDIO | frontend | B-034 |
| Caratteristiche | 🟡 GIALLO | MEDIO | frontend | B-032 |
| Incontro | 🟡 GIALLO | MEDIO | — | 14/14, passa a BASSO appena VERDE per 3 giorni |
| Combattimento, Tratti, Incantesimi, Zaino, Cronaca, Biblioteca, Workshop, Telefono | 🟢 VERDE | BASSO | designer / tester | solo controlli leggeri; Workshop con B-020 (bassa) se resta tempo |

## Oggi
Zone di index.html oggi: **Backend** (per primo) possiede `extMeta`, `extBody`, `r5`, `ingest5`, `brewImport` e la verifica homebrew (dove si legge `sc`), `fixup`, sw.js. **Frontend** (dopo) possiede `classOptions`, `bindValue` per `class`, righe multiclasse, `opt()`, `conHp`, ramo `feat` di `applyLevelUp` e la finestra Level up. **Designer** solo CSS e `docs/design/`. Nessuno esce dalla propria zona.

- **Sviluppo 10:23, una sessione, prima BACKEND** · Import/Robustezza: **B-042** (escape o riduzione a numero di `page` e `passive`; poi passare in rassegna TUTTI i valori `o.*` interpolati in `extMeta`/`extBody`/`r5` per chiudere la classe una volta per tutte) e **B-043** (ridurre ogni campo a testo con `typeof === 'string'` prima di confrontarlo, `sc` compreso). *Fatto* = test B-042 e B-043 verdi, `robustezza` e `importexport` senza regressioni, bug in "Risolti", `CACHE` alzata.
- **Sviluppo, poi FRONTEND** · **B-033** (menu classe principale senza classi già in multiclasse), poi **B-034** (valore dell'eroe sempre visibile nei menu, anche "non più disponibile"), poi B-032, B-031 finché c'è tempo. *Fatto* = test verde, suite completa senza regressioni, log.
- **Designer 14:13 · Stampa A4 della scheda** (backlog 12), solo CSS `@media print`; se serve altro, indizio di scorrimento sui segnalibri su 390 px. *Fatto* = scheda stampabile su una/due pagine A4 senza menu, screenshot in docs/design/, `telefono` 17/17.
- **Distruttore 21:07 · Import**: attacca B-042/B-043 con `<img onerror>`, `javascript:`, oggetti con `toString`/`valueOf` in ogni campo di 5etools, homebrew JSON e Markdown, eroe. Poi B-020 se il backend l'ha toccato. *Fatto* = diario, bug nuovi con passi e test.
- **Power user 21:37 · Level up e multiclasse a telefono**: Guerriero 5 / Ladro 3 a 390 px, talenti ai livelli 4 e 8, riposi, Cronaca di una serata. *Fatto* = diario con numeri, bug solo se riproducibili.
- **Test e punteggio (domani 8:47)**: nuovi test per ciò che si chiude oggi; niente test nuovi nelle sezioni VERDI.

## Backlog (ordinato)
**Backend**
1. B-042 / B-043 (oggi). 2. B-020 `brewImport` con `Map`, 20.000 voci sotto 5 s. 3. Avviso "New version available" quando sw.js trova un index.html nuovo. 4. Prova di login e sync reali (sola lettura, serve rete verso Supabase). 5. B-011: decidere se l'import deve rispettare `FREE_BREW` (oggi app gratuita, non applicabile).
**Frontend**
6. B-033, 7. B-034, 8. B-032, 9. B-031.
**Design**
10. Stampa/PDF A4 della scheda (oggi). 11. Indizio di scorrimento sui segnalibri.
12. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali con brevi spiegazioni, avvio dal menu, saltabile): designer + frontend dopo il 23/11, o prima se tutte le sezioni sono VERDI (oggi 7 su 14: no).
13. Bozza di post in docs/promo/ quando non ci sono più bug alti (solo bozza; B-042 è ancora aperto).

## Regole per tutti
- Solo SRD 5.2.1; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- Nessuna PR aperta (la #23 con il keep-alive è unita). Da controllare quando puoi: GitHub → Actions → "supabase-keepalive" → Run workflow, per vedere che risponda 2xx (da qui non raggiungo Supabase).
- Decisione facoltativa: aprire nella rete dell'ambiente l'host Supabase per provare login e sync.
