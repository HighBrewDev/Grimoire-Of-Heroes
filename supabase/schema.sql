-- Grimoire of Heroes · Supabase schema (crafted by HighBrew)
-- Paste all of this into Supabase → SQL Editor → New query → Run. Safe to run again.
--
-- Who can see what:
--   * every player owns their heroes and is the only one who can create, change or delete them;
--   * players in the same party can read each other's heroes and player names;
--   * nobody else sees anything.
--
-- Grimoire+ (the paid plan), enforced here and not in the app, so it cannot be switched on by editing the page:
--   * a free account keeps ONE hero in the cloud (its oldest); the rest stay on the device;
--   * Grimoire+ syncs every hero and keeps a history of each one (restore yesterday's sheet);
--   * only Grimoire+ can create a party; anyone can join a party whose creator has Grimoire+;
--   * the payment webhook (Edge Function stripe-webhook) is the only writer of entitlements.
-- The paywall starts OFF (beta: everyone gets everything). Turn it on when sales open:
--   update public.app_settings set paywall = true;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  updated_at   timestamptz not null default now()
);

create table if not exists public.parties (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  code       text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.party_members (
  party_id  uuid not null references public.parties (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

create table if not exists public.heroes (
  id         text primary key check (char_length(id) between 4 and 64),
  owner      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  deleted    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.heroes add column if not exists created_at timestamptz not null default now();
create index if not exists heroes_owner_idx on public.heroes (owner);
create index if not exists party_members_user_idx on public.party_members (user_id);

-- the server stamps every write, so "last sync" times never depend on a device clock
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists heroes_touch on public.heroes;
create trigger heroes_touch before insert or update on public.heroes for each row execute function public.touch_updated_at();
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before insert or update on public.profiles for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- Grimoire+ entitlements
create table if not exists public.app_settings (
  id            boolean primary key default true check (id),
  paywall       boolean not null default false,
  founder_seats integer not null default 100
);
insert into public.app_settings (id) values (true) on conflict do nothing;

create table if not exists public.entitlements (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  plan                 text not null check (plan in ('monthly', 'yearly', 'founder', 'gift')),
  status               text not null,          -- Stripe's subscription status, or active / refunded for one-off plans
  current_period_end   timestamptz,            -- null for founder and gift: they never expire
  cancel_at_period_end boolean not null default false,
  stripe_customer      text,
  stripe_subscription  text,
  stripe_payment       text,
  updated_at           timestamptz not null default now()
);
create index if not exists entitlements_customer_idx on public.entitlements (stripe_customer);
create index if not exists entitlements_sub_idx on public.entitlements (stripe_subscription);

-- true when this user gets Grimoire+ right now (or the paywall is still off)
create or replace function public.is_premium(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not coalesce((select paywall from app_settings), false)
      or exists (select 1 from entitlements e where e.user_id = u and (
           (e.plan in ('founder', 'gift') and e.status = 'active')
        or (e.plan in ('monthly', 'yearly') and e.status in ('active', 'trialing', 'past_due')
            and (e.current_period_end is null or e.current_period_end > now() - interval '3 days'))));
$$;

-- what the app shows on the account page; works signed out too (paywall and founder seats only)
create or replace function public.billing_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'paywall', coalesce((select paywall from app_settings), false),
    'plus', auth.uid() is not null and public.is_premium(auth.uid()),
    'founder_left', greatest(0, coalesce((select founder_seats from app_settings), 100)
                     - (select count(*) from entitlements where plan = 'founder' and status = 'active')),
    'plan', e.plan, 'status', e.status, 'period_end', e.current_period_end,
    'cancel_at_period_end', e.cancel_at_period_end, 'can_manage', e.stripe_subscription is not null)
  from (select 1) one left join entitlements e on e.user_id = auth.uid();
$$;

-- called only by the payment webhook (service role). A founder or gift plan is never overwritten by
-- subscription events, so an old subscription ending cannot take away a lifetime plan.
create or replace function public.apply_entitlement(p_user uuid, p_plan text, p_status text, p_period_end timestamptz,
  p_cancel boolean, p_customer text, p_subscription text, p_payment text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into entitlements as e (user_id, plan, status, current_period_end, cancel_at_period_end, stripe_customer, stripe_subscription, stripe_payment, updated_at)
  values (p_user, p_plan, p_status, p_period_end, coalesce(p_cancel, false), p_customer, p_subscription, p_payment, now())
  on conflict (user_id) do update set
    plan = excluded.plan, status = excluded.status, current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    stripe_customer = coalesce(excluded.stripe_customer, e.stripe_customer),
    stripe_subscription = coalesce(excluded.stripe_subscription, e.stripe_subscription),
    stripe_payment = coalesce(excluded.stripe_payment, e.stripe_payment),
    updated_at = now()
  where not (e.plan in ('founder', 'gift') and e.status = 'active' and excluded.plan in ('monthly', 'yearly'));
end $$;

-- the user behind a Stripe customer or subscription (for webhook events that carry no user id)
create or replace function public.entitlement_user(p_customer text, p_subscription text) returns uuid
language sql stable security definer set search_path = public as $$
  select user_id from entitlements
  where (p_subscription is not null and stripe_subscription = p_subscription) or (p_customer is not null and stripe_customer = p_customer)
  order by (stripe_subscription = p_subscription) desc nulls last limit 1;
$$;

-- a refunded founder purchase stops counting
create or replace function public.refund_payment(p_payment text) returns void
language sql security definer set search_path = public as $$
  update entitlements set status = 'refunded', updated_at = now() where stripe_payment = p_payment and plan = 'founder';
$$;

-- ---------------------------------------------------------------- helpers (security definer: they read
-- party_members without tripping over its own row-level security)
create or replace function public.is_party_member(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from party_members where party_id = p and user_id = auth.uid());
$$;

-- sharing works only in parties whose creator has Grimoire+ (the master pays, the companions don't)
create or replace function public.shares_party(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from party_members a join party_members b on a.party_id = b.party_id join parties p on p.id = a.party_id
    where a.user_id = auth.uid() and b.user_id = other and public.is_premium(p.created_by));
$$;

-- parties?select=*,active : false while the creator's Grimoire+ has lapsed
create or replace function public.active(p public.parties) returns boolean
language sql stable security definer set search_path = public as $$ select public.is_premium(p.created_by) $$;

-- create a party and join it as its first member
create or replace function public.create_party(p_name text) returns public.parties
language plpgsql security definer set search_path = public as $$
declare p parties;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not public.is_premium(auth.uid()) then raise exception 'grimoire_plus_required' using hint = 'Creating a party needs Grimoire+.'; end if;
  insert into parties (name, created_by) values (coalesce(nullif(trim(p_name), ''), 'Adventuring party'), auth.uid()) returning * into p;
  insert into party_members (party_id, user_id) values (p.id, auth.uid());
  return p;
end $$;

-- join with an invite code; returns null when the code is unknown
create or replace function public.join_party(p_code text) returns public.parties
language plpgsql security definer set search_path = public as $$
declare p parties;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into p from parties where code = upper(trim(p_code));
  if not found then return null; end if;
  if not public.is_premium(p.created_by) then raise exception 'party_inactive' using hint = 'The party creator''s Grimoire+ has lapsed.'; end if;
  insert into party_members (party_id, user_id) values (p.id, auth.uid()) on conflict do nothing;
  return p;
end $$;

-- free accounts: only the oldest live hero may be written to the cloud. Deleting is always allowed.
-- A trigger (not a policy) so that several heroes sent in one request are counted one after another.
create or replace function public.heroes_quota() returns trigger
language plpgsql security definer set search_path = public as $$
declare mine timestamptz;
begin
  if new.deleted or public.is_premium(new.owner) then return new; end if;
  select created_at into mine from heroes where id = new.id and owner = new.owner and not deleted;
  if exists (select 1 from heroes h where h.owner = new.owner and not h.deleted and h.id <> new.id
             and (mine is null or (h.created_at, h.id) < (mine, new.id))) then
    raise exception 'grimoire_plus_required' using hint = 'Free accounts keep one hero in the cloud.';
  end if;
  return new;
end $$;
drop trigger if exists heroes_quota on public.heroes;
create trigger heroes_quota before insert or update on public.heroes for each row execute function public.heroes_quota();

-- ---------------------------------------------------------------- hero history (Grimoire+ backup)
create table if not exists public.hero_history (
  id       bigint generated always as identity primary key,
  hero_id  text not null,
  owner    uuid not null references auth.users (id) on delete cascade,
  data     jsonb not null,
  saved_at timestamptz not null default now()
);
create index if not exists hero_history_hero_idx on public.hero_history (hero_id, saved_at desc);

-- before a hero changes, keep the old sheet: at most one copy every 30 minutes, the latest 60 per hero
create or replace function public.hero_snapshot() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.deleted or old.data = '{}'::jsonb or old.data is not distinct from new.data or not public.is_premium(old.owner) then return new; end if;
  if exists (select 1 from hero_history where hero_id = old.id and saved_at > now() - interval '30 minutes') then return new; end if;
  insert into hero_history (hero_id, owner, data) values (old.id, old.owner, old.data);
  delete from hero_history where hero_id = old.id and id not in (select id from hero_history where hero_id = old.id order by saved_at desc limit 60);
  return new;
end $$;
drop trigger if exists heroes_snapshot on public.heroes;
create trigger heroes_snapshot before update on public.heroes for each row execute function public.hero_snapshot();

revoke all on function public.create_party(text), public.join_party(text) from public, anon;
grant execute on function public.create_party(text), public.join_party(text) to authenticated;
grant execute on function public.is_party_member(uuid), public.shares_party(uuid), public.active(public.parties) to authenticated;
revoke all on function public.apply_entitlement(uuid, text, text, timestamptz, boolean, text, text, text),
  public.entitlement_user(text, text), public.refund_payment(text), public.is_premium(uuid) from public, anon, authenticated;
grant execute on function public.is_premium(uuid) to authenticated;
grant execute on function public.apply_entitlement(uuid, text, text, timestamptz, boolean, text, text, text),
  public.entitlement_user(text, text), public.refund_payment(text), public.is_premium(uuid) to service_role;
grant execute on function public.billing_info() to anon, authenticated;

-- ---------------------------------------------------------------- row-level security
alter table public.profiles      enable row level security;
alter table public.parties       enable row level security;
alter table public.party_members enable row level security;
alter table public.heroes        enable row level security;
alter table public.entitlements  enable row level security;
alter table public.app_settings  enable row level security;
alter table public.hero_history  enable row level security;

drop policy if exists "profiles: read own and party" on public.profiles;
create policy "profiles: read own and party" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_party(id));
drop policy if exists "profiles: write own" on public.profiles;
create policy "profiles: write own" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "parties: members read" on public.parties;
create policy "parties: members read" on public.parties for select to authenticated using (public.is_party_member(id));
drop policy if exists "parties: creator renames" on public.parties;
create policy "parties: creator renames" on public.parties for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "parties: creator deletes" on public.parties;
create policy "parties: creator deletes" on public.parties for delete to authenticated using (created_by = auth.uid());

drop policy if exists "members: read own parties" on public.party_members;
create policy "members: read own parties" on public.party_members for select to authenticated using (public.is_party_member(party_id));
drop policy if exists "members: leave" on public.party_members;
create policy "members: leave" on public.party_members for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.parties p where p.id = party_id and p.created_by = auth.uid()));
-- joining happens only through join_party(), so there is no insert policy

drop policy if exists "heroes: read own and party" on public.heroes;
create policy "heroes: read own and party" on public.heroes for select to authenticated
  using (owner = auth.uid() or public.shares_party(owner));
drop policy if exists "heroes: create own" on public.heroes;
create policy "heroes: create own" on public.heroes for insert to authenticated with check (owner = auth.uid());
drop policy if exists "heroes: change own" on public.heroes;
create policy "heroes: change own" on public.heroes for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "heroes: delete own" on public.heroes;
create policy "heroes: delete own" on public.heroes for delete to authenticated using (owner = auth.uid());

drop policy if exists "entitlements: read own" on public.entitlements;
create policy "entitlements: read own" on public.entitlements for select to authenticated using (user_id = auth.uid());
drop policy if exists "history: read own" on public.hero_history;
create policy "history: read own" on public.hero_history for select to authenticated using (owner = auth.uid());
-- app_settings has no policy: only the SQL editor (and the functions above) can read or change it

grant select, insert, update, delete on public.heroes, public.profiles to authenticated;
grant select on public.entitlements, public.hero_history to authenticated;
grant select, update, delete on public.parties to authenticated;
grant select, delete on public.party_members to authenticated;
revoke all on public.heroes, public.profiles, public.parties, public.party_members, public.entitlements, public.hero_history, public.app_settings from anon;
revoke insert, update, delete on public.entitlements, public.hero_history, public.app_settings from authenticated;

-- ---------------------------------------------------------------- homebrew (follows the account)
-- Same block as supabase/migrations/2026-11-16-homebrew.sql. Until it exists the app keeps homebrew on the device.
-- One row per homebrew entry, owned by its player. Nobody else can read it (homebrew is not shared with the party).
-- data = {cat, o, updatedAt}: the entry and the time of its last edit on the device that made it.
-- A deleted entry stays as a row with deleted = true, so other devices learn about the delete.
create table if not exists public.homebrew (
  id         text primary key check (char_length(id) between 4 and 64),
  owner      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 400000),
  deleted    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists homebrew_owner_idx on public.homebrew (owner);

-- the server stamps updated_at; and a write older than the stored one (a device that was offline for a week) is
-- ignored, so an old copy never overwrites a newer edit
create or replace function public.homebrew_guard() returns trigger language plpgsql as $$
declare o numeric := 0; n numeric := 0;
begin
  if tg_op = 'UPDATE' then
    if new.owner <> old.owner then new.owner := old.owner; end if;
    if jsonb_typeof(old.data->'updatedAt') = 'number' then o := (old.data->>'updatedAt')::numeric; end if;
    if jsonb_typeof(new.data->'updatedAt') = 'number' then n := (new.data->>'updatedAt')::numeric; end if;
    if n < o then return null; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists homebrew_guard on public.homebrew;
create trigger homebrew_guard before insert or update on public.homebrew for each row execute function public.homebrew_guard();

alter table public.homebrew enable row level security;
drop policy if exists "homebrew: read own" on public.homebrew;
create policy "homebrew: read own" on public.homebrew for select to authenticated using (owner = auth.uid());
drop policy if exists "homebrew: create own" on public.homebrew;
create policy "homebrew: create own" on public.homebrew for insert to authenticated with check (owner = auth.uid());
drop policy if exists "homebrew: change own" on public.homebrew;
create policy "homebrew: change own" on public.homebrew for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "homebrew: delete own" on public.homebrew;
create policy "homebrew: delete own" on public.homebrew for delete to authenticated using (owner = auth.uid());
grant select, insert, update, delete on public.homebrew to authenticated;
revoke all on public.homebrew from anon;

-- ---------------------------------------------------------------- NPC dossiers for the DM
-- Same block as supabase/migrations/2026-11-17-npc.sql. Until it exists the app keeps NPCs on the device.
-- npcs = the DM's full dossiers (owner only); npc_public = what the DM revealed (the party can read, only the owner writes).
-- Two tables, on purpose:
--   npcs        the DM's full dossiers, secret notes included. Only the owner can read or write a row.
--   npc_public  what the DM chose to reveal: a ready-made copy without the secrets, written by the DM's app.
--               Everyone in the party can read it, and only the owner can write it.
-- Players never get a policy on npcs, so a secret cannot leak through a bug in the app: it is not in their table.
-- data = {kind: 'npc' | 'group', o, updatedAt}. A removed or hidden entry stays as a row with deleted = true,
-- so the other devices (and the players) learn about it.

create table if not exists public.npcs (
  id         text primary key check (char_length(id) between 4 and 64),
  owner      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  party_id   uuid references public.parties (id) on delete set null,
  data       jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 400000),
  deleted    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists npcs_owner_idx on public.npcs (owner);

create table if not exists public.npc_public (
  id         text primary key check (char_length(id) between 4 and 64),
  owner      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  party_id   uuid not null references public.parties (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 400000),
  deleted    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists npc_public_party_idx on public.npc_public (party_id);
create index if not exists npc_public_owner_idx on public.npc_public (owner);

-- the server stamps updated_at; a write older than the stored one (a device offline for a week) is ignored;
-- the owner and the party of a row never change
create or replace function public.npc_guard() returns trigger language plpgsql as $$
declare o numeric := 0; n numeric := 0;
begin
  if tg_op = 'UPDATE' then
    if new.owner <> old.owner then new.owner := old.owner; end if;
    if tg_table_name = 'npc_public' and new.party_id <> old.party_id then new.party_id := old.party_id; end if;
    if jsonb_typeof(old.data->'updatedAt') = 'number' then o := (old.data->>'updatedAt')::numeric; end if;
    if jsonb_typeof(new.data->'updatedAt') = 'number' then n := (new.data->>'updatedAt')::numeric; end if;
    if n < o then return null; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists npcs_guard on public.npcs;
create trigger npcs_guard before insert or update on public.npcs for each row execute function public.npc_guard();
drop trigger if exists npc_public_guard on public.npc_public;
create trigger npc_public_guard before insert or update on public.npc_public for each row execute function public.npc_guard();

alter table public.npcs       enable row level security;
alter table public.npc_public enable row level security;

drop policy if exists "npcs: read own" on public.npcs;
create policy "npcs: read own" on public.npcs for select to authenticated using (owner = auth.uid());
drop policy if exists "npcs: create own" on public.npcs;
create policy "npcs: create own" on public.npcs for insert to authenticated with check (owner = auth.uid());
drop policy if exists "npcs: change own" on public.npcs;
create policy "npcs: change own" on public.npcs for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "npcs: delete own" on public.npcs;
create policy "npcs: delete own" on public.npcs for delete to authenticated using (owner = auth.uid());

drop policy if exists "npc_public: read own and party" on public.npc_public;
create policy "npc_public: read own and party" on public.npc_public for select to authenticated
  using (owner = auth.uid() or public.is_party_member(party_id));
drop policy if exists "npc_public: create own" on public.npc_public;
create policy "npc_public: create own" on public.npc_public for insert to authenticated
  with check (owner = auth.uid() and public.is_party_member(party_id));
drop policy if exists "npc_public: change own" on public.npc_public;
create policy "npc_public: change own" on public.npc_public for update to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid() and public.is_party_member(party_id));
drop policy if exists "npc_public: delete own" on public.npc_public;
create policy "npc_public: delete own" on public.npc_public for delete to authenticated using (owner = auth.uid());

grant select, insert, update, delete on public.npcs, public.npc_public to authenticated;
revoke all on public.npcs, public.npc_public from anon;

-- ---------------------------------------------------------------- tickets (bugs and ideas)
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run again. Until it is run, tickets wait on the device.
--
--   tickets  what a player reports: a bug, an idea, or wrong data. Each player sees and creates only their own;
--            the status (open / working / done) and the reply can only be written by an admin.
--   admins   who the admins are. The table has RLS and no policy, so nobody can read or change it through the API:
--            it is edited from the SQL Editor only. public.is_admin() is what the policies (and the app) ask.
-- What a ticket holds: the text the player wrote, the chapter they were on, the app version, a coarse device line
-- (system, browser, screen size) and an optional screenshot. No email, no hero data. The server adds the player name.
--
-- To make someone an admin (SQL Editor):
--   insert into public.admins (user_id) select id from auth.users where email = 'someone@example.com' on conflict do nothing;

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.tickets (
  id          text primary key check (char_length(id) between 4 and 64),
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '' check (char_length(author_name) <= 60),
  kind        text not null default 'bug' check (kind in ('bug', 'idea', 'data')),
  severity    text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  title       text not null check (char_length(title) between 1 and 120),
  body        text not null default '' check (char_length(body) <= 4000),
  page        text not null default '' check (char_length(page) <= 60),
  app_version text not null default '' check (char_length(app_version) <= 40),
  device      text not null default '' check (char_length(device) <= 200),
  screenshot  text check (screenshot is null or (char_length(screenshot) <= 450000 and screenshot like 'data:image/%')),
  has_shot    boolean generated always as (screenshot is not null) stored,
  status      text not null default 'open' check (status in ('open', 'working', 'done')),
  reply       text not null default '' check (char_length(reply) <= 2000),
  replied_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tickets_owner_idx on public.tickets (owner, created_at desc);
create index if not exists tickets_status_idx on public.tickets (status, created_at desc);

-- the server decides who wrote it, the status it starts in, and when it was answered
create or replace function public.tickets_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.owner := coalesce(auth.uid(), new.owner);
    new.status := 'open'; new.reply := ''; new.replied_at := null;
    new.created_at := now();
    new.author_name := coalesce((select display_name from public.profiles where id = new.owner), '');
    -- at most 20 tickets an hour per player, so a script cannot fill the table
    if (select count(*) from public.tickets where owner = new.owner and created_at > now() - interval '1 hour') >= 20 then
      raise exception 'tickets_rate_limit';
    end if;
  else
    -- an admin may change only the status and the reply
    new.id := old.id; new.owner := old.owner; new.author_name := old.author_name; new.kind := old.kind; new.severity := old.severity;
    new.title := old.title; new.body := old.body; new.page := old.page; new.app_version := old.app_version;
    new.device := old.device; new.screenshot := old.screenshot; new.created_at := old.created_at;
    if new.reply is distinct from old.reply then new.replied_at := now(); end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists tickets_guard on public.tickets;
create trigger tickets_guard before insert or update on public.tickets for each row execute function public.tickets_guard();

alter table public.tickets enable row level security;

drop policy if exists "tickets: read own or admin" on public.tickets;
create policy "tickets: read own or admin" on public.tickets for select to authenticated using (owner = auth.uid() or public.is_admin());
drop policy if exists "tickets: create own" on public.tickets;
create policy "tickets: create own" on public.tickets for insert to authenticated with check (owner = auth.uid());
drop policy if exists "tickets: admin answers" on public.tickets;
create policy "tickets: admin answers" on public.tickets for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "tickets: admin deletes" on public.tickets;
create policy "tickets: admin deletes" on public.tickets for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.tickets to authenticated;
revoke all on public.tickets from anon;
