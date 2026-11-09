# Scoreboard di Grimoire of Heroes

Aggiornato il **2026-11-09** sul commit `1028d8d` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.

## Regole (sono la legge per tutto il team)

- Test superato **+1**, test fallito **−3**.
- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.
- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.
- Test che passava ieri e oggi fallisce (regressione): **−5** in più.
- Stato: **ROSSO** se il punteggio di oggi è negativo o c'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.
- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l'app è sbagliata: si corregge l'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.
- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.

## Oggi

- Test superati: **140 / 154**
- Punteggio totale: **+107**, tendenza — (primo giorno)
- Sezioni rosse: telefono

| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |
|---|---:|---:|:---:|---:|---|---|
| Eroe (creazione, nome, specie, background) | +13 | 13 | — | 14/15 | B-014 (UX) | 🟡 GIALLO |
| Caratteristiche (punteggi, modificatori, TS, abilità) | +8 | 8 | — | 8/8 | — | 🟡 GIALLO |
| Combattimento (PF, CA, attacchi, riposi) | +7 | 7 | — | 13/15 | B-006 (media) | 🟡 GIALLO |
| Incontro (iniziativa, round) | +11 | 11 | — | 11/11 | — | 🟡 GIALLO |
| Tratti e talenti | +8 | 8 | — | 8/8 | — | 🟡 GIALLO |
| Incantesimi (slot, preparati, multiclasse) | +11 | 11 | — | 11/11 | — | 🟡 GIALLO |
| Zaino e monete | +11 | 11 | — | 10/10 | — | 🟡 GIALLO |
| Cronaca | +7 | 7 | — | 7/7 | — | 🟡 GIALLO |
| Biblioteca (ricerca regole) | +8 | 8 | — | 8/8 | — | 🟡 GIALLO |
| Workshop homebrew | +14 | 14 | — | 14/14 | B-011 (bassa) | 🟡 GIALLO |
| Level up e multiclasse | +7 | 7 | — | 10/11 | B-005 (media) | 🟡 GIALLO |
| Import/export e salvataggio | +15 | 15 | — | 12/13 | B-015 (UX) | 🟡 GIALLO |
| Telefono (390x844) | -21 | -21 | — | 3/11 | — | 🔴 ROSSO |
| Robustezza (console, offline, input strani) | +8 | 8 | — | 11/12 | — | 🟡 GIALLO |

## Dettaglio delle sezioni

- **telefono** -21 (3 × +1, 8 × −3)
  - ✗ 390 px: nessuno scroll orizzontale in nessun capitolo: scrollWidth oltre 390: hero 400px
  - ✗ tocco ≥44 px: pulsanti in alto (nuovo eroe, biblioteca, homebrew, tema): sotto 44 px: "Night pages" 38×36, "＋ New hero" 105×36, "Library" 73×36, "Homebrew" 96×36, "Page-turn sound" 38×36
  - ✗ tocco ≥44 px: barra dei dadi: sotto 44 px: "d4" 39×32, "d6" 39×32, "d8" 39×32, "d10" 45×32, "d12" 45×32, "d20" 48×32 … (10)
  - ✗ tocco ≥44 px: frecce per girare pagina: sotto 44 px: "Previous page" 36×29, "Next page" 36×29
  - ✗ tocco ≥44 px: danni, cura e riposi: sotto 44 px: "" 84×36, "Damage" 66×26, "Heal" 46×26, "Temp" 52×26, "Short Rest" 77×26, "Long Rest" 75×26
  - ✗ tocco ≥44 px: + e − delle caratteristiche: sotto 44 px: "Lower Strength" 28×26, "Raise Strength" 28×26, "Lower Dexterity" 28×26, "Raise Dexterity" 28×26, "Lower Constitution" 28×26, "Raise Constitution" 28×26 … (12)
  - ✗ tocco ≥44 px: slot degli incantesimi: sotto 44 px: "Level 1 slot 1" 26×26, "Level 1 slot 2" 26×26, "Level 1 slot 3" 26×26, "Level 1 slot 4" 26×26, "Level 2 slot 1" 26×26, "Level 2 slot 2" 26×26 … (7)
  - ✗ i campi di testo hanno carattere ≥16 px (niente zoom automatico su iPhone): omni 15.5px, f_name 15.5px, f_player 15.5px, f_portrait 15.5px, f_align 15.5px, f_species 15.5px
