// Grimoire of Heroes · Stripe webhook (crafted by HighBrew)
// Stripe calls this after every payment, renewal, change or cancellation. Deploy with "Verify JWT" OFF:
// Stripe has no Supabase token, so every request is checked against the Stripe signature instead.
// Events to send (Stripe → Developers → Webhooks): checkout.session.completed, customer.subscription.created,
// customer.subscription.updated, customer.subscription.deleted, charge.refunded.
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.

const env = (k: string) => Deno.env.get(k) ?? '';
const STRIPE_VERSION = '2026-04-22.dahlia';
const TOLERANCE = 300; // seconds: older signatures are refused, so a captured request cannot be replayed later

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function verify(body: string, header: string) {
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=')).filter(p => p.length === 2).map(([k, v]) => [k.trim(), v])) as Record<string, string>;
  const sigs = header.split(',').filter(p => p.trim().startsWith('v1=')).map(p => p.trim().slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > TOLERANCE) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env('STRIPE_WEBHOOK_SECRET')), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const want = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  // constant-time comparison
  return sigs.some(s => s.length === want.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ want.charCodeAt(i)), 0) === 0);
}
async function stripe(path: string) {
  const r = await fetch((env('STRIPE_API') || 'https://api.stripe.com') + '/v1' + path, {headers: {Authorization: 'Bearer ' + env('STRIPE_SECRET_KEY'), 'Stripe-Version': STRIPE_VERSION}});
  const j = await r.json();
  if (!r.ok) throw new Error('stripe: ' + (j.error?.message || r.status));
  return j;
}
async function rpc(fn: string, args: Record<string, unknown>) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(`${env('SUPABASE_URL')}/rest/v1/rpc/${fn}`, {method: 'POST', headers: {apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json'}, body: JSON.stringify(args)});
  const t = await r.text();
  if (!r.ok) throw new Error(`supabase ${fn}: ${t}`);
  return t ? JSON.parse(t) : null;
}
const id = (x: unknown) => (typeof x === 'string' ? x : (x as {id?: string})?.id) || null;

// Always read the subscription fresh from Stripe, so events arriving out of order still end in the right state.
async function applySubscription(subId: string, hintUser?: string | null) {
  const sub = await stripe('/subscriptions/' + subId);
  const user = sub.metadata?.user_id || hintUser || await rpc('entitlement_user', {p_customer: id(sub.customer), p_subscription: sub.id});
  if (!user) { console.warn('subscription without a user', sub.id); return; }
  const item = sub.items?.data?.[0];
  const end = sub.current_period_end ?? item?.current_period_end;
  await rpc('apply_entitlement', {
    p_user: user, p_plan: item?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly', p_status: sub.status,
    p_period_end: end ? new Date(end * 1000).toISOString() : null, p_cancel: !!(sub.cancel_at_period_end || sub.cancel_at),
    p_customer: id(sub.customer), p_subscription: sub.id, p_payment: null,
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', {status: 405});
  const body = await req.text();
  if (!await verify(body, req.headers.get('Stripe-Signature') || '')) return new Response('bad signature', {status: 400});
  const ev = JSON.parse(body), o = ev.data?.object || {};
  try {
    switch (ev.type) {
      case 'checkout.session.completed': {
        const user = o.client_reference_id || o.metadata?.user_id;
        if (o.mode === 'subscription' && o.subscription) await applySubscription(id(o.subscription)!, user);
        else if (o.mode === 'payment' && o.metadata?.plan === 'founder' && o.payment_status === 'paid' && user)
          await rpc('apply_entitlement', {p_user: user, p_plan: 'founder', p_status: 'active', p_period_end: null, p_cancel: false,
            p_customer: id(o.customer), p_subscription: null, p_payment: id(o.payment_intent)});
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await applySubscription(o.id);
        break;
      case 'charge.refunded':
        if (o.refunded && o.payment_intent) await rpc('refund_payment', {p_payment: id(o.payment_intent)});
        break;
    }
    return new Response(JSON.stringify({received: true}), {headers: {'Content-Type': 'application/json'}});
  } catch (e) {
    console.error(ev.type, e);
    return new Response('error', {status: 500}); // Stripe retries for up to three days
  }
});
