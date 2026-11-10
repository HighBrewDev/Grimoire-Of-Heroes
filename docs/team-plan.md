# Piano del team · martedì 10 novembre 2026

## Stato dell'app
- Live = main (stesso index.html e `CACHE` di sw.js, `4fd899d`). Controllo di stamattina con Playwright a 1440x900 e 390x844: copertina "Open the Grimoire" ok, scrollWidth uguale alla finestra (1440 / 390), console pulita a parte Supabase bloccato dalla sandbox. Niente di rotto da ieri.
- Ieri chiusi B-005, B-006, B-015 (backup di tutti gli eroi) e il telefono è passato da 3/11 a 12/15. Il distruttore e il power user hanno aperto 10 bug nuovi (B-016…B-025), che oggi pesano −24.
- **Punteggio totale +105, tendenza ↓** (ieri +107). Test 169/186, nessuna regressione. **Unica sezione rossa: Level up (−9, 14/20), giorno 1 su 3.**
- Nessuna PR aperta.

## Allocazione per sezione
| Sezione | Punti | Stato | Carico | Perché |
|---|---:|---|---|---|
| Level up e multiclasse | −9 | 🔴 ROSSO | **ALTO** | B-021 [alta] = 4 test rossi, più B-022, B-025 |
| Import/export e salvataggio | +1 | 🟡 GIALLO | MEDIO | B-016 [alta] (2 test), B-024 |
| Telefono (390x844) | +1 | 🟡 GIALLO | MEDIO | B-019 (2 test), tocco nella finestra Level up |
| Zaino e monete | +6 | 🟡 GIALLO | MEDIO | B-017 |
| Combattimento | +9 | 🟡 GIALLO | MEDIO | B-023, B-018 |
| Eroe | +11 | 🟡 GIALLO | MEDIO | B-014 (UX) |
| Workshop homebrew | +21 | 🟡 GIALLO | MEDIO | B-020 |
| Cronaca, Caratteristiche, Tratti, Biblioteca, Incontro, Incantesimi, Robustezza | +7…+12 | 🟡 GIALLO | BASSO | tutto verde, giorno 2 su 3: domani possono diventare VERDI; solo controlli leggeri |

## Oggi
- **Sviluppo mattina (10:23) · Level up** (su main, non tocca dati salvati). `levelPlan` (~3420) deve offrire "Ability Score Improvement or feat" a 4, 8, 12, 16 per tutti, 6 e 14 Guerriero, 10 Ladro, anche nella classe aggiunta in multiclasse (B-021). Poi B-022: dopo un aumento di Costituzione (level up e "Raise Constitution") i PF massimi si ricalcolano per tutti i livelli. Poi B-025: `featList` esclude i talenti già presi se non sono ripetibili (anche homebrew).
  *Fatto* = `node tests/run.js levelup` 20/20, nessun altro test regredisce, B-021/B-022/B-025 in "Risolti". Niente CSS.
- **Sviluppo sera (18:23) · Import/export.** 1) **B-016 come PR** (tocca il salvataggio con più schede): se l'eroe in modifica è stato cancellato in un'altra scheda, il testo non va mai su un altro eroe (avviso e niente salvataggio, o l'eroe resta). Unione automatica dopo i test (non tocca Supabase). 2) **B-024 su main**: `duplicate` (~3700) passa da `fixup`/limite 80 e dà nomi distinti ("(copy 2)"); l'import del backup non scarta eroi diversi con lo stesso nome.
  *Fatto* = `node tests/run.js importexport` 17/17, test di B-002 ancora verdi, suite completa senza regressioni, link alla PR nel log.
- **Designer (14:13) · Telefono, solo CSS.** B-019: `overflow-wrap:anywhere` su descrizioni e nomi di oggetti, attacchi, note, specie/sottoclasse homebrew e scaffale `.hero`. Poi tocco ≥44 px nella finestra Level up ("Roll", "Become level N") solo con `pointer:coarse`. Non toccare JS di `levelPlan`/`applyLevelUp` né `duplicate` (sviluppo).
  *Fatto* = `node tests/run.js telefono` 15/15, desktop identico a 1440, screenshot prima/dopo in docs/design/.
- **Distruttore (21:07) · Level up e salvataggio.** Attacca la correzione del mattino: aumenti a ogni livello per tutte le 12 classi, multiclassi a tre, eroi importati già al 20, Costituzione portata a 30 e poi abbassata, talenti homebrew ripetibili e no, annulla/chiudi a metà finestra. Poi B-016 dopo la PR: tre schede, cancellazione e rinomina durante la scrittura. Controllo leggero sulle sezioni tutte verdi. *Fatto* = voce nel diario e bug nuovi con passi e test.
- **Power user (21:37) · Verifica in gioco.** Porta 1→20 un Guerriero, un Ladro e un Mago/Chierico multiclasse: conta aumenti e PF (attesi: 7 per il Guerriero, 6 il Ladro, 5 gli altri + Epic Boon). Verifica B-024 (backup con copie) e B-019 su telefono vero (390x844). *Fatto* = diario con numeri, bug nuovi solo se riproducibili.
- **Test e punteggio (domani 8:47)**: aggiungi test di level up per multiclasse (ASI nella seconda classe) e per i talenti homebrew ripetibili; un test B-019 per lo scaffale con specie homebrew lunga.

## Backlog (ordinato)
1. **bug** · B-023 riposo breve: Second Wind, Channel Divinity, Bardic Inspiration (Font of Inspiration) recuperano. Prossima sessione libera di sviluppo.
2. **bug** · B-017 monete e XP negative; B-018 CA mai sotto 0 e PF con massimo ragionevole (`bindValue` int con min/max).
3. **UX** · B-014 filtro per nome e ordine dello scaffale: il designer propone, lo sviluppo realizza (ultimo test rosso di Eroe).
4. **performance** · B-020 import 5etools quadratico (cercare il confronto dentro il ciclo).
5. **funzione** · Avviso "Nuova versione, ricarica" quando il service worker trova un index.html nuovo.
6. **performance** · Zaino lento con CPU 4x al cambio eroe.
7. **design** · Accessibilità: contrasto, focus visibile, `aria-label`; pallini di competenza e "✕" dei chip a 44 px.
8. **funzione** · Stampa/PDF della scheda su A4.
9. **marketing** · Bozza di post in docs/promo/ quando non ci sono più bug alti (solo bozza).

## Regole per tutti
- Solo contenuti SRD 5.2.1; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo l'attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**. Unione automatica dopo i test, tranne pagamenti/Stripe, Supabase, `schema.sql`, funzioni edge: quelle aspettano Capo.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, nessuna regressione.
- Ogni rilascio alza `CACHE` in sw.js. Sviluppo e designer non toccano la stessa parte di index.html nello stesso giorno.
- Nessuna pubblicazione su Reddit/Discord. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- Nessuna PR aperta. La PR di B-016 di stasera si unisce da sola dopo i test (non tocca Supabase).
- **Decisione (facoltativa)**: permettere l'host `obahrlbwbplqqgokjqhf.supabase.co` nella rete dell'ambiente cloud, per testare login e sync.
- **Decisione (facoltativa)**: B-011, l'import homebrew deve rispettare il limite di 3 elementi gratuiti?
