-- Premium third tier — entitlement plumbing only (premium-product-plan.md P0).
--
-- 0007_entitlements.sql created `public.entitlements` with
--   check (tier in ('free', 'pro'))
-- as an inline column constraint, which Postgres names
-- `entitlements_tier_check`. This widens it to also accept 'premium'. Storage
-- shape, ownership, RLS (0007 / 0010) and the service-role grants (0009) are
-- all unchanged — this migration only relaxes the allowed values of one
-- column.
--
-- `premium` rows follow the exact same read/write rules as `pro`: RLS
-- read-own for the client, writes via the service-role key
-- (scripts/grant-pro.mts --tier premium) or the admin self-toggle from 0010
-- (which already restricts admin writes to their own row with source='comp'
-- and does not constrain the tier value).
--
-- Run in the Supabase SQL Editor or via `supabase db push`. Idempotent.

alter table public.entitlements
  drop constraint if exists entitlements_tier_check;

alter table public.entitlements
  add constraint entitlements_tier_check
  check (tier in ('free', 'pro', 'premium'));
