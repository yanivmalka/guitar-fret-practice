# Free vs Pro Tiering — Implementation Tasks

Executable, session-portable build plan for `design.md` in this folder. A fresh session (or you)
should be able to pick this up cold: each phase is independently shippable and leaves `main`
working. **Read `design.md` for the "why" and the full code sketches** — this file is the ordered
"what to do", with just enough detail to act without re-deriving decisions.

> **Working location (from Phase 4 on):** this work moved to a dedicated git worktree at
> `C:/source/gfp-tiering` on branch `claude/free-pro-tiering-work` (created off
> `claude/free-pro-tiering` at `2efe89f`), because another session shares the main
> `C:/source/guitar-fret-practice` checkout and the two were colliding. Do all further phase work
> in `C:/source/gfp-tiering`; do **not** edit the shared checkout. The user reconciles
> `claude/free-pro-tiering-work` back into `claude/free-pro-tiering` themselves. Phases 1–3 are
> committed on `claude/free-pro-tiering` (`614fe6d`, `2efe89f`) and inherited here.

## How to use this file

- Do the phases **in order**. Phases 1–3 and 5 carry no product risk; Phase 4 is the visible one
  (still no comms needed — no user base). Phase 6 is tooling. Phase 7 is a separate later spec.
- After each phase: `npm run build` (runs `tsc -b` then Vite) **and** `npm run lint` must pass.
  There is **no test suite** in this repo — verification is build + lint + a manual click-through.
- Mark progress by ticking the boxes below and committing per phase (branch off `main`, don't
  commit to `main` directly). Suggested commit prefixes match the repo style, e.g.
  `Tiering: entitlement plumbing (phase 1)`.
- Anything marked **[MANUAL]** is a step the human runs (Supabase SQL, env), not code.
- File references use the repo convention: `path:line` and markdown links.

## Conventions to follow (from `CLAUDE.md` + existing code)

- New Supabase data-access modules mirror `src/utils/board.ts` (`fetchIsAdmin` shape): single
  shared `supabase` client, return a safe default on any error / when `!supabase`.
- Client hooks that depend on the signed-in user mirror the `admin` effect in
  [src/hooks/useAuth.ts](src/hooks/useAuth.ts) — keyed on `user`, cancelled flag, gated output.
- Timer/callback values use refs, not state, inside `setTimeout`/`setInterval` (not relevant to
  most of this work, but `useGameEngine` touches apply).
- CSS is per-domain partials under `src/styles/NN-*.css`, `@import`-ed in order from
  [src/index.css](src/index.css). Next free number is **21**.
- All user-facing strings go through `src/i18n/translations.ts` (+ `useTranslation`), Hebrew
  included. Keep the app's tone (see the Hebrew localization glossary).

---

## Phase 1 — Entitlement plumbing (no visible change)

**Goal:** the app knows a user's tier; nothing is gated yet.

### [MANUAL] 1.0 — Apply the migration

- [x] Write `supabase/migrations/0007_entitlements.sql` (task 1.1) — **done**.
- [x] **[MANUAL — you]** Run it in the Supabase SQL Editor or `supabase db push` — **done**. It
      creates `public.entitlements` **and** `public.orphan_practice` (used later in Phase 5 —
      shipped both now so there is one migration).

### 1.1 — `supabase/migrations/0007_entitlements.sql` (new)

- [x] `public.entitlements` exactly as in `design.md` §3.1: `user_id` PK → `auth.users`,
      `tier text check (tier in ('free','pro')) default 'free'`, `source text check (...)`,
      `expires_at timestamptz`, `provider_ref text`, `updated_at`, `created_at`.
- [x] RLS: enable; **read-own only** for `authenticated` (`using (user_id = auth.uid())`); **no**
      insert/update/delete policy (writes go through the service-role key).
- [x] `public.orphan_practice` as in `design.md` §3.1: `history_entries` columns minus the FK,
      plus `batch_id uuid`, `captured_at timestamptz default now()`; RLS enable; **insert-only**
      for `anon, authenticated` (`with check (true)`); **no select policy**.
- [x] Grants: `grant usage on schema public to ...`; `grant select on public.entitlements to
      authenticated`; `grant insert on public.orphan_practice to anon, authenticated`.
