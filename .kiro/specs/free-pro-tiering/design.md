# Free vs Pro Tiering — Design

Status: **design only, nothing implemented.** This document turns the §6 "Monetization Tiering
(Draft)" bullet list in `../roadmap/product-wishlist.md` into a concrete, decision-made design:
the exact Free/Pro split, the entitlement data model, the client-side gating layer, how free-user
data is retained, how existing users are grandfathered, and the seam where a real payment provider
plugs in later. No paywall, no payment SDK, and no feature removal is designed here beyond what is
listed.

Decisions locked in for this pass (from the product owner):

1. **Two tiers only for now: Free and Pro.** The "Premium" third tier in the wishlist draft is
   parked — everything the draft called Premium is unbuilt anyway, so it stays a future concern and
   is not modelled here. The entitlement model is designed so a third tier can be added without a
   schema change.
2. **Payment rail: deferred.** Entitlement is granted by a manual/admin-written row in Supabase for
   launch (comp accounts, promo, testing). A payment provider (RevenueCat is the expected choice,
   since the app ships on both web and Google Play) writes the same row later via a webhook. The
   client never talks to a payment SDK in this design.
3. **Free history window: last 7 days, in the Stats & Progress screen only.** The app keeps
   recording, syncing *and restoring* the complete history for every signed-in user regardless of
   tier. The 7-day limit is a **view filter over one screen** (`ProgressPanel` + the mastery
   overlays), never a data cut and never a sync/restore limit. Rationale: the full history is
   already present the moment a user upgrades, the complete dataset is wanted for analytics, and
   XP / badges / the leaderboard must keep reading the whole set.
4. **Cloud sync and multi-device restore stay free.** The full pull/merge/push in `utils/sync.ts`
   runs for every signed-in user. This was briefly considered a Pro hook and is not — the complete
   history has to be present locally on each device for scoring to stay correct, so gating restore
   would violate decision 3.
5. **Guest → account merge becomes an explicit prompt.** Today `bootstrapUser` merges a guest's
   local history into the account silently on first sign-in. Going forward the app asks first.
6. **Leaderboard is entirely outside tiering.** A free player's XP, rank and row are identical to a
   Pro player's, computed from the full local history and accumulated for all time.
7. **No grandfathering.** There is no user base yet, so no founder comp, no backfill, no transition
   notice — everyone starts Free.
8. **`admin` does not imply Pro.** The two flags are independent; a dev-only "simulate Pro" toggle
   covers testing both experiences.
9. **Deliverable: this document.** No code in this pass. The only decision still outstanding is
   Pro's price / trial length, needed later for the payment rail (§7, §11).

---

## 1. Guiding principles

- **Gating hides, it never deletes or stops collecting.** Every free-tier limit in this design is a
  presentation/query filter over data that is still fully recorded and (for signed-in users) still
  fully synced to Supabase. No write is skipped, no row is dropped, no sync path is disabled to
  enforce a tier.
- **The Free tier is a complete app.** By-fret and by-note drilling, guitar and bass, scoring,
  celebrations, notation options, onboarding, offline, and the public leaderboard all stay free.
  Someone who never pays still has a product worth using and recommending.
- **Client-trust is acceptable for unlock, not for money.** The gated features are all local UX
  (showing more history, enabling a mode). A determined user can flip a boolean in dev tools and
  see them — that is fine. The only thing that must be trustworthy is the *entitlement row itself*,
  which is written server-side (by an admin now, by a payment webhook later) and protected by RLS.
- **One source of truth for "is this user Pro".** A single `useEntitlement()` hook, mirroring the
  existing `auth.admin` pattern in `src/hooks/useAuth.ts`. No component reads the entitlement table
  directly; no component hard-codes a tier check inline.
- **Fail open on read failure, fail closed on absence.** If the entitlement lookup errors or times
  out (offline, Supabase down), fall back to the last known value cached in localStorage; if there
  is no cached value, treat the user as Free. A signed-out guest is always Free.

---

## 2. Tier definitions

Mapped feature-by-feature to the code that exists today. "Gate" = what the tiering layer does to a
free user. Everything here already exists in the codebase; this is gating work, not feature work.

### 2.1 Free — "learn the neck"

