# Piano del team · domenica 8 novembre 2026

## Stato dell'app
- Sito live online (200, ~1,6 MB) con i fix di ieri (`cleanBrew` presente). Flusso base ok a 1440x900 e 390x844: copertina → "Start writing" → nuovo eroe → level up 1→2. Console pulita a parte Supabase bloccato dalla sandbox.
- Ieri lo sviluppo ha chiuso **B-001, B-003, B-007, B-008, B-010** ([1a09890](https://github.com/HighBrewDev/Grimoire-Of-Heroes/commit/1a09890)): import a prova di file rotti.
- Restano aperti **B-002 (critica, due schede si cancellano gli eroi)** e **B-004 (alta, memoria piena silenziosa)**: sono le ultime perdite di dati note.
- A 390 px ancora 10 px di scroll orizzontale (scrollWidth 400). `sw.js` non cambia versione dal 26/10: gli aggiornamenti arrivano solo al secondo avvio.

## Obiettivo della settimana (7–13 novembre)
**Nessuna perdita di dati**: import/export e salvataggio a prova di bomba. *Fatto* = B-002 e B-004 in "Risolti" (B-001 e B-003 già chiusi) e il power user non trova nuove perdite di dati.

## Oggi (domenica)
- **Sviluppo (10:23)**: due passi, in quest'ordine.
  1. **B-004 su main**: in `writeLocal` (index.html ~2813), se `setItem` fallisce imposta un flag `G.saveFailed`; mostra un avviso persistente (banner o toast che non si chiude da solo e non viene sovrascritto da `toast()` ~1186) finché un salvataggio non riesce. `doWizard` (~2645) e l'import non devono dire "joins the tome" se il salvataggio è fallito. Aggiungi anche `maxlength="80"` al campo Nome della scheda (chiude B-009).
     *Fatto* = con localStorage pieno (riempilo da Playwright) creare un eroe mostra l'avviso che resta visibile; dopo aver liberato spazio sparisce; B-004 e B-009 in "Risolti".
  2. **B-002 come PR** (tocca il salvataggio dei dati utenti, quindi niente main): ascolta l'evento `storage` sulla chiave degli eroi e ricarica/unisci per `id` invece di sovrascrivere; se lo stesso eroe è cambiato in entrambe le schede, vince l'ultima modifica e compare un avviso. Non toccare Supabase/sync cloud.
     *Fatto* = PR aperta con il test dei passi di B-002 (schede A e B, entrambi gli eroi presenti) e link in team-log.
  Niente CSS oltre al `maxlength`.
- **Power user (21:37)**: 20+ eroi di livello 10–20 con inventari lunghi e molti incantesimi; misura apertura del tomo, cambio eroe e level up (1440x900 e 390x844, anche con CPU rallentata 4x), dimensione di localStorage/IndexedDB e quanto manca al limite di 5 MB; verifica sul sito live B-001/B-003 e, se già su main, B-004. *Fatto* = numeri nel diario dei test e bug nuovi in docs/bug-beta.md.
- **Designer e distruttore**: oggi non lavorano. Dopo il power user nessuno sviluppa: lunedì si valutano i risultati del weekend.

## Backlog (ordinato)
1. **bug** · B-002 due schede (se la PR di oggi non arriva): perdita dati silenziosa, critica.
2. **UX/design** · Telefono 390x844: 10 px di scroll orizzontale (`.hero` / `input#f_img`), barra dadi e toast che coprono il fondo. Per il designer martedì.
3. **bug** · Service worker: alzare la versione di `CACHE` in sw.js a ogni rilascio (o farlo in automatico), altrimenti i fix arrivano tardi agli utenti.
4. **bug** · B-005 ASI che abbassa punteggi sopra 20; B-006 danni/cure negativi.
5. **performance** · index.html da 1,6 MB: avvio su rete lenta e memoria con 20+ eroi (numeri dal power user di stasera).
6. **design** · Accessibilità: contrasto, focus visibile, `aria-label` sulle icone senza testo.
7. **funzione** · Stampa/PDF della scheda leggibile su A4.
8. **marketing** · Prima bozza di post di presentazione in docs/promo/ (solo bozza, pubblica Capo) quando B-002/B-004 sono chiusi.
9. **decisione** · B-011 import homebrew oltre il limite gratuito: serve Capo quando si riaccende il paywall.

## Regole per tutti
- Solo contenuti SRD 5.2.1 pubblici; mai "Dungeons & Dragons", "D&D" o marchi Wizards of the Coast (salvo l'attribuzione CC-BY).
- Dati utenti, Supabase, pagamenti, login, schema e redesign grandi: **solo PR**, mai su main. Avvisi e validazione locali (B-004, B-009) vanno su main.
- Nessuna pubblicazione su Reddit/Discord: lo fa Capo.
- Sviluppo e designer non modificano la stessa parte di index.html nello stesso giorno.
- Ogni agente lascia almeno una voce in docs/team-log.md, anche se non ha concluso nulla.

## In attesa di Capo
- Nessuna PR aperta e nessuna bozza in docs/promo/. In serata potrebbe arrivare la PR di B-002 (due schede): da rivedere e unire lunedì.
- **Decisione (facoltativa)**: permettere l'host `obahrlbwbplqqgokjqhf.supabase.co` nella rete dell'ambiente cloud, così gli agenti possono testare login e sync.
- **Decisione (facoltativa)**: B-011, l'import homebrew deve rispettare il limite di 3 elementi gratuiti?
