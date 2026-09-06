-- Game progression sync: the World → Stage star ratings a signed-in user has
-- earned, plus a "continue where you left off" pointer. Without this the whole
-- Game resets on a device switch — stars and unlocks are never back-computed
-- from play history (the Game uses an isolated in-memory history sink), so
-- they are simply lost, and two devices diverge permanently.
--
-- localStorage (`gameProgress`) is the immediate / offline source of truth;
-- this table is the best-effort restore layer, exactly like
-- 0004_user_settings.sql, 0008_user_badges.sql and 0012_user_learning_state.sql.
--
-- Shape (see src/game/models.ts `GameProgress`):
--   best_stars  { "<stageId>": 1 | 2 | 3 }   -- 0 is never written; a missing
--                                               stage id means 0★
--   last_played { "worldId": "...", "stageId": "..." }   -- nullable
--
-- Sync is NOT last-writer-wins for `best_stars`: the client merges it per
-- stage as a max (`mergeGameProgress`), so a 3★ earned on one device is never
-- dropped because another device wrote the row more recently. The reconcile is
-- pull → merge → write-back → upsert, which is idempotent and order-independent.
-- `last_played` / `updated_at` are "continue" hints and follow the newer
-- `updated_at`.
--
-- Run in the Supabase SQL Editor or via `supabase db push`. Idempotent.

create table if not exists public.user_game_progress (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  best_stars  jsonb not null default '{}'::jsonb,
  last_played jsonb,
  updated_at  timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────
-- Authenticated own-row access only — the same policy shape as
-- public.user_settings (0004), public.user_badges (0008) and
-- public.user_learning_state (0012).
alter table public.user_game_progress enable row level security;

drop policy if exists user_game_progress_own on public.user_game_progress;
create policy user_game_progress_own on public.user_game_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Data API exposure ────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.user_game_progress to authenticated;
