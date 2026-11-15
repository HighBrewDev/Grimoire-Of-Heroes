# Scoreboard di Grimoire of Heroes

Aggiornato il **2026-11-15** sul commit `6777c04` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.

## Regole (sono la legge per tutto il team)

- Test superato **+1**, test fallito **−3**.
- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.
- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.
- Test che passava ieri e oggi fallisce (regressione): **−5** in più.
- Stato: **ROSSO** se il punteggio di oggi è negativo o c'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.
- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l'app è sbagliata: si corregge l'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.
- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.

## Oggi

- Test superati: **274 / 281**
- Punteggio totale: **+244**, tendenza ↓ (ieri 253)
- Sezioni rosse: nessuna

| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |
|---|---:|---:|:---:|---:|---|---|
| Eroe (creazione, nome, specie, background) | +21 | 16,1 | = | 21/21 | — | 🟡 GIALLO |
| Caratteristiche (punteggi, modificatori, TS, abilità) | +17 | 11,3 | ↑ | 20/21 | B-032 (bassa) | 🟡 GIALLO |
| Combattimento (PF, CA, attacchi, riposi) | +32 | 22,9 | ↓ | 33/33 | B-045 (bassa) | 🟢 VERDE |
| Incontro (iniziativa, round) | +14 | 11,6 | = | 14/14 | — | 🟢 VERDE |
| Tratti e talenti | +18 | 10,6 | ↑ | 18/18 | — | 🟢 VERDE |
| Incantesimi (slot, preparati, multiclasse) | +13 | 11,6 | = | 13/13 | — | 🟢 VERDE |
| Zaino e monete | +12 | 12 | ↓ | 13/13 | B-046 (bassa) | 🟢 VERDE |
| Cronaca | +17 | 9,6 | ↑ | 17/17 | — | 🟢 VERDE |
| Biblioteca (ricerca regole) | +16 | 10 | ↑ | 16/16 | — | 🟢 VERDE |
| Workshop homebrew | +25 | 23,3 | = | 26/26 | B-047 (bassa), B-020 (bassa), B-011 (bassa) | 🟢 VERDE |
| Level up e multiclasse | +20 | 13,7 | = | 23/24 | B-031 (bassa) | 🟡 GIALLO |
| Import/export e salvataggio | +16 | 14,7 | ↓ | 21/21 | B-044 (alta) | 🟡 GIALLO |
| Telefono (390x844) | +13 | 8,1 | ↓ | 17/18 | B-048 (UX) | 🟡 GIALLO |
| Robustezza (console, offline, input strani) | +10 | 9,7 | ↓ | 22/26 | — | 🟡 GIALLO |

## Dettaglio delle sezioni

- **robustezza** +10 (22 × +1, 4 × −3)
  - ✗ B-044 un pacchetto 5etools con `source` come oggetto con `toString` non blocca l'avvio dell'app alla ricarica: dopo la ricarica non c'è nessun capitolo (0 segnalibri): l'app non si avvia più. Errori: Cannot convert object to primitive value / Cannot convert object to primitive value
  - ✗ B-045 una voce 5etools con `ac` numerico (non array) si apre nella Biblioteca senza errori: errore di pagina: (o.ac // []).map is not a function
  - ✗ B-046 una voce 5etools con `source` non testuale non rompe la ricerca della Biblioteca: errore di pagina: (e.k // "").toLowerCase is not a function
  - ✗ B-047 homebrew: incantesimo con `lv` e `cls` come oggetti con `toString`: nessun errore di pagina e un messaggio: errore di pagina: Cannot convert object to primitive value
- **zaino** +12 (13 × +1, 0 × −3, bug nuovi -1)
  - Bug nuovo B-046 [bassa] -1: Biblioteca: una voce 5etools con `source` non testuale (numero, array) rompe la ricerca della sua categoria
- **telefono** +13 (17 × +1, 1 × −3, bug nuovi -1)
  - ✗ B-048 tocco ≥44 px: pulsanti Roll dei tratti di classe: sotto 44 px: "1d10" 36×24, "1d10" 36×24, "d20" 28×24
  - Bug nuovo B-048 [bassa, UX] -1: Telefono: i pulsanti dei dadi nei tratti sono 28×24 e 36×24 px, i chip delle regole 20 px di altezza
- **incantesimi** +13 (13 × +1, 0 × −3): tutto verde oggi.
- **incontro** +14 (14 × +1, 0 × −3): tutto verde oggi.
- **biblioteca** +16 (16 × +1, 0 × −3): tutto verde oggi.
- **importexport** +16 (21 × +1, 0 × −3, bug nuovi -5)
  - Bug nuovo B-044 [alta] -5: Biblioteca: un file 5etools con `source` (o `cls`) come oggetto con `toString` blocca l'avvio dell'app per sempre
- **caratteristiche** +17 (20 × +1, 1 × −3)
  - ✗ B-032 Cos abbassata fino al minimo, poi un danno, poi rialzata: i PF massimi tornano 82, non di più (Mago 20): Cos 10 → 1, danno 5, Cos 10: PF 115/120 invece di 77/82
- **cronaca** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **tratti** +18 (18 × +1, 0 × −3): tutto verde oggi.
- **levelup** +20 (23 × +1, 1 × −3)
  - ✗ B-031 talento Grappler al livello 4: +1 a Forza o Destrezza: For 16, Des 14 (prima 16 e 14)
- **eroe** +21 (21 × +1, 0 × −3): tutto verde oggi.
- **workshop** +25 (26 × +1, 0 × −3, bug nuovi -1)
  - Bug nuovo B-047 [bassa] -1: Import homebrew: oggetti con `toString` in altri campi (incantesimi `cls`/`lv`, talenti) fanno sparire l'import senza messaggio (resto di B-043)
- **combattimento** +32 (33 × +1, 0 × −3, bug nuovi -1)
  - Bug nuovo B-045 [bassa] -1: Biblioteca: una voce 5etools con un campo del tipo sbagliato (`ac: 15`, `trait` non array, `will` non array…) non si apre e non dice nulla

## Classifica (dalla peggiore alla migliore)

1. robustezza +10 · 22/26 · GIALLO
2. zaino +12 · 13/13 · VERDE
3. telefono +13 · 17/18 · GIALLO
4. incantesimi +13 · 13/13 · VERDE
5. incontro +14 · 14/14 · VERDE
6. biblioteca +16 · 16/16 · VERDE
7. importexport +16 · 21/21 · GIALLO
8. caratteristiche +17 · 20/21 · GIALLO
9. cronaca +17 · 17/17 · VERDE
10. tratti +18 · 18/18 · VERDE
11. levelup +20 · 23/24 · GIALLO
12. eroe +21 · 21/21 · GIALLO
13. workshop +25 · 26/26 · VERDE
14. combattimento +32 · 33/33 · VERDE

## Storico

```
2026-11-09  totale  +107  test 140/154  1028d8d
2026-11-10  totale  +105  test 169/186  b44618f
2026-11-11  totale  +173  test 208/225  cc5634e
2026-11-12  totale  +208  test 226/235  afc1c73
2026-11-13  totale  +206  test 238/247  f77121d
2026-11-14  totale  +253  test 253/255  f45e295
2026-11-15  totale  +244  test 274/281  6777c04
```