| Capability | Code today | Free behavior |
|---|---|---|
| By-fret and by-note modes | `useGameEngine.ts` | unchanged |
| Guitar and bass | `utils/instruments.ts` (`InstrumentId`) | unchanged — bass is **not** a Pro hook |
| Single-string selection, fret-range halves, difficulty, Auto Advance | `useSelector.ts` | unchanged |
| Scoring, streak, fire multiplier, celebrations, score-off "serious" mode | `useScoring.ts`, `utils/feedback.ts` | unchanged |
| Notation A-B-C / Do-Re-Mi, circle / alphabetical order | `SelectorPanel.tsx`, `utils/music.ts` | unchanged |
| Badges / Achievements wall | `utils/badges.ts`, `BadgeGrid.tsx` | unchanged — earned on any tier |
| Basic voice answering (Web Speech / native), no personal profile | `utils/speech.ts`, `useVoiceAnswer.ts` | unchanged |
| Public leaderboard (view for all, appear once signed in) | `utils/leaderboard.ts`, `LeaderboardPanel.tsx` | unchanged — already free/open |
| Onboarding + placement, full offline / PWA | `Onboarding.tsx`, `vite.config.ts` SW | unchanged |
| **Practice history — Stats screen** | `ProgressPanel.tsx`, `utils/progress.ts` | **Gated: the Stats & Progress screen renders only the last 7 days.** This is the *only* place the window applies. Older entries are still recorded, synced, restored to every device, and counted toward XP / badges / personal bests — just not drawn in this screen. The locked "All time" scope shows an upsell. |
| **Cloud sync of history / bests / settings — full, every device** | `utils/sync.ts`, `settingsSync.ts`, `voiceSync.ts` | **Unchanged for every signed-in user.** Full pull / merge / push and multi-device restore stay free — the complete history must be present locally on each device for XP, badges and the leaderboard to stay correct. |
| **Personal best — current combination** | `utils/personalBest.ts`, `ProgressPanel.tsx` "This setup" | Unchanged — the best score / streak / accuracy for the combination being drilled is shown to everyone, no time window. Browsing bests across *all* combinations is Pro. |
| **Leaderboard — XP, questions, accuracy** | `utils/leaderboard.ts`, `LeaderboardPanel.tsx` | **Not gated in any way.** Computed from the full local history and synced to `leaderboard_entries` for every signed-in user, accumulating for all time — never limited to 7 days. A free player's standing is identical to a Pro player's. |
| **Badges / Achievements** | `utils/badges.ts`, `BadgeGrid.tsx` | **Not gated.** Session and lifetime badges are evaluated over the full local history on every tier. |

### 2.2 Pro — "train seriously and track progress"

| Capability | Code today | What Pro unlocks |
|---|---|---|
| **Full practice history** | `ProgressPanel.tsx` | Removes the 7-day view filter — all-time history and trends across every settings combination. |
| **Mastery maps** (fret / note "equalizer" overlays) | `utils/mastery.ts`, `App.tsx` `fretMasteryMap` / `noteMasteryMap`, the "Mastery on the fretboard" toggle in the Stats screen | The overlay + its toggle are Pro-only. A free user sees the toggle in a locked state with an upsell. |
| **Browse personal bests across every combination** | `utils/personalBest.ts`, `ProgressPanel.tsx` "All bests" expander (`allBestsSummary`) | The current-combination best is free (see §2.1); the all-combinations list is Pro. |
| **Multi-string mode** | `useSelector.ts` (`multiMode`, `multiStrings`), `SelectorPanel.tsx` | The multi-string toggle is Pro-only; free is single-string. |
| **Personal voice profile + calibration** | `utils/voiceProfile.ts`, `VoiceCalibration.tsx`, `voiceSync.ts` | Creating/using a personal voice profile is Pro. Free keeps the generic engine. |
| **No ads** | *(no ad code exists yet)* | If ads are ever added to Free, Pro removes them. Not built; listed so the tier promise is complete. |

### 2.3 Explicitly NOT gated

Called out to prevent scope creep, all free on every tier:

- bass, score-off mode, notation options, circle/alphabetical order, Auto Advance, onboarding /
  placement, offline / PWA, the Feedback Board;
- **cloud sync and full multi-device restore** of history, personal bests, settings and voice data;
- **the leaderboard** — XP / questions / accuracy computed from the complete history and
  accumulated for all time, synced for every signed-in user;
- **badges / Achievements** — session and lifetime, evaluated over the full history;
- **the personal best for the combination currently being drilled.**

