-- Admin self-serve Pro toggle (extends 0007_entitlements.sql /
-- 0009_entitlements_service_role_grants.sql).
--
-- 0007 left public.entitlements with no client write policy on purpose: grants
-- came only from the service-role key (scripts/grant-pro.mts / the future
-- payment webhook), and its comment noted that "an admin-in-app grant UI, if
-- ever wanted, adds a policy scoped to public.admins membership then, not now."
-- This is that policy.
--
-- Scope is deliberately narrow: an admin (a row in public.admins, tested via
-- the SECURITY DEFINER public.is_admin() from 0005) may write only their OWN
-- entitlement row, and only with source='comp'. A non-admin still cannot write
-- at all, and no one — admin included — can grant Pro to another account from
-- the app. Same API-exposure pattern as 0005 / 0007. Run in the Supabase SQL
-- Editor or via `supabase db push`.

-- ── entitlements: admin writes to their own row ────────────────────────

drop policy if exists entitlements_admin_insert_own on public.entitlements;
create policy entitlements_admin_insert_own on public.entitlements
  for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_admin() and source = 'comp');

drop policy if exists entitlements_admin_update_own on public.entitlements;
create policy entitlements_admin_update_own on public.entitlements
  for update
  to authenticated
  using (user_id = auth.uid() and public.is_admin())
  with check (user_id = auth.uid() and public.is_admin() and source = 'comp');

drop policy if exists entitlements_admin_delete_own on public.entitlements;
create policy entitlements_admin_delete_own on public.entitlements
  for delete
  to authenticated
  using (user_id = auth.uid() and public.is_admin());

-- ── Data API exposure ──────────────────────────────────────────────────
-- RLS above still restricts these to an admin acting on their own row.
grant insert, update, delete on public.entitlements to authenticated;
