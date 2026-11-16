-- Grimoire of Heroes · bug and idea tickets (crafted by HighBrew)
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
