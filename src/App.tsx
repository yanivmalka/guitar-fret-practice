import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { SettingsDrawerNav, SettingsSubPage, type SettingsSection } from './components/settings/SettingsDrawer';
import PlayingSection from './components/settings/sections/PlayingSection';
import GeneralSettingsSection from './components/settings/sections/GeneralSettingsSection';
import AccountSection from './components/settings/sections/AccountSection';
import menuIconLearn from './assets/menu-icons/learn.png';
import menuIconPlaying from './assets/menu-icons/playing.png';
import menuIconSettings from './assets/menu-icons/settings.png';
import menuIconStats from './assets/menu-icons/stats.png';
import menuIconFeedback from './assets/menu-icons/feedback.png';
import menuIconLeaderboard from './assets/menu-icons/leaderboard.png';
import menuIconAccount from './assets/menu-icons/account.png';
import SelectorPanel from './components/SelectorPanel';
import AdjustSuggestionBanner from './components/AdjustSuggestionBanner';
import ProgressPanel from './components/ProgressPanel';
import Onboarding from './components/Onboarding';
import { setActiveInstrument } from './utils/music';
import type { HistoryEntry, AccidentalMode, OrderMode, NotationMode } from './utils/music';
import { getInstrument, type InstrumentId } from './utils/instruments';
import { preloadAllSamples, unlockAudio, setAudioInstrument } from './utils/audio';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { playClickSound, playToggleOnSound, playToggleOffSound, playStickClick, haptic, celebrateTier3 } from './utils/feedback';
import { withClick as click } from './utils/withClick';
import { loadSetting, saveSetting } from './utils/settings';
import { type Theme } from './utils/theme';
import { useThemeEffect } from './hooks/useThemeEffect';
import { useSilentModeEffect } from './hooks/useSilentModeEffect';
import { useBootReadyEvent } from './hooks/useBootReadyEvent';
import { useAutoPauseOnBackground } from './hooks/useAutoPauseOnBackground';
import { useQuestionChangeAnimation } from './hooks/useQuestionChangeAnimation';
import { useAdjustSuggestion } from './hooks/useAdjustSuggestion';
import { loadBest, saveBest, loadAllBests, writeAllBests } from './utils/personalBest';
import { historyForInstrument, flattenHistory, fretMasteryMap, noteMasteryMap, applyMasteryWindow, DEFAULT_MASTERY_WINDOW, FREE_MASTERY_WINDOW, type MasteryStat, type MasteryWindow } from './utils/mastery';
import { useAuth } from './hooks/useAuth';
import { bootstrapUser, reconcileUser, syncedUser, clearSyncedUser, cloudCaptureOrphans, restoreOnly } from './utils/sync';
import { bootstrapSettings, syncedSettingsUser, clearSyncedSettingsUser, cloudPushSettings } from './utils/settingsSync';
import { bootstrapBadges, syncedBadgesUser, clearSyncedBadgesUser, cloudPushBadges } from './utils/badgeSync';
import { useSelector, type DerivedSettings } from './hooks/useSelector';
import { useDerivedNotes } from './hooks/useDerivedNotes';
import { useDrillSession } from './hooks/useDrillSession';
import { deriveDrillConfig, type DrillConfig } from './drill/DrillConfig';
import GameFlow from './game/GameFlow';
import LearningPathScreen from './components/LearningPathScreen';
import DailyPracticeScreen from './components/DailyPracticeScreen';
import IntervalPracticeScreen from './components/IntervalPracticeScreen';
import LearnHub, { type LearnDomain } from './components/LearnHub';
import { useLearning } from './hooks/useLearning';
import { useDrillHistorySink } from './game/useDrillHistorySink';
import type { HistoryOps } from './hooks/useGameEngine';
import type { TeacherPlan } from './learning/planner';
import {
  bootstrapLearning, syncedLearningUser, clearSyncedLearningUser, clearLocalLearningState, cloudPushLearning,
} from './learning/learningSync';
import {
  bootstrapGameProgress, syncedGameProgressUser, clearSyncedGameProgressUser,
  clearLocalGameProgress, cloudPushGameProgress,
} from './utils/gameSync';
import { useHistory } from './hooks/useHistory';
import { useScoring } from './hooks/useScoring';
import { useVoiceAnswer } from './hooks/useVoiceAnswer';
import ExitHintToast from './components/ExitHintToast';
import MicPermissionCard from './components/MicPermissionCard';
import SignInNudge from './components/SignInNudge';
import CountdownOverlay from './components/drill/CountdownOverlay';
import StageTransition from './components/drill/StageTransition';
import GameEndSummary from './components/drill/GameEndSummary';
import DrillBoard from './components/drill/DrillBoard';
import DrillControls from './components/drill/DrillControls';
import DebugLogPanel from './components/DebugLogPanel';
import VoiceCalibration from './components/VoiceCalibration';
import { FeedbackBoard } from './components/FeedbackBoard';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { computeMyStats, leaderboardName, upsertMyEntry } from './utils/leaderboard';
import { BadgeGrid } from './components/BadgeGrid';
import { UpgradeCard } from './components/UpgradeCard';
import { can } from './utils/features';
import { GuestMergePrompt } from './components/GuestMergePrompt';
import { registerUpgradeHandler } from './utils/upgradeDrawer';
import { BadgeToast, BadgeRevealOverlay, type CelebratedBadge } from './components/BadgeCelebration';
import {
  badgeDef, evaluateSession, evaluateLifetime, awardFamilyUpTo, earnedTier,
  type BadgeId, type SessionSnapshot, type LifetimeSnapshot, type Tier,
} from './utils/badges';
import type { SpeechNotation } from './utils/speechVocab';
import { resetSpeechEngine, type VoiceEnginePref } from './utils/speech';
import {
  getActiveProfile, setActiveProfile, isProfileReady, recomputeReady, templateCounts,
} from './utils/voiceProfile';
import { PROFILE_LABELS, SAMPLES_PER_LABEL, profileVocabId } from './utils/voiceProfileVocab';
import { bootstrapVoiceProfile, voiceSyncedUser, clearVoiceSyncedUser } from './utils/voiceSync';
import { useTranslation } from './i18n/useTranslation';
import { mergeCelebrated } from './utils/badgeCelebration';

type AnswerMode = 'tap' | 'voice';

// The learning domains, chosen from the "Learn" drawer page (<LearnHub>).
// 'notes' is the Selector — the home screen and the default on every launch;
// 'daily' and 'intervals' are Premium full pages (DailyPracticeScreen /
// IntervalPracticeScreen). Not persisted, so a fresh launch — or a page
// reload — always lands back on the Selector. `LearnDomain` is defined by
// <LearnHub> and re-exported through its import above.

