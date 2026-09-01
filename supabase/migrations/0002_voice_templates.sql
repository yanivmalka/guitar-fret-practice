-- Voice profile sync: personal voice-calibration recordings (MFCC feature
-- vectors, not audio), restorable across a signed-in user's devices. Guests
-- keep using IndexedDB only; signing in with Google syncs this table,
-- same pattern as 0001_accounts.sql. Run this in the Supabase SQL Editor
-- (or via `supabase db push`).

create table if not exists public.voice_templates (
  user_id     uuid not null references auth.users (id) on delete cascade,
  key         text not null,   -- client-generated IndexedDB key (unique per user)
  profile     text not null,   -- the profile name shown in the calibration screen
  vocab_id    text not null,   -- e.g. "notes-alpha" / "notes-solfege"
  label       text not null,   -- one of C D E F G A B # b
  frames      jsonb not null,  -- MFCC frames, number[][]
  source      text not null default 'cal',  -- 'cal' (recorded) | 'learned' (in-game)
  created_at  bigint not null, -- epoch ms, matches the client's StoredTemplate.createdAt
  primary key (user_id, key)
);

create index if not exists voice_templates_user_profile_idx
  on public.voice_templates (user_id, profile, vocab_id);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.voice_templates enable row level security;

drop policy if exists voice_templates_own on public.voice_templates;
create policy voice_templates_own on public.voice_templates
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Data API exposure ────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.voice_templates to authenticated;
