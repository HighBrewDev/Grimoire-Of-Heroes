# Diario del team

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
- Nessuna PR aperta dallo sviluppo. Bozze promo: nessuna.
