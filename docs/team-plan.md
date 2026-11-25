# Piano del team · mercoledì 25 novembre 2026

## Regole di squadra
Segnale alla Sala: all'avvio e a fine lavoro scrivi `live/<tuo id>` come in docs/sala-segnali.md (vedi anche CLAUDE.md).
Chi chiude o cambia qualcosa aggiorna da sé le proprie voci, senza aspettare il giro del punteggio. A fine lavoro: (1) in docs/bug-beta.md sposta in 'Bug risolti' i bug che hai chiuso (ID, data, chi, commit) o correggi stato e gravità di quelli che hai toccato; (2) se hai cambiato lo stato di bug, compiti, PR o decisioni, ritocca le voci corrispondenti della Sala del Team: leggi la pagina pubblicata con Artifact (action read, url https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv), modifica SOLO le voci toccate dell'oggetto DATA (bugs, solved, running, decisions, la riga del tuo ruolo in team) nel file docs/sala/sala-team.html di main copiato fuori dal repo, controlla che il JavaScript resti valido e ripubblica con Artifact sullo stesso url, senza icona nuova e senza commit del file. Fallo solo se qualcosa è davvero cambiato, in una modifica sola, e nel diario scrivi 'Sala aggiornata' o il motivo se non ci sei riuscito. Vale per sviluppo, designer, tester e leader.

## Fase: refactoring e pulizia (decisione di Capo, 18/11)
Niente nuove feature finché Capo non le riapre. Compiti piccoli, suite verde a ogni passo, nessun cambio di stack, un passo = una PR piccola se tocca dati utente o spezza `index.html`. Ritmo ridotto dal 24/11: sviluppo in UNA sessione al giorno.

## Stato dell'app
- Main `69b3423` (live = main). Controllo Chromium a 1440x900 e 390x844: carica, scrollWidth uguale alla finestra, nessun errore di pagina. Niente di rotto da ieri.
- Punteggio **+373, tendenza ↑** (ieri +358). Test **405/410**. Rosse: combattimento, telefono, beneficiClasse.
- I 5 rossi hanno una sola causa: B-055 (la fold "Add an attack" si richiude; 3 test non la aprono) e B-056 (pallini doppi; 1 test). Sono bug [UX] bassi, ma tengono 3 sezioni in rosso.
- `index.html` è ancora un file unico da 6645 righe. PR #48 (service worker + avviso "Reload now") aperta, aspetta Capo.

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| Combattimento | 🔴 ROSSO | ALTO | frontend | B-055, 2 test rossi |
| Telefono | 🔴 ROSSO | ALTO | frontend | B-030 rosso per B-055 |
| beneficiClasse | 🔴 ROSSO | ALTO | frontend | B-056, test pallini |
| Zaino, Robustezza, equipaggiamento, armi-incantesimi, import5etools(+Classi) | 🟡 GIALLO | MEDIO | tester/backend | pochi giorni di verde |
| Le altre 12 sezioni | 🟢 VERDE | BASSO | tester | solo controlli leggeri |

## Oggi
Zone di index.html: **Sviluppo** possiede il blocco Combattimento (azioni del turno, risorse di classe) e `sw.js` solo per `CACHE`. **Designer** solo CSS (effetti pesanti) e `docs/design/`. Nessuno esce dalla propria zona.

- **Sviluppo 10:23 · B-055 + B-056 (frontend)**. (1) B-055: dopo "Add" il modulo "Add an attack" (`index.html:2228`, `<details class="fold">`) resta aperto, con i campi svuotati e il focus sul nome. Se la fold si richiude per un re-render, ripristinare lo stato aperto. I 3 test (`combattimento` ×2, `telefono` B-030) devono aprire la fold: aggiornarli è legittimo solo se l'app mostra la fold chiusa di partenza (è la scelta voluta), non per far passare un bug. (2) B-056: un solo gruppo di pallini per risorsa nella pagina (tenere quello nella card "Sorcerer resources" o nella riga azione, non entrambi), sincronizzati, nessun uso perso. *Fatto* = test `B-055` e `usi: pallini per Wind Soul…` verdi, `combattimento`/`telefono`/`beneficiClasse` senza regressioni, suite completa ≥ 410/410, bug in "Risolti" con commit, `CACHE` alzata, screenshot 390 e 1440. Sala aggiornata. Se avanza tempo: misurare il lag di digitazione (backlog 1), solo misura, senza fix.
- **Designer 14:13 · effetti CSS pesanti (solo misura e proposta)**: elencare `backdrop-filter`, `filter: blur`, ombre grandi, animazioni infinite in `index.html`; misurare il costo di digitazione/scroll con Chromium (Performance trace o `requestAnimationFrame`) a 390 e 1440. *Fatto* = `docs/design/effetti-css-2026-11-25.md` con tabella (selettore, riga, costo, rimovibile sì/no) e al massimo 2 rimozioni senza cambio visibile, screenshot prima/dopo, `telefono` e `eroe` senza rotture.
- **Distruttore 21:07 · Combattimento e Robustezza**: dopo il fix di B-055/B-056, aggiungere 30 attacchi di fila, PF con override, risorse a usi, import file strani. *Fatto* = diario, bug nuovi con passi e test.
- **Test e punteggio (domani 8:47)**: confermare B-055/B-056 chiusi e le 3 sezioni uscite dal rosso.

## Backlog (ordinato)
1. Misurare il lag di digitazione (campi lunghi, note, cronaca): trace prima di toccare qualcosa. (frontend)
2. Effetti CSS pesanti (oggi, designer).
3. Spezzare `index.html`, passo 1: estrarre il CSS in `style.css`, aggiornare precache in `sw.js`, suite identica. Solo PR. (frontend)
4. Spezzare `index.html`, passo 2: estrarre il JS in moduli per area (dati SRD, combattimento, spellbook, homebrew). Solo PR, un'area per volta.
5. B-011: l'import homebrew deve rispettare `FREE_BREW`? (oggi paywall spento; decisione di Capo se serve)
6. Codice morto, nomi doppi, avvisi in console (backend/frontend).
7. Test di regressione per i test `tests/` che dipendono da fold chiuse (robustezza dei selettori).
8. Prova di login e sync reali con Supabase (serve rete e il via di Capo).
9. Rifinitura dei flussi npc e ticket dopo le prove del power user.
10. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali, avvio dal menu, saltabile). Fermo finché non finisce il refactoring o Capo lo chiede.

## Regole per tutti
- Solo SRD 5.2.1 nella versione pubblica; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- **PR #48** (https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/48): service worker più robusto, avviso "Reload now", etichetta versione. Tocca `sw.js`: va unita da te (o dimmi "mergia tu"); dopo il merge chiudi e riapri il sito una volta.
- **Keep-alive Supabase**: workflow `supabase-keepalive.yml` su main, da provare in GitHub → Actions → "supabase-keepalive" → Run workflow (deve dare 2xx). Serve il tuo ok per chiuderlo.
- Migrazioni Supabase in `supabase/migrations/`: se non le hai ancora eseguite, vanno nell'editor SQL; finché mancano l'app resta locale senza errori.
- Decisione facoltativa: B-011 (limite di 3 elementi gratuiti nell'import) e apertura dell'host Supabase nella rete dell'ambiente per provare login e sync.
