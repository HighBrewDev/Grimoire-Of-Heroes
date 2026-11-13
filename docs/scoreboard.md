# Scoreboard di Grimoire of Heroes

Aggiornato il **2026-11-13** sul commit `f77121d` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.

## Regole (sono la legge per tutto il team)

- Test superato **+1**, test fallito **−3**.
- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.
- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.
- Test che passava ieri e oggi fallisce (regressione): **−5** in più.
- Stato: **ROSSO** se il punteggio di oggi è negativo o c'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.
- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l'app è sbagliata: si corregge l'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.
- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.

## Oggi

- Test superati: **238 / 247**
- Punteggio totale: **+206**, tendenza ↓ (ieri 208)
- Sezioni rosse: nessuna

| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |
|---|---:|---:|:---:|---:|---|---|
| Eroe (creazione, nome, specie, background) | +17 | 14,2 | ↓ | 20/21 | B-034 (bassa) | 🟡 GIALLO |
| Caratteristiche (punteggi, modificatori, TS, abilità) | +12 | 10 | = | 15/16 | B-032 (bassa) | 🟡 GIALLO |
| Combattimento (PF, CA, attacchi, riposi) | +33 | 19 | ↓ | 33/33 | — | 🟡 GIALLO |
| Incontro (iniziativa, round) | +14 | 10,6 | ↑ | 14/14 | B-037 (bassa) | 🟡 GIALLO |
| Tratti e talenti | +11 | 8,6 | ↑ | 11/11 | — | 🟢 VERDE |
| Incantesimi (slot, preparati, multiclasse) | +11 | 11 | = | 11/11 | — | 🟢 VERDE |
| Zaino e monete | +13 | 11,8 | = | 13/13 | — | 🟢 VERDE |
| Cronaca | +10 | 7,6 | ↑ | 10/10 | — | 🟢 VERDE |
| Biblioteca (ricerca regole) | +11 | 8,6 | ↑ | 11/11 | — | 🟢 VERDE |
| Workshop homebrew | +26 | 22,6 | = | 26/26 | B-020 (bassa), B-011 (bassa) | 🟢 VERDE |
| Level up e multiclasse | +16 | 11,2 | = | 22/24 | B-031 (bassa), B-033 (bassa) | 🟡 GIALLO |
| Import/export e salvataggio | +12 | 12,4 | ↑ | 20/21 | B-041 (alta), B-039 (alta), B-038 (bassa), B-016 (alta) | 🟡 GIALLO |
| Telefono (390x844) | +17 | 5,4 | ↓ | 17/17 | — | 🟡 GIALLO |
| Robustezza (console, offline, input strani) | +3 | 6,8 | ↓ | 15/19 | B-029 (media) | 🟡 GIALLO |

## Dettaglio delle sezioni

- **robustezza** +3 (15 × +1, 4 × −3)
  - ✗ B-029 solo tastiera: Tab nella finestra Level up non esce sugli eroi coperti e il livello va all'eroe del titolo: Kessa è passata al livello 3 dalla finestra "Eldrin reaches level 5" (focus uscito su: omni, theme, wizard, go:library, go:workshop, sound)
  - ✗ B-039 XSS: quantità (q) di un oggetto importato come testo HTML non esegue codice nello Zaino: onerror eseguito: la quantità non è escapata né ridotta a numero
  - ✗ B-039 XSS: durata di una condizione (condDur) importata come testo HTML non esegue codice in Combattimento: onerror eseguito: condDur non è escapato né ridotto a numero
  - ✗ B-041 XSS: un file 5etools importato nella Biblioteca con HTML in livello, scuola, tabelle o PF non esegue codice: onerror eseguito da campi non escapati: rmax, school, rollexact, rmin, level, str, slots, lvkey
- **cronaca** +10 (10 × +1, 0 × −3): tutto verde oggi.
- **tratti** +11 (11 × +1, 0 × −3): tutto verde oggi.
- **incantesimi** +11 (11 × +1, 0 × −3): tutto verde oggi.
- **biblioteca** +11 (11 × +1, 0 × −3): tutto verde oggi.
- **caratteristiche** +12 (15 × +1, 1 × −3)
  - ✗ B-032 Cos abbassata fino al minimo, poi un danno, poi rialzata: i PF massimi tornano 82, non di più (Mago 20): Cos 10 → 1, danno 5, Cos 10: PF 115/120 invece di 77/82
- **importexport** +12 (20 × +1, 1 × −3, bug nuovi -5)
  - ✗ B-038 import con risorse (res) negative, frazionarie o di testo: salvate entro valori sensati e il riposo breve non le rende frazionarie: res.channel_divinity_charges = 1.5 dopo il riposo breve (valori ammessi: interi 0-20)
  - Bug nuovo B-041 [alta] -5: XSS guardado: un file 5etools importato nella Biblioteca con HTML in livello, scuola, tabelle, forza o slot esegue codice a ogni apertura della voce
- **zaino** +13 (13 × +1, 0 × −3): tutto verde oggi.
- **incontro** +14 (14 × +1, 0 × −3): tutto verde oggi.
- **levelup** +16 (22 × +1, 2 × −3)
  - ✗ B-031 talento Grappler al livello 4: +1 a Forza o Destrezza: For 16, Des 14 (prima 16 e 14)
  - ✗ B-033 multiclasse: il menu della classe principale non offre una classe già presente nelle righe (Fighter 3 / Rogue 1): classe doppia dopo aver scelto Rogue come classe principale: Rogue / Rogue
- **eroe** +17 (20 × +1, 1 × −3)
  - ✗ B-034 classe, specie e background che non sono nei menu (homebrew cancellato, import) restano mostrati nei menu: i menu mostrano Barbarian, Dragonborn, Acolyte, Barbarian per un eroe Runecarver / Blood Hunter, Popolo del Muschio, Pirata
- **telefono** +17 (17 × +1, 0 × −3): tutto verde oggi.
- **workshop** +26 (26 × +1, 0 × −3): tutto verde oggi.
- **combattimento** +33 (33 × +1, 0 × −3): tutto verde oggi.

## Classifica (dalla peggiore alla migliore)

1. robustezza +3 · 15/19 · GIALLO
2. cronaca +10 · 10/10 · VERDE
3. tratti +11 · 11/11 · VERDE
4. incantesimi +11 · 11/11 · VERDE
5. biblioteca +11 · 11/11 · VERDE
6. caratteristiche +12 · 15/16 · GIALLO
7. importexport +12 · 20/21 · GIALLO
8. zaino +13 · 13/13 · VERDE
9. incontro +14 · 14/14 · GIALLO
10. levelup +16 · 22/24 · GIALLO
11. eroe +17 · 20/21 · GIALLO
12. telefono +17 · 17/17 · GIALLO
13. workshop +26 · 26/26 · VERDE
14. combattimento +33 · 33/33 · GIALLO

## Storico

```
2026-11-09  totale  +107  test 140/154  1028d8d
2026-11-10  totale  +105  test 169/186  b44618f
2026-11-11  totale  +173  test 208/225  cc5634e
2026-11-12  totale  +208  test 226/235  afc1c73
2026-11-13  totale  +206  test 238/247  f77121d
```
