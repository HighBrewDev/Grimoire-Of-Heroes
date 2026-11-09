# Suite automatica di Grimoire of Heroes

Playwright (già installato nell'ambiente, niente `npm install`), Chromium, server locale `python3 -m http.server`.
Nessuna richiesta esce da localhost: `config.js` viene sostituito con una configurazione vuota (modalità "solo questo dispositivo", niente Supabase) e ogni altro host è bloccato. `Math.random` ha un seme fisso, quindi i tiri di dado sono ripetibili.

- `node tests/run.js` esegue tutte le sezioni (`tests/sezioni/*.test.js`) e scrive `tests/risultati/AAAA-MM-GG.json`.
- `node tests/punteggio.js` calcola i punteggi e riscrive `docs/scoreboard.md` (storico in `tests/risultati/storico.json`).
- `node tests/run.js telefono zaino` esegue solo alcune sezioni; `node tests/run.js --grep B-005` un solo test. Queste esecuzioni parziali non scrivono risultati.

Ogni file di sezione esporta `{sezione, test:[[nome, async ({open}) => {…}], …]}`. `open(opzioni)` apre l'app in un contesto pulito con tre eroi di prova (`fixtures.js`); opzioni utili: `heroes`, `activeId`, `viewport`, `mobile`, `sw` (service worker attivo), `samples` (nessun eroe salvato), `extra` (altre chiavi di localStorage). Un errore JavaScript non gestito (PAGEERROR) fa fallire il test.

Regole: i test di regressione hanno l'ID del bug all'inizio del nome ("B-012 …"). Non si cambia un test per farlo passare se l'app è sbagliata.
