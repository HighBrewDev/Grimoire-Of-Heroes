-- Grimoire of Heroes · homebrew follows the account (crafted by HighBrew)
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run again. Until it is run, the app keeps homebrew on the device.
--
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
