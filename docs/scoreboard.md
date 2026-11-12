# Scoreboard di Grimoire of Heroes

Aggiornato il **2026-11-12** sul commit `afc1c73` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.

## Regole (sono la legge per tutto il team)

- Test superato **+1**, test fallito **−3**.
- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.
- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.
- Test che passava ieri e oggi fallisce (regressione): **−5** in più.
- Stato: **ROSSO** se il punteggio di oggi è negativo o c'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.
- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l'app è sbagliata: si corregge l'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.
- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.

## Oggi

- Test superati: **226 / 235**
- Punteggio totale: **+208**, tendenza ↑ (ieri 173)
- Sezioni rosse: nessuna

| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |
|---|---:|---:|:---:|---:|---|---|
| Eroe (creazione, nome, specie, background) | +20 | 13,5 | ↑ | 20/21 | B-034 (bassa) | 🟡 GIALLO |
| Caratteristiche (punteggi, modificatori, TS, abilità) | +12 | 9,5 | ↑ | 15/16 | B-032 (bassa) | 🟡 GIALLO |
| Combattimento (PF, CA, attacchi, riposi) | +42 | 15,5 | ↑ | 33/33 | — | 🟡 GIALLO |
| Incontro (iniziativa, round) | +10 | 9,8 | ↑ | 13/14 | B-037 (bassa) | 🟡 GIALLO |
| Tratti e talenti | +8 | 8 | = | 8/8 | — | 🟢 VERDE |
| Incantesimi (slot, preparati, multiclasse) | +11 | 11 | = | 11/11 | — | 🟢 VERDE |
| Zaino e monete | +13 | 11,5 | ↓ | 13/13 | — | 🟡 GIALLO |
| Cronaca | +7 | 7 | = | 7/7 | — | 🟢 VERDE |
| Biblioteca (ricerca regole) | +8 | 8 | = | 8/8 | — | 🟢 VERDE |
| Workshop homebrew | +26 | 21,8 | = | 26/26 | B-020 (bassa), B-011 (bassa) | 🟡 GIALLO |
| Level up e multiclasse | +16 | 10 | ↓ | 22/24 | B-031 (bassa), B-033 (bassa) | 🟡 GIALLO |
| Import/export e salvataggio | +11 | 12,5 | ↓ | 20/21 | B-039 (alta), B-038 (bassa), B-016 (alta) | 🟡 GIALLO |
| Telefono (390x844) | +20 | 2,5 | ↑ | 17/17 | — | 🟡 GIALLO |
| Robustezza (console, offline, input strani) | +4 | 7,8 | ↓ | 13/16 | B-029 (media) | 🟡 GIALLO |

## Dettaglio delle sezioni

- **robustezza** +4 (13 × +1, 3 × −3)
  - ✗ B-029 solo tastiera: Tab nella finestra Level up non esce sugli eroi coperti e il livello va all'eroe del titolo: Kessa è passata al livello 3 dalla finestra "Eldrin reaches level 5" (focus uscito su: omni, theme, wizard, go:library, go:workshop, sound)
  - ✗ B-039 XSS: quantità (q) di un oggetto importato come testo HTML non esegue codice nello Zaino: onerror eseguito: la quantità non è escapata né ridotta a numero
  - ✗ B-039 XSS: durata di una condizione (condDur) importata come testo HTML non esegue codice in Combattimento: onerror eseguito: condDur non è escapato né ridotto a numero
- **cronaca** +7 (7 × +1, 0 × −3): tutto verde oggi.
- **tratti** +8 (8 × +1, 0 × −3): tutto verde oggi.
- **biblioteca** +8 (8 × +1, 0 × −3): tutto verde oggi.
- **incontro** +10 (13 × +1, 1 × −3)
  - ✗ B-037 cura dal tracciatore a un eroe a 0 PF: i tiri contro la morte si azzerano come con Heal: a 5 PF i tiri contro la morte restano {"s":1,"f":2}
