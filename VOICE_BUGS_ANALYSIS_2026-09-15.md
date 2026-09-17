# Voice Bugs — Critical Analysis & Action Plan
**Extracted from product-wishlist.md §1 — Session 2026-09-15**

---

## 🔥 Priority Ranking

| Priority | Issue | Status | Decision Needed |
|----------|-------|--------|-----------------|
| **🚨 1** | Multi-attempt captures ("I have to shout") | **Partially fixed** | Choose option (a)/(b)/(c) for cause B |
| **🚨 2** | "F sharp" → "F" (fluent, no pause) | **IN PROGRESS** | Build & verify hybrid approach live |
| **🚨 3** | A → B misheard (self-test missed) | **Unresolved** | Investigate calibration pairwise limits |
| **⚠️ 4** | Correct answer scores worse than wrong | **Unresolved** | Check C calibration consistency |
| **⚠️ 5** | VAD fails with background noise | **In analysis** | Endpoint against utterance peak (not noise floor) |
| **🔄 6** | "By note" mode can't be answered by voice | **Blocked** | Needs fret vocabulary templates |
| **🔄 7** | Remove "General" bundled model | **Blocked** | Decide what Free tier gets instead |
| **✅ 8** | Personal profile never runs in Android app | **Investigation** | Verify `getUserMedia` inside Capacitor WebView |

---

## 🔴 THE FOUR CRITICAL BUGS (from 2026-09-15 round)

### 1. **Multi-Attempt Captures (PRODUCT OWNER TOP PRIORITY)**
**Problem:** User has to shout / repeat again and again

#### Root Causes Found:
- **Cause A (FIXED 2026-09-15):** Noise floor learned from user's own repeated answer → deaf for 4 seconds
  - Evidence: Previous round: 2/15 timed out; after fix: 15/15 answered, zero timeouts
  - One 100ms transient got through → **tightened threshold to 2× gate** (`TRANSIENT_PEAK_OVER_GATE`)
  
- **Cause B (UNDECIDED):** Short trailing fragment (~120–180ms) rejects a clear letter
  - When `segmentUtterance` returns non-sharp/non-flat second segment, accidental gate fails
  - Example: A vs E on `segMs [360,169]` → rejected and asked again
  - Real accidentals are 240–980ms; garbage fragments 80–180ms
  
#### Two Fixes Already Built (2026-09-15, not verified):
1. **Concat override only on non-null segmented notes** — prevents rejected "C" becoming C#
2. **Discard transient captures** — post-onset peak below silence gate OR single segment < ~150ms

#### Test Results After Fixes:
- Q4: cause B shape, concat override turned "ask again" into wrong C#
- Q14: single 100ms transient at 25.0 was answered (shows rule was too lenient)
- **Thresholds tightened to 2×** — blocks garbage at 0.7×, 1.0×, 1.3×; real words ≥ 3.9×

#### ⚡ DECISION NEEDED FOR CAUSE B — Three Options:

**Option (a) Plain Rule:**
- Answer segmented letter when: segment 0 ≥ 250ms, segment 1 < 200ms, segment 1 fails accidental cap
- Trade-off: might turn some real "sharp" tails into wrong answers
- Evidence: one `[520,140]` was a real "sharp"; measure how often cause A happens vs cause B

**Option (b) Margin-Gated:**
- Only ignore fragment when letter wins by wide margin: letter ratio ≤ 0.85
- Example: Q4 0.52 ✓, Q7 0.96 ✗, earlier A/E 0.84 / B/D 0.86 borderline
- **Untested** against the `[520,140]` tails

**Option (c) Leave As Is:**
- Continue asking again on cause B
- Accept some retry loops vs risk wrong answers

#### 📋 **Implementation Files to Touch** (cause B if chosen):
- `src/utils/templateSpeechEngine.ts` — `runSegmented()` function
- `src/utils/{mfcc,dtw}.ts` — segment filtering logic
- Add test log parsing to measure frequency before/after

---

### 2. **"F Sharp" Reads as "F" (Fluent, No Pause)**
**Problem:** When user says "F sharp" without pause between letter and accidental, it reads just "F"

#### Root Cause (Diagnosed 2026-09-15):
The fricatives of "ef" + "sharp" merge phonetically:
- `segmentUtterance` cuts anywhere in the merge zone
- Any cut leaves half a letter that sounds like "E"
- E + "#" normalizes to F via `SHARP_WRAP` logic
- Looks like the sharp was dropped