- [x] Follow the header-comment style of `0001_accounts.sql` / `0006_leaderboard.sql`.

### 1.2 — `src/utils/entitlement.ts` (new)

- [x] Export `type Tier = 'free' | 'pro'`.
- [x] Export `interface Entitlement { tier: Tier; expiresAt: string | null; source: string }`
      and `const FREE: Entitlement = { tier: 'free', expiresAt: null, source: 'none' }`.
- [x] `export async function fetchEntitlement(userId: string): Promise<Entitlement>` per
      `design.md` §3.2:
  - `!supabase` → `FREE`.
  - `select tier, expires_at, source ... eq('user_id', userId).maybeSingle()`.
  - error → cached value if present (see 1.3) else `FREE`.
  - no row → `FREE`.
  - row `tier === 'pro'` and (`expires_at` null or `Date.parse(expires_at) > Date.now()`) →
    `{ tier:'pro', expiresAt, source }`; expired → `FREE`.
  - on success, write cache (1.3).
- [x] `export function cachedEntitlement(userId: string): Entitlement | null` and an internal
      `writeCache(userId, e)` — localStorage key `entitlementCache:<userId>` holding
      `{ value: Entitlement, fetchedAt: number }`. Wrap in try/catch.

### 1.3 — Extend `src/hooks/useAuth.ts`

- [x] Add to `AuthState`: `tier: Tier`, `isPro: boolean`, `entitlementLoading: boolean`
      (+ `refreshEntitlement`).
- [~] New state `const [entitlement, setEntitlement] = useState<Entitlement>(FREE)`. **The
      synchronous cache seed was dropped**: this repo's `react-hooks` lint rules flag both
      `setState` in an effect body *and* reading/writing a ref during render, so the blessed
      "adjust state while rendering" pattern is unavailable here without a new lint warning. The
      hook now mirrors the `admin` effect exactly (fetch → set in a `.then`). Offline flicker is
      still covered — `fetchEntitlement` falls back to the localStorage cache on error, so a
      returning Pro user stays Pro. Online, there is a ≤1-frame / 1-RTT `free` flash before the
      lookup resolves, the same tradeoff the existing `admin` flag already accepts.
- [x] Effect keyed on `user`, mirroring the `admin` effect: `if (!user) return;` →
      `fetchEntitlement(user.id)` → set, with a `cancelled` guard. Guest state is masked in the
      return value (`tier: user ? … : 'free'`) rather than reset in the effect body.
- [x] Foreground refresh: a `visibilitychange` + `online` listener that re-runs
      `fetchEntitlement` when the tab is visible again after > 5 min (`ENTITLEMENT_MAX_AGE_MS`).
      `refreshEntitlement: () => Promise<void>` exported from the hook.
- [x] Return `tier: user ? entitlement.tier : 'free'`, `isPro: entitlement.tier === 'pro' &&
      !!user`, `entitlementLoading: !!user && entitlementLoading`.
- [x] Guests: no network, `tier='free'`, `entitlementLoading=false`.

### 1.4 — Temporary dev readout

- [x] In [src/App.tsx](src/App.tsx) `settingsSections` `id: 'account'` body, when
      `import.meta.env.DEV`, render a one-line `tier: {auth.tier}` row. Remove or replace in
      Phase 6.

### Done when

- [x] `npm run build` + `npm run lint` clean (lint warning count unchanged from the 22-warning
      baseline; no new warnings in the touched files).
- [ ] **[DEFERRED to a deploy]** Signed-in user with no row shows `tier: free`; after
      `update public.entitlements set tier='pro'` for that user id (via SQL), a foreground
      refresh flips the readout to `pro`. Not checkable on the local dev server — there is no
      local `.env`, so `isSupabaseConfigured` is false and the Account section (with the readout)
      does not render. Verify on the `claude/free-pro-tiering` preview deploy, where sign-in
      works.
- [x] Guest / unconfigured (`!isSupabaseConfigured`) path: local `npm run dev` has no `.env`, so
      it runs the unconfigured path — no Account section, no `entitlements` network call, `tier`
      is `free`, no console errors. Matches design §9.
- [x] Commit: `Tiering: entitlement plumbing + 0007 migration (phase 1)` (`1894d3a`).

