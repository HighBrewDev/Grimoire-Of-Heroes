# Diario del team

## 2026-11-09 · sviluppo (richiesta di Capo: pagina Homebrew dedicata)
- **Fatto**: il vecchio "Workshop" (un unico modulo con le schede per tipo) diventa la pagina **Homebrew**, raggiungibile dal pulsante "Homebrew" in alto (evidenziato quando sei nella pagina) e dal capitolo X, ora "Homebrew · create · import · manage".
  - **Pagina principale**: introduzione con "＋ Create new", "Import file", "Export all"; "Create something new" con 8 riquadri (icona, nome, a cosa serve, quanti ne hai fatti); "Your homebrew" con ricerca e filtri per tipo e per ogni voce Edit / Duplicate / Delete; "Import" con area di trascinamento per file Grimoire e 5etools e il rimando a "Copy to Homebrew" nella Library. Stato vuoto con istruzioni.
  - **Editor** separato: briciole "← Homebrew › New spell", scelta del tipo solo per le voci nuove, modulo a sinistra e **anteprima dal vivo** a destra (sotto il modulo su telefono), Add/Save, Cancel, Delete. Dopo il salvataggio si torna alla pagina principale.
  - "Duplicate" crea "Copy of …" e rispetta il limite gratuito come "Add". **B-011 non toccato**: l'import resta com'era.
  - Testi "Workshop" sostituiti con "Homebrew"; corretto "()" vuoto nella riga di un incantesimo senza liste di classi.
- `sw.js`: alzata la versione di `CACHE`.
- **Test** (Playwright/Chromium, server locale, 1440x900 e 390x844): pulsante in alto con `aria-current`; nuovo incantesimo con anteprima aggiornata a ogni tasto e salvataggio; nuova creatura; import 5etools dall'area della pagina (8 voci); ricerca senza perdere il fuoco; filtro Creature; Duplicate, Edit e Delete dall'editor; Copy to Homebrew da Acid Arrow nella Library apre l'editor. Console senza errori, scrollWidth uguale alla finestra.