export default function App() {
  const { t, lang, setLang } = useTranslation();
  // Which instrument is being drilled. Chosen on first launch (Onboarding) and
  // switchable from the hamburger menu; everything tuning/string/fret/sample
  // related flows from this config (see utils/instruments.ts).
  const [instrumentId, setInstrumentId] = useState<InstrumentId>(
    () => loadSetting('pref_instrument', 'guitar'),
  );
  const instrument = getInstrument(instrumentId);
  // Sync the shared note-table + audio bindings to the active instrument before
  // any child hook/component reads them this render. Idempotent — this is an
  // external-store sync, not derived render state.
  setActiveInstrument(instrument);
  setAudioInstrument(instrument);
  const applyInstrument = (id: InstrumentId) => {
    setInstrumentId(id);
    saveSetting('pref_instrument', id);
  };

  // Auth carries the entitlement/tier. The account-sync effect further down
  // uses the same `auth` object.
  const auth = useAuth();

  const selector = useSelector(instrument, auth.isPro);
  const { derivedSettings } = selector;

  // ── Premium Teacher (P2) ──────────────────────────────────────────────
  // A planned session, set by the Today card. While it is non-null the drill
  // runs on the plan's DrillConfig (fret window / mode / strings / count /
  // timer) instead of the Selector's; the Selector itself and `historyKey()`
  // are untouched, so a Teacher session records as ordinary note practice and
  // keeps feeding history / mastery / stats. Cleared when the session ends.
  const [teacherPlan, setTeacherPlan] = useState<TeacherPlan | null>(null);
  const teacherPlanRef = useRef<TeacherPlan | null>(null);
  teacherPlanRef.current = teacherPlan;
  // ── Interval drill (P4) ──────────────────────────────────────────────
  // A plain DrillConfig (with an `interval` spec) set by the Interval card.
  // While it is non-null the drill runs on it; its answers go to an in-memory
  // sink (never `useHistory` / mastery / stats / badges / leaderboard) and feed
  // only the interval SRS schedule. Cleared when the session ends.
  const [intervalPlan, setIntervalPlan] = useState<DrillConfig | null>(null);
  const intervalPlanRef = useRef<DrillConfig | null>(null);
  intervalPlanRef.current = intervalPlan;
  // True while the run that is currently ending was an interval session — used
  // to skip the note-side end-of-run work (personal best, badges, leaderboard).
  // Set in `start()`, cleared on reset (not on stop), like `wasTeacherRunRef`.
  const wasIntervalRunRef = useRef(false);
  // A Teacher answer folds into the learning model (SRS + daily goal); an
  // ordinary by-fret Selector answer folds into the SRS schedule only, so the
  // Teacher still learns from all note practice. Both are no-ops off Premium.
  const teacherRecordRef = useRef<((e: HistoryEntry) => void) | null>(null);
  const practiceRecordRef = useRef<((e: HistoryEntry) => void) | null>(null);
  // True while the run that is currently ending was launched from the Today
  // card. Set in `start()`, read by the game-end effect, cleared on reset —
  // NOT on stop, so a manually-stopped Teacher run is still recognised.
  const wasTeacherRunRef = useRef(false);

  // The settings the drill / board actually run on: the Selector's, unless a
  // Teacher plan is active.
  const eff = useMemo<DerivedSettings>(() => {
    const planDrill = intervalPlan ?? teacherPlan?.drill ?? null;
    if (!planDrill) return derivedSettings;
    const d = planDrill;
    return {
      ...derivedSettings,
      guitarString: d.primaryString,
      multiStrings: d.isMulti ? d.strings : [],
      fretFrom: d.fretFrom,
      fretTo: d.fretTo,
      byNote: d.mode === 'byNote',
      dotsOnly: false,
      wholeToneOnly: false,
      time: d.timeLimit,
      maxQuestions: d.questionCount,
    };
  }, [teacherPlan, intervalPlan, derivedSettings]);
  // Mode the drill is actually running in, for the history sink (read inside a
  // callback, so kept in a ref per the repo convention).
  const effByNoteRef = useRef(eff.byNote);
  effByNoteRef.current = eff.byNote;

  const [guitarString, setGuitarString] = useState(derivedSettings.guitarString);
  // `guitarString` is state synced from derivedSettings via an effect, so for
  // one render right after an instrument switch it can still hold the previous
  // instrument's (larger) string number. Clamp it before anything indexes the
  // now-shorter note table with it — an out-of-range index throws and blanks
  // the whole page.
  const safeGuitarString = Math.min(Math.max(guitarString, 1), instrument.stringCount);
  const [byString, setByString] = useState(() => loadSetting('pref_byString', true));
  const [notation, setNotation] = useState<NotationMode>(() => loadSetting('pref_notation', 'alpha'));
  // Bumped when a personal voice-profile calibration finishes, so
  // useVoiceAnswer re-selects the speech engine (on-device vs Web).
  const [voiceEngineEpoch, setVoiceEngineEpoch] = useState(0);
  const [showVoiceCalibration, setShowVoiceCalibration] = useState(false);
  // Summary of the stored personal voice profile, shown in Settings so it is
  // obvious that recordings exist and can be extended.
  const [voiceProfileStat, setVoiceProfileStat] = useState<
    { enabled: boolean; count: number } | null
  >(null);
  const [voiceEnginePref, setVoiceEnginePref] = useState<VoiceEnginePref>(
    () => loadSetting('pref_voiceEngine', 'auto'),
  );
  const pickVoiceEngine = (p: VoiceEnginePref) => {
    setVoiceEnginePref(p);
    saveSetting('pref_voiceEngine', p);
    resetSpeechEngine();
    setVoiceEngineEpoch((n) => n + 1);
  };
  // Refresh the voice-profile summary on mount and whenever a calibration
  // session ends or the engine preference changes.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const active = getActiveProfile();
      if (!active) { if (alive) setVoiceProfileStat({ enabled: false, count: 0 }); return; }
      try {
        const counts = await templateCounts(active, profileVocabId(notation as SpeechNotation), true);
        const count = Object.values(counts).reduce((s, v) => s + v, 0);
        if (alive) setVoiceProfileStat({ enabled: isProfileReady(), count });
      } catch {
        if (alive) setVoiceProfileStat(null);
      }
    })();
    return () => { alive = false; };
  }, [showVoiceCalibration, voiceEngineEpoch, notation]);
  // How the player answers a question: tapping the circle/grid, or speaking the
  // note name / fret number aloud (WP-4). Voice needs a network connection and
  // is only offered where a recogniser is actually available.
  const [answerMode, setAnswerMode] = useState<AnswerMode>(() => loadSetting('pref_answerMode', 'tap'));
  const [order, setOrder] = useState<OrderMode>(() => loadSetting('pref_order', 'fifths'));
  // The engine always picks pitches from the sharp-spelled `notes` table, and
  // there is no user-facing sharp/flat spelling choice: the question note area
  // shows BOTH enharmonic names ("C♯ = D♭") via `displayNoteBothEnharmonics`,
  // and every other single-spelled surface (feedback line, stats, wheel base)
  // stays on the sharp spelling. Kept as a constant so the many call sites that
  // still take an `accidental` prop go on compiling unchanged.
  const accidental: AccidentalMode = 'sharps';
  // Whether the on-screen score, streak multiplier and all score celebrations
  // are shown. Off = "serious learning" mode: no score HUD or effects during
  // play, but every answer is still scored into history and personal-best
  // progress exactly as before.
  const [showScore, setShowScore] = useState(() => loadSetting('pref_showScore', true));
  // Whether the all-time per-note / per-fret mastery bars are drawn over the
  // circle/grid while stopped or paused. Off = a clean fretboard at rest; every
  // answer is still recorded and mastery keeps accumulating either way.
  const [showMastery, setShowMastery] = useState(() => loadSetting('pref_showMastery', true));
  // How much recent history the mastery bars are computed from. Free users are
  // pinned to FREE_MASTERY_WINDOW (last 250); Pro users pick the count via the
  // "questions counted" control in Settings. Persisted as a MasteryWindow object
  // so the future date-range / specific-day variants slot in without a migration.
  const [masteryWindow, setMasteryWindow] = useState<MasteryWindow>(
    () => loadSetting('pref_masteryWindow', DEFAULT_MASTERY_WINDOW),
  );
  // Silent mode: mute the drill's content audio (question note + correct chime
  // + celebration tones) while keeping UI clicks, haptics and every on-screen
  // celebration. For practising with headphones off or a real guitar in hand.
  const [silentMode, setSilentMode] = useState(() => loadSetting('pref_silentMode', false));
  // Whether the signed-in user has hidden themselves from the public
  // leaderboard. Default false = a signed-in player is listed automatically.
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(() =>
    loadSetting('pref_leaderboardOptOut', false),
  );

  useSilentModeEffect(silentMode);

  // Theme: 'dark' (default, original look) / 'night' (warm, dimmer) / 'day'
  // (light).
  const [theme, setThemeState] = useState<Theme>(() => loadSetting<Theme>('pref_theme', 'dark'));
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    saveSetting('pref_theme', t);
  }, []);
  useThemeEffect(theme);

  useBootReadyEvent(auth.loading, auth.entitlementLoading);

  const historyOps = useHistory();
  // Interval drill (P4): an isolated in-memory history for interval sessions,
  // so they never touch `useHistory` / mastery / stats / badges / leaderboard.
  // The wrapper below also routes each tagged row to the interval SRS schedule.
  const intervalSink = useDrillHistorySink();
  const intervalSinkRef = useRef(intervalSink);
  intervalSinkRef.current = intervalSink;
  const intervalRecordRef = useRef<((entry: HistoryEntry) => void) | null>(null);
  const intervalAddEntry = useCallback((entry: HistoryEntry) => {
    intervalSinkRef.current.addEntry(entry);
    if (entry.intervalItemId) {
      intervalRecordRef.current?.(entry);
    }
  }, []);
  const intervalHistory = useMemo<HistoryOps>(
    () => ({
      addEntry: intervalAddEntry,
      markPlayed: intervalSink.markPlayed,
      resetSession: intervalSink.resetSession,
      history: intervalSink.history,
    }),
    [intervalSink, intervalAddEntry],
  );
  const histKey = selector.historyKey();
  const { addEntry: addEntryRaw, markPlayed: markPlayedRaw } = historyOps;
  const addEntryWithKey = useCallback(
    (entry: HistoryEntry) => {
      addEntryRaw(histKey, entry);
      // Feed the Premium learning model. A Teacher session's answers update the
      // SRS schedule *and* the daily goal. Ordinary Selector play updates the
      // SRS schedule only (no daily-goal tick) and only in by-fret mode, where
      // each entry is exactly the asked (string, fret) — by-note's wrong-tap
      // entries are the wrong fret, so they must not touch the schedule. Both
      // recorders are inert off Premium.
      if (teacherPlanRef.current) teacherRecordRef.current?.(entry);
      else if (!effByNoteRef.current) practiceRecordRef.current?.(entry);
    },
    [histKey, addEntryRaw],
  );
  const markPlayedForKey = useCallback(
    () => markPlayedRaw(histKey),
    [histKey, markPlayedRaw],
  );

  // ── Accounts (optional): guests are unaffected; signing in with Google
  // syncs History + Personal Best to the account and restores them on other
  // devices. localStorage stays the source of truth the UI reads from.
  // (`auth` is created above, next to useSelector.)
  const { replaceAllHistory, getAllHistory } = historyOps;

  // First sign-in on a device that has local guest history: ask before
  // merging it into the account (design §5.4). The sign-in effect only sets
  // this flag; the actual bootstrap / capture+restore runs in the prompt's
  // button handlers, so the async sign-in flow isn't blocked on a user choice.
  const [pendingGuestMerge, setPendingGuestMerge] = useState(false);
  const guestMergeKey = (userId: string) => `guestMergeChoice:${userId}`;
  const finishGuestMerge = useCallback(async (choice: 'merge' | 'account-only') => {
    setPendingGuestMerge(false);
    const user = auth.user;
    if (!user) return;
    try {
      if (choice === 'merge') {
        // The original behavior: union this device's guest rows into the
        // account, push, and commit the merged set locally.
        const { history, bests } = await bootstrapUser(
          user.id, getAllHistory(), loadAllBests(),
        );
        replaceAllHistory(history);
        writeAllBests(bests);
      } else {
        // Keep the guest rows off the account: drop them into orphan_practice
        // for analytics, then restore the account's own cloud data locally,
        // replacing the guest history and bests on this device.
        await cloudCaptureOrphans(flattenHistory(getAllHistory()));
        const { history, bests } = await restoreOnly(user.id);
        replaceAllHistory(history);
        writeAllBests(bests);
      }
      try { localStorage.setItem(guestMergeKey(user.id), choice); } catch { /* ignore */ }
    } catch {
      /* offline or transient error — the sign-in effect retries next start */
    }
  }, [auth.user, getAllHistory, replaceAllHistory]);

  useEffect(() => {
    const user = auth.user;
    if (!user) { clearSyncedUser(); return; }
    let cancelled = false;
    (async () => {
      // Cleared here (inside the async body, not synchronously in the effect)
      // so a stale prompt from a previous account can't linger; re-armed below
      // only on a genuine first sign-in with un-merged guest history.
      setPendingGuestMerge(false);
      try {
        if (syncedUser() !== user.id) {
          // First sign-in on this device. With no local guest history there is
          // nothing to merge — restore straight from the cloud, no prompt.
          if (flattenHistory(getAllHistory()).length === 0) {
            const { history, bests } = await bootstrapUser(
              user.id, getAllHistory(), loadAllBests(),
            );
            if (cancelled) return;
            replaceAllHistory(history);
            writeAllBests(bests);
            return;
          }
          // Local guest history exists: honor a remembered choice silently,
          // otherwise ask (design §5.4).
          let stored: string | null = null;
          try { stored = localStorage.getItem(guestMergeKey(user.id)); } catch { /* ignore */ }
          if (cancelled) return;
          if (stored === 'merge' || stored === 'account-only') {
            await finishGuestMerge(stored);
          } else {
            setPendingGuestMerge(true);
          }
        } else {
          // Already merged before — pull the tombstone set, retire any
          // cleared rows that still survive here, then re-push what's left
          // (this also carries up anything written offline).
          const { history, changed } = await reconcileUser(
            user.id, getAllHistory(), loadAllBests(),
          );
          if (cancelled) return;
          if (changed) replaceAllHistory(history);
        }
      } catch {
        /* offline or transient error — retried on next sign-in / app start */
      }
    })();
    return () => { cancelled = true; };
  }, [auth.user, replaceAllHistory, getAllHistory, finishGuestMerge]);

  // Selector picks + UI preferences: once per sign-in on this device, adopt
  // the account's settings blob if it's newer than what this device last
  // synced. Applied by writing localStorage then reloading, so the settings
  // hooks read the restored values at mount (they only read localStorage
  // once). A no-op when the cloud blob isn't newer.
  useEffect(() => {
    const user = auth.user;
    if (!user) { clearSyncedSettingsUser(); return; }
    if (syncedSettingsUser() === user.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { applied } = await bootstrapSettings(user.id);
        if (cancelled) return;
        if (applied) window.location.reload();
      } catch {
        /* offline or transient error — retried on next sign-in / app start */
      }
    })();
    return () => { cancelled = true; };
  }, [auth.user]);

  // Earned badges: pull/merge/push the `badges` store on sign-in / app start,
  // so session badges (and every badge's original earnedAt) restore instead of
  // being lost on a device switch. The merge keeps the earliest earnedAt per
  // badge, so it's safe to re-run; badgeSync fires a `badges-synced` event if
  // the local set changed, which a mounted BadgeGrid re-reads on. A device
  // that already bootstrapped this account still runs the cheap reconcile
  // (one row) to pull anything earned elsewhere since its last visit.
  useEffect(() => {
    const user = auth.user;
    if (!user) { clearSyncedBadgesUser(); return; }
    if (syncedBadgesUser() === user.id) { cloudPushBadges(); return; }
    void (async () => {
      try {
        await bootstrapBadges(user.id);
      } catch {
        /* offline or transient error — retried on next sign-in / app start */
      }
    })();
  }, [auth.user]);

  // Premium Teacher learning state (SRS schedule + daily goal): pull / merge /
  // push the JSONB blob on sign-in / app start, same cadence as badgeSync. The
  // merge is per-NoteItem (never last-writer), so a review made on another
  // device is not discarded. A device that already bootstrapped still fires
  // the cheap write-through to carry up anything answered offline.
  useEffect(() => {
    const user = auth.user;
    // Signed out: drop this device's learning blob so it can't be merged into
    // the next account's cloud row on a shared device. A Free user's Teacher
    // is inert, so there is nothing live to lose.
    if (!user) { clearSyncedLearningUser(); clearLocalLearningState(); return; }
    if (syncedLearningUser() === user.id) { cloudPushLearning(); return; }
    void (async () => {
      try {
        await bootstrapLearning(user.id);
      } catch {
        /* offline or transient error — retried on next sign-in / app start */
      }
    })();
  }, [auth.user]);

  // Game progression (World → Stage stars + "continue" pointer): pull / merge
  // / push the `gameProgress` row on sign-in / app start, same cadence as
  // badgeSync. The merge is a per-stage max on `bestStars` (never last-writer),
  // so a star earned on another device is never discarded; gameSync fires a
  // `game-progress-synced` event when the local record changes, which a
  // mounted GameFlow re-reads on.
  useEffect(() => {
    const user = auth.user;
    // Signed out: drop this device's Game progress so it cannot be merged
    // (max-merged, so it would inflate ratings) into the next account's cloud
    // row on a shared device.
    if (!user) { clearSyncedGameProgressUser(); clearLocalGameProgress(); return; }
    if (syncedGameProgressUser() === user.id) { cloudPushGameProgress(); return; }
    void (async () => {
      try {
        await bootstrapGameProgress(user.id);
      } catch {
        /* offline or transient error — retried on next sign-in / app start */
      }
    })();
  }, [auth.user]);

  // Same model, for the personal voice profile: pull/merge/push once per
  // sign-in on this device, then switch the app onto the restored profile.
  useEffect(() => {
    const user = auth.user;
    if (!user) { clearVoiceSyncedUser(); return; }
    if (voiceSyncedUser() === user.id) return;
    let cancelled = false;
    (async () => {
      try {
        const merged = await bootstrapVoiceProfile(user.id);
        if (cancelled || !merged.length) return;
        // Keep the device's current profile if it's among the restored rows;
        // otherwise switch to whichever profile was touched most recently.
        const current = getActiveProfile();
        const profiles = [...new Set(merged.map((r) => r.profile))];
        const chosen = current && profiles.includes(current)
          ? current
          : merged.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b)).profile;
        setActiveProfile(chosen);
        const vocabIds = [...new Set(
          merged.filter((r) => r.profile === chosen).map((r) => r.vocabId),
        )];
        for (const vocabId of vocabIds) {
          await recomputeReady(vocabId, [...PROFILE_LABELS], SAMPLES_PER_LABEL);
        }
        resetSpeechEngine();
        setVoiceEngineEpoch((n) => n + 1);
      } catch {
        /* offline or transient error — retried on next sign-in / app start */
      }
    })();
    return () => { cancelled = true; };
  }, [auth.user]);

  // A round played offline only reaches the cloud on the next app start:
  // write-through (cloudInsertEntry / cloudPushSettings) is dropped while
  // navigator.onLine is false and nothing replays it, and the reconcile
  // above runs only per sign-in. Re-run the idempotent reconcile — and
  // re-arm the settings push — as soon as the network comes back.
  useEffect(() => {
    const user = auth.user;
    if (!user) return;
    let cancelled = false;
    const onOnline = () => {
      void (async () => {
        try {
          if (syncedUser() === user.id) {
            const { history, changed } = await reconcileUser(
              user.id, getAllHistory(), loadAllBests(),
            );
            if (!cancelled && changed) replaceAllHistory(history);
          } else {
            const { history, bests } = await bootstrapUser(
              user.id, getAllHistory(), loadAllBests(),
            );
            if (cancelled) return;
            replaceAllHistory(history);
            writeAllBests(bests);
          }
        } catch {
          /* transient — retried on the next reconnect / app start */
        }
        cloudPushSettings();
        cloudPushBadges();
        cloudPushLearning();
        cloudPushGameProgress();
      })();
    };
    window.addEventListener('online', onOnline);
    return () => { cancelled = true; window.removeEventListener('online', onOnline); };
  }, [auth.user, replaceAllHistory, getAllHistory]);

  const derived = useDerivedNotes(
    safeGuitarString, eff.fretFrom, eff.fretTo,
    eff.wholeToneOnly, eff.dotsOnly,
    accidental, order, byString, eff.multiStrings, instrumentId,
  );
  const { cofList, isMulti } = derived;
  const scoring = useScoring();

  // All-time (every settings combo ever played) mastery, shown as a small
  // equalizer-style overlay on the fretboard/note-circle so the user can see
  // at a glance what they know vs. what needs work, in both directions:
  // frets on the current string, and each note across all strings.
  const allHistoryEntries = useMemo(
    () => historyForInstrument(historyOps.allHistory, instrument.id),
    [historyOps.allHistory, instrument.id],
  );
  // Every instrument's history flattened — feeds the player-progress badges
  // (Century, streaks, accuracy…), which are not scoped to the current one.
  const everyInstrumentHistory = useMemo(
    () => flattenHistory(historyOps.allHistory),
    [historyOps.allHistory],
  );

  // Premium Teacher: reads the same instrument-scoped history, keeps the SRS
  // schedule + daily goal, and derives today's recommended session + a
  // "weak spots" session. Inert (no work, null plans) for non-Premium users.
  const learning = useLearning({
    instrument,
    entries: allHistoryEntries,
    isPremium: can('premiumTeacher', auth.tier),
    accidental,
    order,
  });
  teacherRecordRef.current = learning.recordAnswer;
  practiceRecordRef.current = learning.recordPracticeAnswer;
  // Every interval answer folds through the same path — interval SRS + the
  // separate interval daily goal + the capped, synced interval history
  // (spec §13 / §14 / §15.2). It never touches the note schedule / goal /
  // history (OD-5 / OD-6).
  intervalRecordRef.current = learning.recordIntervalTeacherAnswer;
  // The overlay is free for everyone (spec free-pro-tiering §5.2). Free users
  // see it computed from FREE_MASTERY_WINDOW (last 250 questions); Pro users
  // pick the window via the "questions counted" control in Settings.
  const effectiveMasteryWindow = auth.isPro ? masteryWindow : FREE_MASTERY_WINDOW;
  const windowedMasteryEntries = useMemo(
    () => applyMasteryWindow(allHistoryEntries, effectiveMasteryWindow),
    [allHistoryEntries, effectiveMasteryWindow],
  );
  const fretMastery = useMemo<Record<number, MasteryStat>>(
    () => fretMasteryMap(windowedMasteryEntries, safeGuitarString),
    [windowedMasteryEntries, safeGuitarString],
  );
  const noteMastery = useMemo<Record<string, MasteryStat>>(
    () => noteMasteryMap(windowedMasteryEntries, cofList),
    [windowedMasteryEntries, cofList],
  );

  // Auto Advance: when the current stage/selection is actually completed
  // (every question answered, not a manual Stop), move into the next stage of
  // the ordered curriculum (see utils/stageSequence.ts) and continue straight
  // into it, keeping the same score/streak/session. selector.applyStage and
  // setPendingAutoAdvance are called together in the same tick as the engine's
  // setRunning(false), so React batches them into one render — the
  // game-end-summary effect (below) sees pendingAutoAdvance already true at
  // that same render and skips showing the "round complete" screen.
  const [pendingAutoAdvance, setPendingAutoAdvance] = useState(false);
  // Data for the brief Auto Advance stage-transition banner (null = not shown).
  const [stageTransition, setStageTransition] = useState<{ name: string; from: number; to: number } | null>(null);
  // Mirror of the *current* stage's question count, read at the moment a stage
  // completes (before the next stage re-renders) to show "15 → 20".
  const stageMaxQRef = useRef(derivedSettings.maxQuestions);
  stageMaxQRef.current = derivedSettings.maxQuestions;
  const autoAdvanceFromRef = useRef(0);
  // Label of the stage being advanced into, captured for the transition banner.
  const autoAdvanceLabelRef = useRef('');
  const handleAutoComplete = useCallback(() => {
    // Teacher sessions are a fixed one-off plan — never chain into the Auto
    // Advance curriculum even if the user has it switched on in the Selector.
    if (teacherPlanRef.current || intervalPlanRef.current) return;
    if (!selector.state.autoAdvance) return;
    const next = selector.nextStage();
    if (!next) return; // end of the curriculum — let the run finish normally
    autoAdvanceFromRef.current = stageMaxQRef.current;
    autoAdvanceLabelRef.current = next.label;
    // Continuous run: carry score / streak / timing progression straight into
    // the next stage. runStreak keeps counting across this boundary — the
    // engine's next start() must NOT call scoring.beginRun (only manual Play
    // does), so the single run-length ramp is preserved.
    selector.applyStage(next);
    setPendingAutoAdvance(true);
  }, [selector]);

  // Practice's picks, reduced to the platform-neutral shape the shared drill
  // engine runs on (Practice → DrillSession ← Game). `accidental`/`order`/the
  // primary string come from App state, exactly as they did when App fed
  // useGameEngine directly.
  const selectorDrillConfig = useMemo(
    () => deriveDrillConfig(derivedSettings, {
      primaryString: safeGuitarString, accidental, order,
    }),
    [derivedSettings, safeGuitarString, accidental, order],
  );
  // An interval plan (P4) or a Teacher plan supplies its own DrillConfig;
  // otherwise the drill runs on the Selector-derived one. Interval plans take
  // precedence and route history to the isolated in-memory sink.
  const drillConfig = intervalPlan ?? (teacherPlan ? teacherPlan.drill : selectorDrillConfig);
  const session = useDrillSession(drillConfig, {
    setActiveString: setGuitarString,
    history: intervalPlan
      ? intervalHistory
      : {
          addEntry: addEntryWithKey,
          markPlayed: markPlayedForKey,
          resetSession: historyOps.resetSession,
          history: historyOps.history,
        },
    scoring: {
      onCorrect: scoring.onCorrect,
      onWrong: scoring.onWrong,
      onTimeout: scoring.onTimeout,
      getQuestionTime: scoring.getQuestionTime,
      showScore,
      session: scoring.session,
    },
    onComplete: handleAutoComplete,
  });
  const {
    running, paused, currentFret, currentNote, askedFret, remaining, feedback,
    correctCofNote, wrongCofNote, answered, remainingFrets, foundFrets, wrongFret,
    questionTime, questionStart, questionSeq, questionNumber, intervalPrompt,
    start: engineStart, stop, pause, resume, selectFret, selectAnswer,
    selectInterval, replayIntervalQuestion,
    // The tidy end-of-drill snapshot (score / accuracy / streak / counts) the
    // drill session already derives from the session score + recorded history.
    // Practice reads it for the round-complete card and the personal-best
    // record; a future Game will read the same shape for its own end screen.
    result: sessionResult,
  } = session;

  // Voice answering (WP-4): while a question is on screen and answerMode is
  // 'voice', listen and route the recognised note/fret through the same
  // selectAnswer/selectFret the tap handlers use.
  // Held in a ref because the callback below is defined inside the same
  // useVoiceAnswer() call that produces `voice.learn`.
  const voiceLearnRef = useRef<(label: string) => void>(() => {});
  const voice = useVoiceAnswer({
    enabled: answerMode === 'voice',
    running,
    paused,
    answered,
    byNote: eff.byNote,
    questionSeq,
    hasActiveQuestion: eff.byNote ? currentNote !== null : currentFret !== null,
    notation: notation as SpeechNotation,
    engineEpoch: voiceEngineEpoch,
    // A correct spoken answer is fed back to the engine so the "general"
    // recogniser can learn the user's own voice over time.
    onNote: (n) => { if (selectAnswer(n)) voiceLearnRef.current(n); },
    onFret: selectFret,
  });
  useEffect(() => { voiceLearnRef.current = voice.learn; }, [voice.learn]);
  // Fall back to tap input if voice is selected but no recogniser exists.
  const voiceActive = answerMode === 'voice' && voice.supported;

  // Latest-value mirror so the Auto Advance effect below can depend ONLY on
  // `pendingAutoAdvance`. `engineStart` (and the objects it closes over) get a
  // fresh identity on every render, so listing it as a dep would re-run the
  // effect mid-hold and restart the timer forever.
  const autoAdvanceLatestRef = useRef({ engineStart, derivedSettings });
  autoAdvanceLatestRef.current = { engineStart, derivedSettings };

  // On an Auto Advance boundary: show the "STAGE COMPLETE / <NAME>" banner,
  // hold briefly, then start the next stage exactly the way it started before —
  // same engineStart, same per-question countdown, no 3-2-1. No scoring/streak/
  // multiplier/timing state is touched here; this only delays *when* the first
  // question of the new stage is asked (~1s, or ~0.55s under reduced-motion).
  // `pendingAutoAdvance` stays true for the whole hold so the "round complete"
  // screen stays suppressed and the game screen stays mounted (see gameActive).
  useLayoutEffect(() => {
    if (!pendingAutoAdvance) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const { derivedSettings: ds } = autoAdvanceLatestRef.current;
    setStageTransition({
      name: autoAdvanceLabelRef.current,
      from: autoAdvanceFromRef.current,
      to: ds.maxQuestions,
    });
    const id = window.setTimeout(() => {
      const l = autoAdvanceLatestRef.current;
      setStageTransition(null);
      setPendingAutoAdvance(false);
      l.engineStart(l.derivedSettings.maxQuestions, l.derivedSettings.time, l.derivedSettings.byNote);
    }, reduced ? 550 : 1000);
    return () => window.clearTimeout(id);
  }, [pendingAutoAdvance]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!paused) setGuitarString(eff.guitarString); }, [eff.guitarString, paused]);

  const questionDisplayRef = useQuestionChangeAnimation(questionSeq);

  // Settings changed while actively playing invalidate the session, so stop it.
  // While paused, just remember the new settings — they're picked up on resume
  // (for the next question) without losing the current score/streak/progress.
  const derivedRef = useRef(derivedSettings);
  useEffect(() => {
    if (derivedRef.current !== derivedSettings && running && !paused) { stop(); }
    derivedRef.current = derivedSettings;
  }, [derivedSettings, running, paused, stop]);

  useAutoPauseOnBackground(pause, running);

  const [preloaded, setPreloaded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => loadSetting<boolean>('onboardingDone', false));
  // One-time nudge for guests to sign in, shown right after onboarding. "Maybe
  // later" sets this device-local flag so it never nags again; the account is
  // still reachable any time from Settings → Account.
  const [signInPromptSeen, setSignInPromptSeen] = useState(
    () => loadSetting<boolean>('pref_signInPromptSeen', false),
  );
  const dismissSignInPrompt = () => {
    setSignInPromptSeen(true);
    saveSetting('pref_signInPromptSeen', true);
  };
  // Which screen is open (Stats, the settings drawer, a settings sub-page) is
  // stashed in sessionStorage so a page reload — the ↻ button, or the browser's
  // own refresh — lands back where you were instead of on the home screen.
  // sessionStorage (not localStorage) so a fresh launch still starts at home.
  const initialView = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('gfp_view');
      return raw ? (JSON.parse(raw) as {
        stats?: boolean; settingsOpen?: boolean; section?: string | null;
        upgradeFromAccount?: boolean; path?: boolean;
      }) : null;
    } catch {
      return null;
    }
  }, []);
  // The unified "Stats & progress" screen (current-setup stats + all-time progress tabs).
  const [showStats, setShowStats] = useState(() => initialView?.stats ?? false);
  // The Premium Learning Path screen (P3) — a full page shown alongside the
  // Selector, opened from the Today card. Persisted to `gfp_view` like the
  // other full-screen views so a reload lands back on it.
  const [showPath, setShowPath] = useState(() => initialView?.path ?? false);
  const [settingsOpen, setSettingsOpen] = useState(() => initialView?.settingsOpen ?? false);
  // Which learning-type tab is showing (drawer "Learn" group). Not persisted —
  // every launch / reload starts on 'notes' (the Selector). See LEARN_TABS.
  const [activeDomain, setActiveDomain] = useState<LearnDomain>('notes');
  // Which settings sub-page is open inside the drawer; null = the list of titles.
  const [drawerSection, setDrawerSection] = useState<string | null>(() => initialView?.section ?? null);
  // F.1 Game wiring spike: a single flag that swaps the whole screen for the
  // self-contained <GameFlow>. Not persisted to gfp_view yet — the spike
  // always re-enters from the home button.
  const [gameOpen, setGameOpen] = useState(false);
  // Populated by <GameFlow> with its "step one level back" action, so the
  // Android hardware Back button can walk the Game's own screens.
  const gameBackRef = useRef<(() => void) | null>(null);
  // The `upgrade` (Pro) sub-page is reachable both from the Account tab's plan
  // tile and from any locked <ProGate> in the app (via registerUpgradeHandler,
  // which may open it without Account ever being shown). Back should return to
  // Account only in the former case, so track which way we got there.
  const upgradeFromAccountRef = useRef(initialView?.upgradeFromAccount ?? false);
  // Friendly in-app microphone card shown *before* the browser's own bare
  // permission prompt: 'primer' explains why we need the mic, 'denied' is the
  // recovery card for when the browser has already refused (it won't re-ask).
  const [micPrompt, setMicPrompt] = useState<null | 'primer' | 'denied'>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  // True only while the first-time auto-popped hint is showing (a brand-new
  // player who has never seen it). It changes the dismiss rule to "any click
  // anywhere closes it"; existing users never enter this state and keep the
  // manual "?" open/close/position behavior untouched.
  const [infoAutoShown, setInfoAutoShown] = useState(false);
  const gameRowRef = useRef<HTMLDivElement>(null);
  const playBtnRef = useRef<HTMLButtonElement>(null);
  // Guards the Tier 3 (new personal best) celebration so it fires at most once
  // per completed run. Reset on every Play and whenever the selector combo changes.
  const tier3FiredRef = useRef(false);
  // Guards badge evaluation so it runs at most once per completed run, and holds
  // the ids newly earned this run for the game-end summary card.
  const badgesFiredRef = useRef(false);
  // Every badge newly earned this run (mid-game sweeps + the final one), keyed
  // by family. Feeds the game-end summary list and the reveal finale.
  const [newBadges, setNewBadges] = useState<CelebratedBadge[]>([]);
  const newBadgesRef = useRef<CelebratedBadge[]>([]);
  useEffect(() => { newBadgesRef.current = newBadges; }, [newBadges]);
  // Pending top-of-screen toasts (one shown at a time) and the badges handed to
  // the end-of-round reveal overlay.
  const [toastQueue, setToastQueue] = useState<CelebratedBadge[]>([]);
  const [revealBadges, setRevealBadges] = useState<CelebratedBadge[]>([]);
  // Last answered-question count a mid-game badge sweep ran at, so each answer
  // triggers at most one sweep. A per-run running id for celebrated badges.
  const midSweepCountRef = useRef(0);
  const badgeUidRef = useRef(0);

  const isPlaying = running && !paused;
  const isStopped = !running && !paused;
  // The game screen (question, grid/circle, selector-mini) stays visible and
  // frozen while paused, not just while actively running.
  // Also "active" during the brief Auto Advance banner: `running` is momentarily
  // false between stages, but the game screen must stay mounted (frozen on the
  // last question) so the transition never collapses the layout.
  const gameActive = running || paused || pendingAutoAdvance;
  // During the 3-2-1 count-in the engine hasn't started yet (`running` is still
  // false), but the fretboard/circle should already wear the stage's play
  // appearance — no all-time mastery overlay, dots shown — instead of flashing
  // the at-rest page look for the three seconds before the first question.
  const boardLive = gameActive || countdown !== null;


  // ── "Back" keeps you inside the app ─────────────────────────────────
  // Android's hardware Back / back-gesture (via @capacitor/app) and the
  // browser's Back button (via a History API sentinel entry) both run the same
  // ladder — close a popup, step back through Settings, leave Stats, back out
  // of the Game, stop a running round — instead of dropping straight out of
  // the app. Only on the bare home screen with nothing left to undo does a
  // second Back within 2s actually leave.
  const [exitHint, setExitHint] = useState(false);
  const signInPromptOpen = auth.configured && !auth.loading && !auth.user
    && onboardingDone && !signInPromptSeen && !gameActive;
  // Everything the Back handler reads, refreshed after each render so the
  // listeners (bound once) always see current values without re-subscribing.
  const backNav = useRef({
    micPrompt, showInfo, revealBadges, signInPromptOpen, settingsOpen, drawerSection,
    showStats, showPath, activeDomain, gameOpen, running, paused, stop,
  });
  useEffect(() => {
    backNav.current = {
      micPrompt, showInfo, revealBadges, signInPromptOpen, settingsOpen, drawerSection,
      showStats, showPath, activeDomain, gameOpen, running, paused, stop,
    };
  });
  useEffect(() => {
    // Step the app back one level. Returns true when it consumed a level,
    // false when already on the bare home screen.
    const consumeBack = (): boolean => {
      const s = backNav.current;
      if (s.micPrompt) { setMicPrompt(null); return true; }
      if (s.showInfo) { setShowInfo(false); return true; }
      if (s.revealBadges.length > 0) { setRevealBadges([]); return true; }
      if (s.signInPromptOpen) { dismissSignInPrompt(); return true; }
      // Settings drawer and its sub-pages (mirrors the Escape ladder above).
      if (s.settingsOpen) {
        if (s.drawerSection !== null) {
          const toAccount = s.drawerSection === 'badges'
            || (s.drawerSection === 'upgrade' && upgradeFromAccountRef.current);
          setDrawerSection(toAccount ? 'account' : null);
        } else {
          setSettingsOpen(false);
        }
        return true;
      }
      if (s.showStats) { setShowStats(false); return true; }
      if (s.showPath) { setShowPath(false); return true; }
      // Learning-type tabs step back to the "Learn" drawer hub they were
      // launched from, not all the way out to the Selector / home screen.
      if (s.activeDomain !== 'notes') {
        setActiveDomain('notes');
        setSettingsOpen(true);
        setDrawerSection('learn');
        return true;
      }
      if (s.gameOpen) { gameBackRef.current?.(); return true; }
      if (s.running || s.paused) { s.stop(); return true; }
      return false;
    };

    let armed = false;
    let armedTimer: number | null = null;
    const disarm = () => {
      armed = false;
      if (armedTimer !== null) { clearTimeout(armedTimer); armedTimer = null; }
      setExitHint(false);
    };
    const armExitHint = () => {
      armed = true;
      setExitHint(true);
      armedTimer = window.setTimeout(disarm, 2000);
    };

    // Android hardware Back (native shell only fires this).
    let removeNative: (() => void) | undefined;
    CapacitorApp.addListener('backButton', () => {
      if (consumeBack()) return;
      if (armed) { disarm(); void CapacitorApp.exitApp(); return; }
      armExitHint();
    }).then((h) => { removeNative = () => h.remove(); });

    // Browser Back button / gesture. A sentinel history entry sits "ahead" of
    // the app so Back fires popstate here instead of unloading the page; we
    // re-push it after every handled press. Skipped in the native shell, where
    // the plugin above owns Back.
    const isNative = Capacitor.isNativePlatform();
    const pushSentinel = () => {
      try { window.history.pushState({ gfpBackTrap: true }, ''); } catch { /* history unavailable */ }
    };
    const onPopState = () => {
      if (consumeBack()) { pushSentinel(); return; }
      if (armed) {
        disarm();
        window.removeEventListener('popstate', onPopState);
        window.history.back(); // leave the app (or close the installed PWA)
        return;
      }
      pushSentinel();
      armExitHint();
    };
    if (!isNative) {
      // Guard against a second sentinel from StrictMode / HMR remounts.
      if (!(window.history.state as { gfpBackTrap?: boolean } | null)?.gfpBackTrap) {
        pushSentinel();
      }
      window.addEventListener('popstate', onPopState);
    }

    return () => {
      removeNative?.();
      if (armedTimer !== null) clearTimeout(armedTimer);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // Route every microphone request through our own card instead of springing
  // the browser's permission bar unannounced. Already-granted → straight
  // through; a prior refusal → the recovery card; otherwise → the primer.
  const askForMic = () => {
    if (!voice.supported) return;
    if (voice.permission === 'granted') { void voice.ensurePermission(); return; }
    setMicPrompt(voice.permission === 'denied' ? 'denied' : 'primer');
  };
  const grantMic = async () => {
    const ok = await voice.ensurePermission();
    setMicPrompt(ok ? null : 'denied');
  };

  // "?" affordance pinned to the active mode card: opens the setup-summary
  // bubble and keeps it open until the user taps the "?" again or clicks
  // anywhere else on the page (no auto-dismiss timer).
  // Any interaction with the "?" itself drops the first-time auto-shown state,
  // so from then on the bubble behaves the normal (manual) way for this user.
  const openInfo = () => { setInfoAutoShown(false); setShowInfo(v => !v); };
  useEffect(() => {
    if (!showInfo) return;
    const onPointerDown = (e: PointerEvent) => {
      // First-time auto-popped hint: a click anywhere collapses it back.
      if (infoAutoShown) { setInfoAutoShown(false); setShowInfo(false); return; }
      if (!(e.target as Element | null)?.closest('.mode-card-info')) setShowInfo(false);
    };
    // Defer so the click that opened the bubble doesn't immediately close it.
    const id = window.setTimeout(
      () => document.addEventListener('pointerdown', onPointerDown), 0,
    );
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [showInfo, infoAutoShown]);

  const hasHistory = historyOps.getEntriesForKey(histKey).length > 0;
  const hasAnyHistory = hasHistory || Object.values(historyOps.allHistory).some(list => list.length > 0);

  const { adjustSuggestion, dismissSuggestion } = useAdjustSuggestion({
    autoAdvance: selector.state.autoAdvance,
    useFretRange: selector.state.useFretRange,
    difficulty: selector.state.difficulty,
    isPro: auth.isPro,
    histKey,
    getEntriesForKey: historyOps.getEntriesForKey,
  });

  // First-time hint: a brand-new player (no history at all, hint never seen)
  // gets the setup-summary bubble popped open automatically the first time they
  // reach the selector. It collapses on the first click anywhere and never
  // auto-opens again. Runs once on mount.
  const firstHintRef = useRef(false);
  useEffect(() => {
    if (firstHintRef.current) return;
    firstHintRef.current = true;
    if (loadSetting<boolean>('infoBubbleSeen', false)) return;
    saveSetting('infoBubbleSeen', true);
    if (hasAnyHistory) return;
    setShowInfo(true);
    setInfoAutoShown(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While actively playing the game stays clean and focused — the hamburger
  // (and the stats shortcut) are only offered when stopped or paused.
  // The burger icon is hidden while the drawer itself is open — the drawer's
  // own Back control takes over from there.
  const showBurger = !isPlaying && !pendingAutoAdvance && countdown === null && !settingsOpen;

  useEffect(() => {
    setShowStats(false); setGameEnded(false);
    tier3FiredRef.current = false;
    wasTeacherRunRef.current = false;
    wasIntervalRunRef.current = false;
    badgesFiredRef.current = false; setNewBadges([]);
    midSweepCountRef.current = 0;
    setToastQueue([]); setRevealBadges([]);
    setTeacherPlan(null);
    setIntervalPlan(null);
  }, [histKey]);

  // Mirror the open sub-page in a ref so the Escape handler (bound once per
  // open) reads the current value without re-subscribing on every navigation.
  const drawerSectionRef = useRef<string | null>(null);
  useEffect(() => { drawerSectionRef.current = drawerSection; }, [drawerSection]);

  // Persist the open screen so a reload restores it (see `initialView` above).
  // Clear the key when we're back on the home screen so the next fresh launch
  // starts clean even within the same tab session.
  useEffect(() => {
    try {
      if (!showStats && !settingsOpen && drawerSection === null && !showPath) {
        sessionStorage.removeItem('gfp_view');
      } else {
        sessionStorage.setItem('gfp_view', JSON.stringify({
          stats: showStats,
          settingsOpen,
          section: drawerSection,
          upgradeFromAccount: upgradeFromAccountRef.current,
          path: showPath,
        }));
      }
    } catch {
      /* sessionStorage unavailable (private mode / disabled) — non-fatal */
    }
  }, [showStats, settingsOpen, drawerSection, showPath]);

  // A locked <ProGate> anywhere in the tree opens the `upgrade` drawer section
  // through this handler (see utils/upgradeDrawer.ts). Leave any full-screen
  // view (Stats, an open sub-page) first so the section actually renders.
  useEffect(() => {
    registerUpgradeHandler(() => {
      setShowStats(false);
      setSettingsOpen(true);
      upgradeFromAccountRef.current = false;
      setDrawerSection('upgrade');
    });
    return () => registerUpgradeHandler(null);
  }, []);

  // Escape steps back one level, then closes the drawer. The Badges page is
  // only reachable from inside Account (via the pinned-badge picker), so it
  // steps back there rather than to the hamburger list of titles.
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const cur = drawerSectionRef.current;
      if (cur !== null) {
        const backToAccount = cur === 'badges' || (cur === 'upgrade' && upgradeFromAccountRef.current);
        setDrawerSection(backToAccount ? 'account' : null);
      } else setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);

  // Dismiss the microphone card with Escape too.
  useEffect(() => {
    if (!micPrompt) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMicPrompt(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [micPrompt]);

  // Close the Learning Path screen with Escape, back to the home screen.
  useEffect(() => {
    if (!showPath) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPath(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPath]);

  // Escape steps a learning-type tab (Daily practice / Intervals) back to the
  // Selector, matching the on-screen Back button and hardware Back.
  useEffect(() => {
    if (activeDomain === 'notes') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveDomain('notes'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeDomain]);

  // Guests can dismiss the sign-in nudge with Escape ("Maybe later").
  useEffect(() => {
    if (signInPromptSeen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismissSignInPrompt(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [signInPromptSeen]);

  // Multi-string mode: a short haptic pulse when the drilled string changes
  // between questions, reinforcing the visual string-change emphasis. Single-
  // string rounds never switch string, so this only ever fires in Multi.
  const activeStringRef = useRef(guitarString);
  useEffect(() => {
    if (gameActive && isMulti && activeStringRef.current !== guitarString) {
      haptic.stageChange();
    }
    activeStringRef.current = guitarString;
  }, [guitarString, gameActive, isMulti]);

  // Evaluate this run's session badges plus a retroactive pass over all-time
  // history, award every reached tier (idempotent), and return the families
  // that were genuinely new this call. Mid-game it drops the badges that a
  // later answer could still invalidate — a clean run or whole-round accuracy
  // is only final once the round is over.
  const sweepBadges = useCallback((midGame: boolean): CelebratedBadge[] => {
    const sessionSnap: SessionSnapshot = {
      questionsAnswered: scoring.session.questionsAnswered,
      maxQuestions: intervalPlanRef.current
        ? intervalPlanRef.current.questionCount
        : teacherPlanRef.current
          ? teacherPlanRef.current.drill.questionCount
          : selector.runQuestionCount(),
      longestStreak: scoring.session.longestStreak,
      entries: historyOps.history,
      instrument,
    };
    const lifetimeSnap: LifetimeSnapshot = {
      instrumentEntries: historyForInstrument(historyOps.allHistory, instrument.id),
      allEntries: flattenHistory(historyOps.allHistory),
      instrument,
    };
    const reached: Partial<Record<BadgeId, Tier>> = {
      ...evaluateSession(sessionSnap),
      ...evaluateLifetime(lifetimeSnap),
    };
    if (midGame) {
      delete reached.perfect_session;
      delete reached.flawless_sprint;
      delete reached.every_string;
    }
    const earned: CelebratedBadge[] = [];
    for (const [idStr, tier] of Object.entries(reached) as [BadgeId, Tier | undefined][]) {
      if (!tier) continue;
      const def = badgeDef(idStr, instrument);
      if (!def) continue;
      const prevTier = earnedTier(idStr, instrument.id);
      const newly = awardFamilyUpTo(idStr, instrument.id, tier, def.levels);
      if (newly.length > 0) {
        earned.push({
          uid: ++badgeUidRef.current,
          id: idStr,
          tier: newly[newly.length - 1],
          upgrade: prevTier !== null,
        });
      }
    }
    return earned;
  }, [
    scoring.session.questionsAnswered, scoring.session.longestStreak,
    selector, historyOps.history, historyOps.allHistory, instrument,
  ]);

  // Mid-game achievement check: after every answered question, sweep for newly
  // earned badges and slide a toast in from the top for each. The full list is
  // also accumulated so the end-of-round reveal shows everything won this run.
  useEffect(() => {
    if (!running || paused) return;
    const n = scoring.session.questionsAnswered;
    if (n === 0 || n === midSweepCountRef.current) return;
    midSweepCountRef.current = n;
    const earned = sweepBadges(true);
    if (earned.length === 0) return;
    setNewBadges(prev => mergeCelebrated(prev, earned));
    if (showScore) setToastQueue(q => [...q, ...earned]);
  }, [running, paused, scoring.session.questionsAnswered, showScore, sweepBadges]);

  // Detect game end (skipped when Auto Advance is about to continue straight
  // into the next stage, so the "round complete" screen doesn't flash up for
  // a transition that isn't actually ending the session).
  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (wasRunningRef.current && !running && !paused && scoring.session.questionsAnswered > 0 && !pendingAutoAdvance) {
      setGameEnded(true);
      // A Teacher / interval session is a one-off: its per-answer feedback
      // already went into the learning model, so once the run ends drop the
      // plan and the app returns to the normal Selector view.
      setTeacherPlan(null);
      setIntervalPlan(null);

      // Major achievement: a new personal-best score for this exact selector
      // combination — the same per-historyKey `best_<key>` record StatsPanel
      // maintains. Persist it here and fire the Tier 3 celebration once per run
      // (tier3FiredRef also blocks a repeat if this effect re-runs).
      //
      // A Teacher session runs on the plan's own fret window / string / count,
      // not the Selector combo `histKey` still points at, so its score is not
      // comparable to that combo's best — recording it (or flashing "NEW BEST!"
      // for it) would be misleading. Its answers are still in the shared
      // history; only this Selector-combo record is skipped.
      const score = scoring.session.score;
      const prevBest = loadBest(histKey);
      let pbCardShown = false;
      if (!wasTeacherRunRef.current && !tier3FiredRef.current && score > 0 && score > (prevBest?.score ?? 0)) {
        tier3FiredRef.current = true;
        // Accuracy for the personal-best record comes from the drill session's
        // SessionResult (correct / recorded-answers, rounded) rather than a
        // second inline pass over the same history.
        saveBest(histKey, { score, streak: scoring.session.longestStreak, accuracy: sessionResult.accuracy });
        // Personal-best progress is always recorded; the celebration itself is
        // a score effect, so it is skipped in "serious learning" mode.
        if (showScore) pbCardShown = true;
      }

      // Achievements: a final sweep (session badges that only settle at the end
      // + a retroactive lifetime pass), once per completed run (badgesFiredRef,
      // like tier3FiredRef, blocks a repeat if the effect re-runs). Awarding is
      // never gated on `showScore` — badges accrue in Silent / Score-off mode;
      // only the toast and the reveal below are score effects.
      let revealList: CelebratedBadge[] = [];
      // An interval session's answers are not in the note history at all
      // (isolated sink), so it earns no note badges — skip the sweep entirely.
      if (!badgesFiredRef.current && !wasIntervalRunRef.current) {
        badgesFiredRef.current = true;
        const merged = mergeCelebrated(newBadgesRef.current, sweepBadges(false));
        if (merged.length > 0) {
          setNewBadges(merged);
          if (showScore) {
            setToastQueue([]); // the reveal supersedes any still-queued mid-game toasts
            revealList = merged;
          }
        }
      }

      // The personal-best card is a blocking modal the user must dismiss; only
      // then does the badge reveal fly in, so it never lands hidden behind it.
      // With no PB card, a short beat lets the score register first.
      if (pbCardShown) {
        celebrateTier3(
          score, scoring.session.longestStreak,
          revealList.length > 0 ? () => setRevealBadges(revealList) : undefined,
        );
      } else if (revealList.length > 0) {
        window.setTimeout(() => setRevealBadges(revealList), 900);
      }
    }
    wasRunningRef.current = running;
  }, [running, paused, pendingAutoAdvance, scoring.session.questionsAnswered, scoring.session.score, scoring.session.longestStreak, sessionResult, histKey, historyOps.allHistory, instrument, selector.state.difficulty, selector.state.autoAdvance, showScore, sweepBadges]);

  // Push the signed-in player's leaderboard row after each completed run, so
  // the public board tracks their all-time XP without them opening it. Guests
  // and opted-out players are skipped; failures are ignored (the board also
  // refreshes its own row whenever the panel is opened).
  useEffect(() => {
    if (!gameEnded || !auth.user || leaderboardOptOut) return;
    // An interval session contributed nothing to `allHistoryEntries` — don't
    // fire a redundant leaderboard upsert for it.
    if (wasIntervalRunRef.current) return;
    const name = leaderboardName(
      auth.profile?.name ?? null,
      auth.profile?.email ?? auth.user.email ?? null,
    );
    void upsertMyEntry(
      auth.user.id,
      instrument.id,
      name,
      computeMyStats(allHistoryEntries),
    );
  }, [gameEnded, auth.user, auth.profile, leaderboardOptOut, instrument.id, allHistoryEntries]);

  const start = () => {
    unlockAudio();
    // Trigger the mic permission prompt from this user gesture, like unlockAudio.
    if (answerMode === 'voice' && voice.supported) askForMic();
    if (!preloaded) { preloadAllSamples().then(() => setPreloaded(true)); setPreloaded(true); }
    scoring.reset();
    // One continuous timing ramp for the whole run: from this difficulty's
    // base down to the 3s floor across every question the run will ask
    // (all Auto Advance stages, or just this one).
    scoring.beginRun(
      eff.time,
      (teacherPlan || intervalPlan) ? eff.maxQuestions : selector.runQuestionCount(),
    );
    setGameEnded(false);
    tier3FiredRef.current = false;
    // Remember whether this run is a Teacher / interval session — the game-end
    // effect uses these to skip the Selector personal-best / badge / leaderboard
    // flow (see there).
    wasTeacherRunRef.current = teacherPlan !== null || intervalPlan !== null;
    wasIntervalRunRef.current = intervalPlan !== null;
    badgesFiredRef.current = false;
    setNewBadges([]);
    midSweepCountRef.current = 0;
    setToastQueue([]); setRevealBadges([]);
    // Count-in: the on-screen countdown steps 3 → 2 → 1 once a second and the
    // game comes in on "0" at t = 3s. The four drum-stick clicks run on their
    // own steady, faster cadence — one every 750ms (t = 0, 0.75, 1.5, 2.25s),
    // "1-2-3-4" — so the game arrives exactly one beat after the last click.
    setCountdown(3);
    playStickClick();
    [750, 1500, 2250].forEach((t) => window.setTimeout(playStickClick, t));
    let c = 3;
    const interval = setInterval(() => {
      c--;
      if (c > 0) {
        setCountdown(c);
      } else {
        clearInterval(interval);
        setCountdown(null);
        engineStart(eff.maxQuestions, eff.time, eff.byNote);
        setTimeout(() => gameRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    }, 1000);
  };

  // Fresh-closure handle on `start` so the Teacher-launch effect below always
  // calls the version that has already seen the new `eff` (post-setTeacherPlan
  // render), not a stale one.
  const startRef = useRef(start);
  startRef.current = start;
  // The Today card just calls `setTeacherPlan(plan)`. Once the plan is set (and
  // `eff` / `drillConfig` have re-derived from it) kick off the run exactly
  // like a manual Play — same 3-2-1, same engine, same scoring.
  useEffect(() => {
    if ((teacherPlan || intervalPlan) && !running && !paused && countdown === null && !gameEnded) {
      startRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherPlan, intervalPlan]);

  // Multiplier display tracks the streak-tier multiplier from useScoring
  // (1×, 1.25×, 1.5×, 2×, 2.5×, 3×, 4× at streaks 0, 3, 5, 7, 10, 15, 20).
  const currentMultiplier = scoring.session.multiplier;
  const multiplierFireCount = currentMultiplier >= 4 ? 5
    : currentMultiplier >= 3 ? 4
    : currentMultiplier >= 2.5 ? 3
    : currentMultiplier >= 2 ? 2
    : currentMultiplier > 1 ? 1
    : 0;
  const multiplierIcon = multiplierFireCount > 0
    ? `${'🔥'.repeat(multiplierFireCount)} ×${currentMultiplier}`
    : '';

  // One definition of the settings panel, rendered in three ways: the full
  // editable panel inline on the page, the compact read-only HUD during play
  // (panelPlaying = true), and — inside the hamburger overlay — just the
  // note-name notation toggle (notationOnly = true).
  const renderSelectorPanel = (panelPlaying: boolean, notationOnly = false) => (
    <SelectorPanel
      selector={selector.state}
      instrument={instrument}
      onStringSelect={selector.onStringSelect}
      onMultiToggle={selector.onMultiToggle}
      onModeSelect={selector.onModeSelect}
      onFretRangeToggle={selector.onFretRangeToggle}
      isPro={auth.isPro}
      onDifficultySelect={selector.onDifficultySelect}
      onAutoAdvanceToggle={() => {
        if (selector.state.autoAdvance) playToggleOffSound(); else playToggleOnSound();
        haptic.tap();
        selector.onAutoAdvanceToggle();
        // Pull focus/hover off the toggle onto Play so a touch device repaints
        // it to its new on/off colour immediately instead of holding the
        // pressed look until the next tap.
        playBtnRef.current?.focus();
      }}
      isPlaying={panelPlaying}
      notationOnly={notationOnly}
      activeString={gameActive ? safeGuitarString : undefined}
      activeFret={
        gameActive
          ? intervalPrompt
            ? intervalPrompt.exercise === 'findTargetPosition'
              ? intervalPrompt.refFret
              : undefined
            : askedFret
          : undefined
      }
      byString={byString}
      order={order}
      onByStringToggle={() => { if (byString) playToggleOffSound(); else playToggleOnSound(); haptic.tap(); const next = !byString; setByString(next); saveSetting('pref_byString', next); }}
      onOrderChange={(o) => { playClickSound(); haptic.tap(); setOrder(o); saveSetting('pref_order', o); }}
      accidental={accidental}
      notation={notation}
      onNotationChange={(n) => { playClickSound(); haptic.tap(); setNotation(n); saveSetting('pref_notation', n); }}
      onInfo={() => { playClickSound(); haptic.tap(); openInfo(); }}
      showInfo={showInfo}
    />
  );

  // The hamburger drawer is a list of section titles; tapping one opens a
  // sub-page with a short blurb plus just that section's controls.
  // `onSelect`, when set, fires on tap instead of opening the section's sub-page —
  // used by "Stats & progress" to jump straight to its full screen like a page.
  const settingsSections: SettingsSection[] = [
    {
      id: 'learn',
      title: t('Learn'),
      icon: menuIconLearn,
      blurb: t('Choose what to practise.'),
      body: (
        <LearnHub
          activeDomain={activeDomain}
          canDaily={can('premiumTeacher', auth.tier)}
          canIntervals={can('intervalDrill', auth.tier)}
          showGame={import.meta.env.DEV || auth.admin}
          onPick={(d) => {
            setActiveDomain(d);
            setShowStats(false);
            setShowPath(false);
            setSettingsOpen(false);
            setDrawerSection(null);
          }}
          onLocked={() => {
            upgradeFromAccountRef.current = false;
            setDrawerSection('upgrade');
          }}
          onOpenGame={() => {
            setShowStats(false);
            setShowPath(false);
            setSettingsOpen(false);
            setDrawerSection(null);
            setGameOpen(true);
          }}
        />
      ),
    },
    {
      id: 'instrument',
      title: t('Playing'),
      icon: menuIconPlaying,
      blurb: '',
      body: (
        <PlayingSection
          t={t}
          instrument={instrument}
          instrumentId={instrumentId}
          admin={auth.admin}
          running={running}
          paused={paused}
          stop={stop}
          applyInstrument={applyInstrument}
          setPreloaded={setPreloaded}
          notation={notation}
          setNotation={setNotation}
          fretRange={{
            useFretRange: selector.state.useFretRange,
            fretLo: selector.state.fretLo,
            fretHi: selector.state.fretHi,
            onPreciseToggle: selector.onFretRangePreciseToggle,
            onWindow: selector.onFretRangeWindow,
          }}
        />
      ),
    },
    {
      // The general "Settings" drawer section: score display, app language and
      // the fretboard-mastery overlay toggle (which used to sit at the top of
      // the Stats & progress screen) all live together here now.
      id: 'settings',
      title: t('Settings'),
      icon: menuIconSettings,
      blurb: '',
      body: (
        <GeneralSettingsSection
          t={t}
          lang={lang}
          setLang={setLang}
          showScore={showScore}
          setShowScore={setShowScore}
          silentMode={silentMode}
          setSilentMode={setSilentMode}
          theme={theme}
          setTheme={setTheme}
          voiceSupported={voice.supported}
          answerMode={answerMode}
          setAnswerMode={setAnswerMode}
          askForMic={askForMic}
          voiceEnginePref={voiceEnginePref}
          pickVoiceEngine={pickVoiceEngine}
          voiceProfileStat={voiceProfileStat}
          setSettingsOpen={setSettingsOpen}
          setShowVoiceCalibration={setShowVoiceCalibration}
          showMastery={showMastery}
          setShowMastery={setShowMastery}
          masteryWindow={masteryWindow}
          setMasteryWindow={setMasteryWindow}
        />
      ),
    },
    {
      // Jumps straight to its full screen.
      id: 'stats',
      title: t('Stats & progress'),
      icon: menuIconStats,
      blurb: '',
      body: null,
      onSelect: () => { setShowStats(true); },
    },
    ...(auth.configured ? [{
      id: 'board',
      title: t('Feedback board'),
      icon: menuIconFeedback,
      blurb: '',
      body: (
        <FeedbackBoard
          user={auth.user}
          profile={auth.profile}
          suppressAdmin={auth.viewingAsUser}
          onSignIn={() => { void auth.signInWithGoogle(); }}
        />
      ),
    }] : []),
    ...(auth.configured ? [{
      id: 'leaderboard',
      title: t('Leaderboard'),
      icon: menuIconLeaderboard,
      blurb: '',
      body: (
        <LeaderboardPanel
          activeInstrumentId={instrument.id}
          allHistory={historyOps.allHistory}
          user={auth.user}
          profile={auth.profile}
          optedOut={leaderboardOptOut}
          onOptOutChange={(next) => {
            setLeaderboardOptOut(next);
            saveSetting('pref_leaderboardOptOut', next);
          }}
          onSignIn={() => { void auth.signInWithGoogle(); }}
        />
      ),
    }] : []),
    ...(auth.configured ? [{
      id: 'account',
      title: t('Account'),
      icon: menuIconAccount,
      blurb: '',
      body: (
        <AccountSection
          t={t}
          lang={lang}
          auth={auth}
          setDrawerSection={setDrawerSection}
          upgradeFromAccountRef={upgradeFromAccountRef}
        />
      ),
    }] : []),
    ...(auth.configured ? [{
      id: 'upgrade',
      title: `⭐ ${t('Pro')}`,
      blurb: '',
      // The admin Pro toggle used to live here; it now sits in the Account tab
      // (design note: admin controls are grouped under Account, not on the
      // customer-facing subscription screen).
      body: <UpgradeCard />,
    }] : []),
    {
      id: 'badges',
      title: `🏅 ${t('Badges')}`,
      blurb: '',
      body: (
        <BadgeGrid
          instrument={instrument}
          instrumentEntries={allHistoryEntries}
          allEntries={everyInstrumentHistory}
          isAdmin={auth.admin}
          onCelebrate={setRevealBadges}
        />
      ),
    },
  ];

  // F.1 spike: the Game is a full-screen takeover, mounted as its own
  // self-contained component so App gains no Game state beyond `gameOpen`.
  if (gameOpen) {
    return <GameFlow onExit={() => setGameOpen(false)} backRef={gameBackRef} />;
  }

  // The unified "Stats & progress" screen replaces the game entirely — its own
  // page, not an overlay pinned on top of the (blurred) game screen.
  if (showStats) {
    return (
      <div className="app settings-page stats-page">
        <ProgressPanel
          headerIcon={menuIconStats}
          allHistory={historyOps.allHistory}
          noteNames={cofList}
          accidental={accidental}
          notation={notation}
          instrument={instrument}
          currentHistory={historyOps.getEntriesForKey(histKey)}
          sessionScore={scoring.session.score}
          longestStreak={scoring.session.longestStreak}
          currentHistoryKey={histKey}
          setupStrings={selector.state.selectedStrings}
          setupFretFrom={derivedSettings.fretFrom}
          setupFretTo={derivedSettings.fretTo}
          onClearCurrent={() => { historyOps.clearHistory(histKey); }}
          onClearAll={() => { historyOps.clearAllHistory(); }}
          onClose={() => setShowStats(false)}
          isPro={auth.isPro}
          intervalBoard={learning.intervalBoard}
          intervalStats={learning.intervalStats}
        />
      </div>
    );
  }

  // The Premium Learning Path (P3): a full page shown alongside the Selector,
  // never in place of it. Gated on `learningPath` (premium) — a tier drop
  // while it is open falls straight through to the home screen. It is not
  // shown while a round is running.
  if (showPath && can('learningPath', auth.tier) && !gameActive && countdown === null) {
    return (
      <LearningPathScreen
        pathView={learning.pathView ?? { checkpoints: [], currentIndex: 0 }}
        todayPlan={learning.todayPlan}
        busy={gameActive || countdown !== null}
        onStart={(plan) => { setShowPath(false); setTeacherPlan(plan); }}
        onClose={() => setShowPath(false)}
      />
    );
  }

  // Learning-type tabs (drawer "Learn" group). Full pages like Stats / the
  // Learning Path. Their Back button drops the domain and re-opens the "Learn"
  // drawer hub the user launched from, rather than falling out to the Selector
  // / home screen. They bail while a round is running, during the count-in, or
  // while the end-of-round summary is up, so the game and its summary render
  // from the main return as usual; the user then lands back on the tab they
  // launched from. A tier drop falls straight through to the home screen.
  const backToLearnHub = () => {
    setActiveDomain('notes');
    setSettingsOpen(true);
    setDrawerSection('learn');
  };
  if (activeDomain === 'daily' && can('premiumTeacher', auth.tier)
      && onboardingDone && !gameActive && !gameEnded && countdown === null) {
    return (
      <DailyPracticeScreen
        todayPlan={learning.todayPlan}
        weakSpotsPlan={learning.weakSpotsPlan}
        dailyGoal={learning.dailyGoal}
        goalComplete={learning.goalComplete}
        accidental={accidental}
        notation={notation}
        instrument={instrument}
        canIntervals={can('intervalDrill', auth.tier)}
        intervalTodayPlan={learning.intervalTodayPlan}
        intervalWeakSpotsPlan={learning.intervalWeakSpotsPlan}
        intervalDailyGoal={learning.intervalDailyGoal}
        intervalGoalComplete={learning.intervalGoalComplete}
        busy={gameActive || countdown !== null}
        onStart={(plan) => setTeacherPlan(plan)}
        onStartIntervalPlan={(exercise, kind) => {
          const plan = kind === 'weak'
            ? learning.buildIntervalWeakSpotsPlan(exercise)
            : learning.buildIntervalTodayPlan(exercise);
          if (plan) setIntervalPlan(plan.drill);
        }}
        onOpenPath={can('learningPath', auth.tier)
          ? () => { setShowStats(false); setSettingsOpen(false); setShowPath(true); }
          : undefined}
        onClose={backToLearnHub}
      />
    );
  }
  if (activeDomain === 'intervals' && can('intervalDrill', auth.tier)
      && onboardingDone && !gameActive && !gameEnded && countdown === null) {
    return (
      <IntervalPracticeScreen
        instrument={instrument}
        intervalBoard={learning.intervalBoard}
        accidental={accidental}
        order={order}
        trackedCount={learning.intervalTrackedCount}
        busy={gameActive || countdown !== null}
        silentMode={silentMode}
        onStart={(config: DrillConfig) => setIntervalPlan(config)}
        onClose={backToLearnHub}
      />
    );
  }

  // The hamburger stays a side drawer that only lists the section titles.
  // Tapping a title opens that one section as its own full page (same
  // page-replacing treatment as "Stats & progress"), styled to match it.
  if (settingsOpen && drawerSection !== null) {
    const activeSection = settingsSections.find(s => s.id === drawerSection);
    if (activeSection && activeSection.body != null) {
      return (
        <SettingsSubPage
          section={activeSection}
          lang={lang}
          t={t}
          drawerSection={drawerSection}
          upgradeFromAccountRef={upgradeFromAccountRef}
          setDrawerSection={setDrawerSection}
          revealBadges={revealBadges}
          instrument={instrument}
          setRevealBadges={setRevealBadges}
        />
      );
    }
  }

  return (
    <div className="app">
      {!onboardingDone && (
        <Onboarding
          onInstrument={applyInstrument}
          onPlacement={selector.onDifficultySelect}
          onDone={() => { setOnboardingDone(true); saveSetting('onboardingDone', true); }}
        />
      )}

      {/* Pause: dim the entire app screen; .controls (Resume/Stop) sits
          above this via z-index so it stays sharp and clickable in place. */}
      {paused && <div className="pause-overlay" aria-hidden="true" />}

      {/* Shown when Back (hardware or browser) is pressed on the home screen —
          a second press within 2s leaves the app (see the Back handler above). */}
      {exitHint && <ExitHintToast t={t} />}

      {/* Settings hamburger + stats shortcut — hidden while actively playing so
          the game stays clean and focused. */}
      {showBurger && (
        <button
          className="burger-btn"
          onClick={click(() => { setDrawerSection(null); setSettingsOpen(o => !o); })}
          aria-label={settingsOpen ? t('Close settings') : t('Open settings')}
          aria-expanded={settingsOpen}
          title={t('Settings')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <rect x="3" y="5" width="18" height="2" rx="1" fill="currentColor" />
            <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" />
            <rect x="3" y="17" width="18" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
      )}

      <h1>{instrument.emoji} {t(instrument.label)} {t('Fret Practice')}</h1>

      {/* The Game layer's only entry point is the "Game" tile on the drawer's
          "Learn" page (<LearnHub>, dev/admin only) — no home-screen button. */}

      {/* The Premium Teacher's Today card and the interval-drill entry now
          live on their own learning-type tabs (drawer "Learn" group →
          DailyPracticeScreen / IntervalPracticeScreen), not stacked here on
          the home screen. This screen is the 'notes' tab: the Selector. */}

      {/* All playing settings live inline on the page; a compact read-only HUD
          replaces the panel during play. */}
      {renderSelectorPanel(gameActive)}

      {/* Adaptive difficulty nudge — only at rest, and only once the current
          combination has enough recent history to be sure (see wishlist §3). */}
      {isStopped && !gameEnded && onboardingDone && adjustSuggestion && (
        <AdjustSuggestionBanner
          direction={adjustSuggestion.direction}
          target={adjustSuggestion.target}
          onApply={() => {
            // Switching difficulty changes historyKey, so this combination's
            // banner disappears on its own — no dismissal to record. The button
            // itself plays the click + haptic (see AdjustSuggestionBanner).
            selector.onDifficultySelect(adjustSuggestion.target);
          }}
          onDismiss={() => dismissSuggestion(adjustSuggestion.direction)}
        />
      )}

      {/* Hamburger drawer: a side sheet listing the section titles only.
          Tapping one opens that section as its own full page (handled by the
          early return above). Backdrop click or Escape dismisses. */}
      {settingsOpen && drawerSection === null && (
        <SettingsDrawerNav
          sections={settingsSections}
          lang={lang}
          t={t}
          setSettingsOpen={setSettingsOpen}
          setDrawerSection={setDrawerSection}
        />
      )}

      {/* Microphone permission card — our own copy + styling, shown ahead of
          (primer) or in place of (denied) the browser's native prompt. */}
      {micPrompt && (
        <MicPermissionCard
          micPrompt={micPrompt}
          t={t}
          grantMic={grantMic}
          setMicPrompt={setMicPrompt}
          setAnswerMode={setAnswerMode}
        />
      )}

      {/* One-time sign-in nudge for guests, right after onboarding. Reuses the
          mic card's styling. "Maybe later" (or backdrop / Escape) dismisses it
          for good on this device; the account stays reachable from Settings. */}
      {auth.configured && !auth.loading && !auth.user && onboardingDone
        && !signInPromptSeen && !gameActive && (
        <SignInNudge
          t={t}
          onSignIn={() => { void auth.signInWithGoogle(); }}
          onDismiss={dismissSignInPrompt}
        />
      )}

      {/* Countdown overlay */}
      {countdown !== null && <CountdownOverlay countdown={countdown} />}

      <div className="game-row" ref={gameRowRef}>
        {stageTransition && <StageTransition stageTransition={stageTransition} t={t} />}
        <DrillBoard
          t={t}
          lang={lang}
          accidental={accidental}
          notation={notation}
          instrument={instrument}
          derived={derived}
          eff={eff}
          voice={voice}
          scoringSession={scoring.session}
          fretMastery={fretMastery}
          noteMastery={noteMastery}
          intervalPrompt={intervalPrompt}
          questionDisplayRef={questionDisplayRef}
          gameActive={gameActive}
          isStopped={isStopped}
          gameEnded={gameEnded}
          stageExiting={stageTransition != null}
          isPlaying={isPlaying}
          boardLive={boardLive}
          running={running}
          paused={paused}
          answered={answered}
          showScore={showScore}
          showMastery={showMastery}
          byString={byString}
          voiceActive={voiceActive}
          multiplierIcon={multiplierIcon}
          feedback={feedback}
          safeGuitarString={safeGuitarString}
          currentNote={currentNote}
          currentFret={currentFret}
          questionSeq={questionSeq}
          remaining={remaining}
          questionTime={questionTime}
          questionStart={questionStart}
          questionNumber={questionNumber}
          remainingFrets={remainingFrets}
          foundFrets={foundFrets}
          wrongFret={wrongFret}
          correctCofNote={correctCofNote}
          wrongCofNote={wrongCofNote}
          selectFret={selectFret}
          selectAnswer={selectAnswer}
          selectInterval={selectInterval}
          replayIntervalQuestion={replayIntervalQuestion}
        >
          {gameEnded && isStopped && (
            <GameEndSummary
              t={t}
              showScore={showScore}
              score={scoring.session.score}
              longestStreak={scoring.session.longestStreak}
              questionsCorrect={sessionResult.questionsCorrect}
              questionsAnswered={sessionResult.questionsAnswered}
              newBadges={newBadges}
              instrument={instrument}
              onOk={() => { setGameEnded(false); setNewBadges([]); setToastQueue([]); setRevealBadges([]); }}
            />
          )}
          <DrillControls
            running={running}
            paused={paused}
            countdown={countdown}
            t={t}
            playBtnRef={playBtnRef}
            start={start}
            pause={pause}
            resume={resume}
            stop={stop}
            onStopPlan={() => { setTeacherPlan(null); setIntervalPlan(null); }}
          />
        </DrillBoard>
      </div>

      {(auth.admin || import.meta.env.DEV) && (
        <DebugLogPanel
          {...(import.meta.env.DEV
            ? { simTier: auth.devSimulateTier, onSetSimTier: auth.setDevSimulateTier }
            : {})}
        />
      )}

      {showVoiceCalibration && auth.isPro && (
        <VoiceCalibration
          notation={notation}
          accidental={accidental}
          onClose={() => setShowVoiceCalibration(false)}
          onProfileChanged={() => setVoiceEngineEpoch((n) => n + 1)}
        />
      )}

      {pendingGuestMerge && auth.user && (
        <GuestMergePrompt
          localRowCount={flattenHistory(getAllHistory()).length}
          onMerge={() => void finishGuestMerge('merge')}
          onAccountOnly={() => void finishGuestMerge('account-only')}
        />
      )}

      <BadgeToast
        key={toastQueue[0]?.uid ?? 'idle'}
        badge={toastQueue[0] ?? null}
        instrument={instrument}
        onDone={() => setToastQueue(q => q.slice(1))}
      />
      {/* Normally set only at game end, but an admin Granting a badge by hand on
          the Badges wall fires the same reveal — so gate on the list alone. */}
      {revealBadges.length > 0 && (
        <BadgeRevealOverlay
          badges={revealBadges}
          instrument={instrument}
          onClose={() => setRevealBadges([])}
        />
      )}
    </div>
  );
}