---

## Phase 2 — Feature map + `<ProGate>` + upsell shell

**Goal:** the gating primitives exist and render; still nothing is actually gated.

### 2.1 — `src/utils/features.ts` (new)

- [x] `export type Feature = 'historyBeyond7Days' | 'masteryMaps' | 'allPersonalBests' |
      'multiString' | 'voiceProfile' | 'noAds'` (comments per `design.md` §4.1).
- [x] `const MIN_TIER: Record<Feature, Tier>` — all `'pro'` for now.
- [x] `const RANK: Record<Tier, number> = { free: 0, pro: 1 }`.
- [x] `export function can(feature: Feature, tier: Tier): boolean`.
- [x] `export const FREE_HISTORY_DAYS = 7`.
- [x] Comment noting what is deliberately **not** here (sync/restore, leaderboard, badges,
      current-combo best).

### 2.2 — `src/components/ProGate.tsx` (new)

- [x] Props: `{ feature: Feature; children: ReactNode; variant?: 'overlay'|'replace'|'inline-badge';
      pitch?: string }`.
- [x] Reads `useEntitlement()` (see 2.4). If `can(feature, tier)` → render `children` unchanged.
- [x] Locked rendering per `design.md` §4.2:
  - `overlay` — `children` in a `.progate-dim` (blur + dim + `pointer-events:none`); a
    full-cover `.progate-lock` button (lock glyph + "Pro" pill + `pitch`) opens the `upgrade`
    drawer section.
  - `replace` — render only `<UpgradeCard pitch={pitch} />`.
  - `inline-badge` — render `children` + a small "Pro" pill; a transparent full-cover
    `.progate-inline-catch` button swallows the primary tap and opens `upgrade` instead
    (child is left interactive-looking, not disabled).
- [x] No security logic — purely presentational. The "open upgrade" call goes through the
      `utils/upgradeDrawer.ts` module singleton (`openUpgrade()` / `registerUpgradeHandler`),
      mirroring `setSyncUser` in `utils/sync.ts` — no prop/context threaded through every gate.

### 2.3 — `src/components/UpgradeCard.tsx` (new)

- [x] Reuses `SettingCard` / drawer-page styling (new `.pro-card` surface). Shows: what Pro
      unlocks (short list), current tier, and — for Pro — `source` + `expiresAt` as whole
      translated sentences (not glued fragments), per the Hebrew glossary.
- [x] CTA is a **placeholder** (disabled "Coming soon" button + a "not on sale yet" note). **No
      payment button.** Marked `// Phase 7: wire purchase entry point here`.

### 2.4 — `src/hooks/useEntitlement.ts`

- [x] Thin read over `useAuth()`: returns `{ tier, isPro, entitlement, loading, refresh }` so
      call sites don't pull the whole auth object. **Deviation from the sketch:** it also
      surfaces the full `entitlement` (`source` + `expiresAt`) that `<UpgradeCard>` needs — this
      required adding `entitlement: Entitlement` to `AuthState` in
      [src/hooks/useAuth.ts](src/hooks/useAuth.ts) (`FREE` for guests).

### 2.5 — `upgrade` drawer section

- [x] In [src/App.tsx](src/App.tsx) `settingsSections`, added `{ id: 'upgrade', title: '⭐ Pro',
      blurb: '', body: <UpgradeCard /> }`, present when `auth.configured`, right after `account`.
- [x] A mount effect registers an `openUpgrade` handler that clears any full-screen view
      (`setShowStats(false)`) then `setSettingsOpen(true)` + `setDrawerSection('upgrade')`.

### 2.6 — CSS + i18n

- [x] New `src/styles/21-pro-gate.css`; `@import './styles/21-pro-gate.css';` added to
      [src/index.css](src/index.css).
- [x] All new strings added to `src/i18n/translations.ts` (`he`; `en` falls through to source).

### Done when

- [x] Build + lint clean (lint unchanged at the 21-warning baseline — the count dropped from 22
      to 21 on the rebase onto `origin/main`, before Phase 2; no new warnings in touched files).
- [x] Eyeballed all three variants + `<UpgradeCard>` via a temporary `progate-preview` drawer
      section, headless, in **both** languages (screenshots) — RTL, gold accent and the perk list
      all render; temp section removed.
