# Scoreboard di Grimoire of Heroes

Aggiornato il **2026-11-10** sul commit `b44618f` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.

## Regole (sono la legge per tutto il team)

- Test superato **+1**, test fallito **−3**.
- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.
- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.
- Test che passava ieri e oggi fallisce (regressione): **−5** in più.
- Stato: **ROSSO** se il punteggio di oggi è negativo o c'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.
- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l'app è sbagliata: si corregge l'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.
- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.

## Oggi

- Test superati: **169 / 186**
- Punteggio totale: **+105**, tendenza ↓ (ieri 107)
- Sezioni rosse: levelup

| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |
|---|---:|---:|:---:|---:|---|---|
| Eroe (creazione, nome, specie, background) | +11 | 12 | ↓ | 14/15 | B-014 (UX) | 🟡 GIALLO |
| Caratteristiche (punteggi, modificatori, TS, abilità) | +8 | 8 | = | 8/8 | — | 🟡 GIALLO |
| Combattimento (PF, CA, attacchi, riposi) | +9 | 8 | ↑ | 15/17 | B-023 (media), B-018 (bassa) | 🟡 GIALLO |
| Incontro (iniziativa, round) | +11 | 11 | = | 11/11 | — | 🟡 GIALLO |
| Tratti e talenti | +8 | 8 | = | 8/8 | — | 🟡 GIALLO |
| Incantesimi (slot, preparati, multiclasse) | +11 | 11 | = | 11/11 | — | 🟡 GIALLO |
| Zaino e monete | +6 | 8,5 | ↓ | 10/11 | B-017 (bassa) | 🟡 GIALLO |
| Cronaca | +7 | 7 | = | 7/7 | — | 🟡 GIALLO |
| Biblioteca (ricerca regole) | +8 | 8 | = | 8/8 | — | 🟡 GIALLO |
| Workshop homebrew | +21 | 17,5 | ↑ | 25/26 | B-020 (bassa), B-011 (bassa) | 🟡 GIALLO |
| Level up e multiclasse | -9 | -1 | ↓ | 14/20 | B-021 (alta), B-022 (media), B-025 (bassa) | 🔴 ROSSO |
| Import/export e salvataggio | +1 | 8 | ↓ | 14/17 | B-024 (media), B-016 (alta) | 🟡 GIALLO |
| Telefono (390x844) | +1 | -10 | ↑ | 12/15 | B-019 (media) | 🟡 GIALLO |
| Robustezza (console, offline, input strani) | +12 | 10 | ↑ | 12/12 | — | 🟡 GIALLO |

## Dettaglio delle sezioni

- **levelup** -9 (14 × +1, 6 × −3, bug nuovi -8, bug chiusi +3)
  - ✗ B-021 Paladino 7 → 8: si sceglie aumento dei punteggi o talento: nessuna scelta di aumento dei punteggi o talento al livello 8
  - ✗ B-021 Guerriero 5 → 6: si sceglie aumento dei punteggi o talento: nessuna scelta di aumento dei punteggi o talento al livello 6
  - ✗ B-022 +2 Costituzione al livello 4 alza i PF massimi anche per i livelli precedenti (28 → 40): PF massimi 36: 10 + 3 × 6 + 4 × Cos 3 = 40
  - ✗ B-025 un talento non ripetibile già preso (Alert) non viene offerto di nuovo: Alert offerto anche se Valeria lo ha già
  - ✗ B-021 Ladro 9 → 10: si sceglie aumento dei punteggi o talento (livello extra del Ladro): nessuna scelta di aumento dei punteggi o talento al livello 10
  - ✗ B-021 Mago 11 → 12: si sceglie aumento dei punteggi o talento: nessuna scelta di aumento dei punteggi o talento al livello 12
  - Bug nuovo B-021 [alta] -5: Level up: aumento dei punteggi o talento solo al livello 4: mancano 8, 12, 16 (Guerriero 6 e 14, Ladro 10) per tutte le classi
  - Bug nuovo B-022 [media] -2: Level up: +2 a Costituzione non alza i PF massimi dei livelli precedenti
  - Bug nuovo B-025 [bassa] -1: Level up: un talento non ripetibile già preso viene offerto e preso di nuovo
  - Bug chiuso B-005 con test che passa +3: Aumento dei punteggi +2 abbassa un punteggio sopra 20 a 20
