-- Grimoire of Heroes · players' notes on NPCs (crafted by HighBrew)
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run again. Until it is run, the notes box says it is not set up.
-- Needs supabase/migrations/2026-11-17-npc.sql (npc_public) and public.is_party_member().
--
-- One table, two kinds of note per revealed NPC:
--   scope 'party'  ONE note shared by the whole party. Every member (the DM included) reads and edits it.
--   scope 'own'    a private note per player: only its author can read it, not even the DM.
-- Only NPCs the DM has revealed (a live row in npc_public for that party) can have notes. Hide the NPC again and its
-- notes disappear for everyone (rows stay, and come back if it is revealed again); delete the NPC and the notes go.
-- The DM's secrets, voice and quotes live in public.npcs, which this table never touches.
--
-- Edit conflicts: every row has a version that the server bumps on each write. The app updates with
--   PATCH ... ?id=eq.<id>&version=eq.<the version it saw>
-- so a write on top of someone else's newer edit changes nothing (0 rows) and the app merges and retries.

create table if not exists public.npc_notes (
  id         text primary key check (char_length(id) between 8 and 160),
  npc_id     text not null references public.npc_public (id) on delete cascade,
  party_id   uuid not null references public.parties (id) on delete cascade,
  scope      text not null check (scope in ('party', 'own')),
  author     uuid not null default auth.uid() references auth.users (id) on delete cascade,   -- 'own': its owner · 'party': the last editor
  body       text not null default '' check (char_length(body) <= 4000),
  version    integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists npc_notes_npc_idx on public.npc_notes (npc_id);
create index if not exists npc_notes_party_idx on public.npc_notes (party_id);

-- true when the NPC is revealed to that party right now (reads npc_public as the caller, so RLS applies)
create or replace function public.npc_revealed(n text, p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.npc_public x where x.id = n and x.party_id = p and not x.deleted and public.is_party_member(p));
$$;
grant execute on function public.npc_revealed(text, uuid) to authenticated;

create or replace function public.npc_notes_guard() returns trigger language plpgsql as $$
begin
  new.author := auth.uid();
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.version := 1;
    if new.id <> (case when new.scope = 'party' then 'party:' || new.npc_id else 'own:' || new.author::text || ':' || new.npc_id end) then
      raise exception 'npc_notes: unexpected id';
    end if;
  else
    new.id := old.id; new.npc_id := old.npc_id; new.party_id := old.party_id; new.scope := old.scope; new.created_at := old.created_at;
    new.version := old.version + 1;
  end if;
  return new;
end $$;
drop trigger if exists npc_notes_guard on public.npc_notes;
create trigger npc_notes_guard before insert or update on public.npc_notes for each row execute function public.npc_notes_guard();

alter table public.npc_notes enable row level security;

drop policy if exists "npc_notes: read" on public.npc_notes;
create policy "npc_notes: read" on public.npc_notes for select to authenticated
  using (public.npc_revealed(npc_id, party_id) and (scope = 'party' or author = auth.uid()));
drop policy if exists "npc_notes: create" on public.npc_notes;
create policy "npc_notes: create" on public.npc_notes for insert to authenticated
  with check (public.npc_revealed(npc_id, party_id));
drop policy if exists "npc_notes: change" on public.npc_notes;
create policy "npc_notes: change" on public.npc_notes for update to authenticated
  using (public.npc_revealed(npc_id, party_id) and (scope = 'party' or author = auth.uid()))
  with check (public.npc_revealed(npc_id, party_id));
drop policy if exists "npc_notes: delete own" on public.npc_notes;
create policy "npc_notes: delete own" on public.npc_notes for delete to authenticated using (scope = 'own' and author = auth.uid());

grant select, insert, update, delete on public.npc_notes to authenticated;
revoke all on public.npc_notes from anon;
