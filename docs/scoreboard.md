# Scoreboard di Grimoire of Heroes

Aggiornato il **2026-11-11** sul commit `cc5634e` di main dall'agente "Test e punteggio". Fase intensiva fino al 23 novembre 2026: il lavoro del team si sceglie da questi punteggi.

## Regole (sono la legge per tutto il team)

- Test superato **+1**, test fallito **−3**.
- Bug nuovo aperto dai beta tester nelle ultime 24 ore (docs/bug-beta.md, nella sua sezione): critica **−10**, alta **−5**, media **−2**, bassa/[UX] **−1**. Ogni bug conta una volta sola.
- Bug chiuso (in "Risolti" da meno di 24 ore) con test di regressione che ora passa: **+3**.
- Test che passava ieri e oggi fallisce (regressione): **−5** in più.
- Stato: **ROSSO** se il punteggio di oggi è negativo o c'è una regressione; **VERDE** se tutti i test della sezione passano da 3 giorni di fila e non ci sono bug alti o critici aperti; altrimenti **GIALLO**.
- I test sono in `tests/` (Playwright, server locale, niente rete). Non si cambia un test per farlo passare se l'app è sbagliata: si corregge l'app. Ogni bug aperto automatizzabile ha un test con il suo ID nel nome.
- Eseguire: `node tests/run.js` (tutto, scrive `tests/risultati/AAAA-MM-GG.json`), poi `node tests/punteggio.js`. Una sezione sola: `node tests/run.js telefono`; un test: `node tests/run.js --grep B-005`.

## Oggi

- Test superati: **208 / 225**
- Punteggio totale: **+173**, tendenza ↑ (ieri 105)
- Sezioni rosse: nessuna

| Sezione | Punteggio oggi | Media 7 gg | Tendenza | Test superati | Bug aperti | Stato |
|---|---:|---:|:---:|---:|---|---|
| Eroe (creazione, nome, specie, background) | +10 | 11,3 | ↓ | 17/19 | B-034 (bassa), B-014 (UX) | 🟡 GIALLO |
| Caratteristiche (punteggi, modificatori, TS, abilità) | +10 | 8,7 | ↑ | 13/14 | B-032 (bassa) | 🟡 GIALLO |
| Combattimento (PF, CA, attacchi, riposi) | +4 | 6,7 | ↓ | 25/33 | B-036 (media), B-023 (media) | 🟡 GIALLO |
| Incontro (iniziativa, round) | +7 | 9,7 | ↓ | 11/12 | B-037 (bassa) | 🟡 GIALLO |
| Tratti e talenti | +8 | 8 | = | 8/8 | — | 🟢 VERDE |
| Incantesimi (slot, preparati, multiclasse) | +11 | 11 | = | 11/11 | — | 🟢 VERDE |
| Zaino e monete | +16 | 11 | ↑ | 13/13 | — | 🟡 GIALLO |
| Cronaca | +7 | 7 | = | 7/7 | — | 🟢 VERDE |
| Biblioteca (ricerca regole) | +8 | 8 | = | 8/8 | — | 🟢 VERDE |
| Workshop homebrew | +26 | 20,3 | ↑ | 26/26 | B-020 (bassa), B-011 (bassa) | 🟡 GIALLO |
| Level up e multiclasse | +26 | 8 | ↑ | 22/24 | B-031 (bassa), B-033 (bassa) | 🟡 GIALLO |
| Import/export e salvataggio | +23 | 13 | ↑ | 20/20 | B-016 (alta) | 🟡 GIALLO |
| Telefono (390x844) | +10 | -3,3 | ↑ | 15/17 | B-030 (media) | 🟡 GIALLO |
| Robustezza (console, offline, input strani) | +7 | 9 | ↓ | 12/13 | B-029 (media) | 🟡 GIALLO |

## Dettaglio delle sezioni

