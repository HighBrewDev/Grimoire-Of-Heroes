// Finto Supabase per i test di sincronizzazione: tabelle in memoria, nessuna rete vera.
// Imita la regola del server per homebrew: una scrittura più vecchia di quella salvata viene ignorata.
const URL_BASE = 'http://localhost:54321';
class Cloud {
  constructor({user = 'u1', homebrew = 'ok', rows = [], signedOut = false} = {}){
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
      if (p.startsWith('/rest/v1/profiles')) return json(req.method() === 'GET' ? [{id:this.user, display_name:'Tester'}] : [{id:this.user, display_name:'Tester'}]);
      if (p.startsWith('/rest/v1/rpc/')) return json({paywall:false, plus:true, founder_left:0});
      if (p.startsWith('/rest/v1/')) return json([]);
      return json({}, 404);
    });
  }
}
module.exports = {Cloud, URL_BASE};