The `admin` role and its surfaces are orthogonal to tiering.

---

## 3. Entitlement model

### 3.1 Data — `public.entitlements` (new migration `0007_entitlements.sql`)

One row per user. Absence of a row = Free. Follows the exact conventions of
`0001_accounts.sql` and `0006_leaderboard.sql` (explicit grants, RLS, `to authenticated`).

```sql
-- Per-user subscription entitlement. No row => Free tier. A row with
-- tier='pro' and (expires_at is null or expires_at > now()) => Pro.
--
-- Written server-side only: by an admin (manual comp / promo / testing) now,
-- and by a payment-provider webhook later (see design §7). The client never
-- inserts or updates here — RLS gives authenticated users read-only access to
-- their own row and nothing else.
create table if not exists public.entitlements (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  tier        text not null default 'free' check (tier in ('free', 'pro')),
  source      text not null default 'manual'
              check (source in ('manual', 'promo', 'revenuecat', 'stripe', 'play', 'comp')),
  -- null = does not expire (comp / lifetime); otherwise the access cut-off.
  expires_at  timestamptz,
  -- opaque provider reference (RevenueCat app_user_id, Stripe sub id, …) so a
  -- webhook can find and update the right row. Unused for manual grants.
  provider_ref text,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table public.entitlements enable row level security;

-- Read: a signed-in user may read only their own entitlement row.
drop policy if exists entitlements_read_own on public.entitlements;
create policy entitlements_read_own on public.entitlements
  for select
  to authenticated
  using (user_id = auth.uid());

-- No insert / update / delete policy for `authenticated` on purpose: writes go
-- through the service-role key (admin script / webhook edge function), which
-- bypasses RLS. If an admin-in-app grant UI is ever wanted, add a policy
-- scoped to `public.admins` membership then, not now.

grant usage on schema public to authenticated;
grant select on public.entitlements to authenticated;
```

Notes:

- **No `anon` read.** Guests are always Free; there is nothing for them to read.
- **`tier` is a text enum, not a boolean**, so a future `'premium'` needs only a CHECK change.
- **Expiry is enforced client-side** against `expires_at`; a nightly job to normalise expired rows
  to `tier='free'` is optional and not required for correctness.

Migration `0007` also creates **`public.orphan_practice`** — the write-only capture table for
guest rows a user chooses not to merge into their account (§5.4):

```sql
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
drop policy if exists orphan_practice_insert on public.orphan_practice;
create policy orphan_practice_insert on public.orphan_practice
  for insert to anon, authenticated with check (true);   -- write-only, no select policy
grant usage on schema public to anon, authenticated;
grant insert on public.orphan_practice to anon, authenticated;
```

No `user_id` and no FK — these rows are intentionally unlinked from any account. Analytics reads
use the service-role key.

### 3.2 Client data access — `src/utils/entitlement.ts` (new)

Mirrors `fetchIsAdmin` in `src/utils/board.ts`.

```ts
export type Tier = 'free' | 'pro';

export interface Entitlement {
  tier: Tier;
  /** ISO; null = never expires. Already checked against now() by the time
   *  a caller sees `tier: 'pro'`. */
  expiresAt: string | null;
  source: string;
}

export const FREE: Entitlement = { tier: 'free', expiresAt: null, source: 'none' };

/** The signed-in user's entitlement. Returns FREE on any error, when
 *  unconfigured, offline with no cache, or when the row is missing/expired. */
export async function fetchEntitlement(userId: string): Promise<Entitlement>;
```

`fetchEntitlement`:
1. If `!supabase` → `FREE`.
2. `select tier, expires_at, source from entitlements where user_id = eq(userId)` `.maybeSingle()`.
3. On error → return the localStorage-cached value if present, else `FREE`.
4. No row → `FREE`.
5. Row with `tier='pro'` and (`expires_at` null or `> now()`) → `{ tier: 'pro', … }`.
6. Row present but expired → `FREE`.
7. On success, write the result to a localStorage cache key (`entitlementCache:<userId>` →
   `{ value, fetchedAt }`) for offline fallback.

### 3.3 Client hook — `useEntitlement()` in `src/hooks/useAuth.ts` (extend `AuthState`)

The cleanest fit is to fold it into the existing auth hook, exactly like `admin`:

```ts
export interface AuthState {
  // …existing…
  admin: boolean;
  tier: Tier;          // 'free' for guests and signed-in free users
  isPro: boolean;      // convenience: tier === 'pro'
  entitlementLoading: boolean;
}
```

Implementation: a `useEffect` keyed on `user` (same shape as the admin effect) that calls
`fetchEntitlement(user.id)`, seeds state from the localStorage cache synchronously on mount so
there is no free→pro flicker for a returning Pro user, and clears to `FREE` on sign-out. A
`supabase.auth.onAuthStateChange` refresh already re-runs the effect.

Guests: `tier` is `'free'`, `entitlementLoading` is `false`, no network call.

Optionally also export a thin standalone `useEntitlement()` that just reads `useAuth()` — so
call sites read `const { isPro } = useEntitlement()` without pulling the whole auth object. Same
underlying state.

### 3.4 Refresh points

- On app start / sign-in (the existing auth effect).
- On return to foreground after > ~5 min (add to the existing visibility/online handling in
  `App.tsx` if present; otherwise a `visibilitychange` listener). This is how a just-upgraded user
  on another device, or an expiry, becomes visible without a reload.
- After the (future) in-app purchase flow returns — the payment step calls a
  `refreshEntitlement()` exposed from the hook.

---

## 4. Feature-flag / gating layer

### 4.1 `src/utils/features.ts` (new) — the capability map

A single place that maps a capability name to the minimum tier. Nothing else in the app should
compare tiers directly.

```ts
import type { Tier } from './entitlement';

export type Feature =
  | 'historyBeyond7Days'   // the Stats & Progress screen's "All time" scope + trends
  | 'masteryMaps'          // fret/note "equalizer" overlays + their toggle
  | 'allPersonalBests'     // browse bests across every settings combination
  | 'multiString'          // multi-string drilling mode
  | 'voiceProfile'         // personal voice profile + calibration
  | 'noAds';               // future: suppress Free-tier ads

const MIN_TIER: Record<Feature, Tier> = {
  historyBeyond7Days: 'pro',
  masteryMaps:        'pro',
  allPersonalBests:   'pro',
  multiString:        'pro',
  voiceProfile:       'pro',
  noAds:              'pro',
};
// NOT in this map on purpose: cloud sync / multi-device restore, leaderboard
// XP, badges, and the current-combination personal best are free on every tier.

const RANK: Record<Tier, number> = { free: 0, pro: 1 };

export function can(feature: Feature, tier: Tier): boolean {
  return RANK[tier] >= RANK[MIN_TIER[feature]];
}

/** Free users still see this many days of their own history. */
export const FREE_HISTORY_DAYS = 7;
```

Keeping the list of gated features in one typed object means the "what is Pro" answer is greppable
and testable, and a future `'premium'` tier is a one-line rank change plus per-feature edits.

### 4.2 `<ProGate>` — the presentational lock

A small wrapper component (`src/components/ProGate.tsx`) used wherever a Pro-only control or panel
lives. It does **not** enforce anything security-sensitive; it renders either the child or a
locked-state upsell.

```tsx
interface ProGateProps {
  feature: Feature;
  children: ReactNode;
  /** How to present the locked state. */
  variant?: 'overlay' | 'replace' | 'inline-badge';
  /** Optional short reason shown in the upsell, e.g. "See your full history". */
  pitch?: string;
}
```

- `overlay` — render `children` blurred/dimmed with a lock chip and a "Pro" pill on top (for the
  history panel, the mastery toggle).
- `replace` — render only the upsell card instead of `children` (for a whole Pro-only section).
- `inline-badge` — render `children` fully but add a small "Pro" pill and route the control's
  activation through the upsell (for the multi-string toggle: a free user can see it, tapping it
  opens the upsell instead of enabling the mode).

All three reuse the existing `SettingCard` / drawer-page styling and the celebration/`prefers-
reduced-motion` conventions. Copy is short and non-nagging; the app's tone (see the Hebrew
localization glossary memory) applies, and every string goes through `src/i18n/translations.ts`.

### 4.3 The upsell surface

A new drawer section `id: 'upgrade'` in `settingsSections` (`src/App.tsx`), and a reusable
`<UpgradeCard pitch={…} />` that `<ProGate>` renders. For this pass the card's CTA is a
placeholder ("Coming soon" / links to a short "what's in Pro" list) — **no payment button**. When
the payment rail lands (§7) the CTA becomes the purchase entry point. The section is always
present when `auth.configured`; it shows current tier and, for Pro, the `source` and any
`expiresAt`.