- **combattimento** +4 (25 × +1, 8 × −3, bug nuovi -3, bug chiusi +6)
  - ✗ B-023 riposo breve: Second Wind recupera un uso: dopo il riposo breve Second Wind è ancora 0/2
  - ✗ B-036 danno a 0 PF: un fallimento in più ai tiri contro la morte, non tutti azzerati: dopo 3 danni a 0 PF i fallimenti sono 0 (prima 2)
  - ✗ B-023 riposo breve: Rage (Barbaro 5) recupera un uso: dopo il riposo breve rage_count usati 3 (prima 3), attesi 2
  - ✗ B-023 riposo breve: Wild Shape (Druido 5) recupera un uso: dopo il riposo breve wild_shape_uses usati 2 (prima 2), attesi 1
  - ✗ B-023 riposo breve: Channel Divinity (Paladino 5) recupera un uso: dopo il riposo breve channel_divinity_charges usati 2 (prima 2), attesi 1
  - ✗ B-023 riposo breve: Channel Divinity (Chierico 6) recupera un uso: dopo il riposo breve channel_divinity_charges usati 3 (prima 3), attesi 2
  - ✗ B-023 riposo breve: Bardic Inspiration (Bardo 5, Font of Inspiration) torna tutta: dopo il riposo breve bardic_inspiration usati 3 (prima 3), attesi 0
  - ✗ B-036 danno massiccio: un danno che supera i PF massimi oltre lo 0 uccide (o lo dice): danno 90 a 40 PF: fallimenti 0/3 e nessun avviso di morte istantanea
  - Bug nuovo B-036 [media] -2: Danno a un eroe già a 0 PF: i fallimenti dei tiri contro la morte tornano a zero invece di salire
  - Bug nuovo B-035 [bassa] -1: PF massimi scritti come "1e3": il campo mostra 1e3, salva 1 e i PF attuali crollano a 1
  - Bug chiuso B-035 con test che passa +3: PF massimi scritti come "1e3": il campo mostra 1e3, salva 1 e i PF attuali crollano a 1
  - Bug chiuso B-018 con test che passa +3: CA e PF senza limite superiore/inferiore: CA -981, PF 1e+308
- **incontro** +7 (11 × +1, 1 × −3, bug nuovi -1)
  - ✗ B-037 cura dal tracciatore a un eroe a 0 PF: i tiri contro la morte si azzerano come con Heal: a 5 PF i tiri contro la morte restano {"s":1,"f":2}
  - Bug nuovo B-037 [bassa] -1: Cura dal tracciatore dell'Incontro a un eroe a 0 PF: i tiri contro la morte restano segnati
- **robustezza** +7 (12 × +1, 1 × −3, bug nuovi -2)
  - ✗ B-029 solo tastiera: Tab nella finestra Level up non esce sugli eroi coperti e il livello va all'eroe del titolo: Kessa è passata al livello 3 dalla finestra "Eldrin reaches level 5" (focus uscito su: omni, theme, wizard, go:library, go:workshop, sound)
  - Bug nuovo B-029 [media] -2: Solo tastiera: Tab esce dalla finestra Level up e il livello finisce su un altro eroe
- **cronaca** +7 (7 × +1, 0 × −3): tutto verde oggi.
- **tratti** +8 (8 × +1, 0 × −3): tutto verde oggi.
- **biblioteca** +8 (8 × +1, 0 × −3): tutto verde oggi.
- **telefono** +10 (15 × +1, 2 × −3, bug nuovi -2, bug chiusi +3)
  - ✗ B-030 390 px: un link nel danno di un attacco non allarga Combattimento: scrollWidth 743px
  - ✗ B-030 390 px: un link in un privilegio di classe non allarga Tratti: scrollWidth 689px
  - Bug nuovo B-030 [media] -2: Telefono: B-019 non copre danno degli attacchi, privilegi e talenti, incantesimi e nome in Incontro
  - Bug chiuso B-019 con test che passa +3: Telefono: un link o una parola lunga in oggetti e attacchi allarga la pagina fino a 1.400 px
- **eroe** +10 (17 × +1, 2 × −3, bug nuovi -1)
  - ✗ B-014 con 33 eroi lo scaffale offre un filtro per nome: nessun campo di ricerca/filtro vicino allo scaffale degli eroi
  - ✗ B-034 classe, specie e background che non sono nei menu (homebrew cancellato, import) restano mostrati nei menu: i menu mostrano Barbarian, Dragonborn, Acolyte, Barbarian per un eroe Runecarver / Blood Hunter, Popolo del Muschio, Pirata
  - Bug nuovo B-034 [bassa] -1: Classe, specie o background fuori dai menu (homebrew cancellato, eroe importato): i menu mostrano Barbarian, Dragonborn, Acolyte
