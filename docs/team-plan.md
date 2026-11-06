# Piano del team · venerdì 6 novembre 2026

## Stato dell'app
- Sito live online (200, ~1,5 MB, carica in ~1,2 s). Flusso base ok a 1440x900 e 390x844: apri il tomo → chiudi lettera beta → crea eroe → level up 1→2 funziona.
- Console pulita: l'unico errore è la connessione a Supabase rifiutata dal proxy della sandbox (ambiente, non bug dell'app). Login/sync quindi non testabili dagli agenti finché l'host non è permesso.
- Telefono: 10 px di scroll orizzontale a 390 px, causato da `input#f_img` (classe `.sr`, riga ~1513 di index.html) sulla pagina Eroe.
- Telefono: la barra dadi fissa in basso copre il fondo della pagina; il toast di level up copre la riga "Cloud/sync".
- Primo giorno del team: niente log, niente bug-beta, nessuna PR aperta, nessun commit negli ultimi 3 giorni.

## Obiettivo della settimana
**L'app è comoda su telefono (390x844)**: zero scroll orizzontale in tutti i 10 capitoli, nulla coperto da barra dadi o toast, flusso crea eroe → level up → export senza intoppi.

## Oggi (venerdì)
- **Sviluppo**: niente bug critici/alti in docs/bug-beta.md (file appena creato). Correggi lo scroll orizzontale a 390 px: `.sr` (riga 58) deve restare dentro il viewport (es. `left:0;top:0` o `clip-path:inset(50%)`, `white-space:nowrap`). Poi controlla tutti i capitoli I–X a 390 px. *Fatto* = `document.documentElement.scrollWidth === innerWidth` in ogni capitolo, con e senza eroe selezionato; nota in team-log. Non toccare CSS di barra dadi e toast (sono del designer).
- **Designer**: barra dadi in basso (`#dice…`, `.dbtn`) e toast su telefono. Il contenuto deve avere padding inferiore pari all'altezza della barra (+ safe-area iOS), il toast non deve coprire pulsanti o testo utile. *Fatto* = screenshot 390x844 prima/dopo di pagina Eroe e Combattimento in docs/design/, ultimo pulsante della pagina cliccabile senza essere sotto la barra. Crea docs/design/note-design.md con le regole grafiche che vedi (colori, font, bottoni).
- **Distruttore (21:07)**: rompi il wizard e l'import/export. Nomi vuoti/lunghissimi/emoji/HTML (`<img onerror>`), livello 0, 21, -1, testo; import di JSON malformato, vuoto, enorme, di un altro sito; level up fino a 20 e multiclasse; Homebrew con campi vuoti; ricarica a metà operazione; modalità offline. *Fatto* = ogni bug in docs/bug-beta.md con gravità, passi, atteso/ottenuto.

## Backlog (ordinato)
1. **bug** · Import/export robusto (validazione, nessuna perdita dati): è il punto dove un utente perde un eroe.
2. **UX** · Level up guidato su telefono (scelte di sottoclasse, talenti, incantesimi chiare a 390 px): è il momento più usato al tavolo.
3. **performance** · index.html da 1,5 MB in un file: misurare tempo di avvio su 3G lento e uso memoria con 20+ eroi; valutare caricamento pigro dei dati SRD.
4. **bug** · Service worker: verificare che un aggiornamento del sito arrivi agli utenti (versione cache in sw.js), altrimenti il lavoro del team non si vede.
5. **design** · Accessibilità: contrasto, focus visibile, etichette `aria` su icone (tema, suono).
6. **funzione** · Stampa/PDF della scheda leggibile su A4.
7. **UX** · La lettera beta compare a ogni apertura del tomo? Verificare che si chiuda una volta sola.
8. **marketing** · Prima bozza di post di presentazione in docs/promo/ (solo bozza, pubblica Capo).
9. **legale** · Audit contenuti: solo SRD 5.2.1 nella versione pubblica, nessun marchio; l'unica menzione permessa di Wizards of the Coast è l'attribuzione CC-BY obbligatoria già presente.

## Regole per tutti
- Solo contenuti SRD 5.2.1 pubblici; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo l'attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**, mai su main.
- Nessuna pubblicazione su Reddit/Discord: lo fa Capo.
- Sviluppo e designer non modificano la stessa parte di index.html nello stesso giorno.
- Domenica sera nessuno sviluppa dopo il power user; lunedì si valutano i risultati del weekend.

## In attesa di Capo
- Nessuna PR aperta e nessuna bozza in docs/promo/.
- **Decisione (facoltativa)**: per far testare login e sync agli agenti, permettere l'host `obahrlbwbplqqgokjqhf.supabase.co` nella rete dell'ambiente cloud; altrimenti i test restano solo in locale sul dispositivo.
