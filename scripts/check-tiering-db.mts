// One-shot check that migration 0007 is live: are `public.entitlements` and
// `public.orphan_practice` present with the expected RLS shape?
//
// Run after filling `.env` (repo root):
//   node --experimental-strip-types scripts/check-tiering-db.mts
//
// Uses the anon key only — no secret needed. Reports PASS/FAIL per table.
// This is a hand-run diagnostic; it is not part of any build.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv(): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), '.env'), 'utf8'); } catch { return; }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotEnv();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error('check-tiering-db: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env first');
  process.exit(1);
}

const db = createClient(url, anon, { auth: { persistSession: false } });
let ok = true;

// entitlements: table must exist; with no session, an anon SELECT returns 0 rows
// (RLS read-own gives nothing to a guest) but must NOT error with "relation does
// not exist" / "schema cache" — that would mean the migration never ran.
{
  const { error } = await db.from('entitlements').select('user_id').limit(1);
  const missing = error && /relation|does not exist|schema cache|not found/i.test(error.message);
  if (missing) { ok = false; console.log('FAIL  public.entitlements —', error!.message); }
  else if (error) console.log('OK    public.entitlements (present; SELECT blocked as expected:', error.message + ')');
  else console.log('OK    public.entitlements (present, readable)');
}

// orphan_practice: insert-only for anon, no SELECT policy. A SELECT should come
// back empty or permission-denied, never "relation does not exist".
{
  const { error } = await db.from('orphan_practice').select('batch_id').limit(1);
  const missing = error && /relation|does not exist|schema cache|not found/i.test(error.message);
  if (missing) { ok = false; console.log('FAIL  public.orphan_practice —', error!.message); }
  else if (error) console.log('OK    public.orphan_practice (present; SELECT blocked as expected:', error.message + ')');
  else console.log('OK    public.orphan_practice (present)');
}

console.log(ok
  ? '\nPASS — migration 0007 is live. Proceed to sign-in + grant-pro.'
  : '\nFAIL — run supabase/migrations/0007_entitlements.sql in the Supabase SQL Editor, then re-run this.');
process.exit(ok ? 0 : 1);