- **combattimento** +7 (13 × +1, 2 × −3)
  - ✗ B-006 danni negativi non danno PF temporanei: PF temporanei 50 dopo danni -50
  - ✗ B-006 una cura negativa non porta i PF sotto zero: PF -68/32 dopo cura -100
- **levelup** +7 (10 × +1, 1 × −3)
  - ✗ B-005 aumento +2 non abbassa un punteggio sopra 20: Forza scesa da 24 a 20
- **cronaca** +7 (7 × +1, 0 × −3): tutto verde oggi.
- **robustezza** +8 (11 × +1, 1 × −3)
  - ✗ nome lungo senza spazi (80 caratteri) non allarga la pagina: scroll orizzontale di 831 px a 1440 px
- **caratteristiche** +8 (8 × +1, 0 × −3): tutto verde oggi.
- **tratti** +8 (8 × +1, 0 × −3): tutto verde oggi.
- **biblioteca** +8 (8 × +1, 0 × −3): tutto verde oggi.
- **incontro** +11 (11 × +1, 0 × −3): tutto verde oggi.
- **incantesimi** +11 (11 × +1, 0 × −3): tutto verde oggi.
- **zaino** +11 (10 × +1, 0 × −3, bug nuovi -2, bug chiusi +3)
  - Bug nuovo B-013 [media] -2: Oggetti con una categoria sconosciuta sono invisibili nello Zaino e non si possono cancellare
  - Bug chiuso B-013 con test che passa +3: Oggetti con una categoria sconosciuta sono invisibili nello Zaino e non si possono cancellare
- **eroe** +13 (14 × +1, 1 × −3, bug nuovi -1, bug chiusi +3)
  - ✗ B-014 con 33 eroi lo scaffale offre un filtro per nome: nessun campo di ricerca/filtro vicino allo scaffale degli eroi
  - Bug nuovo B-014 [bassa, UX] -1: Con 30+ eroi lo scaffale non ha ricerca né ordine: su telefono la fila è larga 7.400 px
  - Bug chiuso B-009 con test che passa +3: Nome eroe senza limite di lunghezza: pagina larga 358.000 px
- **workshop** +14 (14 × +1, 0 × −3): tutto verde oggi.
- **importexport** +15 (12 × +1, 1 × −3, bug nuovi -3, bug chiusi +9)
  - ✗ B-015 esiste "Esporta tutti" gli eroi in un solo file: nessun pulsante per esportare tutti gli eroi insieme
  - Bug nuovo B-015 [bassa, UX] -1: Nessun backup di tutti gli eroi insieme
  - Bug nuovo B-012 [media] -2: Ogni eroe è salvato due volte: la copia `_sig` raddoppia localStorage e i file di export
  - Bug chiuso B-012 con test che passa +3: Ogni eroe è salvato due volte: la copia `_sig` raddoppia localStorage e i file di export
  - Bug chiuso B-002 con test che passa +3: Due schede aperte: l'ultima che salva cancella gli eroi creati nell'altra
  - Bug chiuso B-004 con test che passa +3: Memoria piena: il nuovo eroe sembra salvato ma sparisce alla ricarica

## Classifica (dalla peggiore alla migliore)

1. telefono -21 · 3/11 · ROSSO
2. combattimento +7 · 13/15 · GIALLO
3. levelup +7 · 10/11 · GIALLO
4. cronaca +7 · 7/7 · GIALLO
5. robustezza +8 · 11/12 · GIALLO
6. caratteristiche +8 · 8/8 · GIALLO
7. tratti +8 · 8/8 · GIALLO
8. biblioteca +8 · 8/8 · GIALLO
9. incontro +11 · 11/11 · GIALLO
10. incantesimi +11 · 11/11 · GIALLO
11. zaino +11 · 10/10 · GIALLO
12. eroe +13 · 14/15 · GIALLO
13. workshop +14 · 14/14 · GIALLO
14. importexport +15 · 12/13 · GIALLO

## Storico

```
2026-11-09  totale  +107  test 140/154  1028d8d
```
