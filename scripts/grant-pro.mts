// Grant or revoke a paid entitlement (Pro or Premium) for one user, out of
// band — comps, promos, and manual testing. Run by hand; never part of
// `npm run build`.
//
// Writes `public.entitlements` with the SERVICE-ROLE key, which bypasses RLS
// (the table has no client write policy — see 0007_entitlements.sql). That key
// is a secret: keep it in a local, git-ignored `.env` only, and never in a
// `VITE_*` var (those ship in the client bundle).
//
// Env (from `.env` in the repo root, or the shell — the shell wins):
//   SUPABASE_URL                 https://<ref>.supabase.co
//                                (VITE_SUPABASE_URL is accepted as a fallback)
//   SUPABASE_SERVICE_ROLE_KEY    Project Settings -> API -> service_role
//
// Usage:
//   node --experimental-strip-types scripts/grant-pro.mts --email you@example.com --months 1
//   node --experimental-strip-types scripts/grant-pro.mts --email you@example.com --lifetime
//   node --experimental-strip-types scripts/grant-pro.mts --email you@example.com --tier premium --lifetime
//   node --experimental-strip-types scripts/grant-pro.mts --email you@example.com --revoke
//
//   --tier T     'pro' (default) or 'premium' — which paid tier to grant.
//                Ignored with --revoke.
//   --months N   access expires N calendar months from now (default: 1)
//   --lifetime   access never expires (expires_at = null); mutually exclusive with --months
//   --revoke     set tier back to 'free' (the row is kept for history);
//                equivalent to --tier free

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Minimal .env reader — no dependency. Only fills vars not already in the env.
function loadDotEnv(): void {
  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  } catch {
    return; // no .env file — rely on the shell environment
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function die(msg: string): never {
  console.error(`grant-pro: ${msg}`);
  process.exit(1);
}

function monthsFromNow(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}

loadDotEnv();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url) die('set SUPABASE_URL (or VITE_SUPABASE_URL)');
if (!serviceKey) die('set SUPABASE_SERVICE_ROLE_KEY (Project Settings -> API -> service_role)');

const email = argValue('email');
if (!email) die('pass --email <address>');

const revoke = hasFlag('revoke');
const lifetime = hasFlag('lifetime');
const monthsArg = argValue('months');
if (lifetime && monthsArg) die('--lifetime and --months are mutually exclusive');
const months = monthsArg === undefined ? 1 : Number(monthsArg);
if (!Number.isFinite(months) || months <= 0) die('--months must be a positive number');

// Which paid tier to grant. --revoke always wins and writes 'free'.
const tierArg = (argValue('tier') ?? 'pro').toLowerCase();
if (!['free', 'pro', 'premium'].includes(tierArg)) {
  die("--tier must be 'pro' or 'premium' (or 'free' / use --revoke to remove)");
}
const targetTier = revoke ? 'free' : tierArg;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Resolve the auth.users id by email. listUsers is paged; walk the pages.
async function findUserId(target: string): Promise<string | null> {
  const needle = target.trim().toLowerCase();
  for (let page = 1; page <= 200; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) die(`listUsers failed: ${error.message}`);
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === needle);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

const userId = await findUserId(email);
if (!userId) die(`no auth user with email ${email}`);

const nowIso = new Date().toISOString();
const row = targetTier === 'free'
  ? { user_id: userId, tier: 'free', source: 'comp', expires_at: null, updated_at: nowIso }
  : {
      user_id: userId,
      tier: targetTier,
      source: 'comp',
      expires_at: lifetime ? null : monthsFromNow(months),
      updated_at: nowIso,
    };

const { data, error } = await admin
  .from('entitlements')
  .upsert(row, { onConflict: 'user_id' })
  .select()
  .single();
if (error) die(`upsert failed: ${error.message}`);

console.log(targetTier === 'free'
  ? `revoked paid access for ${email}:`
  : `granted ${targetTier} to ${email}:`);
console.log(data);