---

## 5. Per-feature gating specifics

How each gate is actually applied, in the code that exists today.

### 5.1 7-day history view (`historyBeyond7Days`)

- **Where:** `ProgressPanel.tsx` and the mastery aggregation in `App.tsx` **only**. Nothing else
  applies the window — not `useHistory`, not `utils/sync.ts`, not `utils/leaderboard.ts`, not
  `utils/badges.ts`.
- **How:** a single helper in `src/utils/progress.ts`:
  ```ts
  export function withinFreeWindow(entries: HistoryEntry[]): HistoryEntry[] {
    const cut = Date.now() - FREE_HISTORY_DAYS * 864e5;
    return entries.filter(e => e.createdAt && Date.parse(e.createdAt) >= cut);
  }
  ```
  `ProgressPanel` applies it to the `history` prop it derives stats from **unless `isPro`**. The
  "All time" scope for a free user is relabelled "Last 7 days" and either hidden or shown behind a
  `<ProGate variant="overlay">`. The "This setup" scope also clips to 7 days for free.
- **Mastery overlays:** see §5.2 — for free they are hidden entirely, so the window question is
  moot there; when a Pro user is present the aggregation reads the full set as today.
- **Legacy rows without `createdAt`:** excluded from the free window (same as `dailyStats`
  already does). They stay in storage and appear on upgrade.
- **Data:** untouched. `useHistory.addEntry`, the full `bootstrapUser` / `reconcileUser` restore,
  and every `utils/sync.ts` path keep writing, syncing and restoring every row on every tier.

### 5.2 Mastery maps (`masteryMaps`)

- **Where:** `App.tsx` builds `fretMasteryMap` / `noteMasteryMap` from
  `historyForInstrument(...)`; the "Mastery on the fretboard" toggle lives in the Stats screen.
- **How:** when `!isPro`, force the overlay off and wrap the toggle in
  `<ProGate variant="overlay" feature="masteryMaps">`. The maps are still *computed* lazily only
  when shown, so gating is just "don't render, show upsell".

### 5.3 Multi-string mode (`multiString`)

- **Where:** `useSelector.ts` (`multiMode` persisted setting, `multiStrings` derived),
  `SelectorPanel.tsx` toggle.
- **How:** `SelectorPanel` receives `isPro`; the multi-string toggle uses
  `<ProGate variant="inline-badge">`. If a free user already has `multiMode = true` persisted
  (set before they were on Free, or via grandfathering), `useSelector`'s derivation clamps to
  single-string when `!isPro` — the stored preference is kept, not overwritten, so it reactivates
  on upgrade.

### 5.4 Cloud sync, multi-device restore & the guest-merge prompt

**Not gated.** Full sync and restore run for every signed-in user, exactly as today. The
`cloudReady()` check in `utils/sync.ts` and the `bootstrapUser` / `reconcileUser` calls in
`App.tsx`'s sign-in effect stay tier-agnostic. A free user who signs in on a new device gets their
**complete** history, personal bests, settings and voice data pulled and merged locally — the
`ProgressPanel` window then clips what is *drawn* to 7 days, but XP, badges and the current-combo
best all see the full restored set.

**New: guest → account merge is an explicit prompt.** Today the first sign-in on a device with
local guest history runs `bootstrapUser`, which silently merges that local data into the account.
Going forward:

- On first sign-in on a device (`syncedUser() !== user.id`) **and** the local `allHistory` is
  non-empty, show a modal before touching anything:
  > *"You've practiced on this device without an account. Add that progress to your account, or
  > keep only what's already on the account?"*
  > **[ Merge my progress ]  [ Use account only ]**
- **Merge my progress** → the current behavior: `bootstrapUser(user.id, getAllHistory(),
  loadAllBests())` (pull → union-merge → push → commit locally).
- **Use account only** → pull the cloud set and commit it locally *without* unioning the local
  guest rows into the account. Practically: a `bootstrapUser` variant that skips the local side of
  the merge. The guest rows are then:
  - **removed from this device** — `localStorage` `selectorHistory` (and the local bests) are
    replaced by the restored cloud set;
  - **not attached to the account** — never written to `history_entries` / `personal_bests` under
    this `user_id`, never shown, never counted toward the user's stats, XP or badges;
  - **but preserved in the database for analytics** — one bulk insert into a separate
    `public.orphan_practice` table (see below) before the local wipe, so the practice data is not
    lost to us even though it never becomes "the user's".
  - Show a second confirm if the set is large (say > 50 rows), wording it as "these won't be added
    to your account".
