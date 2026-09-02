-- Settings sync: the selector picks and UI preferences a signed-in user has
-- chosen (strings, fret range, mode, difficulty, Auto Advance, notation,
-- accidental, order, answer mode, score visibility, instrument, voice
-- engine). Unlike history/personal-best these cannot be merged row-wise, so
-- the model is last-synced-device-wins: one JSON blob per user with an
-- `updated_at`; on sign-in a device whose local settings are older adopts
-- the cloud blob. Same exposure pattern as 0001_accounts.sql.

create table if not exists public.user_settings (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.user_settings enable row level security;

drop policy if exists user_settings_own on public.user_settings;
create policy user_settings_own on public.user_settings
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Data API exposure ────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