- [x] Commit: `Tiering: ProGate + feature map + upgrade shell (phase 2)`.

---

## Phase 3 — Gate the low-risk toggles

**Goal:** multi-string, mastery maps, and voice profile are Pro-gated. Self-contained, easy to
verify.

### 3.1 — Multi-string (`multiString`) — `design.md` §5.3

- [x] [src/components/SelectorPanel.tsx](src/components/SelectorPanel.tsx): the multi-string
      toggle wrapped in `<ProGate feature="multiString" variant="inline-badge">` (pitch =
      `t('Multi-string drilling mode')`). Free user sees it with a gold "Pro" pill; the
      transparent catch layer turns the tap into `openUpgrade()`.
- [x] [src/hooks/useSelector.ts](src/hooks/useSelector.ts): the `multiStrings` derivation now
      takes `isPro` and yields `[]` when `!isPro`, so a free user drills single-string. The
      persisted `multiMode` setting is **not** touched (the toggle handler is unreachable behind
      the gate), so it reactivates on upgrade. `isPro` is threaded in from `App.tsx` —
      `const auth = useAuth()` moved above `useSelector(instrument, auth.isPro)`.
- [x] Confirmed via headless CDP: seeding `sel_multi_guitar = true` + all six strings on the
      unconfigured (free) local build renders the "Multi" pill active with the "Pro" badge, the
      board does not crash, and gameplay reads a single string. `multiMode` is never written back.

### 3.2 — Mastery maps (`masteryMaps`) — `design.md` §5.2

- [x] [src/App.tsx](src/App.tsx): the `fretMastery` / `noteMastery` `useMemo`s return `{}` when
      `!auth.isPro` (the maps are not built at all), and the `showMastery` prop passed to
      `FretGrid` / `NoteCircle` is `&&`-ed with `auth.isPro`, so the overlay is forced off
      regardless of the stored `pref_showMastery`.
- [x] The "Mastery on the fretboard" toggle in the Stats & progress screen wrapped in
      `<ProGate feature="masteryMaps" variant="overlay">` (pitch = the mastery-maps perk string).
      Verified via CDP: on the Stats screen the toggle shows blurred/dimmed under a lock chip +
      "Pro" pill.

### 3.3 — Voice profile (`voiceProfile`) — `design.md` §5.5

- [x] [src/App.tsx](src/App.tsx) `answer` drawer section: the whole `answerMode === 'voice'`
      block (the "Voice engine" card **and** the "Your voice profile" / calibration-entry card)
      wrapped in `<ProGate feature="voiceProfile" variant="replace">`, so a free user sees one
      `<UpgradeCard>` in their place. The `{showVoiceCalibration && …}` modal render is also
      guarded with `auth.isPro` as a backstop. `VoiceCalibration.tsx` itself is unchanged — its
      only entry point is the now-gated button.
- [x] No change needed in `src/utils/speech.ts` — `getSpeechEngine()` already falls back to the
      generic/template engine when no profile is ready.
- [x] Existing calibration data is left intact (nothing calls `deleteProfile`; the gate only
      hides the UI) — re-enables on upgrade.

### Done when

- [x] Build + lint clean (`npm run build` green; ESLint 0 errors / 21 warnings — unchanged from
      the phase-2 baseline, none in the touched files).
- [x] With a `free` (unconfigured local) build, verified headless: multi-string toggle → "Pro"
      pill + upsell tap; mastery overlay absent and the Stats toggle locked; voice-profile UI
      replaced by the upsell card. **[DEFERRED to the preview deploy]** the flip to `pro` via SQL
      → all three work again and previously-set preferences come back — needs sign-in, which the
      local build (no `.env`) can't do; check on the `claude/free-pro-tiering` preview alongside
      the Phase 1 readout check.
- [x] Commit: `Tiering: gate multi-string, mastery maps, voice profile (phase 3)` (`3f3da95`).

---

## Phase 4 — Gate the history view

**Goal:** the Stats & Progress screen (and mastery aggregation) shows only the last 7 days for
free users. **Nothing else is touched** — sync, restore, XP, badges, current-combo best all keep
reading the full history.

### 4.1 — `src/utils/progress.ts`