- **`public.orphan_practice`** (part of migration `0007`): the same columns as `history_entries`
  minus the `auth.users` FK, plus a client-generated `batch_id uuid` and `captured_at`. RLS:
  `insert` for `anon, authenticated`, **no `select`** for either (write-only drop box; analytics
  reads use the service-role key). No `user_id` — these rows are deliberately unlinked. This keeps
  the "hide, don't delete" principle: the data leaves the user's view and the user's account, not
  the database.
- If local `allHistory` is empty, no prompt — just restore.
- The choice is remembered per `user.id` (`localStorage` `guestMergeChoice:<id>`) so it is asked
  once per account per device, not on every reconcile.
- Same prompt shape could later cover settings and the voice profile; for v1 it governs history +
  personal bests, and settings/voice keep their existing "adopt if newer" behavior.

**Leaderboard interaction:** because the full history is always restored, the client always
recomputes XP from a complete set, so no special "don't lower XP" guard is needed. (If §5.4's
restore ever becomes partial for some tier, revisit — `leaderboard.ts` would then need a
monotonic-XP guard.)

### 5.5 Voice profile (`voiceProfile`)

- **Where:** `VoiceCalibration.tsx`, `utils/voiceProfile.ts`, `voiceSync.ts`, the "Answer" drawer
  section in `App.tsx`.
- **How:** the calibration entry point and the "use my voice profile" switch are wrapped in
  `<ProGate variant="replace">`. `utils/speech.ts` `getSpeechEngine()` already falls back to the
  generic/template engine when no profile is ready, so a free user simply never reaches the
  profile branch. Existing calibration data is retained and re-enables on upgrade.

### 5.6 Ads (`noAds`) — not built

No ad code exists. If/when Free carries ads, the ad component checks `can('noAds', tier)` and
renders nothing for Pro. Listed only for completeness.

---

## 6. Free-user data retention

The crux of decision #3. Restating the contract precisely:

| Layer | Free (signed in) | Free (guest) | Pro |
|---|---|---|---|
| Recording every answered question locally | yes | yes | yes |
| localStorage `selectorHistory` holds the full set | yes | yes | yes |
| Write-through to `history_entries` on each answer | **yes** | n/a (no account) | yes |
| Full re-push on app start (`pushAll`) | **yes** | n/a | yes |
| Server retains the complete history indefinitely | **yes** | n/a | yes |
| New device restores the **full** history from cloud | **yes** | n/a | yes |
| History drawn in the Stats & Progress screen | last 7 days | last 7 days | all-time |
| Mastery maps | no | no | yes |
| XP / leaderboard / badges read | full history | full history | full history |
| Personal best for the current combination | yes | yes | yes |
| Browse bests across all combinations | no | no | yes |

So: a signed-in free user's data is **completely preserved and fully restored** on every device.
The single limitation is that one screen (Stats & Progress) and the mastery overlays render a
7-day slice. Upgrading to Pro makes the already-present full history and maps visible immediately
with no backfill step.

A guest (never signed in) is the only case with no server copy — unavoidable, and an incentive to
sign in, which is itself free.

Storage-cost note: retaining all free-user history rows is a deliberate cost. `history_entries` is
narrow (10 columns, mostly ints); at even heavy usage this is kilobytes/user/day. Acceptable, and
revisited only if Supabase storage becomes a line item.

---

## 7. Payment-provider seam (future, not this pass)

Designed so it can be added without touching the client gating layer.

- **Provider:** RevenueCat is the expected choice — it wraps Google Play Billing (required for the
  Android app) and web billing (Stripe under the hood) and exposes one "is this user entitled?"
  concept. Alternative: Stripe (web) + Play Billing (Android) written to `entitlements` by two
  separate webhooks. Either way the client contract below is identical.
- **Server piece:** a Supabase Edge Function `entitlement-webhook` that:
  1. verifies the provider signature,
  2. maps the provider's user id (`provider_ref`) to a Supabase `user_id` (RevenueCat's
     `app_user_id` is set to the Supabase uid at purchase time),
  3. upserts `public.entitlements` with `tier`, `source`, `expires_at`, `provider_ref` using the
     **service-role key** (bypasses RLS — no client write policy needed).
