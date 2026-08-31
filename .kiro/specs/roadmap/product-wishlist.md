# Guitar Fret Practice — Product Wishlist (Selector Model)

Consolidated from `wishlist-requirements.md` (original Stage-based roadmap) and `wishlist-requirements-v2.md` (Selector-model re-plan). Both source files are kept as-is and unmodified — this document is the clean, decision-ready synthesis.

**Ground rules applied here:**
- The Selector Panel (string + fret range + difficulty, chosen directly) is the confirmed current product direction.
- The old Stage navigation model (chevrons, progress bar, stage picker, custom-stage snapshots) is **not** revived anywhere in this document.
- No item from the old roadmap is assumed wanted just because it was written down — anything not clearly re-affirmed by the Selector-model re-plan is marked Unconfirmed rather than promoted or discarded.

---

## 1. Fix Now
Bugs or behavior the product already promises but doesn't deliver.

- **Failed-note re-queue doesn't work.** `failedFretsRef` in `useGameEngine.ts` is written on a wrong answer but never read — the "missed notes come back once" behavior implied by the balanced-questioning design silently doesn't happen.
- **Click sound missing on some buttons.** The `click()` wrapper pattern (sound + haptic) isn't applied consistently — e.g. the game-end "OK" button uses a bare `onClick`, breaking the established interaction convention.
- **Placement test result isn't applied.** Onboarding's 3-question placement test scores the user correctly but then just tells them to go set the Selector Panel manually instead of writing the suggested string/difficulty into `useSelector`'s persisted settings — the feature doesn't complete its own purpose.
- **Dead/orphaned code: `src/components/Settings.tsx` and `src/design-preview/`.** A substantial alternate settings UI exists but is never imported or rendered by `App.tsx`. This isn't a user-facing bug, but it's misleading to anyone reading the codebase and should be resolved (finish it or remove it) rather than left in limbo.

---

## 2. Finish Current Product
Work needed to make the Selector-based experience feel complete and polished on its own terms — no new product concepts, just closing out what the current model implies.

- **Settings panel polish/completion.** Whatever is salvaged from `Settings.tsx` (time options, notation toggle A-B-C/solfege, circle order) should land inside the live `SelectorPanel.tsx` flow, since these were part of the original settings scope and aren't superseded by anything.
- **`?` info affordance** explaining the clock method / fretboard basics to a new user, auto-dismissing after a few seconds.
- **Toggle button visual state before interaction** (e.g. dashed border to distinguish un-toggled controls) — small discoverability gap in the current UI.
- **Order-switcher layout stability** — confirm the placeholder reserves space so switching between By Fret / By Note doesn't visibly jump the layout.

---

## 3. Confirmed Future Features
Features from the old roadmap that are clearly still desired and map cleanly onto the Selector model with no dependency on Stages, backend, or monetization.

- **Scoring system** — points, speed bonus, streak multiplier, live score counter.
- **Session summary card on stop** — score, streak, accuracy, avg speed, personal best.
- **Celebration tiers** (small win / milestone / major award pulses+haptics) — purely presentational, independent of navigation model.
- **Adaptive timer** — tightens/relaxes based on streak, within a session.
- **Audio refinements** — single-note question sound, satisfying correct chime, escalating streak tone, optional background beats toggle.
- **Silent Mode** — visual-only questions, no audio.
- **Mastery heatmap** on the note circle, colored by per-note/per-string success rate — fits the Selector model well since accuracy is already tracked per settings combination (`historyKey()`).
- **Progress chart** — accuracy % and avg response time trend across recent sessions.
- **Badges** — Speed Demon, Perfect Session, String Master, streak-based (e.g. 5-of-7 days), Most Improved — all computable from existing history data.
- **Practice schedule / reminders** — local notification at a chosen time, gentle streak counter.
- **Adaptive suggestion, retargeted** — auto-suggest a harder/easier Selector configuration (fret range or difficulty) based on recent accuracy for the current settings combination. This keeps the *intent* of the old "adaptive suggestion between stages" idea while dropping the Stage mechanism itself.

---

## 4. Unconfirmed Ideas
Old-roadmap ideas that may still have value but were never re-affirmed under the Selector model. None of these should be scheduled without a product-owner decision.

- **Saved/named Selector presets.** The old "Custom Stage" (save/rename/clear, free-tier limit of 1) doesn't apply directly since there's no Stage to snapshot — but a lighter equivalent (bookmark a specific string+range+difficulty+mode combo for quick recall) might still be wanted. Unconfirmed whether this is desired at all, and if so, whether a free-tier limit is even relevant pre-monetization.
- **Multi-string emphasis animations** (string label flash/scale on switch, haptic pulse on string switch) — plausible polish for multi-string mode, but not confirmed as a priority; usage of multi-string mode isn't yet established as common enough to warrant it.
- **Quick-switch affordance for recent/favorite Selector combinations** — distinct from reviving Stage navigation, but unconfirmed whether users need anything beyond directly editing the Selector Panel each time.
- **Auth & cross-device sync** (Google sign-in, Supabase) — plausible long-term, but the app is intentionally backend-free today; no decision has been made to introduce a backend.
- **Leaderboard, expertise tests (String Speed Test, Full Neck Sprint, Blind Ear Test), user profiles, admin dashboard** — all depend on the unconfirmed backend decision above.
- **Monetization** (premium tier, ad-unlock, donations, community donation pool) — depends on both the backend decision and a separate, unmade business decision to monetize at all.
- **Walk Mode / hands-free voice drilling, ear training, additional instruments (bass, ukulele, mandolin, banjo), iOS port** — all plausible long-term directions from the later original roadmap, none rejected, none confirmed; each represents a significant scope commitment that hasn't been revisited under the current product direction.

---

## 5. Obsolete
Only items clearly and specifically superseded by the Selector model — not "deprioritized," but actually replaced by a shipped, different mechanism.

- **Stage progression system** (dots → natural → chromatic per string, moved through in sequence) — replaced by direct difficulty selection (Whole Only / Dot Frets / +♯♭) in the Selector Panel; there is no discrete sequence to progress through anymore.
- **Stage Navigation chrome** — chevron arrows, progress bar with per-string colored dashes, tap-title stage picker overlay, title glow on stage change, swipe-to-change-stage, "stage change always stops game." All of this assumed a stage index to navigate; the Selector Panel has no equivalent concept and none of this UI should be rebuilt in its original form.
- **"Custom Stage" as a stage-snapshot concept specifically** — the *mechanism* (snapshotting a Stage) is obsolete along with Stages themselves. (The underlying *want* — save a configuration for later — is carried forward as an Unconfirmed idea above, not as this obsolete mechanism.)
