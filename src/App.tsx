import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import menuIconPlaying from './assets/menu-icons/playing.png';
import menuIconSettings from './assets/menu-icons/settings.png';
import menuIconStats from './assets/menu-icons/stats.png';
import menuIconFeedback from './assets/menu-icons/feedback.png';
import menuIconLeaderboard from './assets/menu-icons/leaderboard.png';
import menuIconAccount from './assets/menu-icons/account.png';
import NoteCircle from './components/NoteCircle';
import FretGrid from './components/FretGrid';
import SelectorPanel from './components/SelectorPanel';
import FretRangeControl from './components/FretRangeControl';
import FretRangeNeck from './components/FretRangeNeck';
import ProgressPanel from './components/ProgressPanel';
import { SettingCard, SegmentedControl, PickRow } from './components/SettingCard';
import Onboarding from './components/Onboarding';
import { Chevron } from './components/Chevron';
import SpeedBar from './components/SpeedBar';
import AnimatedScore from './components/AnimatedScore';
import { displayNote, setActiveInstrument } from './utils/music';
import type { HistoryEntry, AccidentalMode, OrderMode, NotationMode } from './utils/music';
import { getInstrument, COMING_SOON_INSTRUMENTS, type InstrumentId } from './utils/instruments';
import { preloadAllSamples, unlockAudio, setAudioInstrument, setSilent as setAudioSilent } from './utils/audio';
import { App as CapacitorApp } from '@capacitor/app';
import { playClickSound, playToggleOnSound, playToggleOffSound, playStickClick, haptic, celebrateTier3, setSilent as setFeedbackSilent } from './utils/feedback';
import { loadSetting, saveSetting } from './utils/settings';
import { THEME_BG, THEME_COLOR_SCHEME, type Theme } from './utils/theme';
import { loadBest, saveBest, loadAllBests, writeAllBests } from './utils/personalBest';
import { historyForInstrument, flattenHistory, fretMasteryMap, noteMasteryMap, applyMasteryWindow, DEFAULT_MASTERY_WINDOW, FREE_MASTERY_WINDOW, PRO_MASTERY_LASTN_CHOICES, type MasteryStat, type MasteryWindow } from './utils/mastery';
import { useAuth } from './hooks/useAuth';
import { bootstrapUser, reconcileUser, syncedUser, clearSyncedUser, cloudCaptureOrphans, restoreOnly } from './utils/sync';
import { bootstrapSettings, syncedSettingsUser, clearSyncedSettingsUser, cloudPushSettings } from './utils/settingsSync';
import { bootstrapBadges, syncedBadgesUser, clearSyncedBadgesUser, cloudPushBadges } from './utils/badgeSync';
import { useSelector } from './hooks/useSelector';
import { useDerivedNotes } from './hooks/useDerivedNotes';
import { useDrillSession } from './hooks/useDrillSession';
import { deriveDrillConfig } from './drill/DrillConfig';
import { useHistory } from './hooks/useHistory';
import { useScoring } from './hooks/useScoring';
import { useVoiceAnswer } from './hooks/useVoiceAnswer';
import VoiceLevelMeter from './components/VoiceLevelMeter';
import DebugLogPanel from './components/DebugLogPanel';
import VoiceCalibration from './components/VoiceCalibration';
import { FeedbackBoard } from './components/FeedbackBoard';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { computeMyStats, leaderboardName, upsertMyEntry } from './utils/leaderboard';
import { BadgeGrid } from './components/BadgeGrid';
import { PinnedBadges } from './components/PinnedBadges';
import { UpgradeCard } from './components/UpgradeCard';
import { ProGate } from './components/ProGate';
import { setOwnEntitlement } from './utils/entitlement';
import { GuestMergePrompt } from './components/GuestMergePrompt';
import { registerUpgradeHandler } from './utils/upgradeDrawer';
import { BadgeMedal, BadgeMedalDefs } from './components/BadgeMedal';
import { BadgeToast, BadgeRevealOverlay, type CelebratedBadge } from './components/BadgeCelebration';
import {
  badgeDef, evaluateSession, evaluateLifetime, awardFamilyUpTo, earnedTier, TIER_LABEL,
  type BadgeId, type SessionSnapshot, type LifetimeSnapshot, type Tier,
} from './utils/badges';
import { vlog, verror } from './utils/debugLog';
import type { SpeechNotation } from './utils/speechVocab';
import { resetSpeechEngine, type VoiceEnginePref } from './utils/speech';
import {
  getActiveProfile, setActiveProfile, isProfileReady, recomputeReady, templateCounts,
} from './utils/voiceProfile';
import { PROFILE_LABELS, SAMPLES_PER_LABEL, profileVocabId } from './utils/voiceProfileVocab';
import { bootstrapVoiceProfile, voiceSyncedUser, clearVoiceSyncedUser } from './utils/voiceSync';
import { useTranslation } from './i18n/useTranslation';
import { LANGUAGES } from './i18n/translations';

type AnswerMode = 'tap' | 'voice';

