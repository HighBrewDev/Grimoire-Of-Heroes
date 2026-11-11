# Piano del team · mercoledì 11 novembre 2026

## Stato dell'app
- **Frontend**: live = main (`CACHE` `grimoire-fs1110b` sia sul sito sia nel repo). Controllo delle 9:40 con Playwright a 1440x900 e 390x844, sito live e server locale: carica, scrollWidth uguale alla finestra, console senza errori. Niente di rotto da ieri.
- PR #14 unita alle 9:28: **B-027 chiuso**, `levelup` adesso **22/23** (resta B-033). Ieri sera chiusi B-024, B-035 (backend) e B-026, B-028 (frontend).
- **Backend**: Supabase **risponde** dalla sandbox (`/auth/v1/health` → 401 senza chiave, cioè progetto attivo e non in pausa). B-016 [alta] corretto in PR #16, in attesa di unione.
- **Punteggio totale +158, tendenza ↑** (ieri +105, prima +107). Test 193/210 sul commit 073375c. Nessuna sezione rossa, nessuna regressione.
- La peggiore è **Combattimento (0, 21/29)**: 8 test rossi tutti su B-023 e B-036. Oggi riceve tutte e due le sessioni frontend.

## Allocazione per sezione
| Sezione | Stato | Carico | Responsabile | Perché |
|---|---|---|---|---|
| Combattimento | 🟡 GIALLO (peggiore) | **ALTO** | frontend | B-023 ×6 test, B-036 ×2 |
| Caratteristiche | 🟡 GIALLO | MEDIO | frontend | B-032 |
| Eroe | 🟡 GIALLO | MEDIO | designer + frontend | B-014 (designer), B-034 |
| Incontro | 🟡 GIALLO | MEDIO | frontend | B-037 (stessa logica di B-036) |
| Robustezza | 🟡 GIALLO | MEDIO | frontend (B-029) + backend (XSS) | B-029, revisione sicurezza |
| Import/export e salvataggio | 🟡 GIALLO | MEDIO | backend | B-016 [alta] in PR #16 |
| Workshop homebrew | 🟡 GIALLO | MEDIO | backend | B-020 (B-011 non si applica: app gratuita) |
| Level up e multiclasse | 🟡 GIALLO | MEDIO | frontend | B-033 |
| Zaino, Telefono | 🟡 GIALLO | BASSO | backend / designer | tutto verde, verso il VERDE: solo controlli |
| Tratti, Incantesimi, Cronaca, Biblioteca | 🟢 VERDE | BASSO | — | nessun lavoro, solo controlli leggeri dei tester |

## Oggi
Zone di index.html oggi: **Frontend** possiede `shortRest`/`longRest` (~3681), `applyDamage` (~3342), `heal`/`setDeath` (~3664), il tracciatore `data-enc` (~3398), `conHp` (~3430). **Backend** possiede `md()` (~912) e l'escape nei template, `brewImport` (~2303), la registrazione del service worker (~4368) e sw.js. **Designer** possiede `renderShelf` (~1355) e il CSS dello scaffale. Nessun altro tocca queste zone.

