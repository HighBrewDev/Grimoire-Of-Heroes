# Effetti CSS pesanti · 2026-11-25

Misura: Chromium headless (rendering software, quindi i valori assoluti sono pessimi, conta il confronto), 60 scroll da 20 px e 60 caratteri digitati in un campo della Cronaca, media di 3 prove, finestra 390x844 touch e 1440x900. Costo = ms per frame (16,7 = frame pieno).

| Selettore | Riga | Effetto | 1440 scroll / digitazione (ms) | 390 scroll / digitazione | Rimovibile |
|---|---|---|---|---|---|
| `.page::before` (+`::after`) | 535, 545 | `will-change:transform` su due strati grandi quanto la pagina, con filtro SVG sopra | base 36 / 60 → senza 20 / 18 | 25 / 17 → 17 / 17 | **Sì, fatto** (nessuna differenza visibile) |
| `.page::before` | 544 | `filter:url(#rough)` (feTurbulence 4 ottave + displacement) sul fondo della carta | senza filtro 20 / 17 | 17 / 17 | No: è il bordo irregolare della pergamena. Con il `will-change` tolto il costo è già sparito |
| `.page::after`, `.btn::after`, `.tab::after`, `.hero::after`, `.dbtn::after`, `.cover::after` | 545-580 | `mix-blend-mode:multiply` (grana, macchie) | senza: 32-37 / 48-63 (nessun guadagno da solo) | 21 vs 25 | No: dà la patina al cuoio e all'oro; guadagno marginale |
| `.cloudBtn .dot` | 624 | animazione infinita `pulse` | trascurabile (solo mentre sincronizza) | idem | Non serve |
| `.strip` / `.face` / `.shade` | 552-554 | `will-change` sui segnalibri 3D | non misurato, elementi piccoli | | Tenere |
| ombre `box-shadow` grandi | 14 occorrenze | ombre ≥10 px | non misurate singolarmente, fuori dal profilo | | No |
| `backdrop-filter`, `blur()` statico | — | assenti nel CSS (solo `filter:blur(1px)` nella `unroll` e un blur di 2 px nel toast, entrambi brevi) | — | | — |

## Cosa ho cambiato
Tolto `will-change:transform` da `.page::before` e `.page::after`. Il filtro `rough` sullo strato forzato a restare in una texture enorme veniva ricalcolato a ogni scroll e a ogni digitazione a 1440: 36 → 20 ms per frame in scroll, 60 → 18 ms digitando. A 390 il guadagno è minore (25 → 17 ms). Nessun cambiamento visibile (a 1440 sparisce anzi un rettangolo di ritaglio del filtro in basso a destra); screenshot `2026-11-25-page-prima|dopo-{390,768,1440}.png`.

## Idea per dopo
Il filtro `rough` resta il costo principale se `will-change` ritorna: non rimetterlo. Eventuale prossimo passo (solo PR): sostituire `feTurbulence` con una maschera SVG/PNG precalcolata per il bordo.
