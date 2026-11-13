# Piano del team · venerdì 13 novembre 2026

## Regole di squadra
Chi chiude o cambia qualcosa aggiorna da sé le proprie voci, senza aspettare il giro del punteggio. A fine lavoro: (1) in docs/bug-beta.md sposta in 'Bug risolti' i bug che hai chiuso (ID, data, chi, commit) o correggi stato e gravità di quelli che hai toccato; (2) se hai cambiato lo stato di bug, compiti, PR o decisioni, ritocca le voci corrispondenti della Sala del Team: leggi la pagina pubblicata con Artifact (action read, url https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv), modifica SOLO le voci toccate dell'oggetto DATA (bugs, solved, running, decisions, la riga del tuo ruolo in team) nel file docs/sala/sala-team.html di main copiato fuori dal repo, controlla che il JavaScript resti valido e ripubblica con Artifact sullo stesso url, senza icona nuova e senza commit del file. Fallo solo se qualcosa è davvero cambiato, in una modifica sola, e nel diario scrivi 'Sala aggiornata' o il motivo se non ci sei riuscito. Vale per sviluppo, designer, tester e leader.

## Stato dell'app
- Live = main (`CACHE` `grimoire-fm1112a`, commit c4f696f). Controllo con Chromium a 1440x900 e 390x844 in locale: carica, scrollWidth uguale alla finestra, console senza errori. Niente di rotto da ieri.
- Punteggio totale **+206, tendenza ↓** (ieri +208, per 11 test nuovi e il bug B-041). Test **238/247**; nessuna sezione rossa, nessuna regressione.
- Ieri non è arrivato nessun commit di sviluppo né del designer: restano aperti **B-039 e B-041 [alte, XSS da import]**, B-038, B-029 e il keep-alive di Supabase. Sono ancora la priorità. Registro corretto: B-037 era già risolto (PR #19 unita), spostato in "Risolti".
- Più basse: Robustezza (+3), Cronaca/Tratti (+10/+11, ma VERDI), Caratteristiche e Import/export (+12). Sei sezioni VERDI.

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| Robustezza | 🟡 GIALLO (peggiore) | **ALTO** | backend (XSS) + frontend (B-029) | B-039 ×2, B-041, B-029 |
| Import/export e salvataggio | 🟡 GIALLO | **ALTO** | backend | B-041 [alta], B-039 [alta], B-038, B-016 da verificare |
| Level up e multiclasse | 🟡 GIALLO | MEDIO | frontend | B-031, B-033 |
| Eroe | 🟡 GIALLO | MEDIO | frontend | B-034 |
| Caratteristiche | 🟡 GIALLO | MEDIO | frontend | B-032 |
| Incontro | 🟡 GIALLO | MEDIO | — | solo B-037 chiuso, ora tutto verde: BASSO appena VERDE per 3 giorni |
| Combattimento, Telefono | 🟡 GIALLO | BASSO | designer | test tutti verdi |
| Tratti, Incantesimi, Zaino, Cronaca, Biblioteca, Workshop | 🟢 VERDE | BASSO | — | solo controlli leggeri dei tester |

## Oggi
Zone di index.html oggi: **Backend** (per primo) possiede `md()`, `esc` nei template, `objList`, rendering di Zaino (`q`) e condizioni (`condDur`), `fixup`/import eroe, `ingest5`, `extMeta`, `extBody`, `r5`, `brewImport`, sw.js. **Frontend** (dopo) possiede `modal()`/level up, menu classe (`classOptions`, `bindValue` per `class`, righe multiclasse), `conHp`, scelta talenti, `opt()`. **Designer** possiede solo CSS e `docs/design/`. Nessuno esce dalla propria zona.

- **Sviluppo 10:23, una sessione, prima BACKEND** · Robustezza/Import: **B-039, B-041, B-038** (stessa classe: dati importati inseriti nell'HTML senza `esc`). Escape o riduzione a numero di `q`, `condDur`, `level`, `school`, `roll.*`, `str`..., chiavi/valori di `daily`/`spells`/`slots`; `res` interi 0-20. Poi **come PR**: workflow GitHub Actions di keep-alive di Supabase (lettura leggera con la chiave anon di config.js, ogni 3 giorni + avvio manuale, fallisce se non 2xx). *Fatto* = test B-039 ×2, B-041, B-038 verdi, `robustezza` e `importexport` senza regressioni, bug in "Risolti", PR keep-alive aperta con link.
- **Sviluppo, poi FRONTEND** · **B-029** (`modal()` trattiene il focus, sfondo `inert`, level up all'eroe della finestra), poi B-033, B-034, B-032, B-031 finché c'è tempo. *Fatto* = test verde, nessun rosso nuovo, suite completa senza regressioni, `CACHE` alzata, log.
- **Designer 14:13 · Accessibilità (Telefono/Eroe)**, rimandata da ieri: focus visibile, contrasto, `aria-label` sui pulsanti a icona, `.dot` e "✕" a 44 px su 390 px. Solo CSS e attributi. *Fatto* = `telefono` 17/17, suite senza regressioni, screenshot prima/dopo in docs/design/.
- **Distruttore 21:07 · Sicurezza dell'import**, se il backend ha consegnato: riprova B-039/B-041/B-038 con `<img onerror>`, `javascript:`, `"><script>` in ogni campo di eroe, homebrew, 5etools (anche campi `daily`, `slots`, `roll`). Se non c'è correzione: Salvataggio con memoria quasi piena e due schede (B-016). *Fatto* = diario, bug nuovi con passi e test.
- **Power user 21:37 · Telefono + incantesimi**: Mago 5 / Chierico 2 a 390 px, slot e preparati, riposo lungo, concentrazione, Cronaca di una serata. *Fatto* = diario con numeri, bug solo se riproducibili.
- **Test e punteggio (domani 8:47)**: nuovi test per ciò che si chiude oggi; niente test nuovi nelle sezioni VERDI.

## Backlog (ordinato)
**Backend**
1. B-039 / B-041 / B-038 (oggi). 2. Keep-alive di Supabase (PR oggi). 3. B-020 `brewImport` con `Map`, 20.000 voci sotto 5 s. 4. Avviso "New version available" quando sw.js trova un index.html nuovo. 5. Verifica B-016 su main e spostalo in "Risolti". 6. Prova di login e sync reali (sola lettura).
**Frontend**
7. B-029, 8. B-033, 9. B-034, 10. B-032, 11. B-031.
**Design**
12. Accessibilità (oggi), poi stampa/PDF A4 della scheda.
13. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali con brevi spiegazioni, avvio dal menu, saltabile): designer + frontend dopo il 23/11, o prima se tutte le sezioni sono VERDI.
14. Bozza di post in docs/promo/ quando non ci sono più bug alti (solo bozza).

## Regole per tutti
- Solo SRD 5.2.1; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- **PR keep-alive di Supabase**: arriva oggi dal backend, da rivedere e unire.
- Nessuna altra PR aperta (la #19 è unita). B-011 non applicabile; app gratuita.
