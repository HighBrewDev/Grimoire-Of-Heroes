# Sala del Team Grimoire

Ufficio 3D del team automatico, pubblicato per Capo su https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv.

- `sala-team.html` è il sorgente della pagina (Three.js r128 da cdnjs, niente asset esterni).
- I dati (team, bacheca, bug) stanno solo nell'oggetto `DATA` tra i commenti "DATI: l'unica parte da aggiornare" e "fine dati". Li aggiorna ogni sera alle 22:38 la routine "Bacheca team Grimoire".
- Chi cambia la grafica (designer) modifica il resto del file qui su main e non tocca `DATA`. La routine serale usa il codice di questo file e ci rimette i dati del giorno, poi ripubblica sullo stesso link.
- Prova in locale: `python3 -m http.server` e apri `docs/sala/sala-team.html` (serve la rete per Three.js e i font).

## Animazioni dei pupini
- Fatte il 10/11: ogni pupino ha un gesto in pausa (leader guarda l'orologio e beve il caffè, test spunta la cartellina, dev mattina sonnecchia, dev sera si stiracchia, designer disegna sul taccuino, distruttore fa roteare e lancia il martello, power user balla con le cuffie, report legge e gira pagina), gesti anche al lavoro, e camminano tra scrivania e angolo caffè quando cambia lo stato.
- Il gesto si sceglie da `GESTURE_BY_ID` (o `idle` nell'agente in `DATA`); agenti nuovi ricevono una scrivania e un posto in piedi in automatico.
- Idee facoltative per il designer: gesti nuovi per agenti nuovi, piccole reazioni al clic.