#### Evidence:
- With pause: 11/11 F# correct across two rounds
- Without pause: 4/9 correct initially, then 2/5 after first fix attempt
- Silent mode log analysis shows exact cut points

#### Solution Under Test — "Hybrid" Approach:
**Shipped cut decides**, EXCEPT:
- When whole-utterance matching against concatenated `letter+accidental` templates
- With ratio gate, reads an accidental
- Offline test (2026-09-15): sharps improved 2→13 correct of 30, wrong answers down 15→9, naturals unchanged

#### ⚡ **Next Step:**
- **Build the hybrid approach** (not yet built)
- **Verify live** in a normal round (offline test favored it, but live round earlier failed)
- Add testing for the exact phonetic overlap zones

#### 📋 **Implementation Files:**
- `src/utils/templateSpeechEngine.ts` — `runWhole()` vs `runSegmented()` decision logic
- `src/utils/voiceProfileVocab.ts` — concatenated template loading
- Test: isolated "F sharp" utterances across 3+ volumes & speakers

---

### 3. **A Recognised as B (Self-Test Missed It)**
**Problem:** A heard as B in live round; calibration shows B is A's nearest neighbor at distance 19.1

#### Evidence:
- Self-test (post-fix) only flagged B/D and D/E pairs
- Live round misheard A as B
- Calibration distance: A → B = 19.1 (closer than to other letters)

#### Root Cause (Likely):
- Pairwise self-test is insufficient — doesn't catch all similar pairs
- Individual calibration take quality varies

#### ⚡ **Not Yet Investigated:**
- Does the self-test loop through all **N × (N-1)** pairs or just the obvious /iː/ group (B/D, B/G, D/E)?
- Should A-to-B distance of 19.1 trigger an extra-takes prompt automatically?

#### 📋 **Implementation Files:**
- `src/utils/voiceProfile.ts` — self-test pair generation & thresholds
- `src/components/VoiceCalibrationScreen.tsx` — UX for "record more for this pair"
- Analysis: extract all distance matrices from real profiles, find pairs < 22 that failed

---

### 4. **Correct Answer Scores Worse Than All Wrong Candidates**
**Problem:** Question where answer was C, but C ranked *worst* of all seven letters

#### Evidence (Q13 from log):
- Correct: C#
- Heard: A#
- C matched with distance 33.8 (furthest of the group)
- Winning wrong guess (F) was nearly 10 points closer

