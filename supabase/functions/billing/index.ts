// Grimoire of Heroes · billing (crafted by HighBrew)
// Called by the app with the player's sign-in token. Deploy with "Verify JWT" ON.
//   {action:'checkout', plan:'monthly'|'yearly'|'founder', returnUrl}  -> {url} of a Stripe checkout page
//   {action:'portal', returnUrl}                                        -> {url} of the Stripe page to manage the plan
//   {action:'delete_account'}                                           -> ends any subscription, deletes the account
// Secrets (Supabase → Edge Functions → Secrets): STRIPE_SECRET_KEY, PRICE_MONTHLY, PRICE_YEARLY, PRICE_FOUNDER, APP_URL.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

const env = (k: string) => Deno.env.get(k) ?? '';
const STRIPE_VERSION = '2026-04-22.dahlia';
const LIVE = ['active', 'trialing', 'past_due'];
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {...CORS, 'Content-Type': 'application/json'}});

// Stripe takes form encoding with brackets for nesting: line_items[0][price]=…
function form(v: unknown, key = '', out = new URLSearchParams()) {
  if (v === undefined || v === null) return out;
  if (typeof v === 'object') for (const [k, x] of Object.entries(v as Record<string, unknown>)) form(x, key ? `${key}[${k}]` : k, out);
  else out.append(key, String(v));
  return out;
}
async function stripe(path: string, params?: Record<string, unknown>, method = 'POST') {
  const r = await fetch((env('STRIPE_API') || 'https://api.stripe.com') + '/v1' + path, {
    method,
    headers: {Authorization: 'Bearer ' + env('STRIPE_SECRET_KEY'), 'Stripe-Version': STRIPE_VERSION, 'Content-Type': 'application/x-www-form-urlencoded'},
    body: params ? form(params).toString() : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error('stripe: ' + (j.error?.message || r.status));
  return j;
}
async function supa(path: string, init: RequestInit = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(env('SUPABASE_URL') + path, {...init, headers: {apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', ...(init.headers || {})}});
  const t = await r.text();
  if (!r.ok) throw new Error('supabase: ' + t);
  return t ? JSON.parse(t) : null;
}
// only send people back to the app's own address
function back(url: unknown, status: string) {
  const app = env('APP_URL');
  const u = new URL(typeof url === 'string' && url.startsWith(app) ? url : app);
  u.hash = ''; u.searchParams.set('billing', status);
  return u.toString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});
  if (req.method !== 'POST') return reply({error: 'method'}, 405);
  try {
    const auth = req.headers.get('Authorization') || '';
    const who = await fetch(env('SUPABASE_URL') + '/auth/v1/user', {headers: {apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: auth}});
    if (!who.ok) return reply({error: 'signed_out'}, 401);
    const user = await who.json();
    const {action, plan, returnUrl} = await req.json().catch(() => ({}));
    const ent = (await supa(`/rest/v1/entitlements?user_id=eq.${user.id}&select=*`))?.[0];
    const lifetime = ent && ['founder', 'gift'].includes(ent.plan) && ent.status === 'active';
    const subscribed = ent?.stripe_subscription && ['monthly', 'yearly'].includes(ent.plan) && LIVE.includes(ent.status);

    if (action === 'portal') {
      if (!ent?.stripe_customer) return reply({error: 'no_customer'}, 404);
      const s = await stripe('/billing_portal/sessions', {customer: ent.stripe_customer, return_url: back(returnUrl, 'managed')});
      return reply({url: s.url});
    }

    if (action === 'checkout') {
      const price = ({monthly: env('PRICE_MONTHLY'), yearly: env('PRICE_YEARLY'), founder: env('PRICE_FOUNDER')} as Record<string, string>)[plan];
      if (!price) return reply({error: 'unknown_plan'}, 400);
      if (lifetime) return reply({error: 'already_lifetime'}, 409);
      if (subscribed && plan !== 'founder') {
        const s = await stripe('/billing_portal/sessions', {customer: ent.stripe_customer, return_url: back(returnUrl, 'managed')});
        return reply({url: s.url, portal: true});
      }
      if (plan === 'founder') {
        const [cfg] = await supa('/rest/v1/app_settings?select=founder_seats');
        const taken = await supa('/rest/v1/entitlements?plan=eq.founder&status=eq.active&select=user_id');
        if ((cfg?.founder_seats ?? 100) - taken.length <= 0) return reply({error: 'founder_sold_out'}, 409);
      }
      const meta = {user_id: user.id, plan};
      const s = await stripe('/checkout/sessions', {
        mode: plan === 'founder' ? 'payment' : 'subscription',
        line_items: [{price, quantity: 1}],
        managed_payments: {enabled: true},
        client_reference_id: user.id,
        metadata: meta,
        ...(plan === 'founder' ? {payment_intent_data: {metadata: meta}, customer_creation: ent?.stripe_customer ? undefined : 'always'} : {subscription_data: {metadata: meta}}),
        ...(ent?.stripe_customer ? {customer: ent.stripe_customer} : {customer_email: user.email}),
        allow_promotion_codes: true,
        success_url: back(returnUrl, 'success'),
        cancel_url: back(returnUrl, 'cancel'),
      });
      return reply({url: s.url});
    }

    if (action === 'delete_account') {
      if (subscribed) await stripe('/subscriptions/' + ent.stripe_subscription, undefined, 'DELETE');
      await supa('/auth/v1/admin/users/' + user.id, {method: 'DELETE'});
      return reply({ok: true});
    }
    return reply({error: 'unknown_action'}, 400);
  } catch (e) {
    console.error(e);
    return reply({error: String((e as Error).message || e)}, 500);
  }
});