- [ ] Add `export function withinFreeWindow(entries: HistoryEntry[]): HistoryEntry[]` —
      `filter(e => e.createdAt && Date.parse(e.createdAt) >= Date.now() - FREE_HISTORY_DAYS*864e5)`.
      Import `FREE_HISTORY_DAYS` from `utils/features.ts`.

### 4.2 — `src/components/ProgressPanel.tsx`

- [ ] Receive `isPro` (from `App.tsx`).
- [ ] When `!isPro`, apply `withinFreeWindow` to the `history` array it derives every stat from,
      in **both** the "This setup" and "All time" scopes.
- [ ] Relabel: for a free user the "All time" scope reads "Last 7 days" — or hide the "All time"
      scope button and show it behind `<ProGate feature="historyBeyond7Days" variant="overlay">`.
- [ ] The "All bests" expander (`allBestsSummary`) is Pro — wrap in
      `<ProGate feature="allPersonalBests" variant="overlay">`. The "This setup" current-combo
      best stays visible to everyone.

### 4.3 — `src/App.tsx` mastery aggregation

- [ ] The `fretMasteryMap` / `noteMasteryMap` `useMemo`s already only matter when the overlay is
      shown, and Phase 3 turned the overlay off for free users — so **no history-window filter is
      needed here**. Just double-check a free user never triggers the aggregation. Leave the
      full-history read for Pro.

### 4.4 — Leave alone (verify, don't change)

- [ ] `useHistory.addEntry`, `utils/sync.ts` (`bootstrapUser`/`reconcileUser`/write-throughs),
      `utils/leaderboard.ts`, `utils/badges.ts` — all keep reading/writing the **full** history.
      Grep for `withinFreeWindow` and confirm it appears only in `ProgressPanel`.

### Done when

- [ ] Build + lint clean.
- [ ] Free account with history older than 7 days: Stats screen shows only recent rows; XP on the
      leaderboard and lifetime badges still reflect the full history; "Clear history" still clears
      everything. Flip to `pro` → all-time stats appear with no backfill step.
- [ ] Commit: `Tiering: 7-day history window for free (phase 4)`.

---

## Phase 5 — Guest-merge prompt

**Goal:** first sign-in on a device with local guest history asks before merging, instead of the
current silent auto-merge. Not tier-specific. See `design.md` §5.4.

### 5.1 — `src/utils/sync.ts`

- [ ] Add `cloudCaptureOrphans(entries: HistoryEntry[]): Promise<void>` — one bulk `insert` into
      `orphan_practice` with a fresh `batch_id = crypto.randomUUID()`, mapping each entry's
      fields + its `createdAt`. Best-effort (try/catch), no-op if `!supabase`.
- [ ] Add a merge-skipping restore: either a `bootstrapUser(userId, {}, {})` call (pass empty
      local maps so the union is a no-op) or an explicit `restoreOnly(userId)` that does
      pull → commit without the local union. Prefer reusing `bootstrapUser` with empty inputs to
      keep one code path.

### 5.2 — `src/components/GuestMergePrompt.tsx` (new)

- [ ] Modal with the copy from `design.md` §5.4 and two buttons: **Merge my progress** /
      **Use account only**. i18n both languages.
- [ ] If the local set is large (> 50 rows) and the user picks "Use account only", show a second
      confirm ("these won't be added to your account").

### 5.3 — `src/App.tsx` sign-in effect

