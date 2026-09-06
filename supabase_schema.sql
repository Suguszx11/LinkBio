-- LinkBio multi-user schema
-- Run this once in Supabase SQL Editor.
create table if not exists public.user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, section),
  constraint user_data_section_check check (section in (
    'profile','links','music','appearance','visualizer','branding',
    'profileCard','background','settings','analytics','gifStickers'
  ))
);

create index if not exists user_data_section_idx on public.user_data(section);
create index if not exists user_data_username_idx on public.user_data((lower(data->>'username'))) where section='profile';

alter table public.user_data enable row level security;

create policy "users can read their own data"
on public.user_data for select
using (auth.uid() = user_id);

create policy "users can insert their own data"
on public.user_data for insert
with check (auth.uid() = user_id);

create policy "users can update their own data"
on public.user_data for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete their own data"
on public.user_data for delete
using (auth.uid() = user_id);

-- Public profile data only. Private settings and analytics stay protected.
create policy "public can read public profile sections"
on public.user_data for select
using (section in ('profile','links','music','appearance','visualizer','branding','profileCard','background','gifStickers'));

create or replace function public.touch_user_data()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

 drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch before update on public.user_data
for each row execute function public.touch_user_data();

-- Helper view used for username lookup without exposing private sections.
create or replace view public.public_profiles as
select user_id, data, updated_at
from public.user_data
where section='profile';

-- Keep the view read-only and expose only the public profile section.
grant select on public.public_profiles to anon, authenticated;


-- V2: canonical usernames for public URLs.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null default '',
  avatar text not null default '',
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username));

alter table public.profiles enable row level security;
create policy "public can read profile handles"
  on public.profiles for select using (true);
create policy "users can insert own profile"
  on public.profiles for insert with check (auth.uid() = user_id);
create policy "users can update own profile"
  on public.profiles for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.sync_profile_handle()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.section = 'profile' then
    insert into public.profiles(user_id,username,display_name,avatar,bio)
    values (
      new.user_id,
      lower(trim(new.data->>'username')),
      coalesce(new.data->>'displayName',new.data->>'name',''),
      coalesce(new.data->>'avatar',''),
      coalesce(new.data->>'bio','')
    )
    on conflict (user_id) do update set
      username=excluded.username,
      display_name=excluded.display_name,
      avatar=excluded.avatar,
      bio=excluded.bio,
      updated_at=now();
  end if;
  return new;
end;
$$;

drop trigger if exists user_data_profile_sync on public.user_data;
create trigger user_data_profile_sync
  after insert or update on public.user_data
  for each row execute function public.sync_profile_handle();

create or replace view public.public_profiles as
select p.user_id,
       jsonb_build_object(
         'username',p.username,
         'displayName',p.display_name,
         'avatar',p.avatar,
         'bio',p.bio
       ) as data,
       p.updated_at
from public.profiles p;

grant select on public.profiles to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- V3: persistent support tickets/messages (Vercel-safe)
create table if not exists public.support_tickets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  photo_url text not null default '',
  subject text not null default 'ติดต่อแอดมิน',
  status text not null default 'open' check (status in ('open','pending','closed')),
  user_unread integer not null default 0,
  admin_unread integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_user_idx on public.support_tickets(user_id,updated_at desc);
create table if not exists public.support_messages (
  id text primary key,
  ticket_id text not null references public.support_tickets(id) on delete cascade,
  number integer not null,
  sender text not null check (sender in ('user','admin','ai')),
  sender_id text not null default '',
  text text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists support_messages_ticket_idx on public.support_messages(ticket_id,number);
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
create policy "users read own support tickets" on public.support_tickets for select using (auth.uid()=user_id);
create policy "users create own support tickets" on public.support_tickets for insert with check (auth.uid()=user_id);
create policy "users update own support tickets" on public.support_tickets for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users read messages in own tickets" on public.support_messages for select using (exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=auth.uid()));
create policy "users create messages in own tickets" on public.support_messages for insert with check (exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=auth.uid()));
create or replace function public.touch_support_ticket() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists support_ticket_touch on public.support_tickets;
create trigger support_ticket_touch before update on public.support_tickets for each row execute function public.touch_support_ticket();


-- V4: persistent GIF sticker section (Supabase/Vercel-safe)
-- The user_data section constraint above includes gifStickers.
-- Public read is limited to the sticker section itself; writes remain protected by auth.uid().
