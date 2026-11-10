# Sala del Team Grimoire

Ufficio 3D del team automatico, pubblicato per Capo su https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv.

- `sala-team.html` è il sorgente della pagina (Three.js r128 da cdnjs, niente asset esterni).
- I dati (team, bacheca, bug) stanno solo nell'oggetto `DATA` tra i commenti "DATI: l'unica parte da aggiornare" e "fine dati". Li aggiorna ogni sera alle 22:38 la routine "Bacheca team Grimoire".
- Chi cambia la grafica (designer) modifica il resto del file qui su main e non tocca `DATA`. La routine serale usa il codice di questo file e ci rimette i dati del giorno, poi ripubblica sullo stesso link.
- Prova in locale: `python3 -m http.server` e apri `docs/sala/sala-team.html` (serve la rete per Three.js e i font).

## In coda per il designer (priorità bassa, solo se non ha altro)
- Animazioni di idle personalizzate per i pupini: ognuno con il suo gesto quando è in pausa (es. il designer schizza su un taccuino, il distruttore fa roteare il martello, il power user muove la testa con le cuffie, il report sfoglia un foglio, il leader guarda l'orologio, chi è alla macchinetta sorseggia). Rispettare `prefers-reduced-motion`, nessun calo di fluidità su telefono.
