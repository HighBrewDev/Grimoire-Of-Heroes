# Piano del team · venerdì 27 novembre 2026

## Regole di squadra
Segnale alla Sala: all'avvio e a fine lavoro scrivi `live/<tuo id>` come in docs/sala-segnali.md (vedi anche CLAUDE.md).
Chi chiude o cambia qualcosa aggiorna da sé le proprie voci, senza aspettare il giro del punteggio. A fine lavoro: (1) in docs/bug-beta.md sposta in 'Bug risolti' i bug che hai chiuso (ID, data, chi, commit) o correggi stato e gravità di quelli che hai toccato; (2) se hai cambiato lo stato di bug, compiti, PR o decisioni, ritocca le voci corrispondenti della Sala del Team: leggi la pagina pubblicata con Artifact (action read, url https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv), modifica SOLO le voci toccate dell'oggetto DATA (bugs, solved, running, decisions, la riga del tuo ruolo in team) nel file docs/sala/sala-team.html di main copiato fuori dal repo, controlla che il JavaScript resti valido e ripubblica con Artifact sullo stesso url, senza icona nuova e senza commit del file. Fallo solo se qualcosa è davvero cambiato, in una modifica sola, e nel diario scrivi 'Sala aggiornata' o il motivo se non ci sei riuscito. Vale per sviluppo, designer, tester e leader.

## Fase: refactoring e pulizia (decisione di Capo, 18/11)
Niente nuove feature finché Capo non le riapre. Compiti piccoli, suite verde a ogni passo, nessun cambio di stack, un passo = una PR piccola se tocca dati utente o spezza `index.html`. Ritmo ridotto dal 24/11: sviluppo in UNA sessione al giorno.

## Stato dell'app
- Main `1b2afed` (live = main). Chromium a 1440x900 e 390x844: carica, scrollWidth uguale alla finestra, zero errori di pagina o console. Niente di rotto.
- Punteggio **+419, tendenza ↑** (ieri +410). Test **419/419**. Nessuna sezione rossa; B-057 chiuso (era timing del test). Nessun bug aperto (B-011 chiuso: l'app resta gratis, decisione di Capo). Nessuna PR aperta.
- `index.html` è ancora un file unico (6738 righe): il refactoring vero non è partito, è il debito principale.

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| beneficiClasse, armi-incantesimi, import5etoolsClassi | 🟡/🟢 | MEDIO | tester/frontend | i più bassi (3-6 test), pochi controlli |
| Combattimento, Telefono | 🟡 GIALLO | MEDIO | frontend | da verde da pochi giorni |
| Le altre 17 sezioni | 🟢 VERDE | BASSO | tester | solo controlli leggeri |

## Oggi
Zone di index.html: **Sviluppo** lavora su misura e CSS; **Designer** non tocca index.html oltre i suoi file di design.
- **Sviluppo 10:23 · backlog 2 e 3 (frontend, suite verde)**: (a) misura del lag di digitazione in Chromium (note, cronaca, campo testo del Workshop `#bw_x`): trace prima/dopo, scrivere i numeri in docs/design/. (b) Estrarre il CSS di `index.html` in `style.css` con precache in `sw.js` e `CACHE` alzata: **solo PR**, suite identica 419/419 a 1440 e 390. *Fatto* = misura nel diario; PR aperta con suite verde.
- **Designer 14:13 (venerdì)**: bordo irregolare con maschera precalcolata al posto di `feTurbulence`, poi link legali del footer e dadi del vassoio a 390. **Solo PR**; screenshot prima/dopo a 1440 e 390. *Fatto* = PR con misura di scroll e digitazione.
- **Distruttore 21:07 (giorno dispari)**: Level up/multiclasse e Import/export: importare file strani (JSON troncati, eroi con campi mancanti), risalire di livello oltre 20, multiclasse con incantatori misti. *Fatto* = diario, bug con passi e test.
- **Test e punteggio (domani 8:47)**: confermare 419/419 e che la PR del CSS non cambi i risultati.

## Backlog (ordinato)
1. Misurare il lag di digitazione (frontend).
2. Spezzare `index.html`, passo 1: CSS in `style.css`. Solo PR.
3. Spezzare `index.html`, passo 2: JS in moduli per area (dati SRD, combattimento, spellbook, homebrew). Solo PR, un'area per volta.
4. Designer: bordo irregolare precalcolato, link legali del footer, dadi del vassoio a 390. Solo PR.
5. Codice morto, nomi doppi, avvisi in console.
6. Selettori dei test più robusti (fold chiuse, attese a tempo fisso).
7. Più test per beneficiClasse e armi-incantesimi (le sezioni con meno copertura).
9. Prova di login e sync reali con Supabase (serve rete e il via di Capo).
10. Rifinitura dei flussi npc e ticket.
11. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali, avvio dal menu, saltabile). Fermo finché non finisce il refactoring o Capo lo chiede.

## Regole per tutti
- Solo SRD 5.2.1 nella versione pubblica; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- **PR #54** (sviluppo): CSS in `style.css`, suite 419/419 identica; annulla = revert. Da unire quando vuoi.
- **Keep-alive Supabase**: workflow `supabase-keepalive.yml` su main, da provare in GitHub → Actions → "supabase-keepalive" → Run workflow (deve dare 2xx). Serve il tuo ok; il progetto potrebbe doversi ripristinare da te.
- Migrazioni in `supabase/migrations/`: se non le hai eseguite, vanno nell'editor SQL; finché mancano l'app resta locale senza errori.
- Decisione facoltativa: apertura dell'host Supabase nella rete dell'ambiente per provare login e sync.