- **telefono** +1 (12 × +1, 3 × −3, bug nuovi -2)
  - ✗ B-019 390 px: un link lungo nella descrizione di un oggetto non allarga la pagina: scrollWidth 1054px
  - ✗ B-019 390 px: nome lungo senza spazi di un attacco non allarga Combattimento: scrollWidth 1291px
  - ✗ tocco ≥44 px: pulsanti della finestra Level up: sotto 44 px: "Roll" 38×37, "Become level 4" 100×30
  - Bug nuovo B-019 [media] -2: Telefono: un link o una parola lunga in oggetti e attacchi allarga la pagina fino a 1.400 px
- **importexport** +1 (14 × +1, 3 × −3, bug nuovi -7, bug chiusi +3)
  - ✗ B-016 due schede: se A cancella l'eroe che B sta scrivendo, le note di un altro eroe non cambiano: storia di Eldrin sovrascritta: "A city guardsman who took up the adventuring road. e poi ancora"
  - ✗ B-016 due schede: se A cancella l'eroe che B sta rinominando, nessun altro eroe prende quel nome: Expected values to be strictly deep-equal:
  - ✗ B-024 backup di eroi duplicati più volte: il ripristino li riporta tutti: dopo il ripristino 3 eroi su 4 (3 heroes back in the tome (1 already here).)
  - Bug nuovo B-024 [media] -2: Backup: eroi duplicati più volte persi al ripristino ("già qui")
  - Bug nuovo B-016 [alta] -5: Due schede: se una cancella l'eroe che l'altra sta scrivendo, il testo finisce su un altro eroe
  - Bug chiuso B-015 con test che passa +3: Nessun backup di tutti gli eroi insieme
- **zaino** +6 (10 × +1, 1 × −3, bug nuovi -1)
  - ✗ B-017 monete: un valore negativo non viene salvato: monete salvate: -100 gp, -3 pp
  - Bug nuovo B-017 [bassa] -1: Monete negative accettate nello Zaino
- **cronaca** +7 (7 × +1, 0 × −3): tutto verde oggi.
- **caratteristiche** +8 (8 × +1, 0 × −3): tutto verde oggi.
- **tratti** +8 (8 × +1, 0 × −3): tutto verde oggi.
- **biblioteca** +8 (8 × +1, 0 × −3): tutto verde oggi.
- **combattimento** +9 (15 × +1, 2 × −3, bug nuovi -3, bug chiusi +3)
  - ✗ B-018 CA e PF restano in un intervallo sensato (regolazione -999, PF 1e308 da import): CA mostrata -981
  - ✗ B-023 riposo breve: Second Wind recupera un uso: dopo il riposo breve Second Wind è ancora 0/2
  - Bug nuovo B-023 [media] -2: Riposo breve non restituisce Second Wind, Channel Divinity e Bardic Inspiration
  - Bug nuovo B-018 [bassa] -1: CA e PF senza limite superiore/inferiore: CA -981, PF 1e+308
  - Bug chiuso B-006 con test che passa +3: Danni negativi danno PF temporanei, cura negativa porta i PF sotto zero
- **eroe** +11 (14 × +1, 1 × −3)
  - ✗ B-014 con 33 eroi lo scaffale offre un filtro per nome: nessun campo di ricerca/filtro vicino allo scaffale degli eroi
- **incontro** +11 (11 × +1, 0 × −3): tutto verde oggi.
- **incantesimi** +11 (11 × +1, 0 × −3): tutto verde oggi.
- **robustezza** +12 (12 × +1, 0 × −3): tutto verde oggi.
- **workshop** +21 (25 × +1, 1 × −3, bug nuovi -1)
  - ✗ B-020 import 5etools con 10.000 incantesimi: la finestra di scelta arriva in meno di 8 s: finestra dopo 8588 ms
  - Bug nuovo B-020 [bassa] -1: Import 5etools enorme: tempo quadratico, 20.000 voci bloccano la pagina per quasi 2 minuti

## Classifica (dalla peggiore alla migliore)

1. levelup -9 · 14/20 · ROSSO
2. telefono +1 · 12/15 · GIALLO
3. importexport +1 · 14/17 · GIALLO
4. zaino +6 · 10/11 · GIALLO
5. cronaca +7 · 7/7 · GIALLO
6. caratteristiche +8 · 8/8 · GIALLO
7. tratti +8 · 8/8 · GIALLO
8. biblioteca +8 · 8/8 · GIALLO
9. combattimento +9 · 15/17 · GIALLO
10. eroe +11 · 14/15 · GIALLO
11. incontro +11 · 11/11 · GIALLO
12. incantesimi +11 · 11/11 · GIALLO
13. robustezza +12 · 12/12 · GIALLO
14. workshop +21 · 25/26 · GIALLO

## Storico

```
2026-11-09  totale  +107  test 140/154  1028d8d
2026-11-10  totale  +105  test 169/186  b44618f
```