// Merge two lists of freshly-earned badges, keeping one entry per family — the
// later one wins, so a family that reached Bronze mid-round and Silver at the
// end is celebrated once, at Silver.
function mergeCelebrated(prev: CelebratedBadge[], next: CelebratedBadge[]): CelebratedBadge[] {
  const byFamily = new Map<string, CelebratedBadge>();
  for (const b of [...prev, ...next]) byFamily.set(b.id, b);
  return [...byFamily.values()];
}

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
  const [accidental] = useState<AccidentalMode>(() => loadSetting('pref_accidental', 'sharps'));
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

  useEffect(() => {
    setAudioSilent(silentMode);
    setFeedbackSilent(silentMode);
  }, [silentMode]);

  // Theme: 'dark' (default, original look) / 'night' (warm, dimmer) / 'day'
  // (light). Applied on <html> (not just inside .app) so modals/portals that
  // render outside the normal tree still pick up the right token block.
  const [theme, setThemeState] = useState<Theme>(() => loadSetting<Theme>('pref_theme', 'dark'));
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    saveSetting('pref_theme', t);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const colorScheme = document.querySelector('meta[name="color-scheme"]');
    if (colorScheme) colorScheme.setAttribute('content', THEME_COLOR_SCHEME[theme]);
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', THEME_BG[theme]);
  }, [theme]);

  const historyOps = useHistory();
  const histKey = selector.historyKey();
  const { addEntry: addEntryRaw, markPlayed: markPlayedRaw } = historyOps;
  const addEntryWithKey = useCallback(
    (entry: HistoryEntry) => addEntryRaw(histKey, entry),
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
      })();
    };
    window.addEventListener('online', onOnline);
    return () => { cancelled = true; window.removeEventListener('online', onOnline); };
  }, [auth.user, replaceAllHistory, getAllHistory]);

  const derived = useDerivedNotes(
    safeGuitarString, derivedSettings.fretFrom, derivedSettings.fretTo,
    derivedSettings.wholeToneOnly, derivedSettings.dotsOnly,
    accidental, order, byString, derivedSettings.multiStrings, instrumentId,
  );
  const { cofList, startIndex, activeNotes, questionActiveNotes, fretDots, noteFrets, isMulti } = derived;
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
  const drillConfig = useMemo(
    () => deriveDrillConfig(derivedSettings, {
      primaryString: safeGuitarString, accidental, order,
    }),
    [derivedSettings, safeGuitarString, accidental, order],
  );
  const session = useDrillSession(drillConfig, {
    setActiveString: setGuitarString,
    history: {
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
    questionTime, questionStart, questionSeq, questionNumber,
    start: engineStart, stop, pause, resume, selectFret, selectAnswer,
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
    byNote: derivedSettings.byNote,
    questionSeq,
    hasActiveQuestion: derivedSettings.byNote ? currentNote !== null : currentFret !== null,
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
  useEffect(() => { if (!paused) setGuitarString(derivedSettings.guitarString); }, [derivedSettings.guitarString, paused]);

  // Subtle in-place transition when the question changes. Animates the single
  // existing .note-display / .fret-display node via the Web Animations API — no
  // React remount, so there is never more than one element and the layout box
  // never grows or shifts. Transform/opacity only; direction-agnostic (works in
  // LTR and RTL). questionSeq bumps once per question (incl. Auto Advance).
  const questionDisplayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (questionSeq === 0) return;
    const el = questionDisplayRef.current;
    if (!el || typeof el.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [
        { transform: 'translateY(4px) scale(0.96)', opacity: 0.35 },
        { transform: 'translateY(0) scale(1)', opacity: 1 },
      ],
      { duration: 130, easing: 'ease-out' },
    );
  }, [questionSeq]);

  // Settings changed while actively playing invalidate the session, so stop it.
  // While paused, just remember the new settings — they're picked up on resume
  // (for the next question) without losing the current score/streak/progress.
  const derivedRef = useRef(derivedSettings);
  useEffect(() => {
    if (derivedRef.current !== derivedSettings && running && !paused) { stop(); }
    derivedRef.current = derivedSettings;
  }, [derivedSettings, running, paused, stop]);

  // Freeze the game (pause, not stop) whenever the app is backgrounded, hidden,
  // or closed, so returning to it resumes exactly where it left off instead of
  // resetting. Only actually running sessions pause; already-idle/paused state
  // is left alone.
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  const runningRef2 = useRef(running);
  runningRef2.current = running;
  useEffect(() => {
    const pauseEverything = () => {
      vlog('[voice] pauseEverything', {
        running: runningRef2.current,
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      });
      if (runningRef2.current) pauseRef.current();
    };

    // `visibilitychange` → hidden is a noisy signal on desktop: some setups
    // (remote-desktop sessions, an undocked/focused DevTools window, brief
    // OS-level occlusion) flip the tab to "hidden" for a moment while the user
    // is still looking at it. That was freezing the game — and killing Voice
    // mode's microphone — mid-round. Genuinely backgrounding the app (switching
    // tab/app, minimising) keeps it hidden for far longer, so wait a short
    // beat and only pause if it is still hidden. Becoming visible again cancels.
    let hiddenTimer: number | null = null;
    const clearHiddenTimer = () => {
      if (hiddenTimer !== null) { clearTimeout(hiddenTimer); hiddenTimer = null; }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        clearHiddenTimer();
        hiddenTimer = window.setTimeout(() => {
          hiddenTimer = null;
          if (document.hidden) pauseEverything();
        }, 2000);
      } else {
        clearHiddenTimer();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    // `pagehide` means the page is actually being torn down — pause at once.
    const onPageHide = () => { clearHiddenTimer(); pauseEverything(); };
    document.addEventListener('pagehide', onPageHide);

    let removeAppStateListener: (() => void) | undefined;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) pauseEverything();
    }).then((handle) => { removeAppStateListener = () => handle.remove(); });
    CapacitorApp.addListener('pause', pauseEverything).then((handle) => {
      const prev = removeAppStateListener;
      removeAppStateListener = () => { prev?.(); handle.remove(); };
    });

    return () => {
      clearHiddenTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('pagehide', onPageHide);
      removeAppStateListener?.();
    };
  }, [pause]);

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
        stats?: boolean; settingsOpen?: boolean; section?: string | null; upgradeFromAccount?: boolean;
      }) : null;
    } catch {
      return null;
    }
  }, []);
  // The unified "Stats & progress" screen (current-setup stats + all-time progress tabs).
  const [showStats, setShowStats] = useState(() => initialView?.stats ?? false);
  const [settingsOpen, setSettingsOpen] = useState(() => initialView?.settingsOpen ?? false);
  // Which settings sub-page is open inside the drawer; null = the list of titles.
  const [drawerSection, setDrawerSection] = useState<string | null>(() => initialView?.section ?? null);
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

  const click = <T,>(fn: () => T) => () => { playClickSound(); haptic.tap(); return fn(); };

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
    badgesFiredRef.current = false; setNewBadges([]);
    midSweepCountRef.current = 0;
    setToastQueue([]); setRevealBadges([]);
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
      if (!showStats && !settingsOpen && drawerSection === null) {
        sessionStorage.removeItem('gfp_view');
      } else {
        sessionStorage.setItem('gfp_view', JSON.stringify({
          stats: showStats,
          settingsOpen,
          section: drawerSection,
          upgradeFromAccount: upgradeFromAccountRef.current,
        }));
      }
    } catch {
      /* sessionStorage unavailable (private mode / disabled) — non-fatal */
    }
  }, [showStats, settingsOpen, drawerSection]);

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
      maxQuestions: selector.runQuestionCount(),
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

      // Major achievement: a new personal-best score for this exact selector
      // combination — the same per-historyKey `best_<key>` record StatsPanel
      // maintains. Persist it here and fire the Tier 3 celebration once per run
      // (tier3FiredRef also blocks a repeat if this effect re-runs).
      const score = scoring.session.score;
      const prevBest = loadBest(histKey);
      let pbCardShown = false;
      if (!tier3FiredRef.current && score > 0 && score > (prevBest?.score ?? 0)) {
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
      if (!badgesFiredRef.current) {
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
      derivedSettings.time,
      selector.runQuestionCount(),
    );
    setGameEnded(false);
    tier3FiredRef.current = false;
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
        engineStart(derivedSettings.maxQuestions, derivedSettings.time, derivedSettings.byNote);
        setTimeout(() => gameRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    }, 1000);
  };

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
      activeFret={gameActive ? askedFret : undefined}
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
  const settingsSections: Array<{ id: string; title: string; icon?: string; blurb: string; body: ReactNode; onSelect?: () => void }> = [
    {
      id: 'instrument',
      title: t('Playing'),
      icon: menuIconPlaying,
      blurb: '',
      body: (
        <>
          <SettingCard
            label={t('Instruments')}
            help={t('Switches tuning, string count and fret range, then reloads the note samples.')}
          >
            <div className="pick-row" role="group" aria-label={t('Instruments')}>
              {([['guitar', '🎸', t('Guitar')], ['bass', '🎵', t('Bass')]] as const).map(([id, emoji, name]) => (
                <button
                  key={id}
                  type="button"
                  className={`pick-btn${instrumentId === id ? ' pick-btn-on' : ''}`}
                  aria-pressed={instrumentId === id}
                  onClick={click(() => {
                    if (id === instrumentId) return;
                    if (running || paused) stop();
                    applyInstrument(id);
                    setPreloaded(false);
                  })}
                >
                  {emoji} {name}
                </button>
              ))}
            </div>
            {/* Roadmap instruments the engine can't drill yet — shown to admins
                inside the same card as Guitar/Bass, as a second row of smaller
                disabled buttons, so the plan reads as part of the picker. */}
            {auth.admin && (
              <div className="pick-soon-row" role="group" aria-label={t('Coming soon')}>
                {COMING_SOON_INSTRUMENTS.map((ci) => (
                  <button
                    key={ci.label}
                    type="button"
                    className="pick-btn-soon"
                    disabled
                    aria-disabled="true"
                    title={`${t('Coming soon')} — ${ci.tuning}`}
                  >
                    {ci.emoji} {t(ci.label)}
                  </button>
                ))}
              </div>
            )}
          </SettingCard>
          {/* Note-name notation used to be its own drawer row; it's really a
              display preference for the instrument, so it lives here now. */}
          <SettingCard
            label={t('Notes')}
            help={t("Display only — the drill itself doesn't change.")}
          >
            <div className="pick-row" role="group" aria-label={t('Notes')}>
              {([['alpha', 'A B C'], ['solfege', 'Do Re Mi']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`pick-btn${notation === val ? ' pick-btn-on' : ''}`}
                  aria-pressed={notation === val}
                  onClick={click(() => { setNotation(val); saveSetting('pref_notation', val); })}
                >
                  {label}
                </button>
              ))}
            </div>
          </SettingCard>
          {/* Precise fret-range window (Pro). It used to sit under the neck on
              the home screen; it lives here now, with its own neck picture
              whose dark silhouette tracks the slider. The home-screen neck
              still reflects the chosen window. */}
          <SettingCard
            label={t('Fret range')}
            help={t('Drill only part of the neck. Drag the handles to set the exact fret window — the shaded area is muted out, both here and on the home-screen neck.')}
          >
            <ProGate
              feature="fretRange"
              variant="overlay"
              pitch={t('Pick an exact fret N–M window to drill')}
            >
              <div className="fret-range-block">
                <SegmentedControl
                  ariaLabel={t('Precise fret range')}
                  value={selector.state.useFretRange ? 'on' : 'off'}
                  options={[
                    { value: 'on', label: t('On') },
                    { value: 'off', label: t('Off') },
                  ]}
                  onChange={() => selector.onFretRangePreciseToggle()}
                />
                <FretRangeNeck
                  instrument={instrument}
                  lo={selector.state.fretLo}
                  hi={selector.state.fretHi}
                  disabled={!selector.state.useFretRange}
                />
                <FretRangeControl
                  maxFret={instrument.maxFret}
                  lo={selector.state.fretLo}
                  hi={selector.state.fretHi}
                  onChange={selector.onFretRangeWindow}
                  disabled={!selector.state.useFretRange}
                />
              </div>
            </ProGate>
          </SettingCard>
        </>
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
        <>
          <SettingCard
            label={t('Score & celebrations')}
            help={<>{t('Live score, streak multiplier and celebrations are shown.')} <em>{t('Every answer is still recorded to your stats and personal bests either way.')}</em></>}
          >
            <SegmentedControl
              ariaLabel={t('Score')}
              value={showScore ? 'on' : 'off'}
              options={[
                { value: 'on', label: t('On') },
                { value: 'off', label: t('Off') },
              ]}
              onChange={(v) => { const on = v === 'on'; setShowScore(on); saveSetting('pref_showScore', on); }}
            />
          </SettingCard>
          <SettingCard
            label={t('Silent mode')}
            help={t('Visual-only questions — no note playback or chime. Haptics and on-screen celebrations stay on. Great for practising with headphones off or a guitar in hand.')}
          >
            <SegmentedControl
              ariaLabel={t('Silent mode')}
              value={silentMode ? 'on' : 'off'}
              options={[
                { value: 'on', label: t('On') },
                { value: 'off', label: t('Off') },
              ]}
              onChange={(v) => { const on = v === 'on'; setSilentMode(on); saveSetting('pref_silentMode', on); }}
            />
          </SettingCard>
          <SettingCard
            label={t('Theme')}
            help={t('Night is a warmer, dimmer palette for a dark room. Day is a light palette.')}
          >
            <PickRow
              ariaLabel={t('Theme')}
              value={theme}
              options={[
                { value: 'dark', label: t('Dark') },
                { value: 'night', label: t('Night') },
                { value: 'day', label: t('Day') },
              ]}
              onChange={(v) => setTheme(v)}
            />
          </SettingCard>
          <SettingCard label={t('Language')}>
            <PickRow
              ariaLabel={t('Language')}
              value={lang}
              options={LANGUAGES}
              onChange={(l) => { setLang(l); }}
            />
          </SettingCard>
          {voice.supported && (
            <>
              <SettingCard
                label={t('How you answer')}
                help={t('Voice mode asks for microphone permission the first time.')}
              >
                <PickRow
                  ariaLabel={t('Answer mode')}
                  value={answerMode}
                  options={[
                    { value: 'tap', label: <>👆 {t('Tap')}</> },
                    { value: 'voice', label: <>🎤 {t('Voice')}</> },
                  ]}
                  onChange={(m) => {
                    setAnswerMode(m);
                    saveSetting('pref_answerMode', m);
                    if (m === 'voice') askForMic();
                  }}
                />
              </SettingCard>
              {/* Voice engine + personal profile only matter once Voice is the
                  chosen answer mode, so they live nested under it. */}
              {answerMode === 'voice' && (
                <ProGate
                  feature="voiceProfile"
                  variant="replace"
                  pitch={t('A personal voice profile built from your own calibration recordings')}
                >
                  <SettingCard
                    label={t('Voice engine')}
                    help={t('Auto picks the best available. Personal uses your calibrated profile; General uses the built-in model.')}
                  >
                    <PickRow
                      ariaLabel={t('Voice engine')}
                      value={voiceEnginePref}
                      options={[
                        { value: 'auto', label: t('Auto') },
                        { value: 'profile', label: t('Personal') },
                        { value: 'general', label: t('General') },
                      ]}
                      onChange={(v) => pickVoiceEngine(v)}
                    />
                  </SettingCard>
                  <SettingCard
                    label={t('Your voice profile')}
                    help={t('Calibrating your own voice improves recognition when answering by voice.')}
                  >
                    {voiceProfileStat && voiceProfileStat.count > 0 && (
                      <div className="sp2-hero">
                        <div className="sp2-tile">
                          <span className="sp2-tile-v">{voiceProfileStat.count}</span>
                          <span className="sp2-tile-l">{t('recordings')}</span>
                        </div>
                        <div className="sp2-tile">
                          <span className="sp2-tile-v" style={{ color: voiceProfileStat.enabled ? '#34e07a' : '#ff9d2e' }}>
                            {voiceProfileStat.enabled ? t('On') : t('Off')}
                          </span>
                          <span className="sp2-tile-l">{t('enabled')}</span>
                        </div>
                      </div>
                    )}
                    <button
                      className="set-card-btn"
                      onClick={click(() => { setSettingsOpen(false); setShowVoiceCalibration(true); })}
                    >🎙️ {voiceProfileStat && voiceProfileStat.count > 0
                      ? t('Add / review recordings')
                      : t('Calibrate my voice')}</button>
                  </SettingCard>
                </ProGate>
              )}
            </>
          )}
          <SettingCard
            label={t('Mastery on the fretboard')}
            help={<>{t('The per-note / per-fret accuracy bars drawn over the circle and grid while stopped or paused.')} <em>{t('Mastery keeps being tracked and shows on the Stats screen either way.')}</em></>}
          >
            <SegmentedControl
              ariaLabel={t('Mastery on the fretboard')}
              value={showMastery ? 'on' : 'off'}
              options={[
                { value: 'on', label: t('On') },
                { value: 'off', label: t('Off') },
              ]}
              onChange={(v) => { const on = v === 'on'; setShowMastery(on); saveSetting('pref_showMastery', on); }}
            />
          </SettingCard>
          <ProGate
            feature="masteryMaps"
            variant="replace"
            pitch={t('Choose how many recent questions the mastery bars are counted from')}
          >
            <SettingCard
              label={t('Questions counted')}
              help={t('How many of your most recent questions the mastery bars are computed from. Free accounts use the last 250.')}
            >
              <PickRow
                ariaLabel={t('Questions counted')}
                value={masteryWindow.kind === 'lastN' ? String(masteryWindow.n) : '250'}
                options={PRO_MASTERY_LASTN_CHOICES.map((n) => ({
                  value: String(n),
                  label: n === 0 ? t('All') : String(n),
                }))}
                onChange={(v) => {
                  const next: MasteryWindow = { kind: 'lastN', n: Number(v) };
                  setMasteryWindow(next);
                  saveSetting('pref_masteryWindow', next);
                }}
              />
            </SettingCard>
          </ProGate>
        </>
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
        <>
        {auth.user ? (
        <SettingCard
          label={t('Signed in')}
          help={t('Keeps your preferences and data in sync across devices.')}
        >
          <div className="account-user">
            {auth.profile?.avatarUrl && (
              <img
                className="account-avatar"
                src={auth.profile.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                width={40}
                height={40}
              />
            )}
            <span className="account-identity">
              {auth.profile?.name && (
                <span className="account-name">{auth.profile.name}</span>
              )}
              <span className="account-email">
                {auth.profile?.email ?? auth.user.email ?? t('Signed in')}
              </span>
              {auth.user.created_at && (
                <span className="account-member-since">
                  {t('Member since')} {new Date(auth.user.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              )}
            </span>
          </div>
          {/* Subscription tier: a plain tappable tile showing the current plan,
              sitting just above Sign out. Opens the `upgrade` sub-page. */}
          <button
            type="button"
            className={`account-plan${auth.isPro ? ' is-pro' : ''}`}
            onClick={click(() => { upgradeFromAccountRef.current = true; setDrawerSection('upgrade'); })}
          >
            <span className="account-plan-icon" aria-hidden="true">⭐</span>
            <span className="account-plan-tier">
              {auth.isPremium ? t('Premium') : auth.isPro ? t('Pro') : t('Free')}
            </span>
          </button>
          <button
            className="set-card-danger"
            onClick={click(() => { void auth.signOut(); })}
          >
            {t('Sign out')}
          </button>
        </SettingCard>
      ) : (
        <SettingCard
          label={t('Account')}
          help={t('Sign in with Google to keep your preferences and data across devices.')}
        >
          {/* Signed-out: no plan on the account, so show the current (Free)
              plan large. Tapping opens the `upgrade` sub-page. */}
          <button
            type="button"
            className="account-plan account-plan-lg"
            onClick={click(() => { upgradeFromAccountRef.current = true; setDrawerSection('upgrade'); })}
          >
            <span className="account-plan-icon" aria-hidden="true">⭐</span>
            <span className="account-plan-tier">{t('Free')}</span>
          </button>
          <button
            className="set-card-btn set-card-btn-primary"
            onClick={click(() => { void auth.signInWithGoogle(); })}
          >
            <svg className="google-icon" viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
            </svg>
            {t('Sign in with Google')}
          </button>
        </SettingCard>
      )}
        {/* The badge shelf: up to five medals the player pins beside their
            name, plus the floating picker that leads into the full Badges
            page (which used to be its own nav-row here). */}
        <PinnedBadges
          isAdmin={auth.admin}
          onOpenBadges={() => setDrawerSection('badges')}
        />
        {/* Admin-only account tools, grouped here rather than on the
            customer-facing Pro screen — kept below the badge shelf so the
            player-facing bits of Account come first. Gated on `adminAccount`
            (the real row in public.admins) so the "back to admin" switch
            stays reachable even while browsing as a regular user. */}
        {auth.adminAccount && (
          <SettingCard
            label={t('Admin: view the app as')}
            help={t('Hides every admin-only control so you see exactly what a regular user sees. Switch back here any time — this is a local view change only and does not change what your account can do.')}
          >
            <SegmentedControl<'admin' | 'user'>
              ariaLabel={t('Admin: view the app as')}
              value={auth.viewingAsUser ? 'user' : 'admin'}
              options={[
                { value: 'admin', label: t('Admin') },
                { value: 'user', label: t('Regular user') },
              ]}
              onChange={(next) => auth.setViewingAsUser(next === 'user')}
            />
          </SettingCard>
        )}
        {auth.admin && auth.user && (
          <SettingCard
            label={t('Admin: plan on your account')}
            help={t('Sets the plan on your own account only (Free, Pro or Premium). Writes to the entitlements table and syncs across your devices.')}
          >
            <SegmentedControl<'free' | 'pro' | 'premium'>
              ariaLabel={t('Admin: plan on your account')}
              value={auth.tier}
              options={[
                { value: 'free', label: t('Free') },
                { value: 'pro', label: t('Pro') },
                { value: 'premium', label: t('Premium') },
              ]}
              onChange={(next) => {
                const userId = auth.user?.id;
                if (!userId || next === auth.tier) return;
                void (async () => {
                  try {
                    await setOwnEntitlement(userId, next);
                    await auth.refreshEntitlement();
                  } catch (e) {
                    verror('[admin] plan toggle failed', e);
                  }
                })();
              }}
            />
          </SettingCard>
        )}
        {import.meta.env.DEV && (
          <p
            className="dev-tier-readout"
            style={{ opacity: 0.6, fontSize: '0.8em', margin: '8px 0 0' }}
          >
            {/* Dev-only readout; the tri-state "simulate tier" control that
                drives the "(sim:…)" state lives in the debug panel (🐞). */}
            tier: {auth.tier}
            {auth.devSimulateTier !== 'off' ? ` (sim:${auth.devSimulateTier})` : ''}
            {auth.entitlementLoading ? ' …' : ''}
          </p>
        )}
        {/* App version — moved here from the bottom of the main screen so the
            footer stays clean; this is the one place it now lives. */}
        <div className="build-info account-build-info">
          {__COMMIT_HASH__} · {__COMMIT_DATE__.slice(0, 16)}
          <button className="refresh-btn" onClick={() => window.location.reload()} title={t('Refresh')}>↻</button>
        </div>
        </>
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
        />
      </div>
    );
  }

  // The hamburger stays a side drawer that only lists the section titles.
  // Tapping a title opens that one section as its own full page (same
  // page-replacing treatment as "Stats & progress"), styled to match it.
  if (settingsOpen && drawerSection !== null) {
    const activeSection = settingsSections.find(s => s.id === drawerSection);
    if (activeSection && activeSection.body != null) {
      return (
        <div className="app settings-page">
          <div className="sp2 settings-page-inner" dir={lang === 'he' ? 'rtl' : undefined}>
            <div className="sp2-head settings-page-head">
              {/* Badges is a sub-page of Account (opened from the pinned-badge
                  picker), so Back returns there, not to the hamburger list.
                  Upgrade is a sub-page of Account too when opened from the
                  plan tile, but can also be opened directly by a locked
                  ProGate elsewhere — upgradeFromAccountRef tracks which. */}
              <button
                className="sp2-back"
                onClick={click(() => {
                  const backToAccount = drawerSection === 'badges'
                    || (drawerSection === 'upgrade' && upgradeFromAccountRef.current);
                  setDrawerSection(backToAccount ? 'account' : null);
                })}
              >
                <Chevron dir="back" /> {t('Back')}
              </button>
            </div>
            <header className="settings-page-hero">
              {activeSection.icon ? (
                <img src={activeSection.icon} alt="" className="settings-page-icon-img" />
              ) : (
                <span className="settings-page-emoji" aria-hidden="true">
                  {activeSection.title.split(' ')[0]}
                </span>
              )}
              <h2 className="settings-page-name">
                {activeSection.icon ? activeSection.title : activeSection.title.slice(activeSection.title.indexOf(' ') + 1)}
              </h2>
            </header>
            <div className="settings-page-body">{activeSection.body}</div>
          </div>
          {/* This full-screen settings sub-page is its own return path, so the
              reveal fired by an admin Grant on the Badges wall must be mounted
              here too — the copy in the main return never renders from here. */}
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

      {/* All playing settings live inline on the page; a compact read-only HUD
          replaces the panel during play. */}
      {renderSelectorPanel(gameActive)}

      {/* Hamburger drawer: a side sheet listing the section titles only.
          Tapping one opens that section as its own full page (handled by the
          early return above). Backdrop click or Escape dismisses. */}
      {settingsOpen && drawerSection === null && (
        <div className="settings-overlay" onClick={click(() => setSettingsOpen(false))}>
          <div
            className="settings-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t('Game settings')}
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="settings-menu" dir={lang === 'he' ? 'rtl' : undefined}>
              <div className="sp2-head">
                <button
                  className="sp2-back"
                  onClick={click(() => setSettingsOpen(false))}
                >
                  <Chevron dir="back" /> {t('Back')}
                </button>
                {/* No title here on purpose: the burger menu is just the list
                    of sections. "Settings" is one of those sections now. */}
              </div>
              {settingsSections.filter(s => s.id !== 'upgrade' && s.id !== 'badges').map(s => {
                // `upgrade` (subscription tier) and `badges` are not top-level
                // rows — each is a tappable tile inside the Account section that
                // opens its sub-page. They stay in `settingsSections` only so
                // that sub-page still resolves by id.
                // `s.icon` is a real image (the metal 3D tab icons); sections
                // without one (upgrade, badges — not shown as top-level rows
                // right now) fall back to the old "<emoji> <label>" title
                // convention, split apart so the emoji is its own leading-icon
                // node and never disturbs the bidi resolution of the
                // (possibly RTL) label text next to it.
                const [emoji, ...rest] = s.icon ? [] : s.title.split(' ');
                return (
                  <button
                    key={s.id}
                    className="nav-row"
                    onClick={click(() => { if (s.onSelect) s.onSelect(); else setDrawerSection(s.id); })}
                  >
                    <span className="nav-row__lead" aria-hidden="true">
                      {s.icon ? <img src={s.icon} alt="" className="nav-row__icon-img" /> : emoji}
                    </span>
                    <span className="nav-row__label">{s.icon ? s.title : rest.join(' ')}</span>
                    <Chevron dir="forward" className="nav-row__chev" />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Microphone permission card — our own copy + styling, shown ahead of
          (primer) or in place of (denied) the browser's native prompt. */}
      {micPrompt && (
        <div className="mic-overlay" onClick={click(() => setMicPrompt(null))}>
          <div
            className="mic-card"
            role="dialog"
            aria-modal="true"
            aria-label={t('Microphone access')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mic-card-icon" aria-hidden="true">🎤</div>
            {micPrompt === 'primer' ? (
              <>
                <div className="mic-card-title">{t('Answer out loud')}</div>
                <p className="mic-card-body">
                  {t('Voice mode listens for the note or fret you say instead of a tap.')}
                  {' '}
                  {t('Your browser will ask to use the microphone next — audio stays on your device and is never recorded or uploaded.')}
                </p>
                <div className="mic-card-actions">
                  <button className="mic-btn mic-btn-primary" onClick={click(() => { void grantMic(); })}>
                    {t('Allow microphone')}
                  </button>
                  <button className="mic-btn mic-btn-ghost" onClick={click(() => setMicPrompt(null))}>
                    {t('Not now')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mic-card-title">{t('Microphone is blocked')}</div>
                <p className="mic-card-body">
                  {t("Your browser is refusing microphone access for this site, so voice answers can't work yet. Tap the 🔒 / 🎤 icon beside the address bar, set the microphone to")}
                  {' '}<strong>{t('Allow')}</strong>{t(', then reload the page.')}
                </p>
                <div className="mic-card-actions">
                  <button className="mic-btn mic-btn-primary" onClick={click(() => setMicPrompt(null))}>
                    {t('Got it')}
                  </button>
                  <button
                    className="mic-btn mic-btn-ghost"
                    onClick={click(() => { setAnswerMode('tap'); saveSetting('pref_answerMode', 'tap'); setMicPrompt(null); })}
                  >
                    {t('Use tap instead')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* One-time sign-in nudge for guests, right after onboarding. Reuses the
          mic card's styling. "Maybe later" (or backdrop / Escape) dismisses it
          for good on this device; the account stays reachable from Settings. */}
      {auth.configured && !auth.loading && !auth.user && onboardingDone
        && !signInPromptSeen && !gameActive && (
        <div className="mic-overlay" onClick={click(dismissSignInPrompt)}>
          <div
            className="mic-card"
            role="dialog"
            aria-modal="true"
            aria-label={t('Sign in')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mic-card-icon" aria-hidden="true">☁️</div>
            <div className="mic-card-title">{t('Save your progress')}</div>
            <p className="mic-card-body">
              {t('Sign in to keep your history, badges and personal bests across devices. You can keep playing as a guest — everything still works, it just stays on this device.')}
            </p>
            <div className="mic-card-actions">
              <button
                className="mic-btn mic-btn-primary"
                onClick={click(() => { void auth.signInWithGoogle(); })}
              >
                {t('Sign in')}
              </button>
              <button className="mic-btn mic-btn-ghost" onClick={click(dismissSignInPrompt)}>
                {t('Maybe later')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="countdown-overlay">
          <span className="countdown-num" key={countdown}>{countdown}</span>
        </div>
      )}

      <div className="game-row" ref={gameRowRef}>
        {stageTransition && (
          <div className="stage-transition" role="status" aria-live="polite">
            <div className="stage-transition-label">{t('STAGE COMPLETE')}</div>
            <div className="stage-transition-name">{stageTransition.name}</div>
            {stageTransition.from !== stageTransition.to && (
              <div className="stage-transition-progress" dir="ltr">
                {stageTransition.from} → {stageTransition.to} {t('QUESTIONS')}
              </div>
            )}
          </div>
        )}
        <div className="question-col">
          {gameActive && (
            <>
              <div className="string-label" key={`str-${safeGuitarString}`}>{t(instrument.stringLabels[safeGuitarString])}</div>
              {derivedSettings.byNote
                ? <div className={`note-display${stageTransition ? ' stage-exiting' : ''}`} ref={questionDisplayRef}>{currentNote ? displayNote(currentNote, accidental, notation) : '—'}</div>
                : <div className={`fret-display${stageTransition ? ' stage-exiting' : ''}`} ref={questionDisplayRef}>{currentFret !== null ? currentFret : '—'}</div>
              }
              <SpeedBar key={`sb-${questionSeq}`} remaining={remaining} total={questionTime} startAt={questionStart} answered={answered} paused={paused} />
              <div className="game-info-row">
                <span className="game-timer">{remaining}s</span>
                <span className="game-progress-text">{questionNumber}/{derivedSettings.maxQuestions}</span>
                {showScore && multiplierIcon && <span className="multiplier-icon">{multiplierIcon}</span>}
              </div>
              {showScore && (
                <div id="live-score" className="score-live">
                  <AnimatedScore value={scoring.session.score} />
                </div>
              )}
              <div className={`feedback ${feedback.startsWith('✓') ? 'good' : feedback.startsWith('✗') ? 'bad' : 'warn'}`}>
                {feedback}{showScore && scoring.session.lastPoints > 0 && feedback.startsWith('✓') ? ` +${scoring.session.lastPoints}` : ''}
              </div>
              {voiceActive && (
                <div className={`voice-status voice-${voice.status}`} role="status" aria-live="polite">
                  {voice.permission === 'denied'
                    ? t('🎤 Microphone blocked — enable it or switch to tap')
                    : voice.error === 'network'
                      ? t('🎤 Voice needs a connection')
                      : voice.error === 'not-supported'
                        ? t('🎤 Voice isn’t working in this browser — try Chrome, or use tap')
                      : voice.error
                        ? t('🎤 Didn’t catch that')
                        : voice.status === 'listening'
                          ? `🎤 ${t('Listening…')}${voice.partial ? ` “${voice.partial}”` : ''}`
                          : voice.status === 'heard'
                            ? `🎤 “${voice.partial}”`
                            : t('🎤 …')}
                  {(voice.status === 'error') && (
                    <button className="clear-btn voice-retry" onClick={click(voice.retry)}>{t('Retry')}</button>
                  )}
                </div>
              )}
              {voiceActive && running && !paused && voice.permission !== 'denied' && (
                <VoiceLevelMeter active={running && !paused} />
              )}
            </>
          )}

          {/* Game ended summary */}
          {gameEnded && isStopped && (
            <div className="game-end-summary">
              <div className="game-end-title">🎉 {t('Round Complete!')}</div>
              {showScore && <div className="game-end-score"><AnimatedScore value={scoring.session.score} /> {t('pts')}</div>}
              <div className="game-end-details">
                {scoring.session.longestStreak >= 2 && <span>🔥 {scoring.session.longestStreak} {t('streak')}</span>}
                <span>✓ {sessionResult.questionsCorrect}/{sessionResult.questionsAnswered}</span>
              </div>
              {newBadges.length > 0 && (
                <div className="game-end-badges">
                  <BadgeMedalDefs />
                  {newBadges.map(({ id, tier }) => {
                    const def = badgeDef(id, instrument);
                    return (
                      <div className="game-end-badge" key={id}>
                        <BadgeMedal id={id} instrumentId={instrument.id} tier={tier} size={30} />
                        {t('New badge')} · {def ? t(def.name) : id} — {t(TIER_LABEL[tier])}
                      </div>
                    );
                  })}
                </div>
              )}
              <button className="clear-btn" onClick={click(() => { setGameEnded(false); setNewBadges([]); setToastQueue([]); setRevealBadges([]); })}>{t('OK')}</button>
            </div>
          )}

          {/* Controls: Play (centered) → becomes a Pause/Resume toggle plus a separate Stop when playing/paused */}
          <div className="controls">
            {!running && !paused && !countdown ? (
              <button ref={playBtnRef} className="icon-btn play-btn" onClick={click(start)} title={t('Start')}>
                <svg viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
              </button>
            ) : running || paused ? (
              <>
                <button
                  className="icon-btn pause-btn"
                  onClick={() => {
                    if (paused) resume();
                    else pause();
                    playClickSound(); haptic.tap();
                  }}
                  title={paused ? t('Resume') : t('Pause')}
                  aria-label={paused ? t('Resume') : t('Pause')}
                >
                  <span className={`morph-icon ${paused ? 'is-resume' : 'is-pause'}`}>
                    <svg className="icon-pause" viewBox="0 0 24 24" width="24" height="24"><rect x="5" y="4" width="4" height="16" fill="currentColor"/><rect x="15" y="4" width="4" height="16" fill="currentColor"/></svg>
                    <svg className="icon-play" viewBox="0 0 24 24" width="24" height="24"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
                  </span>
                </button>
                <button
                  className="icon-btn stop-btn-icon"
                  onClick={() => { stop(); playClickSound(); haptic.tap(); }}
                  title={t('Stop')}
                  aria-label={t('Stop')}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/></svg>
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Keep the grid/circle visible (frozen) while paused; hide only when fully stopped and showing stats/end summary */}
        {(gameActive || (isStopped && !gameEnded)) && (
          derivedSettings.byNote ? (
            <FretGrid
              fretFrom={derivedSettings.fretFrom}
              fretTo={derivedSettings.fretTo}
              guitarString={safeGuitarString}
              validFrets={new Set(Object.values(noteFrets).flat())}
              active={isPlaying && !answered}
              correctFrets={gameActive ? remainingFrets : []}
              wrongFret={gameActive ? wrongFret : null}
              foundFrets={gameActive ? foundFrets : []}
              onSelect={selectFret}
              masteryByFret={fretMastery}
              showMastery={!boardLive && showMastery}
            />
          ) : (
            <NoteCircle
              notes={cofList}
              activeNotes={isMulti && gameActive ? questionActiveNotes : activeNotes}
              active={isPlaying && !answered}
              correctNote={gameActive ? correctCofNote : null}
              wrongNote={gameActive ? wrongCofNote : null}
              onSelect={selectAnswer}
              guitarString={safeGuitarString}
              fretDots={fretDots}
              noteFrets={noteFrets}
              byString={byString}
              startIndex={startIndex}
              showDots={!(isMulti && derivedSettings.multiStrings.length > 1) || boardLive}
              accidental={accidental}
              notation={notation}
              masteryByNote={noteMastery}
              showMastery={!boardLive && showMastery}
            />
          )
        )}
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