- **caratteristiche** +10 (13 × +1, 1 × −3, bug nuovi -3, bug chiusi +3)
  - ✗ B-032 Cos abbassata fino al minimo, poi un danno, poi rialzata: i PF massimi tornano 82, non di più (Mago 20): Cos 10 → 1, danno 5, Cos 10: PF 115/120 invece di 77/82
  - Bug nuovo B-032 [bassa] -1: Cos al minimo, poi danno o Level up, poi Cos rialzata: PF massimi gonfiati (resto di B-026)
  - Bug nuovo B-026 [media] -2: Costituzione giù e su con − / +: PF massimi gonfiati e PF attuali a 0
  - Bug chiuso B-026 con test che passa +3: Costituzione giù e su con − / +: PF massimi gonfiati e PF attuali a 0
- **incantesimi** +11 (11 × +1, 0 × −3): tutto verde oggi.
- **zaino** +16 (13 × +1, 0 × −3, bug chiusi +3)
  - Bug chiuso B-017 con test che passa +3: Monete negative accettate nello Zaino
- **importexport** +23 (20 × +1, 0 × −3, bug chiusi +3)
  - Bug chiuso B-024 con test che passa +3: Backup: eroi duplicati più volte persi al ripristino ("già qui")
- **levelup** +26 (22 × +1, 2 × −3, bug nuovi -5, bug chiusi +15)
  - ✗ B-031 talento Grappler al livello 4: +1 a Forza o Destrezza: For 16, Des 14 (prima 16 e 14)
  - ✗ B-033 multiclasse: il menu della classe principale non offre una classe già presente nelle righe (Fighter 3 / Rogue 1): classe doppia dopo aver scelto Rogue come classe principale: Rogue / Rogue
  - Bug nuovo B-031 [bassa] -1: Level up: un talento generale con aumento di caratteristica (Grappler) non dà il +1
  - Bug nuovo B-033 [bassa] -1: Multiclasse: il menu della classe principale offre una classe già presente nelle righe (resto di B-028)
  - Bug nuovo B-027 [media] -2: Livello 19: "+2" porta un punteggio oltre 20 e l'Epic Boon scelto come talento non dà +1
  - Bug nuovo B-028 [bassa] -1: Multiclasse: la stessa classe può comparire due volte (pagina Eroe e import)
  - Bug chiuso B-027 con test che passa +3: Livello 19: "+2" porta un punteggio oltre 20 e l'Epic Boon scelto come talento non dà +1
  - Bug chiuso B-028 con test che passa +3: Multiclasse: la stessa classe può comparire due volte (pagina Eroe e import)
  - Bug chiuso B-021 con test che passa +3: Level up: aumento dei punteggi o talento solo al livello 4: mancano 8, 12, 16 (Guerriero 6 e 14, Ladro 10) per tutte le classi
  - Bug chiuso B-022 con test che passa +3: Level up: +2 a Costituzione non alza i PF massimi dei livelli precedenti
  - Bug chiuso B-025 con test che passa +3: Level up: un talento non ripetibile già preso viene offerto e preso di nuovo
- **workshop** +26 (26 × +1, 0 × −3): tutto verde oggi.

## Classifica (dalla peggiore alla migliore)

1. combattimento +4 · 25/33 · GIALLO
2. incontro +7 · 11/12 · GIALLO
3. robustezza +7 · 12/13 · GIALLO
4. cronaca +7 · 7/7 · VERDE
5. tratti +8 · 8/8 · VERDE
6. biblioteca +8 · 8/8 · VERDE
7. telefono +10 · 15/17 · GIALLO
8. eroe +10 · 17/19 · GIALLO
9. caratteristiche +10 · 13/14 · GIALLO
10. incantesimi +11 · 11/11 · VERDE
11. zaino +16 · 13/13 · GIALLO
12. importexport +23 · 20/20 · GIALLO
13. levelup +26 · 22/24 · GIALLO
14. workshop +26 · 26/26 · GIALLO

## Storico

```
2026-11-09  totale  +107  test 140/154  1028d8d
2026-11-10  totale  +105  test 169/186  b44618f
2026-11-11  totale  +173  test 208/225  cc5634e
```
