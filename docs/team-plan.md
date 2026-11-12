# Piano del team · giovedì 12 novembre 2026

## Stato dell'app
- Live = main (`CACHE` `grimoire-ds1112a`, commit bff0a97). Controllo con Chromium a 1440x900 e 390x844 in locale: carica, scrollWidth uguale alla finestra, console senza errori. Niente di rotto da ieri.
- Punteggio totale **+208, tendenza ↑** (ieri +173). Test **226/235**; nessuna sezione rossa, nessuna regressione. Ieri sono stati chiusi B-014, B-023, B-030, B-036, B-040.
- Il punto debole è la **sicurezza**: B-039 [alta] (XSS da import in `q` e `condDur`) è aperto e il backend non ha ancora fatto né la revisione XSS né il keep-alive di Supabase (ok di Capo dell'11/11). Sono la priorità di oggi.
- Le più basse: Robustezza (+4), Incontro, Import/export. Quattro sezioni VERDI (Tratti, Incantesimi, Cronaca, Biblioteca).

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| Robustezza | 🟡 GIALLO (peggiore) | **ALTO** | backend (XSS) + frontend (B-029) | B-039 ×2 test, B-029 |
| Import/export e salvataggio | 🟡 GIALLO | **ALTO** | backend | B-039 [alta], B-038, B-016 da verificare |
| Incontro | 🟡 GIALLO | MEDIO | frontend | B-037 (PR #19 già pronta, aspetta Capo) |
| Caratteristiche | 🟡 GIALLO | MEDIO | frontend | B-032 |
| Level up e multiclasse | 🟡 GIALLO | MEDIO | frontend | B-031, B-033 |
| Eroe | 🟡 GIALLO | MEDIO | frontend | B-034 |
| Workshop homebrew | 🟡 GIALLO | MEDIO | backend | B-020 (B-011 non applicabile) |
| Combattimento, Telefono, Zaino | 🟡 GIALLO | BASSO | designer | tutti i test verdi, solo controlli |
| Tratti, Incantesimi, Cronaca, Biblioteca | 🟢 VERDE | BASSO | — | solo controlli leggeri dei tester |

## Oggi
Zone di index.html oggi: **Backend** (per prima) possiede `md()` e l'escape nei template, rendering di Zaino (`q`) e condizioni (`condDur`), import eroe (validazione di `res`, `q`, `condDur`), `brewImport`, sw.js. **Frontend** (dopo il backend) possiede `modal()`/level up, menu classe (`classOptions` e righe multiclasse), `conHp`, scelta talenti. **Designer** possiede solo CSS e `docs/design/`. Nessuno esce dalla propria zona.

- **Sviluppo 10:23, una sessione, prima BACKEND** · Robustezza/Import, **B-039 + B-038**. Escape o riduzione a numero di `q` e `condDur` al rendering e all'import (interi, intervallo sensato); `res` interi 0-20. Poi **come PR**: workflow GitHub Actions per il keep-alive di Supabase (lettura leggera con la chiave anon di config.js, ogni 3 giorni + avvio manuale, fallisce se non 2xx). *Fatto* = test B-039 ×2 e B-038 verdi, `robustezza` e `importexport` senza regressioni, B-039/B-038 in "Risolti", PR keep-alive aperta con link.
- **Sviluppo, poi FRONTEND** · **B-029** (`modal()` trattiene il focus, sfondo `inert`, level up all'eroe della finestra), poi B-033, B-034, B-032, B-031 finché c'è tempo, in quest'ordine. *Fatto* = test del bug verde, sezione senza rossi nuovi, suite completa senza regressioni, `CACHE` alzata, log aggiornato.
- **Designer 14:13 · Accessibilità (Telefono/Eroe).** Focus visibile, contrasto, `aria-label` sui pulsanti a icona, `.dot` e "✕" a 44 px su 390 px. Solo CSS e attributi, senza toccare le zone sopra. *Fatto* = `telefono` 17/17, suite senza regressioni, screenshot prima/dopo in docs/design/.
- **Distruttore 21:07 · Sicurezza dell'import.** Riprova B-039/B-038 corretti: `<img onerror>`, `javascript:`, `"><script>` in nome, note, homebrew, Markdown, 5etools, `q`, `condDur`, `res`, ogni campo libero di un eroe importato. *Fatto* = diario, bug nuovi con passi e test.
- **Power user 21:37 · Level up e multiclasse.** Eroe 1→10 in due classi (Guerriero/Ladro), talenti con +1, backup e ripristino, poi Incontro con un eroe curato a 0 PF. *Fatto* = diario con numeri, bug solo se riproducibili.
- **Test e punteggio (domani 8:47)**: B-039/B-038 e quelli chiusi oggi entrano nel punteggio; nessun test nuovo nelle sezioni VERDI.

## Backlog (ordinato)
**Backend**
1. B-039 / B-038 (oggi).
2. Keep-alive di Supabase (PR oggi).
3. B-020 `brewImport` con `Map`, 20.000 voci sotto 5 s.
4. Avviso "New version available" quando sw.js trova un index.html nuovo.
5. Verifica B-016 su main (PR #16 unita) e spostalo in "Risolti".
6. Prova di login e sync reali (sola lettura).
**Frontend**
7. B-029, 8. B-033, 9. B-034, 10. B-032, 11. B-031.
**Design**
12. Accessibilità (oggi), poi stampa/PDF A4 della scheda.
13. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali, avvio dal menu, saltabile): designer + frontend dopo il 23/11, o prima se tutte le sezioni sono VERDI.
14. Bozza di post in docs/promo/ quando non ci sono più bug alti (solo bozza). Sala del Team solo nei giorni senza compiti UI.

## Regole per tutti
- Solo SRD 5.2.1; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- **[PR #19](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/19)** · B-037, cura dal tracciatore dell'Incontro: da rivedere e unire.
- **PR keep-alive di Supabase**: arriva oggi dal backend, da unire.
- App gratuita (PR #18 già unita); B-011 non applicabile.
