-- Follow-up to 0007_entitlements.sql.
--
-- 0007 enabled RLS on public.entitlements / public.orphan_practice and granted
-- table privileges to `anon` / `authenticated`, but not to `service_role`,
-- assuming Supabase's default privileges would cover it. On projects where the
-- `ALTER DEFAULT PRIVILEGES ... TO service_role` chain does not apply to these
-- tables, the admin path (scripts/grant-pro.mts, and the future
-- entitlement-webhook) hits `permission denied for table entitlements` — the
-- service-role JWT bypasses RLS but still needs the GRANT.
--
-- `service_role` is BYPASSRLS, so these grants give it full read/write for the
-- out-of-band provisioning and analytics reads described in 0007's header.
-- Idempotent: re-granting is a no-op.

grant all on public.entitlements    to service_role;
grant all on public.orphan_practice to service_role;
