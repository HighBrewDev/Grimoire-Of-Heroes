# Segnali alla Sala del Team

La Sala (https://claude.ai/artifact/S9vKKKbzFy2Jb9UNboQ8jv) mostra un pupino "al lavoro" solo se il suo agente lo dice. Il segnale è un documento nella raccolta `live` del database della pagina, scritto con lo strumento `ArtifactData` (url della Sala), un documento per agente.

**Id agente**: `lead`, `test`, `devm` (frontend/sviluppo mattina), `deve` (frontend sera), `back`, `design`, `destr`, `power`, `report`.

**Formato**: `{state:"work"|"idle", since:<ISO UTC inizio>, updated:<ISO UTC ora>, why:<una riga, es. "B-055 e B-056">, steps:[{t:<testo breve>, s:"ok"|"run"|"todo"}]}` (max 12 passi).

**Regola per ogni routine** (da incollare nel prompt, 3 chiamate, niente di più):
1. Appena parte: `get` del tuo documento `live/<id>` per leggere `version`; poi `set` (o `update` con `if_version`; se manca, `set` senza `if_version`) con `state:"work"`, `since` e `updated` = ora, `why`, e `steps` con i 3-5 passi previsti (primo `run`, gli altri `todo`).
2. A metà lavoro (facoltativo, una volta): `update` con `steps` aggiornati e `updated` = ora.
3. A fine lavoro, prima del messaggio finale: `update` con `state:"idle"`, `updated` = ora. Se la sessione si interrompe, la Sala considera comunque in pausa chi non aggiorna da 45 minuti.

Se `ArtifactData` fallisce, ignora e prosegui: il segnale non deve mai bloccare il lavoro.
