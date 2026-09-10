-- 0016_registered_user_count.sql
-- Run in the Supabase SQL Editor or via `supabase db push`.
--
-- Exposes a single scalar: how many accounts exist. The Account screen's
-- "About" tile shows it next to the live-presence counts.
--
-- `auth.users` is not reachable from the client (no anon-readable view, and
-- listing it needs the service-role key). This SECURITY DEFINER function runs
-- with the definer's rights and returns only the COUNT, never any row, so an
-- anon or authenticated caller learns the community size and nothing else.
-- `search_path` is pinned so the body cannot be hijacked by a caller-set path.
--
-- No table, no RLS: the only surface is EXECUTE on the function, granted to
-- anon + authenticated and revoked from PUBLIC.

create or replace function public.registered_user_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from auth.users;
$$;

revoke all on function public.registered_user_count() from public;
grant execute on function public.registered_user_count() to anon, authenticated;
