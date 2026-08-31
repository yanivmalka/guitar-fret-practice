import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Single Supabase client for the whole app. If the env vars are missing
// (e.g. a build without a .env), `supabase` is null and the app stays in
// pure guest / localStorage mode — nothing calls the network.

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;

// Where Google should send the user back to after auth. Matches the Vite
// `base` (/guitar-fret-practice/) so it lines up with the Supabase
// "Redirect URLs" allowlist in both dev and production.
export function authRedirectTo(): string {
  return window.location.origin + import.meta.env.BASE_URL;
}
