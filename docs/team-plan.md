# Piano del team · giovedì 26 novembre 2026

## Regole di squadra
Segnale alla Sala: all'avvio e a fine lavoro scrivi `live/<tuo id>` come in docs/sala-segnali.md (vedi anche CLAUDE.md).
Chi chiude o cambia qualcosa aggiorna da sé le proprie voci, senza aspettare il giro del punteggio. A fine lavoro: (1) in docs/bug-beta.md sposta in 'Bug risolti' i bug che hai chiuso (ID, data, chi, commit) o correggi stato e gravità di quelli che hai toccato; (2) se hai cambiato lo stato di bug, compiti, PR o decisioni, ritocca le voci corrispondenti della Sala del Team: leggi la pagina pubblicata con Artifact (action read, url https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv), modifica SOLO le voci toccate dell'oggetto DATA (bugs, solved, running, decisions, la riga del tuo ruolo in team) nel file docs/sala/sala-team.html di main copiato fuori dal repo, controlla che il JavaScript resti valido e ripubblica con Artifact sullo stesso url, senza icona nuova e senza commit del file. Fallo solo se qualcosa è davvero cambiato, in una modifica sola, e nel diario scrivi 'Sala aggiornata' o il motivo se non ci sei riuscito. Vale per sviluppo, designer, tester e leader.

## Fase: refactoring e pulizia (decisione di Capo, 18/11)
Niente nuove feature finché Capo non le riapre. Compiti piccoli, suite verde a ogni passo, nessun cambio di stack, un passo = una PR piccola se tocca dati utente o spezza `index.html`. Ritmo ridotto dal 24/11: sviluppo in UNA sessione al giorno.

## Stato dell'app
- Main `e1238a7` (live = main). Controllo Chromium a 1440x900 e 390x844: carica, scrollWidth uguale alla finestra, nessun errore di pagina. Niente di rotto dall'esterno.
- Punteggio **+410, tendenza ↑** (ieri +373). Test **415/416**. B-055 e B-056 chiusi: combattimento, telefono, beneficiClasse non sono più rossi.
- **Una sezione rossa: armi-incantesimi**, regressione di ieri. Il test "incantesimo homebrew: picker di tiro salvezza, dadi, area e scaling" fallisce in modo deterministico: l'anteprima dice "No effect text" anche se il campo testo è stato riempito. Verificato a bisezione: passa su `3bd9ee7^` e `201ad77`, fallisce da `3bd9ee7` (Designer, tolto `will-change` da `.page::before/::after`) e su main. Sospetto: gara tra il ridisegno del modulo e `fill` (campi che perdono il valore digitando in fretta) = possibile bug reale di digitazione, non solo test. Test non toccato.
- `index.html` è ancora un file unico da 6677 righe. PR #51 (sync NPC) aperta, aspetta Capo.

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| armi-incantesimi | 🔴 ROSSO | ALTO | frontend | regressione B-057 (sotto) |
| Combattimento, Telefono, Robustezza, equipaggiamento, beneficiClasse, import5etools(+Classi) | 🟡 GIALLO | MEDIO | tester/backend | pochi giorni di verde |
| Le altre 15 sezioni | 🟢 VERDE | BASSO | tester | solo controlli leggeri |

## Oggi
Zone di index.html: **Sviluppo** possiede il modulo Workshop/homebrew (`bw_*`, anteprima `#bwPreview`, riga ~3329) e `sw.js` solo per `CACHE`. Nessuno esce dalla propria zona. **Designer: non è un suo giorno** (lun/mer/ven).

- **Sviluppo 10:23 · B-057 (frontend, priorità 1)**: capire perché, dopo il commit `3bd9ee7`, l'anteprima dell'incantesimo homebrew segnala "No effect text" e "no class list" nel test `armi-incantesimi` "picker di tiro salvezza…". Riprodurre a mano in Chromium (scrivere in fretta nel campo testo `#bw_x` dopo aver cambiato i picker `#bw_fx_*`) e guardare se il modulo si ridisegna e perde il valore (`bwPreview`, handler `input`/`change` del modulo). Se è un bug dell'app, correggere l'app (non ripristinare `will-change`, che era una buona ottimizzazione); se è solo timing del test, rendere il test robusto (attendere il testo, non una costante) e dirlo nel diario. *Fatto* = `armi-incantesimi` 6/6, suite completa 416/416, B-057 in "Risolti" con commit, `CACHE` alzata, Sala aggiornata. Se avanza tempo: misura del lag di digitazione (backlog 1), solo misura.
- **Power user 21:37 · Workshop e Spellbook**: creare 3 incantesimi homebrew compilando i picker, aggiungerli a un eroe, controllare i preparati con il nuovo limite. *Fatto* = diario, bug nuovi con passi e test.
- **Test e punteggio (domani 8:47)**: confermare B-057 chiuso e armi-incantesimi verde.

## Backlog (ordinato)
1. B-057 (oggi, sviluppo).
2. Misurare il lag di digitazione (campi lunghi, note, cronaca): trace prima di toccare qualcosa. (frontend)
3. Spezzare `index.html`, passo 1: estrarre il CSS in `style.css`, aggiornare precache in `sw.js`, suite identica. Solo PR. (frontend)
4. Spezzare `index.html`, passo 2: estrarre il JS in moduli per area (dati SRD, combattimento, spellbook, homebrew). Solo PR, un'area per volta.
5. Designer (venerdì): bordo irregolare con maschera precalcolata al posto di `feTurbulence`, link legali del footer e dadi del vassoio a 390. Solo PR.
6. B-011: l'import homebrew deve rispettare `FREE_BREW`? (oggi paywall spento; decisione di Capo se serve)
7. Codice morto, nomi doppi, avvisi in console (backend/frontend).
8. Selettori dei test più robusti dove dipendono da fold chiuse o da attese a tempo fisso.
9. Prova di login e sync reali con Supabase (serve rete e il via di Capo).
10. Rifinitura dei flussi npc e ticket dopo le prove del power user.
11. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali, avvio dal menu, saltabile). Fermo finché non finisce il refactoring o Capo lo chiede.

## Regole per tutti
- Solo SRD 5.2.1 nella versione pubblica; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- **PR #51** (https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/51): sync, una riga NPC rifiutata non blocca più tutta la sincronizzazione. Tocca sync/dati utente: va rivista e unita da te (o dimmi "mergia tu"); dopo il merge chiudi e riapri il sito una volta.
- **Keep-alive Supabase**: workflow `supabase-keepalive.yml` su main, da provare in GitHub → Actions → "supabase-keepalive" → Run workflow (deve dare 2xx). Serve il tuo ok per chiuderlo.
- Migrazioni Supabase in `supabase/migrations/`: se non le hai ancora eseguite, vanno nell'editor SQL; finché mancano l'app resta locale senza errori.
- Decisione facoltativa: B-011 (limite di 3 elementi gratuiti nell'import) e apertura dell'host Supabase nella rete dell'ambiente per provare login e sync.
