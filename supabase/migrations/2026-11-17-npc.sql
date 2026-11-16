-- Grimoire of Heroes · NPC dossiers for the DM (crafted by HighBrew)
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run again. Until it is run, NPCs stay on the device.
-- Needs the party tables (supabase/schema.sql) and public.is_party_member().
--
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
