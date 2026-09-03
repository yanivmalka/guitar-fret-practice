-- Badge sync: the achievement badges a signed-in user has earned. Session
-- badges (Perfect Session, Speed Demon, On Fire, Comeback, Every String) only
-- ever accrue going forward and are never back-computed from play history, so
-- without this they are lost the moment the player signs in on another device,
-- and two devices diverge permanently. Lifetime badges partly self-heal from
-- the synced history but lose their original `earnedAt`.
--
-- Unlike history/personal-best rows these are a tiny fixed-size set, so the
-- model is one JSON blob per user (the same `badges` localStorage shape:
-- `{ "<storeKey>": { "earnedAt": "<iso>" } }`). Merge is a key union that
-- keeps the earliest `earnedAt`, so a plain last-writer upsert after a
-- pull+merge is safe and order-independent. Same exposure pattern as
-- 0004_user_settings.sql.
--
-- `retired` carries admin-"Reset" tombstones: `{ "<familyId>": "<iso>" }`.
-- A union merge would otherwise resurrect a family an admin cleared on
-- another device; instead the client drops every earned key in a retired
-- family whose `earnedAt` predates the tombstone (a later Grant survives),
-- the same way 0003_deleted_keys.sql retires cleared history.

create table if not exists public.user_badges (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  badges      jsonb not null default '{}'::jsonb,
  retired     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.user_badges enable row level security;

drop policy if exists user_badges_own on public.user_badges;
create policy user_badges_own on public.user_badges
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Data API exposure ────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.user_badges to authenticated;
