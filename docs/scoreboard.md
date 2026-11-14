# Scoreboard di Grimoire of Heroes

Aggiornato il **2026-11-14** sul commit `f45e295` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.

## Regole (sono la legge per tutto il team)

- Test superato **+1**, test fallito **−3**.
- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.
- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.
- Test che passava ieri e oggi fallisce (regressione): **−5** in più.
- Stato: **ROSSO** se il punteggio di oggi è negativo o c'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.
- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l'app è sbagliata: si corregge l'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.
- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.

## Oggi

- Test superati: **253 / 255**
- Punteggio totale: **+253**, tendenza ↑ (ieri 206)
- Sezioni rosse: nessuna

| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |
|---|---:|---:|:---:|---:|---|---|
| Eroe (creazione, nome, specie, background) | +21 | 15,3 | ↑ | 21/21 | B-034 (bassa) | 🟡 GIALLO |
| Caratteristiche (punteggi, modificatori, TS, abilità) | +12 | 10,3 | = | 15/16 | B-032 (bassa) | 🟡 GIALLO |
| Combattimento (PF, CA, attacchi, riposi) | +33 | 21,3 | = | 33/33 | — | 🟢 VERDE |
| Incontro (iniziativa, round) | +14 | 11,2 | = | 14/14 | — | 🟡 GIALLO |
| Tratti e talenti | +13 | 9,3 | ↑ | 13/13 | — | 🟢 VERDE |
| Incantesimi (slot, preparati, multiclasse) | +13 | 11,3 | ↑ | 13/13 | — | 🟢 VERDE |
| Zaino e monete | +13 | 12 | = | 13/13 | — | 🟢 VERDE |
| Cronaca | +12 | 8,3 | ↑ | 12/12 | — | 🟢 VERDE |
| Biblioteca (ricerca regole) | +11 | 9 | = | 11/11 | — | 🟢 VERDE |
| Workshop homebrew | +25 | 23 | ↓ | 26/26 | B-043 (bassa), B-020 (bassa), B-011 (bassa) | 🟢 VERDE |
| Level up e multiclasse | +20 | 12,7 | ↑ | 23/24 | B-031 (bassa), B-033 (bassa) | 🟡 GIALLO |
| Import/export e salvataggio | +25 | 14,5 | ↑ | 21/21 | B-042 (alta) | 🟡 GIALLO |
| Telefono (390x844) | +17 | 7,3 | = | 17/17 | — | 🟢 VERDE |
| Robustezza (console, offline, input strani) | +24 | 9,7 | ↑ | 21/21 | — | 🟡 GIALLO |

## Dettaglio delle sezioni

- **biblioteca** +11 (11 × +1, 0 × −3): tutto verde oggi.
- **caratteristiche** +12 (15 × +1, 1 × −3)
  - ✗ B-032 Cos abbassata fino al minimo, poi un danno, poi rialzata: i PF massimi tornano 82, non di più (Mago 20): Cos 10 → 1, danno 5, Cos 10: PF 115/120 invece di 77/82
- **cronaca** +12 (12 × +1, 0 × −3): tutto verde oggi.
- **tratti** +13 (13 × +1, 0 × −3): tutto verde oggi.
- **incantesimi** +13 (13 × +1, 0 × −3): tutto verde oggi.
- **zaino** +13 (13 × +1, 0 × −3): tutto verde oggi.
- **incontro** +14 (14 × +1, 0 × −3): tutto verde oggi.
- **telefono** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **levelup** +20 (23 × +1, 1 × −3)
  - ✗ B-031 talento Grappler al livello 4: +1 a Forza o Destrezza: For 16, Des 14 (prima 16 e 14)
- **eroe** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **robustezza** +24 (21 × +1, 0 × −3, bug chiusi +3)
  - Bug chiuso B-029 con test che passa +3: Solo tastiera: Tab esce dalla finestra Level up e il livello finisce su un altro eroe
- **workshop** +25 (26 × +1, 0 × −3, bug nuovi -1)
  - Bug nuovo B-043 [bassa] -1: Import homebrew: un incantesimo con la scuola (`sc`) come oggetto con `toString` blocca l'import senza messaggio
- **importexport** +25 (21 × +1, 0 × −3, bug nuovi -5, bug chiusi +9)
  - Bug nuovo B-042 [alta] -5: XSS: `page` e `passive` di un file 5etools importato nella Biblioteca eseguono codice (resto di B-041)
  - Bug chiuso B-041 con test che passa +3: XSS guardado: un file 5etools importato nella Biblioteca con HTML in livello, scuola, tabelle, forza o slot esegue codice a ogni apertura della voce
  - Bug chiuso B-039 con test che passa +3: XSS guardado: l'import di un eroe con `q` (quantità di un oggetto) o `condDur` (durata di una condizione) come testo HTML esegue codice
  - Bug chiuso B-038 con test che passa +3: Import: i contatori delle risorse (`res`) accettano negativi, frazioni e testo
- **combattimento** +33 (33 × +1, 0 × −3): tutto verde oggi.

## Classifica (dalla peggiore alla migliore)

1. biblioteca +11 · 11/11 · VERDE
2. caratteristiche +12 · 15/16 · GIALLO
3. cronaca +12 · 12/12 · VERDE
4. tratti +13 · 13/13 · VERDE
5. incantesimi +13 · 13/13 · VERDE
6. zaino +13 · 13/13 · VERDE
7. incontro +14 · 14/14 · GIALLO
8. telefono +17 · 17/17 · VERDE
9. levelup +20 · 23/24 · GIALLO
10. eroe +21 · 21/21 · GIALLO
11. robustezza +24 · 21/21 · GIALLO
12. workshop +25 · 26/26 · VERDE
13. importexport +25 · 21/21 · GIALLO
14. combattimento +33 · 33/33 · VERDE

## Storico

```
2026-11-09  totale  +107  test 140/154  1028d8d
2026-11-10  totale  +105  test 169/186  b44618f
2026-11-11  totale  +173  test 208/225  cc5634e
2026-11-12  totale  +208  test 226/235  afc1c73
2026-11-13  totale  +206  test 238/247  f77121d
2026-11-14  totale  +253  test 253/255  f45e295
```
