# Piano del team · martedì 10 novembre 2026 (aggiornato alle 17:40)

## Stato dell'app
- **Frontend**: live = main (stesso `CACHE` `grimoire-ds1110a` in sw.js). Controllo delle 17:30 con Playwright a 1440x900 e 390x844: app carica, scrollWidth uguale alla finestra, console pulita a parte Supabase bloccato dalla sandbox. Niente di rotto.
- Oggi chiusi B-021, B-022, B-025 (Level up 20/20 stamattina) e B-019 (telefono 15/15). Il distruttore ha aperto B-026…B-029, un tester extra B-030, B-031 (PR #6, non ancora unita).
- **Backend**: Supabase non raggiungibile dalla sandbox (HTTP 000, rete bloccata, non è un guasto noto). B-016 [alta] ancora senza PR: oggi passa al backend.
- **Punteggio totale +105, tendenza ↓** (ieri +107; scoreboard delle 8:47). Suite su main adesso: **179/190**, nessuna regressione; gli 11 rossi sono B-014, B-016 ×2, B-017, B-018, B-023, B-024, B-026, B-027, B-028, B-029. B-020 oggi passa a 3,6 s (stamattina 8,6 s): test sensibile al carico.
- **Rossa: Level up e multiclasse, giorno 1 su 3** (−9 stamattina; ora 20 vecchi test verdi ma B-027, B-028 nuovi e B-031 in arrivo).

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| Level up e multiclasse | 🔴 ROSSO | **ALTO** | frontend | B-027, B-028, B-031 (PR #6) |
| Import/export e salvataggio | 🟡 GIALLO | MEDIO | backend | B-016 [alta] ×2 test, B-024 |
| Caratteristiche | 🟡 GIALLO | MEDIO | frontend | B-026 (nuovo, nato dalla correzione B-022) |
| Robustezza | 🟡 GIALLO | MEDIO | frontend | B-029 (Tab esce dalla finestra) |
| Telefono (390x844) | 🟡 GIALLO | MEDIO | frontend | B-030 (PR #6) |
| Combattimento | 🟡 GIALLO | MEDIO | frontend | B-023; B-018 al backend (validazione) |
| Zaino e monete | 🟡 GIALLO | MEDIO | backend | B-017 (validazione input) |
| Workshop homebrew | 🟡 GIALLO | BASSO | backend | B-020 ora passa; B-011 attende Capo |
| Eroe | 🟡 GIALLO | BASSO | frontend | B-014 (UX, aspetta proposta del designer) |
| Cronaca, Tratti, Biblioteca, Incontro, Incantesimi | 🟡 GIALLO | BASSO | — | tutto verde, domani possono diventare VERDI: solo controlli leggeri |

## Oggi (resto della giornata)
Zone di index.html: **Frontend** possiede `levelPlan`/`applyLevelUp`/`conHp` (~3400–3460), il menu `data-mc` (~1645), `modal()` (~1290). **Backend** possiede `otherTabSaved`/`mergeStored` (~4015), `bindValue` (~4333), `duplicate` (~3700), `importBackup` (~3818). Nessuno tocca il CSS oggi (il designer ci ha già lavorato).

- **Frontend mattina (10:23)** · ✓ fatto: B-021, B-022, B-025, levelup 20/20 ([b5f0d49](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/b5f0d49)).
- **Designer (14:13)** · ✓ fatto: B-019 e tocco nella finestra Level up, telefono 15/15 ([7cb1ec7](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/7cb1ec7)).
- **Frontend sera (18:23) · Level up (ROSSO) e Caratteristiche**, su main.
  1) **B-027**: in `applyLevelUp` il limite 30 vale solo per l'Epic Boon; "+2"/"+1/+1" restano a 20; scegliere un Epic Boon chiede la caratteristica e dà +1 fino a 30. Il test "livello 18 → 19 … può superare 20" codifica la regola sbagliata: correggilo insieme al codice e spiega nel log perché (è il test a essere sbagliato, non l'app).
  2) **B-026**: `conHp` non perde PF nel giro − / +: ricalcola i massimi da zero (o tieni la differenza persa) e minimo 1 PF per livello; i PF attuali di un eroe ferito o morente non salgono per una correzione.
  3) Se resta tempo, **B-028**: il menu `data-mc` non offre classi già presenti; `fixup` unisce i doppioni all'import (solo la riga della multiclasse, non `importBackup`).
  *Fatto* = `node tests/run.js levelup` e `caratteristiche` senza rossi tranne quelli di PR #6, suite completa senza regressioni, bug in "Risolti", `CACHE` alzata.