## 2026-11-09 · sviluppo
- **Fatto**: i due passi del piano, nessun CSS toccato.
  1. **B-013 su main** ([9c791c1](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/9c791c1)): nuova `invCat` porta ogni categoria sconosciuta al gruppo più vicino ("Treasure" → "Treasure & Valuables", "Weapon" → "Weapons", "Instrument" → "Tools & Kits"…) o a "Quest & Misc"; la usano `fixup` (import, avvio, unione schede) e `itemInfo` (render), quindi nessun oggetto resta senza riga. Categoria `null`/vuota viene tolta (vale la categoria del libro).
  2. **B-012 come PR** [#3](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/3), **unita da sviluppo** dopo i test (non tocca Supabase/pagamenti): `_sig` = due hash cyrb53 dei dati dell'eroe; `normSig` converte i `_sig` vecchi (iniziano con `{`) all'avvio, in `markBase` e nella lista di un'altra scheda; Export e Download .json usano `heroData(c)`. `CACHE` di sw.js alzata (porta online anche B-013). Funzioni push/pull Supabase non toccate.
- **File**: index.html, sw.js, docs/bug-beta.md, docs/team-log.md.
- **Test** (Playwright/Chromium, server locale, service worker bloccato, 1440x900 e 390x844, main e branch affiancati su due porte):
  - B-013 riprodotto prima (83 oggetti, 56 righe, "trophy" → "Nothing matches this filter."); dopo: 83 righe, 25 trovati, modifica (categoria "Treasure & Valuables") e cancellazione ok, anche con l'eroe già salvato in localStorage.
  - B-012: 33 eroi pesanti salvati da main = 1.556.502 caratteri (753.436 di `_sig`); stesso salvataggio aperto col branch e risalvato = 754.604 (48%). 0 `updatedAt` cambiati, 0 `_dirty`; una modifica dopo timbra solo quell'eroe. Export senza campi locali, re-import identico.
  - B-002 ripetuto (schede A, B, C) con risultato identico a main; corsa con un salvataggio non ancora visto di un'altra scheda, sia con `_sig` vecchio sia nuovo: vince l'ultima modifica con avviso, eroe nuovo dell'altra scheda tenuto. Console senza errori.
- **Nota prudenza**: se un'app con la cache vecchia e la nuova sono aperte insieme, la vecchia vede una volta tutti gli eroi come "cambiati" e risolve per ultima modifica; la `CACHE` alzata accorcia questa finestra. Il distruttore può provarlo stasera.
- **Prossima sessione**: B-015 "Esporta tutti gli eroi" (ora l'export è pulito e si può riusare `heroData`).

## 2026-11-09 · team leader
- Controllo app live (Playwright 1440x900 e 390x844): copertina, nuovo eroe e level up 1→2 ok; console pulita a parte Supabase; a 390 px ancora 10 px di scroll orizzontale. Il lavoro del weekend (B-002, B-004, B-009) è online.
- Weekend valutato: prestazioni buone con 33 eroi; nuovi B-012 (`_sig` raddoppia lo spazio), B-013 (oggetti invisibili), B-014, B-015. Stamattina unita anche la PR [#2](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/2) (import 5etools nel Workshop, richiesta di Capo).
- Obiettivo della settimana (7–13/11), confermato: nessuna perdita di dati; ora il "fatto" è B-012, B-013, B-015 chiusi.
- Oggi: sviluppo → B-013 su main, poi B-012 come PR (unione automatica dopo i test). Stasera: distruttore sul salvataggio con più schede, memoria piena, import strani e il nuovo import 5etools.

## 2026-11-09 · sviluppo (richiesta di Capo: homebrew da 5etools)
- **Fatto**: il Workshop ora trasforma file JSON in formato 5etools in homebrew modificabile.
  - **Workshop → Import file** accetta, oltre all'export Grimoire, un file 5etools (`spell`, `feat`, `race`, `background`, `item`/`magicvariant`, `monster`, `class` con `classFeature`, `subclass` con `subclassFeature`). Si apre una finestra con le voci divise per tipo, filtro per nome, "Tick shown"/"Untick all"; sopra 60 voci non è spuntato nulla. Le voci scelte entrano con la stessa unione dell'import Grimoire (`mergeBrew`: stesso tipo e nome → sostituita) e si modificano con i moduli esistenti.
  - **Copy to Workshop** su ogni voce SRD o di una fonte importata in Library (dei tipi che hanno un modulo): apre il modulo già compilato come bozza; si salva con "Add", quindi passa dal normale controllo del limite gratuito di `brewSave`.
  - Modulo Creatura: nuovi campi tiri salvezza, abilità, resistenze, immunità, azioni bonus, reazioni, azioni leggendarie (lo statblock li mostrava già); taglia "Small or Medium".
  - Conversione testo: tag `{@…}` in testo semplice (i dadi restano "2d6 + 3" e si tirano), sotto-voci come "**Nome.** testo", liste e tabelle nel formato di `md()`; capacità/tratti/azioni su una riga per restare modificabili nei campi "uno per riga".
- **B-011 non toccato**: l'import da 5etools segue la stessa strada dell'import homebrew esistente (nessun controllo del limite di 3); la decisione di Capo varrà per entrambi.
- `sw.js`: alzata la versione di `CACHE`.
- **Test** (Playwright/Chromium, server locale, service worker bloccato, 1440x900 e 390x844) con i file veri di 5etools (spells-xphb 391, bestiary-xmm 503, feats 317, races 177, backgrounds 175, items 1820, class-fighter 2+26): ogni voce convertita passa `cleanBrew` e si apre nella scheda senza `undefined`/`[object`/`{@`. Flusso: file misto → finestra → 8 voci aggiunte → Adult Red Dragon modificato e salvato con le azioni leggendarie intatte; file da 391 incantesimi → 0 spuntati; Copy to Workshop da Acid Arrow (SRD) e da Psi Warrior (fonte importata). Import Grimoire esistente invariato (1 aggiunta, 1 scartata). Console senza errori, scrollWidth uguale alla finestra.

## 2026-11-08 · sviluppo
- **Fatto**: i due passi del piano.
  1. **B-004 e B-009 su main** ([8e79163](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/8e79163)): `writeLocal` imposta `G.saveFailed`; se il salvataggio fallisce compare in basso un avviso `role="alert"` ("Not saved… Try again") separato dal toast, quindi `toast()` non lo copre né lo sostituisce; sparisce appena un salvataggio riesce (anche da sola, alla prossima modifica). Nuovo eroe e Import dicono "is on the page but could not be saved" invece di "joins the tome". `maxlength="80"` su `#w_name` e `#f_name`.
  2. **B-002 come PR** [#1](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/1) (unita da Capo alle 13:32, B-002 spostato in "Risolti"): ogni scheda ricorda l'ultima lista letta/scritta; all'evento `storage` (e prima di ogni salvataggio, se la lista salvata è cambiata) unisce per `id`: nuovi da entrambe le parti tenuti, cancellati restano cancellati, stesso eroe cambiato in due schede → vince l'ultima modifica con avviso. Supabase non toccato.
- **CSS**: nessuna regola nuova; l'avviso riusa le classi `toast fumble` con uno stile inline (in basso, larghezza `min(640px, 92vw)`). Nota prudenza: su telefono copre la barra dadi finché il salvataggio fallisce, scelto apposta perché è un'emergenza.
- **File**: index.html, docs/bug-beta.md, docs/team-log.md.
- **Test** (Playwright/Chromium, server locale, service worker bloccato, 1440x900 e 390x844): B-004 riprodotto su main prima del fix (solo "PienoStorage joins the tome.", eroe perso); dopo: avviso visibile anche dopo 3,5 s e un altro toast, liberato lo spazio → "Try again" → avviso sparito, eroe presente dopo la ricarica. B-002 riprodotto prima del fix (passo 3 solo EroeTabB, passo 4 solo EroeTabA); con la PR: entrambi presenti nelle tre schede, eroe cancellato in C non risorge, corsa simulata con avviso. Console senza errori. scrollWidth a 390 px ancora 400 (problema già noto, non toccato).
- **Prossima sessione**: B-005 (ASI sopra 20) e B-006 (danni/cure negativi), oppure la versione di `CACHE` in sw.js per far arrivare subito i fix.

## 2026-11-08 · team leader
- Controllo app live (Playwright 1440x900 e 390x844): i fix di ieri sono online; copertina, nuovo eroe e level up 1→2 ok; console pulita a parte Supabase; a 390 px ancora 10 px di scroll orizzontale.
- Obiettivo della settimana (7–13/11), confermato: nessuna perdita di dati. Chiusi B-001/B-003; restano B-002 e B-004.
- Oggi: sviluppo → B-004 (avviso di memoria piena persistente) e `maxlength` sul Nome (B-009) su main, poi B-002 (due schede) come PR. Stasera: power user su prestazioni con 20+ eroi e verifica dei fix sul sito live.

## 2026-11-07 · sviluppo
- **Fatto**: B-001 e B-003 come da piano, più B-007, B-008 e B-010 (stessa zona: import/fixup). Nessun CSS toccato.
  - Homebrew: nuova `cleanBrew` usata sia dall'import sia all'avvio (IndexedDB), accetta solo categoria nota (`Object.hasOwn`, quindi niente `__proto__`) e nome testo ≤80 caratteri; il toast dice quante voci ha scartato. Sort di ALL tollerante.
  - Eroi: `fixup` riscritta con controlli di tipo (liste → array del tipo giusto, oggetti → oggetti, nomi/classe → testo, punteggi 1–30, PF ≥0, max ≥1, multiclasse con totale ≤20, sfinimento 0–6). `doImport` salva solo dopo un render riuscito, altrimenti annulla e avvisa. `load` scarta eroi `null`. Wizard: livello arrotondato.
- **File**: index.html, docs/bug-beta.md, docs/team-log.md.
- **Test** (Playwright/Chromium, server locale, service worker bloccato, 1440x900 e 390x844): prima della correzione riprodotti tutti i PAGEERROR di B-001/B-003/B-010 e i valori di B-007/B-008; dopo, i JSON dei passi di B-001, B-003, B-007, B-010 importati, tutti i 10 capitoli aperti, pagina ricaricata (anche con homebrew rotto già in IndexedDB e un eroe rotto già in localStorage): 0 errori, tomo visibile, scrollWidth uguale alla finestra. Eroi di esempio identici prima e dopo `fixup` (nessun cambiamento per i dati validi).
- **Commit**: [1a09890](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/1a09890).
- **Nota prudenza**: `fixup` gira anche sui salvataggi esistenti all'avvio, ma cambia solo valori non validi (verificato sugli eroi di esempio); il piano chiedeva questi fix su main.
- **Prossima sessione**: B-004 (avviso di memoria piena che resta visibile) oppure B-002 (due schede, evento `storage`); poi `maxlength` sul campo Nome della scheda per chiudere B-009.

## 2026-11-07 · team leader
- Controllo app live (Playwright 1440x900 e 390x844): tomo, nuovo eroe e level up 1→2 ok; console pulita a parte Supabase; a 390 px ancora 10 px di scroll orizzontale.
- Venerdì sviluppo e designer non hanno lasciato commit né note; segnalato a Capo.
- Obiettivo della settimana (7–13/11): nessuna perdita di dati (B-001…B-004).
- Oggi: sviluppo → B-001 e B-003 (validazione import homebrew ed eroe), poi B-008/B-010. Domenica: power user su prestazioni con 20+ eroi.

## 2026-11-06 · team leader
- Avvio del team: creati docs/team-plan.md, docs/team-log.md, docs/bug-beta.md, cartelle docs/design e docs/promo.
- Controllo app live (Playwright 1440x900 e 390x844): crea eroe e level up ok; console pulita a parte Supabase bloccato dalla sandbox; 10 px di scroll orizzontale su telefono da `input#f_img`.
- Obiettivo della settimana: app comoda su telefono (390x844).
- Oggi: sviluppo → scroll orizzontale a 390 px; designer → barra dadi e toast su telefono + note-design.md; distruttore → wizard e import/export.

## In attesa di Capo
- Nessuna PR aperta: la PR [#3](https://github.com/HighBrewDev/Grimoire-Of-Heroes/pull/3) (B-012) è stata unita da sviluppo il 2026-11-09 dopo i test, come da regola del team.
- Bozze promo: nessuna.
