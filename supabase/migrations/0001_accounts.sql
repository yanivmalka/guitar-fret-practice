-- Accounts MVP: per-user History + Personal Best, restorable across devices.
-- Guests keep using localStorage untouched; signing in with Google syncs
-- these two tables. Run this in the Supabase SQL Editor (or via `supabase db push`).

-- ── history_entries ──────────────────────────────────────────────────────
-- One row per answered question. `id` is generated on the client (uuid) so
-- re-pushing the same local data is idempotent (upsert on id, do nothing).
create table if not exists public.history_entries (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  history_key text not null,
  note        text not null,
  fret        integer not null,
  string      integer not null,
  seconds     real not null,
  skipped     boolean not null,
  correct     boolean,
  created_at  timestamptz not null default now()
);

create index if not exists history_entries_user_key_idx
  on public.history_entries (user_id, history_key);

-- ── personal_bests ───────────────────────────────────────────────────────
-- One row per (user, selector-combination). Mirrors the localStorage
-- `best_<historyKey>` record: best score and the streak/accuracy from that run.
create table if not exists public.personal_bests (
  user_id     uuid not null references auth.users (id) on delete cascade,
  history_key text not null,
  score       integer not null,
  streak      integer not null,
  accuracy    integer not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, history_key)
);

-- ── Row Level Security ───────────────────────────────────────────────────
-- Every statement is scoped to the caller's own rows. One `for all` policy
-- per table covers select / insert / update / delete.
alter table public.history_entries enable row level security;
alter table public.personal_bests  enable row level security;

drop policy if exists history_entries_own on public.history_entries;
create policy history_entries_own on public.history_entries
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists personal_bests_own on public.personal_bests;
create policy personal_bests_own on public.personal_bests
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Data API exposure ────────────────────────────────────────────────────
-- The project was created with "Automatically expose new tables" off, so
-- grant the API roles access explicitly. RLS above still restricts rows.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.history_entries to authenticated;
grant select, insert, update, delete on public.personal_bests  to authenticated;
