-- Free vs Pro tiering (design .kiro/specs/free-pro-tiering/design.md §3.1).
-- Two new tables, both written server-side only:
--
--   public.entitlements   — one row per user granting Pro. No row => Free.
--                           A row with tier='pro' and (expires_at is null or
--                           expires_at > now()) => Pro. RLS gives a signed-in
--                           user read-only access to their own row; there is
--                           no client write policy, so the admin script and
--                           the (future) payment webhook write with the
--                           service-role key, which bypasses RLS.
--
--   public.orphan_practice — write-only capture for a guest's local practice
--                            rows when they sign in and choose "use account
--                            only" (design §5.4). No user_id, no FK: these
--                            rows are deliberately unlinked from any account.
--                            insert-only for everyone, no select policy;
--                            analytics reads use the service-role key.
--
-- Same API-exposure pattern as 0001_accounts.sql / 0006_leaderboard.sql. Run
-- in the Supabase SQL Editor or via `supabase db push`.

-- ── entitlements ────────────────────────────────────────────────────────
create table if not exists public.entitlements (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  tier         text not null default 'free' check (tier in ('free', 'pro')),
  source       text not null default 'manual'
               check (source in ('manual', 'promo', 'revenuecat', 'stripe', 'play', 'comp')),
  -- null = does not expire (comp / lifetime); otherwise the access cut-off,
  -- enforced client-side against the client clock.
  expires_at   timestamptz,
  -- opaque provider reference (RevenueCat app_user_id, Stripe sub id, …) so a
  -- webhook can find and update the right row. Unused for manual grants.
  provider_ref text,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table public.entitlements enable row level security;

-- Read: a signed-in user may read only their own entitlement row.
drop policy if exists entitlements_read_own on public.entitlements;
create policy entitlements_read_own on public.entitlements
  for select
  to authenticated
  using (user_id = auth.uid());

-- No insert / update / delete policy for `authenticated` on purpose: writes go
-- through the service-role key (admin script now, webhook edge function later),
-- which bypasses RLS. An admin-in-app grant UI, if ever wanted, adds a policy
-- scoped to public.admins membership then, not now.

-- ── orphan_practice ────────────────────────────────────────────────────
-- history_entries columns minus the auth.users FK, plus a client-generated
-- batch_id and the capture timestamp.
create table if not exists public.orphan_practice (
  batch_id    uuid not null,
  note        text not null,
  fret        integer not null,
  string      integer not null,
  seconds     real not null,
  skipped     boolean not null,
  correct     boolean,
  created_at  timestamptz not null,          -- original client timestamp
  captured_at timestamptz not null default now()
);

alter table public.orphan_practice enable row level security;

-- Insert only, for anyone (guests included). No select policy => write-only
-- drop box; analytics reads use the service-role key.
drop policy if exists orphan_practice_insert on public.orphan_practice;
create policy orphan_practice_insert on public.orphan_practice
  for insert
  to anon, authenticated
  with check (true);

-- ── Data API exposure ──────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select on public.entitlements to authenticated;
grant insert on public.orphan_practice to anon, authenticated;
