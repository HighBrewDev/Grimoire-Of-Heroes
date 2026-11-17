# Piano del team · martedì 17 novembre 2026

## Regole di squadra
Chi chiude o cambia qualcosa aggiorna da sé le proprie voci, senza aspettare il giro del punteggio. A fine lavoro: (1) in docs/bug-beta.md sposta in 'Bug risolti' i bug che hai chiuso (ID, data, chi, commit) o correggi stato e gravità di quelli che hai toccato; (2) se hai cambiato lo stato di bug, compiti, PR o decisioni, ritocca le voci corrispondenti della Sala del Team: leggi la pagina pubblicata con Artifact (action read, url https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv), modifica SOLO le voci toccate dell'oggetto DATA (bugs, solved, running, decisions, la riga del tuo ruolo in team) nel file docs/sala/sala-team.html di main copiato fuori dal repo, controlla che il JavaScript resti valido e ripubblica con Artifact sullo stesso url, senza icona nuova e senza commit del file. Fallo solo se qualcosa è davvero cambiato, in una modifica sola, e nel diario scrivi 'Sala aggiornata' o il motivo se non ci sei riuscito. Vale per sviluppo, designer, tester e leader.

## Stato dell'app
- Main `7fa1276` (live = main). Controllo con Chromium a 1440x900 e 390x844 in locale: carica, scrollWidth uguale alla finestra, nessun errore di pagina (solo un avviso MIME del mio server di prova, non dell'app). Niente di rotto da ieri.
- Punteggio totale **+335, tendenza ↑** (ieri +309). Test **345/347**; nessuna sezione rossa, nessuna regressione. 9 sezioni VERDI, 8 GIALLE (Caratteristiche, Zaino, Level up, Telefono, Robustezza, npc, sincronia, ticket; le ultime tre sono nuove e non hanno ancora 3 giorni di verde).
- Aperti: B-052 [media, denari: "Spend" rifiuta pagamenti validi], B-053 [media, salvataggio locale illeggibile cancellato senza copia], B-011 [bassa, da decidere]. Nessuna PR aperta (ultima unita: #27).

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| Zaino e monete | 🟡 GIALLO | MEDIO | frontend | B-052, test rosso |
| Robustezza | 🟡 GIALLO | MEDIO | backend | B-053, test rosso |
| Import/export e salvataggio | 🟢 VERDE | BASSO | backend | B-053 la tocca (`load`/`save`) |
| Caratteristiche, Level up, Telefono | 🟡 GIALLO | MEDIO | frontend/designer | verdi, servono 3 giorni |
| npc, sincronia, ticket | 🟡 GIALLO | MEDIO | backend | sezioni nuove, 1 giorno di verde |
| Eroe, Combattimento, Incontro, Tratti, Incantesimi, Cronaca, Biblioteca, Workshop | 🟢 VERDE | BASSO | tester | solo controlli leggeri |

## Oggi
Zone di index.html oggi: **Backend** (per primo) possiede `load()`, `save()`, `sampleChars` e la chiave `grimoire-heroes-v1`, più `sw.js`. **Frontend** (dopo) possiede solo `coinSpend` e il blocco Denari dello Zaino. **Designer** solo CSS e `docs/design/`, fuori dallo Zaino. Nessuno esce dalla propria zona.

- **Sviluppo 10:23, una sessione, prima BACKEND · B-053 (robustezza)**: in `load()`, se il JSON è illeggibile o con forma sbagliata, copiare il testo originale in una chiave di backup (come `grimoire-brew-backup-v1`), mostrare un avviso chiaro con modo di scaricarlo, e non sovrascrivere la chiave finché l'utente non sceglie. Il formato dei salvataggi non cambia. *Fatto* = test B-053 verde, `importexport`/`robustezza`/`eroe` senza regressioni, bug in "Risolti", `CACHE` alzata.
- **Sviluppo, poi FRONTEND · B-052 (zaino)**: `coinSpend` deve riprovare con una moneta in più della specie scelta e dare il resto (casi: 41 mo + 3 mr, 2,22 mo; 1 mp, 0,5 PP; 13 me + 8 mr, 1,48 me). Somme e valori negativi restano corretti. *Fatto* = test B-052 verde, `zaino`/`telefono` senza regressioni, bug in "Risolti".
- **Designer 14:13**: indicatore di scorrimento sullo scaffale eroi a telefono (backlog 7), solo CSS, fuori dallo Zaino. *Fatto* = screenshot in docs/design/ a 390, 768 e 1440, `telefono` senza nuove rotture.
- **Distruttore 21:07 · Zaino e Robustezza**: dopo i fix, denari con importi strani (virgola, 0, enormi, troppi decimali) e salvataggi danneggiati in modi nuovi (chiavi diverse, quota piena). *Fatto* = diario, bug nuovi con passi e test.
- **Power user 21:37 · npc e ticket a 390 px**: una sessione da DM, dossier, gruppi, rivelazione ai giocatori, segnalazione di un bug. *Fatto* = diario con numeri, bug solo se riproducibili.
- **Test e punteggio (domani 8:47)**: confermare B-052/B-053; niente test nuovi nelle sezioni VERDI.

## Backlog (ordinato)
**Backend**
1. B-053 (oggi). 2. Avviso "New version available" da sw.js. 3. Prova di login e sync reali (serve rete verso Supabase e il via di Capo). 4. B-011: l'import deve rispettare `FREE_BREW`? (oggi paywall spento).
**Frontend**
5. B-052 (oggi). 6. Variante di B-032: Level up nel mezzo dopo un danno fa perdere `hp.conAdj`. 7. Rifinitura dei flussi nuovi (npc, ticket) dopo le prove del power user.
**Design**
8. Scaffale eroi a telefono con indizio di scorrimento (oggi). 9. Revisione di contrasto e dimensione dei tocchi di npc e ticket a 390 px.
10. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali con brevi spiegazioni, avvio dal menu, saltabile): designer + frontend dopo il 23/11, o prima se tutte le sezioni sono VERDI (oggi 9 su 17).
11. Bozza di post in docs/promo/ (solo bozza, nessuna pubblicazione).
12. Integrazione AI nell'import (rimandata): da riconsiderare solo se i file reali continuano a non passare; dati e Supabase solo come PR.

## Regole per tutti
- Solo SRD 5.2.1; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**. B-053 non cambia formato né schema, ma se il backend lo ritiene dato utente apre una PR.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- Nessuna PR aperta. Homebrew sull'account: serve eseguire `supabase/migrations/2026-11-16-homebrew.sql` nell'editor SQL di Supabase (finché non lo fa l'app resta locale, senza errori).
- Keep-alive Supabase: workflow su main; da provare quando puoi: GitHub → Actions → "supabase-keepalive" → Run workflow, deve rispondere 2xx.
- Decisione facoltativa: aprire nella rete dell'ambiente l'host Supabase per provare login e sync.
