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
    'profileCard','background','settings','analytics'
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
using (section in ('profile','links','music','appearance','visualizer','branding','profileCard','background'));

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
