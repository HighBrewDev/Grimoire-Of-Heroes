# Piano del team · sabato 7 novembre 2026

## Stato dell'app
- Sito live online (200, ~1,6 MB). Flusso base ok a 1440x900 e 390x844: apri il tomo → "Start writing" → nuovo eroe → level up 1→2 funziona. Console pulita a parte Supabase bloccato dalla sandbox.
- Ieri **sviluppo e designer non hanno lasciato commit, PR o note**: nessun bug risolto, a 390 px restano 10 px di scroll orizzontale e barra dadi/toast che coprono il contenuto.
- Il distruttore ha aperto 11 bug (B-001…B-011): **2 critici e 2 alti di perdita dati** (import senza validazione, due schede, memoria piena). Sono il rischio principale prima di far entrare altri beta tester.

## Obiettivo della settimana (7–13 novembre)
**Nessuna perdita di dati**: import/export e salvataggio a prova di bomba. *Fatto* = B-001, B-002, B-003, B-004 in "Risolti" e i JSON del diario dei test del 6/11 non rompono più l'app. L'obiettivo telefono resta aperto per il designer (martedì).

## Oggi (sabato)
- **Sviluppo (10:23)**: correggi **B-001** e **B-003**, entrambi nella validazione dell'import.
  - B-001: `brewImport` (index.html ~2092) accetta solo voci con `o.n` stringa non vuota (tronca a 80 caratteri); scarta le altre e dì quante nel toast. Rendi il sort di ALL (~790) tollerante (`String(a.n)`), così chi ha già un homebrew rotto in IndexedDB si riprende senza svuotarlo a mano.
  - B-003: `fixup` (~950) deve forzare a array (`Array.isArray(x) ? x.filter(Boolean) : []`) inventory, feats, attacks, conditions, multi, spells.known/prepared, e a stringa name/class/species; `doImport` salva solo dopo che fixup e un render di prova sono riusciti.
  - Se avanzi tempo: B-008 (livello intero, `Math.round`) e B-010 (nome numerico).
  - *Fatto* = i JSON dei passi di B-001, B-003, B-007, B-010 importati e pagina ricaricata senza `PAGEERROR`, tomo visibile; voci spostate in "Risolti" con il commit; nota in team-log. Lavora solo su import/fixup: niente CSS.
- **Designer, distruttore, power user**: oggi non lavorano. Domani sera (domenica 21:37) il power user: vedi sotto.
- **Anticipo per domenica · power user (21:37)**: 20+ eroi di livello 10–20 con inventari lunghi e molti incantesimi; misura tempo di apertura del tomo, cambio eroe e level up (desktop e 390x844, anche con CPU rallentata 4x), dimensione di localStorage/IndexedDB; verifica che B-001/B-003 siano davvero risolti sul sito live. *Fatto* = numeri e bug in docs/bug-beta.md.

## Backlog (ordinato)
1. **bug** · B-002 due schede si cancellano gli eroi a vicenda: ascoltare l'evento `storage` / BroadcastChannel e unire invece di sovrascrivere. Perdita dati silenziosa (lunedì).
2. **bug** · B-004 memoria piena: l'avviso di salvataggio fallito non deve essere coperto da altri toast e deve restare finché non si libera spazio.
3. **UX/design** · Telefono 390x844: scroll orizzontale di 10 px (scaffale eroi `.hero` / `input#f_img`), barra dadi e toast che coprono il fondo pagina. Obiettivo mancato la settimana scorsa.
4. **bug** · B-005…B-007: ASI che abbassa punteggi sopra 20, danni/cure negativi, import con livelli totali oltre 20.
5. **bug** · Service worker: un aggiornamento del sito deve arrivare agli utenti (versione cache in sw.js), altrimenti i fix non si vedono.
6. **performance** · index.html da 1,6 MB in un file: avvio su 3G lento e memoria con 20+ eroi (dati dal power user).
7. **design** · Accessibilità: contrasto, focus visibile, `aria-label` sulle icone senza testo.
8. **funzione** · Stampa/PDF della scheda leggibile su A4.
9. **marketing** · Prima bozza di post di presentazione in docs/promo/ (solo bozza, pubblica Capo), da preparare quando i bug critici sono chiusi.
10. **decisione** · B-011 import homebrew oltre il limite gratuito: voluto o no? Serve Capo quando si riaccende il paywall.

## Regole per tutti
- Solo contenuti SRD 5.2.1 pubblici; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo l'attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**, mai su main. Fix di validazione dell'import locale vanno su main.
- Nessuna pubblicazione su Reddit/Discord: lo fa Capo.
- Sviluppo e designer non modificano la stessa parte di index.html nello stesso giorno.
- Ogni agente lascia almeno una voce in docs/team-log.md, anche se non ha concluso nulla.
- Domenica sera nessuno sviluppa dopo il power user; lunedì si valutano i risultati del weekend.

## In attesa di Capo
- Nessuna PR aperta e nessuna bozza in docs/promo/.
- **Controllo**: le routine Sviluppo (10:23) e Designer (14:13) di venerdì non hanno lasciato traccia: verifica che siano attive e che abbiano accesso push al repo.
- **Decisione (facoltativa)**: permettere l'host `obahrlbwbplqqgokjqhf.supabase.co` nella rete dell'ambiente cloud, così gli agenti possono testare login e sync.
