-- LinkBio: safe persistence + GIPHY/GIF-link data
-- Run once in Supabase SQL Editor.
-- This does NOT disable RLS and does NOT expose Service Role/Secret keys.

-- 1) Ensure the canonical JSON sections exist and can store Link GIF metadata.
alter table public.user_data
drop constraint if exists user_data_section_check;

alter table public.user_data
add constraint user_data_section_check
check (section in (
  'profile','links','music','appearance','visualizer','branding',
  'profileCard','background','settings','analytics','gifStickers'
));

-- 2) The server uses upsert(user_id, section), so this unique key is required.
-- It is already the primary key in the normal schema; this is an explicit safety check.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_data'::regclass
      and contype = 'p'
  ) then
    alter table public.user_data add primary key (user_id, section);
  end if;
end $$;

-- 3) Keep user ownership enforced by RLS.
alter table public.user_data enable row level security;

drop policy if exists "users can read their own data" on public.user_data;
create policy "users can read their own data"
on public.user_data for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert their own data" on public.user_data;
create policy "users can insert their own data"
on public.user_data for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update their own data" on public.user_data;
create policy "users can update their own data"
on public.user_data for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete their own data" on public.user_data;
create policy "users can delete their own data"
on public.user_data for delete
to authenticated
using (auth.uid() = user_id);

-- 4) Public profile sections remain readable for public LinkBio pages.
drop policy if exists "public can read public profile sections" on public.user_data;
create policy "public can read public profile sections"
on public.user_data for select
to anon, authenticated
using (section in ('profile','links','music','appearance','visualizer','branding','profileCard','background','gifStickers'));

-- 5) Make sure GIF sticker storage exists for future uploaded assets.
insert into storage.buckets (id,name,public)
values ('gifs','gifs',true)
on conflict (id) do update set public = excluded.public;

-- Public viewing of approved GIF files.
drop policy if exists "Public read LinkBio GIF files" on storage.objects;
create policy "Public read LinkBio GIF files"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'gifs');

-- Authenticated users may upload/update/delete only inside their own UID folder.
drop policy if exists "Users upload own LinkBio GIF files" on storage.objects;
create policy "Users upload own LinkBio GIF files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'gifs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update own LinkBio GIF files" on storage.objects;
create policy "Users update own LinkBio GIF files"
on storage.objects for update
to authenticated
using (bucket_id = 'gifs' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'gifs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own LinkBio GIF files" on storage.objects;
create policy "Users delete own LinkBio GIF files"
on storage.objects for delete
to authenticated
using (bucket_id = 'gifs' and (storage.foldername(name))[1] = auth.uid()::text);
