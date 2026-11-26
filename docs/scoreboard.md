# Scoreboard di Grimoire of Heroes

Aggiornato il **2026-11-26** sul commit `287b0b8` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.

## Regole (sono la legge per tutto il team)

- Test superato **+1**, test fallito **−3**.
- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.
- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.
- Test che passava ieri e oggi fallisce (regressione): **−5** in più.
- Stato: **ROSSO** se il punteggio di oggi è negativo o c'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.
- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l'app è sbagliata: si corregge l'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.
- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.

## Oggi

- Test superati: **415 / 416**
- Punteggio totale: **+410**, tendenza ↑ (ieri 373)
- Sezioni rosse: armi-incantesimi

| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |
|---|---:|---:|:---:|---:|---|---|
| Eroe (creazione, nome, specie, background) | +21 | 21 | = | 21/21 | — | 🟢 VERDE |
| Caratteristiche (punteggi, modificatori, TS, abilità) | +21 | 21 | = | 21/21 | — | 🟢 VERDE |
| Combattimento (PF, CA, attacchi, riposi) | +44 | 31,5 | ↑ | 41/41 | — | 🟡 GIALLO |
| Incontro (iniziativa, round) | +17 | 17 | = | 17/17 | — | 🟢 VERDE |
| Tratti e talenti | +19 | 19 | = | 19/19 | — | 🟢 VERDE |
| Incantesimi (slot, preparati, multiclasse) | +24 | 22 | ↑ | 24/24 | — | 🟢 VERDE |
| Zaino e monete | +21 | 21 | = | 21/21 | — | 🟢 VERDE |
| Cronaca | +17 | 17 | = | 17/17 | — | 🟢 VERDE |
| Biblioteca (ricerca regole) | +16 | 16 | = | 16/16 | — | 🟢 VERDE |
| Workshop homebrew | +34 | 33,5 | ↑ | 34/34 | B-011 (bassa) | 🟢 VERDE |
| Level up e multiclasse | +26 | 26 | = | 26/26 | — | 🟢 VERDE |
| Import/export e salvataggio | +21 | 21 | = | 21/21 | — | 🟢 VERDE |
| Telefono (390x844) | +23 | 18 | ↑ | 23/23 | — | 🟡 GIALLO |
| Robustezza (console, offline, input strani) | +31 | 30 | ↑ | 31/31 | — | 🟡 GIALLO |
| armi-incantesimi | -3 | 1,5 | ↓ | 5/6 | — | 🔴 ROSSO |
| beneficiClasse | +3 | 1 | ↑ | 3/3 | — | 🟡 GIALLO |
| equipaggiamento | +18 | 18 | = | 18/18 | — | 🟡 GIALLO |
| import5etoolsClassi | +4 | 4 | = | 4/4 | — | 🟡 GIALLO |
| import5etools | +10 | 10 | = | 10/10 | — | 🟡 GIALLO |
| npc | +17 | 17 | = | 17/17 | — | 🟢 VERDE |
| sincronia | +12 | 12 | = | 12/12 | — | 🟢 VERDE |
| ticket | +14 | 14 | = | 14/14 | — | 🟢 VERDE |

## Dettaglio delle sezioni

- **armi-incantesimi** -3 (5 × +1, 1 × −3, 1 × −5)
  - ✗ incantesimo homebrew: picker di tiro salvezza, dadi, area e scaling scrivono la riga di regole **(regressione, −5)**: Checks ⚠ On no class list: heroes will only find it by searching. ⚠ No effect text. Ember Nova Homebrew Level 3 Evocation
- **beneficiClasse** +3 (3 × +1, 0 × −3): tutto verde oggi.
- **import5etoolsClassi** +4 (4 × +1, 0 × −3): tutto verde oggi.
- **import5etools** +10 (10 × +1, 0 × −3): tutto verde oggi.
- **sincronia** +12 (12 × +1, 0 × −3): tutto verde oggi.
- **ticket** +14 (14 × +1, 0 × −3): tutto verde oggi.
- **biblioteca** +16 (16 × +1, 0 × −3): tutto verde oggi.
- **incontro** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **cronaca** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **npc** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **equipaggiamento** +18 (18 × +1, 0 × −3): tutto verde oggi.
- **tratti** +19 (19 × +1, 0 × −3): tutto verde oggi.
- **eroe** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **caratteristiche** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **zaino** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **importexport** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **telefono** +23 (23 × +1, 0 × −3): tutto verde oggi.
- **incantesimi** +24 (24 × +1, 0 × −3): tutto verde oggi.
- **levelup** +26 (26 × +1, 0 × −3): tutto verde oggi.
- **robustezza** +31 (31 × +1, 0 × −3): tutto verde oggi.
- **workshop** +34 (34 × +1, 0 × −3): tutto verde oggi.
- **combattimento** +44 (41 × +1, 0 × −3, bug chiusi +3)
  - Bug chiuso B-055 con test che passa +3: Combattimento: "Add an attack" si richiudeva dopo ogni attacco aggiunto

## Classifica (dalla peggiore alla migliore)

1. armi-incantesimi -3 · 5/6 · ROSSO
2. beneficiClasse +3 · 3/3 · GIALLO
3. import5etoolsClassi +4 · 4/4 · GIALLO
4. import5etools +10 · 10/10 · GIALLO
5. sincronia +12 · 12/12 · VERDE
6. ticket +14 · 14/14 · VERDE
7. biblioteca +16 · 16/16 · VERDE
8. incontro +17 · 17/17 · VERDE
9. cronaca +17 · 17/17 · VERDE
10. npc +17 · 17/17 · VERDE
11. equipaggiamento +18 · 18/18 · GIALLO
12. tratti +19 · 19/19 · VERDE
13. eroe +21 · 21/21 · VERDE
14. caratteristiche +21 · 21/21 · VERDE
15. zaino +21 · 21/21 · VERDE
16. importexport +21 · 21/21 · VERDE
17. telefono +23 · 23/23 · GIALLO
18. incantesimi +24 · 24/24 · VERDE
19. levelup +26 · 26/26 · VERDE
20. robustezza +31 · 31/31 · GIALLO
21. workshop +34 · 34/34 · VERDE
22. combattimento +44 · 41/41 · GIALLO

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
2026-11-25  totale  +373  test 405/410  585a1a5
2026-11-26  totale  +410  test 415/416  287b0b8
```
