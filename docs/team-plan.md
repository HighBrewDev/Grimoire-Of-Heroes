# Piano del team · mercoledì 18 novembre 2026

## Regole di squadra
Chi chiude o cambia qualcosa aggiorna da sé le proprie voci, senza aspettare il giro del punteggio. A fine lavoro: (1) in docs/bug-beta.md sposta in 'Bug risolti' i bug che hai chiuso (ID, data, chi, commit) o correggi stato e gravità di quelli che hai toccato; (2) se hai cambiato lo stato di bug, compiti, PR o decisioni, ritocca le voci corrispondenti della Sala del Team: leggi la pagina pubblicata con Artifact (action read, url https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv), modifica SOLO le voci toccate dell'oggetto DATA (bugs, solved, running, decisions, la riga del tuo ruolo in team) nel file docs/sala/sala-team.html di main copiato fuori dal repo, controlla che il JavaScript resti valido e ripubblica con Artifact sullo stesso url, senza icona nuova e senza commit del file. Fallo solo se qualcosa è davvero cambiato, in una modifica sola, e nel diario scrivi 'Sala aggiornata' o il motivo se non ci sei riuscito. Vale per sviluppo, designer, tester e leader.

## Stato dell'app
- Main `3693703` (live = main). Controllo con Chromium a 1440x900 e 390x844 in locale: carica, scrollWidth uguale alla finestra, nessun errore di pagina. Niente di rotto da ieri.
- Punteggio totale **+358, tendenza ↑** (ieri +335). Test **356/357**; nessuna sezione rossa, nessuna regressione. 13 sezioni VERDI su 17, 4 GIALLE (Zaino, Robustezza, npc, ticket).
- Aperti: B-054 [bassa, eroe senza `id` nel salvataggio: le modifiche non restano; test rosso in robustezza], B-011 [bassa, da decidere]. B-052 e B-053 chiusi (PR #28 e #29 unite). Nessuna PR aperta.

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| Robustezza | 🟡 GIALLO | MEDIO | backend | B-054, unico test rosso |
| Import/export e salvataggio | 🟢 VERDE | BASSO | backend | B-054 tocca `load()` |
| Zaino e monete | 🟡 GIALLO | MEDIO | frontend | tutto verde, manca il terzo giorno |
| npc, ticket | 🟡 GIALLO | MEDIO | designer/frontend | sezioni nuove, pochi giorni di verde |
| Level up e multiclasse | 🟢 VERDE | BASSO | frontend | solo la variante di B-032 |
| Le altre 12 sezioni (Eroe … Telefono, sincronia) | 🟢 VERDE | BASSO | tester | solo controlli leggeri |

## Oggi
Zone di index.html oggi: **Backend** (per primo) possiede `load()`, `save()`, `sampleChars` e `sw.js`. **Frontend** (dopo) possiede solo il blocco PF e la sua barra (CSS incluso). **Designer** solo CSS di npc e ticket e `docs/design/`. Nessuno esce dalla propria zona.

- **Sviluppo 10:23, una sessione, prima BACKEND · B-054 (robustezza)**: in `load()`, ogni eroe senza `id` ne riceve uno nuovo e viene risalvato; le modifiche poi restano. Formato invariato. *Fatto* = test B-054 verde, `robustezza`/`importexport`/`eroe` senza regressioni, bug in "Risolti", `CACHE` alzata. Tocca dati utente: PR verso main. Se avanza tempo: avviso "New version available" da sw.js (backlog 2).
- **FATTO (PR #31, unita, campo `hp.maxOv`; la #30 duplicata è chiusa)** · barra della vita (combattimento): (a) PF temporanei in un colore diverso dalla vita, nella stessa barra. (b) Nuovo campo "override PF max", vuoto di default e attivo solo se contiene un numero. Se è **minore** del max base (es. danno necrotico): la fine della barra è coperta proporzionalmente da un colore freddo (viola), la differenza è sempre piena e non si può curare oltre l'override. Se è **maggiore** (es. Aiuto): la barra "cresce", la parte in più è piena in un colore caldo dorato/arancio, mai rosso; se la vita attuale è sotto il vecchio massimo, della parte in più si vede solo il bordo. Cura, danni, riposi e PF temporanei devono usare il massimo effettivo. Campo aggiuntivo e facoltativo nel salvataggio (eroi vecchi invariati): PR verso main. Zona: blocco PF di `index.html` + CSS barra. *Fatto* = test nuovi in `combattimento` (override minore, maggiore, vuoto, cura bloccata, PF temp), `combattimento`/`telefono`/`importexport` senza regressioni, screenshot a 390 e 1440. La variante di B-032 scala a domani.
- **Designer 14:13 · npc e ticket a 390 px**: contrasto e dimensione dei tocchi (min 44 px), solo CSS. *Fatto* = screenshot prima/dopo in docs/design/ a 390 e 1440, `telefono`/`npc`/`ticket` senza rotture.
- **Distruttore 21:07 · Robustezza e Zaino**: dopo B-054, eroi con campi mancanti o di tipo sbagliato, denari con importi strani, quota di salvataggio piena. *Fatto* = diario, bug nuovi con passi e test.
- **Power user 21:37 · Zaino e Level up a 390 px**: sessione da giocatore, spese e resto, level up multiclasse con talento. *Fatto* = diario con numeri, bug solo se riproducibili.
- **Test e punteggio (domani 8:47)**: confermare B-054; test nuovi solo in Zaino, npc, ticket.

## Backlog (ordinato)
**Backend**
1. B-054 (oggi). 2. Avviso "New version available" da sw.js. 3. Prova di login e sync reali (serve rete verso Supabase e il via di Capo). 4. B-011: l'import deve rispettare `FREE_BREW`? (oggi paywall spento).
**Frontend**
5. Barra PF con PF temp e override max (oggi, Capo). 5b. Variante di B-032 (domani). 6. Rifinitura dei flussi npc e ticket dopo le prove del power user.
**Design**
7. Contrasto e tocchi di npc e ticket (oggi). 8. Bozza di post in docs/promo/ (solo bozza, nessuna pubblicazione).
9. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali con brevi spiegazioni, avvio dal menu, saltabile): designer + frontend dopo il 23/11, o prima se tutte le sezioni sono VERDI (oggi 13 su 17).
10. Integrazione AI nell'import (rimandata): da riconsiderare solo se i file reali continuano a non passare; solo come PR.

## Regole per tutti
- Solo SRD 5.2.1; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- Nessuna PR aperta. Migrazioni Supabase in `supabase/migrations/` (homebrew 16/11, npc 17/11, ticket 18/11, note npc 19/11): se non le hai ancora eseguite, vanno nell'editor SQL; finché mancano, l'app resta locale senza errori.
- Keep-alive Supabase: workflow su main (`supabase-keepalive.yml`); da provare: GitHub → Actions → "supabase-keepalive" → Run workflow, deve rispondere 2xx. Serve il tuo ok per considerarlo chiuso.
- Decisione facoltativa: aprire nella rete dell'ambiente l'host Supabase per provare login e sync.
