-- Leaderboard: one public row per (user, instrument) holding that player's
-- all-time totals. This is a FREE feature — the row set is world-readable
-- (anon included) so even a signed-out visitor can browse the standings; a
-- player only appears once they have signed in with Google and their client
-- has pushed a row. Writing is self-only: a signed-in user upserts / deletes
-- their own row and nothing else (RLS below). Same API-exposure pattern as
-- 0001_accounts.sql. Run in the Supabase SQL Editor or via `supabase db push`.
--
-- Anti-cheat note: the client computes `xp` from its own practice history and
-- writes its own row, so the figures are only as trustworthy as the client.
-- The CHECK bounds below stop absurd values; anything finer (server-side
-- recomputation from history_entries) is deliberately out of scope for v1.

create table if not exists public.leaderboard_entries (
  user_id       uuid not null references auth.users (id) on delete cascade,
  instrument    text not null,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  xp            integer not null check (xp between 0 and 5000000),
  questions     integer not null check (questions between 0 and 20000000),
  accuracy      integer not null check (accuracy between 0 and 100),
  updated_at    timestamptz not null default now(),
  primary key (user_id, instrument)
);

-- Standings are read ordered by xp; this index serves the top-N query.
create index if not exists leaderboard_entries_rank_idx
  on public.leaderboard_entries (instrument, xp desc);

-- ── Row Level Security ──────────────────────────────────────────────────
alter table public.leaderboard_entries enable row level security;

-- select — everyone, signed in or not (this is what makes it a free/open
-- feature: guests can see the board).
drop policy if exists leaderboard_read_all on public.leaderboard_entries;
create policy leaderboard_read_all on public.leaderboard_entries
  for select
  to anon, authenticated
  using (true);

-- insert / update / delete — a signed-in user, only on their own row.
drop policy if exists leaderboard_write_own on public.leaderboard_entries;
create policy leaderboard_write_own on public.leaderboard_entries
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Data API exposure ──────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select on public.leaderboard_entries to anon, authenticated;
grant insert, update, delete on public.leaderboard_entries to authenticated;
