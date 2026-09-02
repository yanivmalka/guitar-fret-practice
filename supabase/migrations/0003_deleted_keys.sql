-- Deletion propagation: when a signed-in user clears the stats for one
-- selector-combination (`historyKey`), that clear must reach their other
-- devices instead of being resurrected by the next idempotent re-push.
--
-- Model: a tombstone row per (user, history_key). `deleted_at` is the moment
-- the clear happened. History rows created at or before `deleted_at` are
-- considered deleted everywhere; a later replay of the same combination
-- writes rows with a newer `created_at`, which survive. Same pattern as
-- 0001_accounts.sql — run this in the Supabase SQL Editor (or `supabase db push`).

create table if not exists public.deleted_keys (
  user_id     uuid not null references auth.users (id) on delete cascade,
  history_key text not null,
  deleted_at  timestamptz not null default now(),
  primary key (user_id, history_key)
);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.deleted_keys enable row level security;

drop policy if exists deleted_keys_own on public.deleted_keys;
create policy deleted_keys_own on public.deleted_keys
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Data API exposure ────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.deleted_keys to authenticated;