- **Client purchase flow (later):** the `<UpgradeCard>` CTA opens the platform purchase sheet
  (Play Billing via a Capacitor plugin in the Android app; a hosted checkout URL on web). On
  success it calls `refreshEntitlement()`; the webhook has usually written the row by then, and
  the foreground-refresh in §3.4 covers the race.
- **Nothing in §§3–5 changes** when this lands: the same `entitlements` row, read the same way.

---

## 8. Grandfathering & migration

**There is no user base yet**, so there is nothing to grandfather — this is the main simplifier
for the whole rollout. Consequences:

- **Everyone is Free by default** (no `entitlements` row → Free). No backfill script, no
  "founder comp", no transition notice, no comms plan.
- **No schema migration of existing tables.** Only the new `0007_entitlements.sql` (which also
  adds `orphan_practice`, §3.1) is applied.
- **Persisted Pro-only preferences** (`multiMode = true`, a ready voice profile, the mastery
  toggle on) are still **kept, not reset** for a Free user — they clamp/hide per §5 and reactivate
  on upgrade. This matters for testers and for anyone who set them before the gate landed, not for
  a real migration.
- If a user base accrues *before* the payment rail (Phase 7) ships, revisit whether early
  sign-ups deserve a comp — but that is a future call, not a design constraint now.

---

## 9. Edge cases

- **Supabase not configured** (`isSupabaseConfigured === false`, e.g. a local build without
  `.env`): `tier` is always `'free'`, no network, no upsell section (it is already gated on
  `auth.configured`). Same posture as auth/admin today.
- **Offline at launch:** seed `tier` from `entitlementCache:<userId>`; a returning Pro user stays
  Pro offline. A brand-new Pro user who has never been online sees Free until first sync —
  acceptable.
- **Entitlement expires mid-session:** the next refresh (§3.4) flips `isPro` to false; gated UI
  re-locks on the next render. No forced reload, no data loss.
- **Clock skew:** `expires_at` is compared to client `now()`. A user with a badly wrong clock
  could gain/lose a few hours of access. Not worth server-time round-tripping for v1.
- **"Clear history" while Free:** still clears everything (local + cloud tombstone), unchanged —
  that is its stated contract and it is user-initiated.
- **Downgrade then re-upgrade:** history was never removed, so it simply reappears. Personal
  bests, badges, streak records all intact.
- **Admin who is also Free:** `admin` and `tier` are **independent by decision** — `admin` does
  **not** imply Pro. Admin surfaces (debug panel, feedback inbox, coming-soon instruments) are
  unaffected by tier, and an admin sees the real Free experience unless they hold an actual `pro`
  entitlement row. A **dev-only "simulate Pro" toggle** (behind `import.meta.env.DEV`, surfaced in
  the debug panel) forces `isPro` true locally so both experiences are one tap apart during
  development; it never touches the database and is absent from production builds.
- **Guest-merge prompt declined:** "Use account only" removes the guest rows from the device and
  never links them to the account, but captures them to `public.orphan_practice` first (§5.4).
  The user cannot get them back into their account (by design — that is what they chose), and the
  size-gated confirm makes the consequence explicit. The data still exists for analytics.

---

## 10. Implementation phases

Each phase is independently shippable and leaves the app working.

1. **Entitlement plumbing (no visible change).**
   `0007_entitlements.sql`; `utils/entitlement.ts`; extend `useAuth` with `tier` / `isPro` /
   `entitlementLoading` + localStorage cache + foreground refresh. Add a temporary dev-only
   readout of the current tier to the Account section. No gating yet.
2. **Feature map + `<ProGate>` + upsell shell.**
   `utils/features.ts`; `components/ProGate.tsx` (three variants); `<UpgradeCard>`; the
   `id: 'upgrade'` drawer section with a placeholder CTA; i18n strings. Still nothing gated.
3. **Gate the low-risk toggles.**
   Multi-string (`SelectorPanel` + `useSelector` clamp), mastery maps (`App.tsx` + Stats toggle),
   voice profile (`VoiceCalibration` entry points). These are self-contained and easy to verify.
