# Scoreboard di Grimoire of Heroes

Aggiornato il **2026-11-16** sul commit `922693f` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.

## Regole (sono la legge per tutto il team)

- Test superato **+1**, test fallito **−3**.
- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.
- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.
- Test che passava ieri e oggi fallisce (regressione): **−5** in più.
- Stato: **ROSSO** se il punteggio di oggi è negativo o c'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.
- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l'app è sbagliata: si corregge l'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.
- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.

## Oggi

- Test superati: **315 / 315**
- Punteggio totale: **+309**, tendenza ↑ (ieri 244)
- Sezioni rosse: nessuna

| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |
|---|---:|---:|:---:|---:|---|---|
| Eroe (creazione, nome, specie, background) | +21 | 17,3 | = | 21/21 | — | 🟢 VERDE |
| Caratteristiche (punteggi, modificatori, TS, abilità) | +21 | 13,1 | ↑ | 21/21 | — | 🟡 GIALLO |
| Combattimento (PF, CA, attacchi, riposi) | +35 | 26,9 | ↑ | 35/35 | — | 🟢 VERDE |
| Incontro (iniziativa, round) | +14 | 12 | = | 14/14 | — | 🟢 VERDE |
| Tratti e talenti | +18 | 12 | = | 18/18 | — | 🟢 VERDE |
| Incantesimi (slot, preparati, multiclasse) | +14 | 12 | ↑ | 14/14 | — | 🟢 VERDE |
| Zaino e monete | +16 | 12,7 | ↑ | 18/18 | — | 🟢 VERDE |
| Cronaca | +17 | 11 | = | 17/17 | — | 🟢 VERDE |
| Biblioteca (ricerca regole) | +16 | 11,1 | = | 16/16 | — | 🟢 VERDE |
| Workshop homebrew | +30 | 25,6 | ↑ | 32/32 | B-011 (bassa) | 🟢 VERDE |
| Level up e multiclasse | +26 | 16,4 | ↑ | 26/26 | — | 🟡 GIALLO |
| Import/export e salvataggio | +21 | 15,6 | ↑ | 21/21 | — | 🟢 VERDE |
| Telefono (390x844) | +23 | 14,4 | ↑ | 23/23 | — | 🟡 GIALLO |
| Robustezza (console, offline, input strani) | +25 | 12,1 | ↑ | 27/27 | — | 🟡 GIALLO |
| sincronia | +12 | 12 | — | 12/12 | — | 🟡 GIALLO |

## Dettaglio delle sezioni

- **sincronia** +12 (12 × +1, 0 × −3): tutto verde oggi.
- **incontro** +14 (14 × +1, 0 × −3): tutto verde oggi.
- **incantesimi** +14 (14 × +1, 0 × −3): tutto verde oggi.
- **zaino** +16 (18 × +1, 0 × −3, bug nuovi -2)
  - Bug nuovo B-051 [media, UX] -2: Nessun calcolo dei denari: cambiare monete a mano
- **biblioteca** +16 (16 × +1, 0 × −3): tutto verde oggi.
- **cronaca** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **tratti** +18 (18 × +1, 0 × −3): tutto verde oggi.
- **eroe** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **caratteristiche** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **importexport** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **telefono** +23 (23 × +1, 0 × −3): tutto verde oggi.
- **robustezza** +25 (27 × +1, 0 × −3, bug nuovi -2)
  - Bug nuovo B-050 [media, UX] -2: Danni e cure: nessun controllo −/+ e la quantità tornava a 5 dopo ogni azione
- **levelup** +26 (26 × +1, 0 × −3): tutto verde oggi.
- **workshop** +30 (32 × +1, 0 × −3, bug nuovi -2)
  - Bug nuovo B-049 [media, UX] -2: Import Markdown troppo rigido: richiede `# Class: Nome`, `## Features`, livelli esatti e niente entità HTML
- **combattimento** +35 (35 × +1, 0 × −3): tutto verde oggi.

## Classifica (dalla peggiore alla migliore)

1. sincronia +12 · 12/12 · GIALLO
2. incontro +14 · 14/14 · VERDE
3. incantesimi +14 · 14/14 · VERDE
4. zaino +16 · 18/18 · VERDE
5. biblioteca +16 · 16/16 · VERDE
6. cronaca +17 · 17/17 · VERDE
7. tratti +18 · 18/18 · VERDE
8. eroe +21 · 21/21 · VERDE
9. caratteristiche +21 · 21/21 · GIALLO
10. importexport +21 · 21/21 · VERDE
11. telefono +23 · 23/23 · GIALLO
12. robustezza +25 · 27/27 · GIALLO
13. levelup +26 · 26/26 · GIALLO
14. workshop +30 · 32/32 · VERDE
15. combattimento +35 · 35/35 · VERDE

## Storico

```
2026-11-09  totale  +107  test 140/154  1028d8d
2026-11-10  totale  +105  test 169/186  b44618f
2026-11-11  totale  +173  test 208/225  cc5634e
2026-11-12  totale  +208  test 226/235  afc1c73
2026-11-13  totale  +206  test 238/247  f77121d
2026-11-14  totale  +253  test 253/255  f45e295
2026-11-15  totale  +244  test 274/281  6777c04
2026-11-16  totale  +309  test 315/315  922693f
```
