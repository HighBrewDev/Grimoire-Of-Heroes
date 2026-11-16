# Piano del team · lunedì 16 novembre 2026

## Regole di squadra
Chi chiude o cambia qualcosa aggiorna da sé le proprie voci, senza aspettare il giro del punteggio. A fine lavoro: (1) in docs/bug-beta.md sposta in 'Bug risolti' i bug che hai chiuso (ID, data, chi, commit) o correggi stato e gravità di quelli che hai toccato; (2) se hai cambiato lo stato di bug, compiti, PR o decisioni, ritocca le voci corrispondenti della Sala del Team: leggi la pagina pubblicata con Artifact (action read, url https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv), modifica SOLO le voci toccate dell'oggetto DATA (bugs, solved, running, decisions, la riga del tuo ruolo in team) nel file docs/sala/sala-team.html di main copiato fuori dal repo, controlla che il JavaScript resti valido e ripubblica con Artifact sullo stesso url, senza icona nuova e senza commit del file. Fallo solo se qualcosa è davvero cambiato, in una modifica sola, e nel diario scrivi 'Sala aggiornata' o il motivo se non ci sei riuscito. Vale per sviluppo, designer, tester e leader.

## Stato dell'app
- Live = main (`CACHE` `grimoire-ds1115b`, commit 31b3a89). Controllo con Chromium a 1440x900 e 390x844 in locale: carica, scrollWidth uguale alla finestra, console senza errori. Niente di rotto da ieri.
- Punteggio totale **+285, tendenza ↑** (ieri +244). Test **288/289**; nessuna sezione rossa, nessuna regressione. Dieci sezioni VERDI, quattro GIALLE (Caratteristiche, Level up, Telefono, Robustezza: gialle solo perché non hanno ancora 3 giorni di verde).
- Aperti: B-031 [bassa, Grappler senza +1], B-020 [bassa, import enorme lento], B-011 [bassa, da decidere]. B-044..B-048 e B-032 chiusi ieri e confermati dai test.
- Poco lavoro sui bug: la settimana serve a far crescere l'app e a cercare bug nuovi nelle zone meno provate.

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| Level up e multiclasse | 🟡 GIALLO | MEDIO | frontend | B-031 (unico test rosso) |
| Robustezza | 🟡 GIALLO | MEDIO | backend | verde da 1 giorno; B-020 |
| Telefono | 🟡 GIALLO | MEDIO | designer | verde da 1 giorno; scaffale eroi |
| Caratteristiche | 🟡 GIALLO | MEDIO | frontend | verde, serve 3 giorni |
| Eroe, Combattimento, Incontro, Tratti, Incantesimi, Zaino, Cronaca, Biblioteca, Workshop, Import/export | 🟢 VERDE | BASSO | tester | solo controlli leggeri, niente test nuovi |

## Oggi
Zone di index.html oggi: **Backend** (per primo) possiede `brewImport`, `ingest5`, `buildIndex`, `sw.js` e il registro di versione. **Frontend** (dopo) possiede `applyLevelUp` (ramo `feat`) e la finestra Level up. **Designer** solo CSS e `docs/design/`, fuori dalla finestra Level up. Nessuno esce dalla propria zona.

- **Sviluppo 10:23, una sessione, prima BACKEND** · **B-020**: `brewImport` con `Map` per i duplicati e un'unica passata, così 20.000 voci stanno sotto i 5 s (oggi 109 s); se non basta, limite con messaggio. *Fatto* = test B-020 in `workshop` verde (misura di tempo), `importexport`/`biblioteca` senza regressioni, bug in "Risolti", `CACHE` alzata. Poi, se resta tempo, avviso "New version available" quando sw.js trova un index.html nuovo (solo client).
- **Sviluppo, poi FRONTEND** · **B-031**: nel ramo `feat` di `applyLevelUp` i talenti con aumento di caratteristica (Grappler, ecc., SRD 5.2.1) chiedono nella finestra Level up quale caratteristica alzare (+1, massimo 20) e la applicano. *Fatto* = test B-031 verde, `levelup`/`caratteristiche`/`telefono` senza regressioni, finestra usabile a 390 px, log.
- **Designer 14:13 · "Death Saves" tagliato in stampa A4** (backlog 8), poi indizio di scorrimento sullo scaffale eroi a telefono. Solo CSS, fuori dalla finestra Level up. *Fatto* = screenshot in docs/design/, `telefono` senza nuove rotture.
- **Distruttore 21:07 · Level up e Import/export**: Level up a ripetizione (livelli 1→20, multiclasse, talenti con scelta) dopo il fix di B-031, import di eroi con campi strani. *Fatto* = diario, bug nuovi con passi e test.
- **Power user 21:37 · Combattimento e Incontro a 390 px**: una serata di gioco, Cleric 5 con riposi, incantesimi concentrazione, incontro con 6 creature. *Fatto* = diario con numeri, bug solo se riproducibili.
- **Test e punteggio (domani 8:47)**: test per ciò che si chiude oggi; niente test nuovi nelle sezioni VERDI.

## Backlog (ordinato)
**Backend**
1. B-020 (oggi). 2. Avviso "New version available" da sw.js. 3. Prova di login e sync reali (sola lettura, serve rete verso Supabase). 4. B-011: l'import deve rispettare `FREE_BREW`? (oggi app gratuita, non applicabile).
**Frontend**
5. B-031 (oggi). 6. Variante di B-032: Level up nel mezzo dopo un danno fa perdere `hp.conAdj`.
**Design**
7. Scaffale eroi a telefono con indizio di scorrimento. 8. "Death Saves" tagliato in stampa A4.
9. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali con brevi spiegazioni, avvio dal menu, saltabile): designer + frontend dopo il 23/11, o prima se tutte le sezioni sono VERDI (oggi 10 su 14: probabile da mercoledì 18).
10. Bozza di post in docs/promo/ (solo bozza, nessuna pubblicazione) ora che non ci sono bug alti.

## Regole per tutti
- Solo SRD 5.2.1; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- Nessuna PR aperta (ultima unita: #23). Keep-alive Supabase: workflow già su main; da controllare quando puoi: GitHub → Actions → "supabase-keepalive" → Run workflow, deve rispondere 2xx (da qui non raggiungo Supabase).
- Decisione facoltativa: aprire nella rete dell'ambiente l'host Supabase per provare login e sync.