#### Root Cause (Unknown):
Either:
1. Inconsistent C calibration takes (some days C's tokens are outliers)
2. Utterance shape not covered by template set (speaker's accent on this C was unusual)

#### ⚡ **Not Yet Investigated:**
- Count how often a correct answer ranks below wrong answers per user
- If > threshold, prompt: "Record C again, you sound different today"
- Check if calibration take distribution for C is bimodal (two distinct acoustic clusters)

---

## 🌐 VAD (Voice Activity Detection) Breaks with Background Noise

**Problem:** `captureUtterance` gates onset/silence off a noise floor sampled *before* speech starts. Continuous room noise (traffic, A/C, people talking) defeats both capture ends.

#### Evidence (2026-09-15 noisy-room test):
- 3 questions, 0 answers, 5 captures all rejected
- 6 questions, 2 correct, 1 wrong, 3 no answer, 12 captures
- Captures ran to 3.5s cap; spoken letter ~1s in quiet room
- Segmentation was garbage: `[120,1960]`, `[1600,300]`, `[80,540]`
- Letter distances rose to 17–30 vs 9–13 in quiet

**Why "noise filter" won't work:**
- `openMicSession()` already requests browser's `noiseSuppression`
- It targets *steady* noise, but competing speech lives in the same band

#### ✅ **Fix Direction Confirmed:**
Endpoint *against the utterance's own peak*, not a pre-sampled floor

#### 📋 **Instrumentation Added (2026-09-15):**
- `[voice] vad` now logs post-onset level distribution: `p10`, `p50`, `p90`, `tail` (mean of last ~500ms relative to peak)
- Noisy-room test shows where "silence as fraction of peak" must sit

#### 📋 **Next Step (Ready to Build):**
1. One round in same noisy room with instrumentation
2. Choose threshold fraction from `tail` values on `cap` stops vs `silence` stops
3. Implement in `captureUtterance()` — replace absolute 0.010 gate with peak-relative

#### 📋 **Implementation Files:**
- `src/utils/templateSpeechEngine.ts` — `captureUtterance()` function (~line 250–350)
- `src/utils/debugLog.ts` — ensure `[voice] vad` logs are complete

---

## 🔄 Lower-Priority Items (Blocked or Unbuilt)

### "By Note" Mode Can't Be Answered by Voice
- Currently only note names recognized
- Needs **fret vocabulary** for template engines
- Example: calibration takes for "1st fret, B string"

### Remove "General" Bundled Model
- Requested 2026-09-14, blocked on product decision
- If removed: Free users lose any on-device voice (they're on General fallback)
- **Product owner must decide:** What does Free tier get instead?
  - Nothing (tap only)?
  - Web Speech (requires internet, flaky)?
  - External service?

### Personal Profile Never Runs in Android App
- `getSpeechEngine()` short-circuits to native engine
- Doesn't check user's preference for `profile`
- **Needs:** Verify `getUserMedia` works inside Capacitor WebView

### "Personal" Engine Silently Falls Back
- When calibration profile not ready, no UI indication
- Settings screen should show which recogniser is *actually* active
- File: `src/components/SettingsDrawer.tsx` or `VoiceSettings.tsx`

---

## ✅ Already Built & Verified

- **B/D extra-takes-per-pair** — measured 2026-09-14: 0/4 baseline → 11/16 (69%) after bringing B/D to 8 takes
- **Transient rule tightened to 2×** — filters garbage without losing real letters
- **Concat override on non-null only** — prevents wrong accidental answers
- **User pause hint** — alone took accidentals 0/4 → 2/4 (needs Hebrew copy added to UI)

---

## 🎯 Recommended Next Session Flow

### Before Building Anything:
1. **Communicate product decisions to owner** (Cause B option, Free tier voice strategy)
2. **Verify two fixes live** (concat override, transient rule)
   - One normal round in quiet room
   - Look for `transient ignored` rows (should appear, no answer after)
   - Confirm no `concat accidental` with `overrode: true` on rejected turns

### Then (In Priority Order):
1. **Cause B widened** (if option a chosen) — measure frequency first
2. **Hybrid F# approach** — build & test live
3. **VAD endpoint** — one noisy round with instrumentation, choose threshold, implement
4. **Pause hint UI** — add Hebrew copy, show on calibration screen + voice-answer screen
5. **A→B calibration check** — analyze distance matrices, auto-prompt for outlier pairs

---

## 🔗 File Map

| Component | Path | Issue |
|-----------|------|-------|
| Voice engine selection | `src/utils/speech.ts` | "Personal" fallback signal |
| Template matching | `src/utils/templateSpeechEngine.ts` | Cause B rule, hybrid F#, VAD endpoint |
| Profile calibration | `src/utils/voiceProfile.ts` | Self-test pair generation |
| Calibration UI | `src/components/VoiceCalibrationScreen.tsx` | Pause hint, outlier prompt |
| Voice answer mode | `src/hooks/useVoiceAnswer.ts` | UI for active recogniser |
| Debugging | `src/utils/debugLog.ts` | VAD stats logging |
| Android bridge | `src/utils/speech.ts` + `capacitor.config.ts` | `getUserMedia` verification |

---

## 📊 Measured Metrics (Keep These)

| Measurement | Value | Source |
|-------------|-------|--------|
| Quiet room, natural | 5/10 | 2026-09-14 |
| Quiet room, with pause | 8/10 | 2026-09-14 |
| Noisy room (before VAD fix) | 2/9 | 2026-09-15 |
| Baseline (B/D 2 takes) | 0/4 | 2026-09-14 |
| After 8-take round | 11/16 (69%) | 2026-09-14 |
| Transient threshold | 2× post-onset peak over gate | 2026-09-15 |
| Post-fix normal round | 15/15 answered, 3 retries, 0 timeouts | 2026-09-15 |

---

## 🚀 One-Liner Summary
**Status: 2026-09-15 — Cause A fixed; cause B & F# approaches ready to build after product owner decisions; VAD instrumentation complete, endpoint ready to implement; self-test & C-calibration issues identified but not yet investigated.**
