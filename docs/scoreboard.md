# Scoreboard di Grimoire of Heroes

Aggiornato il **2026-11-18** sul commit `ce2d031` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.

## Regole (sono la legge per tutto il team)

- Test superato **+1**, test fallito **−3**.
- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.
- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.
- Test che passava ieri e oggi fallisce (regressione): **−5** in più.
- Stato: **ROSSO** se il punteggio di oggi è negativo o c'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.
- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l'app è sbagliata: si corregge l'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.
- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.

## Oggi

- Test superati: **356 / 357**
- Punteggio totale: **+358**, tendenza ↑ (ieri 335)
- Sezioni rosse: nessuna

| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |
|---|---:|---:|:---:|---:|---|---|
| Eroe (creazione, nome, specie, background) | +21 | 20,3 | = | 21/21 | — | 🟢 VERDE |
| Caratteristiche (punteggi, modificatori, TS, abilità) | +21 | 16,6 | = | 21/21 | — | 🟢 VERDE |
| Combattimento (PF, CA, attacchi, riposi) | +35 | 35 | = | 35/35 | — | 🟢 VERDE |
| Incontro (iniziativa, round) | +17 | 14,3 | = | 17/17 | — | 🟢 VERDE |
| Tratti e talenti | +18 | 14,9 | = | 18/18 | — | 🟢 VERDE |
| Incantesimi (slot, preparati, multiclasse) | +17 | 13,7 | = | 17/17 | — | 🟢 VERDE |
| Zaino e monete | +21 | 14,4 | ↑ | 21/21 | — | 🟡 GIALLO |
| Cronaca | +17 | 13,9 | = | 17/17 | — | 🟢 VERDE |
| Biblioteca (ricerca regole) | +16 | 13,4 | = | 16/16 | — | 🟢 VERDE |
| Workshop homebrew | +32 | 28 | = | 32/32 | B-011 (bassa) | 🟢 VERDE |
| Level up e multiclasse | +26 | 21,4 | = | 26/26 | — | 🟢 VERDE |
| Import/export e salvataggio | +23 | 18,1 | ↑ | 21/21 | B-054 (bassa) | 🟢 VERDE |
| Telefono (390x844) | +23 | 19,4 | = | 23/23 | — | 🟢 VERDE |
| Robustezza (console, offline, input strani) | +28 | 16,9 | ↑ | 28/29 | — | 🟡 GIALLO |
| npc | +17 | 15 | ↑ | 17/17 | — | 🟡 GIALLO |
| sincronia | +12 | 12 | = | 12/12 | — | 🟢 VERDE |
| ticket | +14 | 12,5 | ↑ | 14/14 | — | 🟡 GIALLO |

## Dettaglio delle sezioni

- **sincronia** +12 (12 × +1, 0 × −3): tutto verde oggi.
- **ticket** +14 (14 × +1, 0 × −3): tutto verde oggi.
- **biblioteca** +16 (16 × +1, 0 × −3): tutto verde oggi.
- **incontro** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **incantesimi** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **cronaca** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **npc** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **tratti** +18 (18 × +1, 0 × −3): tutto verde oggi.
- **eroe** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **caratteristiche** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **zaino** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **importexport** +23 (21 × +1, 0 × −3, bug nuovi -1, bug chiusi +3)
  - Bug nuovo B-054 [bassa] -1: robustezza · Eroe senza `id` nel salvataggio: si vede, ma le modifiche non si salvano
  - Bug chiuso B-053 con test che passa +3: Salvataggio locale danneggiato cancellato senza avviso né copia
- **telefono** +23 (23 × +1, 0 × −3): tutto verde oggi.
- **levelup** +26 (26 × +1, 0 × −3): tutto verde oggi.
- **robustezza** +28 (28 × +1, 1 × −3, bug chiusi +3)
  - ✗ B-054 eroe senza id nel salvataggio (modificato a mano o vecchio): si vede ma le modifiche non vengono salvate: la modifica del nome non è nel salvataggio dopo la ricarica
  - Bug chiuso B-052 con test che passa +3: Denari: "Spend" rifiuta pagamenti validi
- **workshop** +32 (32 × +1, 0 × −3): tutto verde oggi.
- **combattimento** +35 (35 × +1, 0 × −3): tutto verde oggi.

## Classifica (dalla peggiore alla migliore)

1. sincronia +12 · 12/12 · VERDE
2. ticket +14 · 14/14 · GIALLO
3. biblioteca +16 · 16/16 · VERDE
4. incontro +17 · 17/17 · VERDE
5. incantesimi +17 · 17/17 · VERDE
6. cronaca +17 · 17/17 · VERDE
7. npc +17 · 17/17 · GIALLO
8. tratti +18 · 18/18 · VERDE
9. eroe +21 · 21/21 · VERDE
10. caratteristiche +21 · 21/21 · VERDE
11. zaino +21 · 21/21 · GIALLO
12. importexport +23 · 21/21 · VERDE
13. telefono +23 · 23/23 · VERDE
14. levelup +26 · 26/26 · VERDE
15. robustezza +28 · 28/29 · GIALLO
16. workshop +32 · 32/32 · VERDE
17. combattimento +35 · 35/35 · VERDE

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
2026-11-17  totale  +335  test 345/347  6258d74
2026-11-18  totale  +358  test 356/357  ce2d031
```