- [ ] In the first-sign-in branch (`syncedUser() !== user.id`) — currently calls `bootstrapUser`
      directly (see [src/App.tsx](src/App.tsx#L167-L197)):
  - if local `allHistory` is empty → restore only, no prompt (current behavior is fine).
  - else, if `guestMergeChoice:<user.id>` is already stored → honor it silently.
  - else → show `<GuestMergePrompt>`. On **Merge** → existing `bootstrapUser(user.id,
    getAllHistory(), loadAllBests())`. On **Use account only** → `await
    cloudCaptureOrphans(flatten(getAllHistory()))`, then the merge-skipping restore, then wipe
    local `selectorHistory` + local bests to the restored set.
  - persist the choice in `guestMergeChoice:<user.id>`.
- [ ] The `online`-reconnect handler and the `reconcileUser` (already-synced) path are unchanged.

### Done when

- [ ] Build + lint clean.
- [ ] Manual: practice as a guest, sign in → prompt appears. "Merge" behaves as today. "Use
      account only" → local guest rows gone from the device, account shows only its cloud data,
      and a `select count(*) from orphan_practice` (as service role) increased by the guest row
      count. Signing in again does not re-prompt.
- [ ] Commit: `Tiering: guest-merge prompt + orphan capture (phase 5)`.

---

## Phase 6 — Admin provisioning + dev toggle

**Goal:** a way to grant Pro out-of-band, and a way to test both experiences fast.

### 6.1 — `scripts/grant-pro.mts` (new)

- [ ] Node/tsx script (match `scripts/*.mts` style, e.g. `scripts/eval-voice.mts`). Reads
      `SUPABASE_URL` + a **service-role** key from env (never commit it; document in `.env.example`
      as a local-only var). Args: `--email <addr> [--months N | --lifetime] [--revoke]`.
- [ ] Looks up the `auth.users` id by email, upserts `public.entitlements`
      (`tier='pro', source='comp', expires_at = now()+N months or null`). `--revoke` sets
      `tier='free'`.
- [ ] Print the resulting row.

### 6.2 — Dev-only "simulate Pro" toggle

- [ ] Only under `import.meta.env.DEV`. Surface it in the Debug log panel
      ([src/components/DebugLogPanel.tsx](src/components/DebugLogPanel.tsx)) or the dev readout
      from 1.4.
- [ ] Mechanism: a `localStorage` flag `devSimulatePro` that `useAuth` OR-s into `isPro`
      (`isPro = (entitlement.tier === 'pro' || (import.meta.env.DEV && devSimulatePro)) && !!user`).
      Never reads in production bundles.
- [ ] Replace the temporary 1.4 readout with a clean "tier: X (+sim)" line.

### Done when

- [ ] `tsx scripts/grant-pro.mts --email you@example.com --months 1` flips your account to Pro
      (verify in-app after a refresh).
- [ ] The dev toggle flips gated UI on/off with no DB change and is absent from `npm run build`
      output (grep the `dist/` bundle for `devSimulatePro` → nothing meaningful).
- [ ] Commit: `Tiering: grant-pro script + dev simulate-pro toggle (phase 6)`.

---

## Phase 7 — Payment rail (SEPARATE SPEC, not now)

Out of scope here. Needs the pricing / trial decision first (`design.md` §11). When ready, write
`.kiro/specs/free-pro-payments/` covering: RevenueCat SDK wiring (web + Play Billing via
Capacitor), the `entitlement-webhook` Supabase Edge Function (service-role upsert into
`entitlements`, keyed by `provider_ref`), and turning the `<UpgradeCard>` placeholder CTA into the
real purchase entry point that calls `refreshEntitlement()` on success. `design.md` §7 is the
seam; nothing in Phases 1–6 changes.

---

## Progress tracker

- [~] Phase 1 — Entitlement plumbing + `0007` migration — code done & committed (`1894d3a`);
      pending the [MANUAL] `supabase db push` + the in-app `free`→`pro` verification
- [x] Phase 2 — Feature map + `<ProGate>` + upsell shell — done & committed. `utils/features.ts`,
      `components/ProGate.tsx` (3 variants), `components/UpgradeCard.tsx`, `hooks/useEntitlement.ts`
      (+ `entitlement` on `AuthState`), `utils/upgradeDrawer.ts` singleton, the `upgrade` drawer
      section, `styles/21-pro-gate.css`, i18n. Nothing gated yet.
- [~] Phase 3 — Gate multi-string / mastery maps / voice profile — code done; `SelectorPanel` +
      `useSelector(instrument, isPro)` clamp, `App.tsx` mastery `useMemo`/overlay gate + Stats
      toggle `<ProGate overlay>`, `answer` section `<ProGate replace>`. Free/locked side verified
      headless; the `pro` re-enable path is deferred to the preview deploy (needs sign-in).
- [ ] Phase 4 — 7-day history window
- [ ] Phase 5 — Guest-merge prompt + orphan capture
- [ ] Phase 6 — grant-pro script + dev toggle
- [ ] Phase 7 — Payment rail (separate spec)
