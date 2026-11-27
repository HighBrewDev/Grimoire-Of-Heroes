# Lag di digitazione · 2026-11-27

Script: `node tests/misura-lag.js` (fuori dalla suite). Chromium headless a rendering software, eroe vuoto. Per ogni campo scrive 60 caratteri (3 prove = 180 tasti) e misura per tasto il tempo fino a due frame dopo (`input` + 2 `requestAnimationFrame`). 33,3 ms = due frame pieni a 60 Hz = il minimo possibile con questo metodo.

| Finestra | Campo | Prima (main f7d803e) mediana / p95 / max | Dopo (CSS in style.css) mediana / p95 / max |
|---|---|---|---|
| 1440 | Aspetto (`#n_look`) | 33,3 / 33,9 / 204 | 33,3 / 39,0 / 223 |
| 1440 | Storia (`#n_story`) | 33,3 / 34,6 / 220 | 33,3 / 33,6 / 227 |
| 1440 | Workshop testo arma (`#bw_x`) | 33,3 / 34,5 / 197 | 33,3 / 35,0 / 239 |
| 390 | Aspetto | 33,3 / 33,6 / 96 | 33,3 / 33,5 / 91 |
| 390 | Storia | 33,3 / 33,6 / 81 | 33,3 / 33,7 / 85 |
| 390 | Workshop testo arma | 33,3 / 33,7 / 47 | 33,3 / 33,6 / 139 |

Lettura: ogni tasto si assesta entro due frame, a 1440 come a 390, in tutti e tre i campi: nessun lag di digitazione riproducibile in questo ambiente (dopo il lavoro del Designer del 25/11 sul `will-change`). Il massimo è un solo tasto per prova (il primo, che avvia il layout), non cambia tra prima e dopo. L'estrazione del CSS non cambia la digitazione. Limite: rendering software, il telefono vero può comportarsi diversamente; se Capo vede ancora lag, serve il campo e il dispositivo.