- **Backend notte (23:13) · Import/export e salvataggio.**
  1) **B-016 come PR**: se l'eroe in modifica è stato cancellato in un'altra scheda, `bindValue` scrive solo sull'eroe per cui il campo è stato aperto (id legato al render), altrimenti avviso e niente salvataggio; mai su `active()` cambiato. Unione automatica dopo i test (non tocca Supabase).
  2) **B-024 su main**: `duplicate` passa da `fixup`, nomi distinti entro 80 caratteri ("(copy 2)"); `importBackup` non scarta eroi diversi con lo stesso nome.
  *Fatto* = `node tests/run.js importexport` 17/17, test di B-002 e B-015 verdi, suite senza regressioni, link alla PR nel log.
- **Distruttore (21:07) · Level up e Caratteristiche dopo la sera.** Attacca B-026/B-027/B-028 corretti: Cos su e giù fino a 1 e 30 con eroe ferito e morente, Epic Boon e ASI al 19 su tutte le caratteristiche, multiclasse con classi doppie da import. Poi solo tastiera nelle altre finestre (B-029). Controllo leggero sulle sezioni tutte verdi. *Fatto* = voce nel diario, bug nuovi con passi e test.
- **Power user (21:37) · Sessione di gioco con riposi.** Party di 4 (Guerriero, Chierico, Bardo 5, Monaco) per tre incontri con due riposi brevi: conta cosa torna e cosa no (B-023), PF e slot. Poi backup/ripristino con 20 eroi e copie (prepara la verifica di B-024). *Fatto* = diario con numeri, bug solo se riproducibili.
- **Test e punteggio (domani 8:47)**: se PR #6 è unita, B-030 e B-031 in `BUG_SEZIONE` (già fatto nella PR); rendi B-020 meno sensibile al carico (misura il ciclo, non il tempo totale, o ripeti 2 volte) senza alzare la soglia; test per l'ASI nella seconda classe e per il pulsante + Cos.

## Backlog (ordinato)
**Frontend**
1. B-031 Grappler e talenti con +1: scelta della caratteristica nel level up (dopo PR #6).
2. B-029 `modal()` trattiene il focus, sfondo `inert`; `applyLevelUp` usa l'eroe della finestra.
3. B-030 testi lunghi in danno attacchi, tabella privilegi, incantesimi, nome in Incontro (con il designer, solo CSS).
4. B-023 riposo breve: Second Wind, Channel Divinity, Bardic Inspiration (Font of Inspiration).
5. B-014 filtro per nome e ordine dello scaffale (dopo la proposta del designer).
6. Avviso "Nuova versione, ricarica" quando il service worker trova un index.html nuovo.

**Backend**
7. B-017 / B-018 validazione in `bindValue`: monete e XP ≥ 0, CA 0–40, PF con massimo ragionevole, anche all'import.
8. B-020 import 5etools: togliere il confronto quadratico dentro il ciclo.
9. Zaino lento con CPU 4x al cambio eroe (performance dei dati).
10. Revisione sicurezza: XSS nei campi homebrew e Markdown importato, test in `robustezza`.

**Design**
11. Proposta per B-014; accessibilità (contrasto, focus visibile, `aria-label`, pallini `.dot` e "✕" a 44 px).
12. Stampa/PDF della scheda su A4.
13. **Richiesta di Capo, priorità bassa** · Animazioni di idle dei pupini della Sala del Team (docs/sala/, non toccare `DATA`), solo nei giorni senza compiti UI.
14. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali, avvio dal menu, saltabile): designer + frontend dopo il 23 novembre, o prima se tutte le sezioni sono VERDI.
15. Bozza di post in docs/promo/ quando non ci sono più bug alti (solo bozza, niente Reddit/Discord).

## Regole per tutti
- Solo contenuti SRD 5.2.1; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo l'attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**. Unione automatica dopo i test, tranne pagamenti/Stripe, Supabase, `schema.sql`, funzioni edge: quelle aspettano Capo.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, nessuna regressione, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Rispettare le zone di index.html scritte sopra. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- **[PR #6](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/6)** (tester extra): solo bug B-030, B-031 e 4 test nuovi, nessun codice dell'app. Consiglio di unirla: senza, B-030 e B-031 non entrano nel punteggio.
- **Keep-alive di Supabase**: serve il tuo ok per assegnarlo al backend (il progetto gratuito va in pausa dopo 7 giorni senza attività).
- **Decisione (facoltativa)**: permettere l'host `obahrlbwbplqqgokjqhf.supabase.co` nella rete dell'ambiente cloud, per testare login e sync.
- **Decisione (facoltativa)**: B-011, l'import homebrew deve rispettare il limite di 3 elementi gratuiti?
