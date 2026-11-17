# Scoreboard di Grimoire of Heroes

Aggiornato il **2026-11-17** sul commit `6258d74` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.

## Regole (sono la legge per tutto il team)

- Test superato **+1**, test fallito **−3**.
- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.
- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.
- Test che passava ieri e oggi fallisce (regressione): **−5** in più.
- Stato: **ROSSO** se il punteggio di oggi è negativo o c'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.
- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l'app è sbagliata: si corregge l'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.
- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.

## Oggi

- Test superati: **345 / 347**
- Punteggio totale: **+335**, tendenza ↑ (ieri 309)
- Sezioni rosse: nessuna

| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |
|---|---:|---:|:---:|---:|---|---|
| Eroe (creazione, nome, specie, background) | +21 | 18,7 | = | 21/21 | — | 🟢 VERDE |
| Caratteristiche (punteggi, modificatori, TS, abilità) | +21 | 15 | = | 21/21 | — | 🟡 GIALLO |
| Combattimento (PF, CA, attacchi, riposi) | +35 | 30,6 | = | 35/35 | — | 🟢 VERDE |
| Incontro (iniziativa, round) | +17 | 12,9 | ↑ | 17/17 | — | 🟢 VERDE |
| Tratti e talenti | +18 | 13,4 | = | 18/18 | — | 🟢 VERDE |
| Incantesimi (slot, preparati, multiclasse) | +17 | 12,9 | ↑ | 17/17 | — | 🟢 VERDE |
| Zaino e monete | +13 | 13,7 | ↓ | 18/19 | B-052 (media) | 🟡 GIALLO |
| Cronaca | +17 | 12,4 | = | 17/17 | — | 🟢 VERDE |
| Biblioteca (ricerca regole) | +16 | 12,3 | = | 16/16 | — | 🟢 VERDE |
| Workshop homebrew | +32 | 27,1 | ↑ | 32/32 | B-011 (bassa) | 🟢 VERDE |
| Level up e multiclasse | +26 | 21,4 | = | 26/26 | — | 🟡 GIALLO |
| Import/export e salvataggio | +19 | 18,1 | ↓ | 21/21 | B-053 (media) | 🟢 VERDE |
| Telefono (390x844) | +23 | 17,6 | = | 23/23 | — | 🟡 GIALLO |
| Robustezza (console, offline, input strani) | +24 | 13,9 | ↓ | 27/28 | — | 🟡 GIALLO |
| npc | +13 | 13 | — | 13/13 | — | 🟡 GIALLO |
| sincronia | +12 | 12 | = | 12/12 | — | 🟡 GIALLO |
| ticket | +11 | 11 | — | 11/11 | — | 🟡 GIALLO |

## Dettaglio delle sezioni

- **ticket** +11 (11 × +1, 0 × −3): tutto verde oggi.
- **sincronia** +12 (12 × +1, 0 × −3): tutto verde oggi.
- **zaino** +13 (18 × +1, 1 × −3, bug nuovi -2)
  - ✗ B-052 Denari: Spend con la moneta scelta come più grande e senza spiccioli dice "Not enough" anche se il saldo basta: 41 gp + 3 cp, 2,22 gp
  - Bug nuovo B-052 [media] -2: Denari: "Spend" dice "Not enough money" anche se il saldo basta, quando non c'è una moneta più grande o abbastanza spiccioli
- **npc** +13 (13 × +1, 0 × −3): tutto verde oggi.
- **biblioteca** +16 (16 × +1, 0 × −3): tutto verde oggi.
- **incontro** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **incantesimi** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **cronaca** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **tratti** +18 (18 × +1, 0 × −3): tutto verde oggi.
- **importexport** +19 (21 × +1, 0 × −3, bug nuovi -2)
  - Bug nuovo B-053 [media] -2: Salvataggio locale danneggiato: all'avvio compaiono gli eroi di esempio e la prima modifica cancella i dati veri senza avviso né copia
- **eroe** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **caratteristiche** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **telefono** +23 (23 × +1, 0 × −3): tutto verde oggi.
- **robustezza** +24 (27 × +1, 1 × −3)
  - ✗ B-053 salvataggio danneggiato (JSON troncato): all’avvio compaiono gli eroi di esempio e la prima modifica cancella i dati senza avviso né copia: né avviso né copia del salvataggio danneggiato: la prima modifica lo sovrascrive
- **levelup** +26 (26 × +1, 0 × −3): tutto verde oggi.
- **workshop** +32 (32 × +1, 0 × −3): tutto verde oggi.
- **combattimento** +35 (35 × +1, 0 × −3): tutto verde oggi.

## Classifica (dalla peggiore alla migliore)

1. ticket +11 · 11/11 · GIALLO
2. sincronia +12 · 12/12 · GIALLO
3. zaino +13 · 18/19 · GIALLO
4. npc +13 · 13/13 · GIALLO
5. biblioteca +16 · 16/16 · VERDE
6. incontro +17 · 17/17 · VERDE
7. incantesimi +17 · 17/17 · VERDE
8. cronaca +17 · 17/17 · VERDE
9. tratti +18 · 18/18 · VERDE
10. importexport +19 · 21/21 · VERDE
11. eroe +21 · 21/21 · VERDE
12. caratteristiche +21 · 21/21 · GIALLO
13. telefono +23 · 23/23 · GIALLO
14. robustezza +24 · 27/28 · GIALLO
15. levelup +26 · 26/26 · GIALLO
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
```