4. **Gate the history view.**
   `withinFreeWindow` in `utils/progress.ts`; apply in `ProgressPanel` (and, only while a Pro user
   is present, leave the `App.tsx` mastery aggregation full) behind `isPro`; relabel scopes; wrap
   "All time" in `<ProGate>`. Most user-visible step, but no comms plan needed (no user base yet,
   §8). Sync, restore, XP, badges are untouched here.
5. **Guest-merge prompt.**
   Add the modal from §5.4 to `App.tsx`'s first-sign-in branch: `bootstrapUser` on "Merge"; on
   "Use account only" push the local guest rows once to `orphan_practice`, then a merge-skipping
   `bootstrapUser` variant that restores the cloud set and wipes the local guest data;
   `guestMergeChoice:<id>` to ask once per account per device. Not tier-specific — ships for
   everyone. (`orphan_practice` ships in the Phase 1 migration.)
6. **Admin provisioning + dev toggle.**
   `scripts/grant-pro.mts` (service-role key, sets a row by email) for comps / promo / testing;
   the dev-only "simulate Pro" toggle in the debug panel.
7. **(Later, separate spec) Payment rail.**
   RevenueCat SDK, `entitlement-webhook` edge function, real CTA. §7 is the seam.

Phases 1–3 and 5 can land with no product risk. Phase 4 is the most user-visible, but with no
user base there is no comms decision blocking it.

---

## 11. Open questions for the product owner

**Still open:**

1. **Pricing / trial length** — out of scope for this document; needed before Phase 7 (payment
   rail). Everything in Phases 1–6 can be built without it.

**Resolved in review (recorded for traceability):**

- *Grandfathering / founder comp* → **not needed** — no user base yet. Everyone starts Free, no
  backfill, no transition comms. (§8)
- *Does `admin` imply Pro?* → **no.** `admin` and `tier` stay independent; a dev-only "simulate
  Pro" toggle in the debug panel covers testing. (§9)
- *Free history window* → last 7 days, **Stats & Progress screen + mastery overlays only**. Sync,
  restore, XP, badges, current-combo best all read the full history on every tier.
- *Multi-device restore* → **not gated.** Full restore for every signed-in user; "restore" is no
  longer a Pro differentiator.
- *Guest → account merge* → **explicit prompt** ("Merge my progress" / "Use account only"),
  asked once per account per device, replacing today's silent auto-merge. "Use account only"
  removes the guest rows from the device and never links them to the account, but first captures
  them to a write-only `public.orphan_practice` table so the data survives for analytics.
- *Personal bests for Free* → **current combination is free** (unchanged); browsing all
  combinations is Pro. No time window on bests.
- *Leaderboard for Free* → **fully outside tiering.** Identical to Pro; XP from the complete
  history, accumulated for all time, synced for every signed-in user.

---

## 12. File / artifact inventory (when built)

| Path | Kind | Phase |
|---|---|---|
| `supabase/migrations/0007_entitlements.sql` | new — `entitlements` + `orphan_practice` | 1 |
| `src/utils/entitlement.ts` | new | 1 |
| `src/hooks/useAuth.ts` | edit — `tier` / `isPro` / cache / refresh | 1 |
| `src/utils/features.ts` | new — `Feature`, `can()`, `FREE_HISTORY_DAYS` | 2 |
| `src/components/ProGate.tsx` | new | 2 |
| `src/components/UpgradeCard.tsx` | new | 2 |
| `src/App.tsx` | edit — `upgrade` section, mastery gate, guest-merge modal | 2,3,4,5 |
| `src/components/SelectorPanel.tsx` | edit — multi-string gate | 3 |
| `src/hooks/useSelector.ts` | edit — clamp `multiStrings` when `!isPro` | 3 |
| `src/components/VoiceCalibration.tsx` | edit — gate entry points | 3 |
| `src/components/ProgressPanel.tsx` | edit — 7-day window, scope relabel | 4 |
| `src/utils/progress.ts` | edit — `withinFreeWindow` | 4 |
| `src/components/GuestMergePrompt.tsx` | new — first-sign-in merge modal | 5 |
| `src/utils/sync.ts` | edit — `bootstrapUser` variant that skips the local-merge side | 5 |
| `src/i18n/translations.ts` | edit — upsell / lock / merge-prompt strings | 2–5 |
| `src/styles/21-pro-gate.css` (new partial; add `@import` in `src/index.css`) | new | 2 |
| `scripts/grant-pro.mts` | new — admin provisioning | 6 |
