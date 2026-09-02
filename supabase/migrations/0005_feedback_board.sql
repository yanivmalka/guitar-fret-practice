-- Feedback board: any signed-in user can post an idea / comment / suggestion.
-- Authors can read back only their own posts; admins read every post and can
-- delete one or mark it handled. Admin membership is an explicit allowlist
-- table, seeded with the initial owner accounts. Same API-exposure pattern as
-- 0001_accounts.sql. Run in the Supabase SQL Editor or via `supabase db push`.

-- ── admins ──────────────────────────────────────────────────────────────
-- One row per admin user. Not written through the Data API — membership is
-- managed here in SQL only.
create table if not exists public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

-- Seed the initial admin accounts by email. Only matches accounts that have
-- already signed in at least once (the auth.users row must exist); if an
-- account signs in later, re-run this statement. Idempotent.
insert into public.admins (user_id)
select id from auth.users
where lower(email) in ('ymalka82810@gmail.com', 'yanivmalka@gmail.com')
on conflict (user_id) do nothing;

-- Is the current caller an admin? SECURITY DEFINER so a policy can call this
-- without recursing back through admins' own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ── feedback_posts ──────────────────────────────────────────────────────
-- author_name / author_email are denormalised from the Google profile at
-- post time so admins see who wrote a post without a join to auth.users
-- (which the Data API does not expose).
create table if not exists public.feedback_posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  author_name  text,
  author_email text,
  body         text not null check (char_length(body) between 1 and 4000),
  handled      boolean not null default false,
  handled_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists feedback_posts_created_idx
  on public.feedback_posts (created_at desc);

-- ── Row Level Security ──────────────────────────────────────────────────
alter table public.admins         enable row level security;
alter table public.feedback_posts enable row level security;

-- admins: a caller may read their own membership row (so the app can tell
-- whether to show the admin view); admins may read the whole table.
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- feedback_posts:
--   insert — any authenticated user, only as themselves
--   select — your own rows, or every row if you are an admin
--   update — admins only (the "handled" toggle)
--   delete — admins only
drop policy if exists feedback_insert_own on public.feedback_posts;
create policy feedback_insert_own on public.feedback_posts
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists feedback_select_own_or_admin on public.feedback_posts;
create policy feedback_select_own_or_admin on public.feedback_posts
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists feedback_update_admin on public.feedback_posts;
create policy feedback_update_admin on public.feedback_posts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists feedback_delete_admin on public.feedback_posts;
create policy feedback_delete_admin on public.feedback_posts
  for delete
  to authenticated
  using (public.is_admin());

-- ── Data API exposure ──────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.feedback_posts to authenticated;
grant execute on function public.is_admin() to authenticated;
