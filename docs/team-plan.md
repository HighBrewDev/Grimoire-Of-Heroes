# Piano del team · lunedì 9 novembre 2026

## Stato dell'app
- Sito live online (200, ~1,6 MB) con tutto il lavoro di sabato e domenica: B-004/B-009 ([8e79163](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/8e79163)) e B-002 (PR [#1](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/1), unita). Il power user li ha verificati sul live. Stamattina Capo ha unito la PR [#2](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/2): il Workshop importa file JSON in formato 5etools come homebrew modificabile (e `CACHE` di sw.js è stato alzato).
- Controllo di stamattina (Playwright, 1440x900 e 390x844): copertina → "Start writing" → nuovo eroe → level up 1→2 ok, console pulita a parte Supabase bloccato dalla sandbox. A 390 px ancora 10 px di scroll orizzontale (scrollWidth 400).
- Weekend del power user: prestazioni buone (tomo con 33 eroi aperto in 0,8 s, 2 s con CPU 4x; nessuna perdita di memoria). Trovati **B-012** (ogni eroe salvato due volte: il campo `_sig` occupa metà di localStorage e finisce negli export) e **B-013** (oggetti con categoria sconosciuta invisibili e non cancellabili).
- Rischio: con B-012 l'avviso "Not saved" arriva a ~118 eroi pesanti invece di ~230, e non esiste un backup di tutti gli eroi (B-015).

## Obiettivo della settimana (7–13 novembre)
**Nessuna perdita di dati**: salvataggio, import/export a prova di bomba. B-001…B-004 chiusi. *Fatto* entro venerdì = B-012, B-013 e B-015 in "Risolti" e il distruttore di stasera e di venerdì non trova nuove perdite di dati.

## Oggi (lunedì)
- **Sviluppo (10:23)**: due passi, in quest'ordine. Niente CSS.
  1. **B-013 su main** (validazione locale): in `fixup` (index.html ~963) ogni oggetto con `cat` non presente in `INV_CATS` (~1442) diventa "Quest & Misc" (mappa i nomi ovvi: "Treasure" → "Treasure & Valuables", "Weapon" → "Weapons", ecc.). In più, il render dello Zaino non deve mai saltare un oggetto: categoria sconosciuta → gruppo "Quest & Misc".
     *Fatto* = importato l'eroe dei passi di B-013, i 25 "Treasure" compaiono, il filtro "trophy" li trova, si possono modificare e cancellare; numero righe = numero oggetti nell'intestazione; B-013 in "Risolti".
  2. **B-012 come PR** (cambia il formato di salvataggio dei dati utenti): `_sig` diventa un'impronta corta (hash della stringa di `sigOf`, es. cyrb53) invece dell'eroe intero; all'avvio i `_sig` vecchi (che iniziano con `{`) vanno convertiti con lo stesso hash, così nessun eroe risulta "cambiato" e `updatedAt`/`_dirty` non scattano. Export e Download .json (~2583–2588) usano `heroData(c)` (niente `_sig`, `_dirty`, `_rev`, `editedOn`, `updatedAt`). Non toccare le funzioni di push/pull Supabase.
     *Fatto* = PR aperta con test: localStorage con 33 eroi pesanti scende di circa metà; l'unione fra due schede di B-002 funziona ancora (passi di B-002 + stesso eroe cambiato in due schede); un salvataggio vecchio si apre senza nuovi `updatedAt`; export senza campi locali e re-import identico. Si può unire da sola dopo i test (non tocca Supabase/pagamenti), con link e test nel log.
- **Distruttore (21:07)**: attacca il salvataggio nuovo. Due e tre schede insieme con creazione/modifica/cancellazione rapide dello stesso eroe; memoria piena con due schede aperte (avviso "Not saved" in entrambe? eroi persi?); import di eroi con oggetti di categorie strane, `null`, migliaia di oggetti; export → re-import di tutti gli eroi di esempio; **nuovo import 5etools** (Workshop → Import file, PR #2) con file malformati, enormi, tag `{@…}` strani, nomi non testo, voci duplicate e categorie inesistenti: l'app non deve bloccarsi né salvare voci che rompono l'avvio (come B-001). Se B-012 è già su main, ripeti tutto sul live. *Fatto* = voce nel diario dei test e bug nuovi in docs/bug-beta.md con passi riproducibili.
- **Designer e power user**: oggi non lavorano.

## Backlog (ordinato)
1. **funzione** · B-015 "Esporta tutti gli eroi" e import dello stesso file (per sviluppo, martedì): è la prima cosa che serve quando compare "Not saved".
2. **UX/design** · Telefono 390x844: 10 px di scroll orizzontale (`.hero` / `input#f_img`), barra dadi e toast che coprono il fondo. Per il designer martedì.
3. **UX** · B-014 scaffale con 30+ eroi: filtro per nome e ordine (ultimi usati prima). Designer propone, sviluppo realizza.
4. **bug** · B-005 ASI che abbassa punteggi sopra 20; B-006 danni/cure negativi.
5. **bug** · Aggiornamenti: `CACHE` in sw.js va alzato a ogni rilascio (oggi fatto a mano nella PR #2); aggiungere un avviso "Nuova versione, ricarica" quando il service worker trova un index.html nuovo.
6. **performance** · Zaino il più lento con CPU 4x (fino a 490 ms al cambio eroe): render a pezzi o memo.
7. **design** · Accessibilità: contrasto, focus visibile, `aria-label` sulle icone senza testo.
8. **funzione** · Stampa/PDF della scheda leggibile su A4.
9. **marketing** · Prima bozza di post di presentazione in docs/promo/ (solo bozza, pubblica Capo) quando l'obiettivo della settimana è chiuso.
10. **decisione** · B-011 import homebrew oltre il limite gratuito: serve Capo quando si riaccende il paywall.

## Regole per tutti
- Solo contenuti SRD 5.2.1 pubblici; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo l'attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**, mai su main. Avvisi e validazione locali (come B-013) vanno su main.
- **Unione automatica delle PR** (confermata da Capo il 2026-11-08): chi apre una PR la unisce da solo quando i test passano (bug riprodotto prima, assente dopo, desktop e telefono, console pulita) e annota nel log il link e i test. Eccezione: le PR che toccano **pagamenti/Stripe, Supabase, `schema.sql` o le funzioni edge** aspettano l'ok di Capo in "In attesa di Capo".
- Nessuna pubblicazione su Reddit/Discord: lo fa Capo.
- Sviluppo e designer non modificano la stessa parte di index.html nello stesso giorno.
- Ogni agente lascia almeno una voce in docs/team-log.md, anche se non ha concluso nulla.

## In attesa di Capo
- Nessuna PR aperta e nessuna bozza in docs/promo/. La PR di B-012 di oggi non tocca Supabase: lo sviluppo la unisce da sé dopo i test.
- **Decisione (facoltativa)**: permettere l'host `obahrlbwbplqqgokjqhf.supabase.co` nella rete dell'ambiente cloud, così gli agenti possono testare login e sync.
- **Decisione (facoltativa)**: B-011, l'import homebrew deve rispettare il limite di 3 elementi gratuiti?
