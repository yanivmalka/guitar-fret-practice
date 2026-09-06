-- Premium Teacher learning state (premium-product-plan.md P2).
--
-- The adaptive "Teacher" keeps a per-user model: a Leitner SRS schedule per
-- NoteItem (a string+fret fretboard position) and the current daily-goal
-- state, per instrument. localStorage is the immediate / offline source of
-- truth (`learningState` key); this table is the best-effort restore layer,
-- exactly like 0004_user_settings.sql and 0008_user_badges.sql.
--
-- One JSONB blob per user. Shape (see src/learning/learningState.ts):
--
--   { "version": 1,
--     "instruments": {
--       "guitar": {
--         "srs":   { "6:3": { "bucket": 2, "dueAt": 0, "lastReviewedAt": 0,
--                             "reps": 0, "lapses": 0 }, ... },
--         "daily": { "dateISO": "2026-09-06", "target": 12, "completed": 4 },
--         "lastAnswerAt": 0,
--         "updatedAt": "<iso>"
--       }
--     } }
--
-- Sync is NOT last-writer-wins: the client merges the blob per NoteItem
-- (mergeSrsMaps / mergeSrsItem) on every reconcile, so a review made on one
-- device is never dropped because another device wrote the row more
-- recently. The reconcile is pull → merge → write-back → upsert, which is
-- idempotent, so a plain own-row upsert after the merge is safe.
--
-- Run in the Supabase SQL Editor or via `supabase db push`. Idempotent.

create table if not exists public.user_learning_state (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  data        jsonb not null default '{"version":1,"instruments":{}}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────
-- Authenticated own-row access only — the same policy shape as
-- public.user_settings (0004) and public.user_badges (0008).
alter table public.user_learning_state enable row level security;

drop policy if exists user_learning_state_own on public.user_learning_state;
create policy user_learning_state_own on public.user_learning_state
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Data API exposure ────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.user_learning_state to authenticated;