- **Frontend mattina (10:23) · Combattimento, B-023.** In `shortRest` le risorse "Short or Long Rest" recuperano come da SRD 5.2.1: Second Wind 1 uso, Rage 1 uso, Wild Shape 1 uso, Channel Divinity 1 uso (Chierico e Paladino), Bardic Inspiration tutta con Font of Inspiration (Bardo 5+). Meglio una tabella delle risorse che casi sparsi. *Fatto* = i 6 test B-023 verdi, `node tests/run.js combattimento` senza rossi tranne B-036, suite senza regressioni, B-023 in "Risolti", `CACHE` alzata.
- **Backend mezzogiorno (12:53) · Keep-alive di Supabase (ok di Capo dell'11/11), poi Robustezza XSS.** 1) **Come PR**: workflow GitHub Actions pianificato (es. ogni 3 giorni + avvio manuale) che fa una lettura leggera al progetto con la chiave pubblica anon già in config.js (nessun segreto nuovo, nessuna scrittura su dati utenti); se la risposta non è 2xx il workflow fallisce e si vede. *Fatto* = PR aperta con un'esecuzione manuale riuscita o spiegata, link nel log. 2) Revisione XSS: payload (`<img onerror>`, `javascript:` nei link, `"><script>`) in nome eroe, note, homebrew, Markdown importato e file 5etools; correggi l'escape in `md()` e nei template, link solo `http(s)`/`mailto`; test in `robustezza` con ID B-0xx. *Fatto* = test nuovi verdi, suite senza regressioni.
- **Designer (14:13) · Eroe, B-014.** Campo "Filter heroes" sopra lo scaffale (appare da 8 eroi in su) e ordine per nome/ultimo usato; su 390 px niente fila larga 7.400 px (lo scaffale va a capo o scorre dentro sé stesso). *Fatto* = test B-014 verde, `telefono` 15/15, screenshot prima/dopo in docs/design/.
- **Frontend sera (18:23) · Combattimento B-036, poi Incontro B-037, poi Caratteristiche B-032.** `applyDamage`: danno a 0 PF = 1 fallimento (2 se critico), danno che supera i PF massimi oltre lo 0 = morte istantanea con avviso; mai azzerare i fallimenti. Cura dal tracciatore dell'Incontro azzera i tiri contro la morte come Heal. Se resta tempo B-032 in `conHp`. *Fatto* = test B-036 ×2 e B-037 verdi, `combattimento` e `incontro` senza rossi, suite senza regressioni, `CACHE` alzata.
- **Backend notte (23:13) · Workshop B-020, poi service worker.** In `brewImport` togli il confronto quadratico (indice per nome in una `Map`); 20.000 voci sotto 5 s. Poi avviso "New version available, reload" quando sw.js trova un index.html nuovo (non ricarica da solo). Se Capo ha unito PR #16, verifica B-016 su main. *Fatto* = test B-020 veloce anche con CPU lenta, suite senza regressioni.
- **Distruttore (21:07) · Riposi e morte.** Attacca B-023 e B-036 corretti: riposi brevi ripetuti, multiclasse (Guerriero/Chierico), risorse già piene, critici a 0 PF, danno massiccio con PF temporanei. Poi i payload XSS del backend su tutti i campi liberi. *Fatto* = diario, bug nuovi con passi e test.
- **Power user (21:37) · Serata di gioco con l'Incontro.** Party di 4 livello 5 in due incontri dal tracciatore, un eroe che va a 0 PF e viene curato, un riposo breve fra i due. Poi scaffale con 33 eroi e il filtro del designer. *Fatto* = diario con numeri, bug solo se riproducibili.
- **Test e punteggio (domani 8:47)**: se PR #6 è unita, B-030 e B-031 entrano nel punteggio; se il backend non li ha scritti, test XSS in `robustezza`. Nessun test nuovo nelle sezioni VERDI.

## Backlog (ordinato)
**Frontend**
1. B-029 `modal()` trattiene il focus, sfondo `inert`; il level up va all'eroe della finestra.
2. B-033 il menu della classe principale non offre classi già nelle righe.
3. B-034 classe/specie/background fuori dai menu: mostrarli come voce "(not in list)" invece di Barbarian/Dragonborn/Acolyte.
4. B-031 talenti con +1 (Grappler…): scelta della caratteristica nel level up (dopo PR #6).
5. B-030 testi lunghi in attacchi, privilegi, incantesimi, Incontro (con il designer, dopo PR #6).
**Backend**
6. Keep-alive di Supabase: assegnato oggi al backend mezzogiorno (PR).
7. Prova di login e sync reali ora che Supabase risponde dalla sandbox (solo lettura, nessun dato utente toccato).
8. Zaino lento con CPU 4x al cambio eroe (performance dei dati).
9. Revisione delle PR del backend prima dell'unione (Capo).
**Design**
10. Accessibilità: contrasto, focus visibile, `aria-label`, pallini `.dot` e "✕" a 44 px.
11. Stampa/PDF della scheda su A4.
12. **Richiesta di Capo, priorità bassa** · Tour guidato facoltativo (indicatori sui pulsanti principali, avvio dal menu, saltabile): designer + frontend dopo il 23 novembre, o prima se tutte le sezioni sono VERDI.
13. Sala del Team (docs/sala/): solo nei giorni senza compiti UI.
14. Bozza di post in docs/promo/ quando non ci sono più bug alti (solo bozza, niente Reddit/Discord).

## Regole per tutti
- Solo contenuti SRD 5.2.1; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo l'attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**, che aspettano Capo.
- Mai cambiare un test per farlo passare se l'app è sbagliata. Ogni correzione: test della sezione + suite completa, nessuna regressione, `tests/risultati` ripristinato.
- Ogni rilascio alza `CACHE` in sw.js. Rispettare le zone di index.html scritte sopra. Ogni agente lascia una voce in docs/team-log.md.

## In attesa di Capo
- **[PR #16](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/16)** · B-016 [alta], l'unico bug alto aperto: un campo scrive solo sull'eroe per cui è stato aperto. Non tocca Supabase né il formato dei salvataggi, suite 192/203 senza regressioni. Consiglio di unirla.
- **[PR #6](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/6)** · solo bug B-030, B-031 e 4 test, nessun codice dell'app. Consiglio di unirla, così entrano nel punteggio.
- **Keep-alive di Supabase**: ok di Capo arrivato l'11/11; la PR del backend mezzogiorno arriverà qui per l'unione (tocca Supabase).
- **Deciso da Capo l'11/11**: per ora l'app è gratuita, senza abbonamento in vista (link "offrimi un caffè" seguito a parte). B-011 non si applica: Test e punteggio lo sposta in "Risolti" come "non applicabile", senza +3.