- **importexport** +11 (20 × +1, 1 × −3, bug nuovi -6)
  - ✗ B-038 import con risorse (res) negative, frazionarie o di testo: salvate entro valori sensati e il riposo breve non le rende frazionarie: res.channel_divinity_charges = 1.5 dopo il riposo breve (valori ammessi: interi 0-20)
  - Bug nuovo B-039 [alta] -5: XSS guardado: l'import di un eroe con `q` (quantità di un oggetto) o `condDur` (durata di una condizione) come testo HTML esegue codice
  - Bug nuovo B-038 [bassa] -1: Import: i contatori delle risorse (`res`) accettano negativi, frazioni e testo
- **incantesimi** +11 (11 × +1, 0 × −3): tutto verde oggi.
- **caratteristiche** +12 (15 × +1, 1 × −3)
  - ✗ B-032 Cos abbassata fino al minimo, poi un danno, poi rialzata: i PF massimi tornano 82, non di più (Mago 20): Cos 10 → 1, danno 5, Cos 10: PF 115/120 invece di 77/82
- **zaino** +13 (13 × +1, 0 × −3): tutto verde oggi.
- **levelup** +16 (22 × +1, 2 × −3)
  - ✗ B-031 talento Grappler al livello 4: +1 a Forza o Destrezza: For 16, Des 14 (prima 16 e 14)
  - ✗ B-033 multiclasse: il menu della classe principale non offre una classe già presente nelle righe (Fighter 3 / Rogue 1): classe doppia dopo aver scelto Rogue come classe principale: Rogue / Rogue
- **eroe** +20 (20 × +1, 1 × −3, bug chiusi +3)
  - ✗ B-034 classe, specie e background che non sono nei menu (homebrew cancellato, import) restano mostrati nei menu: i menu mostrano Barbarian, Dragonborn, Acolyte, Barbarian per un eroe Runecarver / Blood Hunter, Popolo del Muschio, Pirata
  - Bug chiuso B-014 con test che passa +3: Con 30+ eroi lo scaffale non ha ricerca né ordine: su telefono la fila è larga 7.400 px
- **telefono** +20 (17 × +1, 0 × −3, bug chiusi +3)
  - Bug chiuso B-030 con test che passa +3: Telefono: B-019 non copre danno degli attacchi, privilegi e talenti, incantesimi e nome in Incontro
- **workshop** +26 (26 × +1, 0 × −3): tutto verde oggi.
- **combattimento** +42 (33 × +1, 0 × −3, bug chiusi +9)
  - Bug chiuso B-040 con test che passa +3: Lo scaffale: l'ordine scelto ("By name", "Last used") torna a "Shelf order" a ogni ricarica
  - Bug chiuso B-023 con test che passa +3: Riposo breve non restituisce Second Wind, Channel Divinity e Bardic Inspiration
  - Bug chiuso B-036 con test che passa +3: Danno a un eroe già a 0 PF: i fallimenti dei tiri contro la morte tornano a zero invece di salire

## Classifica (dalla peggiore alla migliore)

1. robustezza +4 · 13/16 · GIALLO
2. cronaca +7 · 7/7 · VERDE
3. tratti +8 · 8/8 · VERDE
4. biblioteca +8 · 8/8 · VERDE
5. incontro +10 · 13/14 · GIALLO
6. importexport +11 · 20/21 · GIALLO
7. incantesimi +11 · 11/11 · VERDE
8. caratteristiche +12 · 15/16 · GIALLO
9. zaino +13 · 13/13 · GIALLO
10. levelup +16 · 22/24 · GIALLO
11. eroe +20 · 20/21 · GIALLO
12. telefono +20 · 17/17 · GIALLO
13. workshop +26 · 26/26 · GIALLO
14. combattimento +42 · 33/33 · GIALLO

## Storico

```
2026-11-09  totale  +107  test 140/154  1028d8d
2026-11-10  totale  +105  test 169/186  b44618f
2026-11-11  totale  +173  test 208/225  cc5634e
2026-11-12  totale  +208  test 226/235  afc1c73
```
