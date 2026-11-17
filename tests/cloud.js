// Finto Supabase per i test di sincronizzazione: tabelle in memoria, nessuna rete vera.
// Imita la regola del server per homebrew: una scrittura più vecchia di quella salvata viene ignorata.
const URL_BASE = 'http://localhost:54321';
class Cloud {
  // hub: tabelle condivise tra più utenti (NPC e gruppo), con le stesse regole di visibilità del server
  constructor({user = 'u1', homebrew = 'ok', rows = [], signedOut = false, hub = null, npc = 'ok', tickets = null, admin = false, ticketMode = 'ok', notes = 'ok'} = {}){
    this.hub = hub; this.npcMode = npc; this.noteMode = notes;
    this.tickets = tickets || new Map(); this.admin = admin; this.ticketMode = ticketMode;      // tickets: tabella condivisa tra utenti; admin: vede e risponde a tutti
    this.user = user; this.signedOut = signedOut; this.mode = homebrew;     // 'ok' | 'missing' (tabella non creata) | 'down' (errore del server)
    this.table = new Map(rows.map(r => [r.id, {deleted:false, ...r}]));
    this.log = [];
  }
  config(){ return {supabaseUrl:URL_BASE, supabaseKey:'test-key'}; }
  session(){ return JSON.stringify({access_token:'t', refresh_token:'r', expires_at:Date.now() + 36e5 * 24, user:{id:this.user, email:'t@example.com'}}); }
  seed(){ return this.signedOut ? {} : {'grimoire-session-v1':this.session(), ['grimoire-migrated-v1:' + this.user]:'1'}; }
  put(id, o, cat, updatedAt, deleted = false){ this.table.set(id, {id, owner:this.user, data:deleted ? {updatedAt} : {cat, o, updatedAt}, deleted, updated_at:new Date().toISOString()}); }
  rows(){ return [...this.table.values()]; }
  live(){ return this.rows().filter(r => !r.deleted); }
  async attach(context){
    await context.route(URL_BASE + '/**', async route => {
      const req = route.request(), u = new URL(req.url()), p = u.pathname, json = (b, status = 200) => route.fulfill({status, contentType:'application/json', body:JSON.stringify(b)});
      if (p.startsWith('/rest/v1/homebrew')){
        this.log.push(req.method() + ' homebrew');
        if (this.mode === 'missing') return json({code:'PGRST205', message:"Could not find the table 'public.homebrew' in the schema cache"}, 404);
        if (this.mode === 'down') return json({message:'boom'}, 503);
        if (req.method() === 'GET') return json(this.rows());
        for (const r of JSON.parse(req.postData() || '[]')){
          const old = this.table.get(r.id);
          if (old && (+r.data?.updatedAt || 0) < (+old.data?.updatedAt || 0)) continue;      // la guardia del server
          this.table.set(r.id, {...r, updated_at:new Date().toISOString()});
        }
        return route.fulfill({status:201, body:''});
      }
      if (this.hub && p.startsWith('/rest/v1/npcs') || this.hub && p.startsWith('/rest/v1/npc_public')){
        const pub = p.startsWith('/rest/v1/npc_public'), tbl = pub ? this.hub.pub : this.hub.npcs;
        this.log.push(req.method() + (pub ? ' npc_public' : ' npcs'));
        if (this.npcMode === 'missing') return json({code:'PGRST205', message:"Could not find the table 'public.npcs' in the schema cache"}, 404);
        const member = pid => this.hub.members.includes(this.user) && pid === this.hub.party;
        if (req.method() === 'GET') return json([...tbl.values()].filter(r => r.owner === this.user || (pub && member(r.party_id))));
        for (const r of JSON.parse(req.postData() || '[]')){
          if (r.owner !== this.user) return json({message:'new row violates row-level security policy'}, 403);
          if (pub && !member(r.party_id)) return json({message:'new row violates row-level security policy'}, 403);
          const old = tbl.get(r.id);
          if (old && old.owner !== this.user) return json({message:'row-level security'}, 403);
          if (old && (+r.data?.updatedAt || 0) < (+old.data?.updatedAt || 0)) continue;
          tbl.set(r.id, {...r, updated_at:new Date().toISOString()});
        }
        return route.fulfill({status:201, body:''});
      }
      if (this.hub && p.startsWith('/rest/v1/npc_notes')){
        // come la tabella sul server: solo membri, solo NPC rivelati, 'own' leggibile solo dall'autore, versione bumpata a ogni scrittura
        this.log.push(req.method() + ' npc_notes');
        if (this.noteMode === 'missing') return json({code:'PGRST205', message:"Could not find the table 'public.npc_notes' in the schema cache"}, 404);
        const tbl = this.hub.notes, member = this.hub.members.includes(this.user);
        const revealed = (npc, party) => member && party === this.hub.party && [...this.hub.pub.values()].some(r => r.id === npc && !r.deleted && r.party_id === party);
        const readable = r => revealed(r.npc_id, r.party_id) && (r.scope === 'party' || r.author === this.user);
        const id = (u.searchParams.get('id') || '').replace(/^eq\./, ''), ver = (u.searchParams.get('version') || '').replace(/^eq\./, '');
        if (req.method() === 'GET') return json([...tbl.values()].filter(readable).filter(r => !id || r.id === id));
        if (req.method() === 'POST'){
          const out = [];
          for (const r of JSON.parse(req.postData() || '[]')){
            if (!revealed(r.npc_id, r.party_id)) return json({message:'new row violates row-level security policy'}, 403);
            const want = r.scope === 'party' ? 'party:' + r.npc_id : 'own:' + this.user + ':' + r.npc_id;
            if (r.id !== want) return json({message:'npc_notes: unexpected id'}, 400);
            if (tbl.has(r.id)) return json({message:'duplicate key value violates unique constraint'}, 409);
            const row = {...r, author:this.user, version:1}; tbl.set(r.id, row); out.push(row);
          }
          return json(out, 201);
        }
        if (req.method() === 'PATCH'){
          const row = tbl.get(id);
          if (!row || !readable(row) || String(row.version) !== ver) return json([]);
          row.body = JSON.parse(req.postData() || '{}').body; row.author = this.user; row.version++;
          return json([row]);
        }
        return route.fulfill({status:204, body:''});
      }
      if (this.hub && p.startsWith('/rest/v1/party_members')) return json(this.hub.members.includes(this.user) ? this.hub.members.map(u => ({party_id:this.hub.party, user_id:u, parties:{id:this.hub.party, name:'The Millford Company', code:'ABC123', created_by:this.hub.members[0], active:true}})) : []);
      if (this.hub && p.startsWith('/rest/v1/profiles')) return json(this.hub.members.map(u => ({id:u, display_name:this.hub.names[u] || u})));
      if (p.startsWith('/rest/v1/profiles')) return json(req.method() === 'GET' ? [{id:this.user, display_name:'Tester'}] : [{id:this.user, display_name:'Tester'}]);
      if (p.startsWith('/rest/v1/rpc/is_admin')) return json(this.admin);
      if (p.startsWith('/rest/v1/tickets')){
        this.log.push(req.method() + ' tickets');
        if (this.ticketMode === 'missing') return json({code:'PGRST205', message:"Could not find the table 'public.tickets' in the schema cache"}, 404);
        const id = (u.searchParams.get('id') || '').replace(/^eq\./, '');
        if (req.method() === 'GET'){
          let rows = [...this.tickets.values()].filter(r => this.admin || r.owner === this.user);
          if (id) rows = rows.filter(r => r.id === id);
          return json(rows.map(r => ({...r, has_shot:!!r.screenshot})));
        }
        if (req.method() === 'POST'){
          for (const r of JSON.parse(req.postData() || '[]')){
            if (this.tickets.has(r.id)) continue;                                                  // ignore-duplicates
            this.tickets.set(r.id, {...r, owner:this.user, author_name:'Tester', status:'open', reply:'', created_at:new Date().toISOString()});
          }
          return route.fulfill({status:201, body:''});
        }
        if (!this.admin) return json({message:'row-level security'}, 403);
        const t = this.tickets.get(id);
        if (req.method() === 'PATCH' && t){ const b = JSON.parse(req.postData() || '{}'); t.status = b.status; t.reply = b.reply; }
        if (req.method() === 'DELETE') this.tickets.delete(id);
        return route.fulfill({status:204, body:''});
      }
      if (p.startsWith('/rest/v1/rpc/')) return json({paywall:false, plus:true, founder_left:0});
      if (p.startsWith('/rest/v1/')) return json([]);
      return json({}, 404);
    });
  }
}
// una tavola con un DM (u1) e un giocatore (u2) nello stesso party
const hub = () => ({party:'11111111-1111-4111-8111-111111111111', members:['u1', 'u2'], names:{u1:'Master', u2:'Pippo'}, npcs:new Map(), pub:new Map(), notes:new Map()});
module.exports = {Cloud, URL_BASE, hub};
