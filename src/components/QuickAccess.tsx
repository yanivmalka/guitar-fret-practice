import {
  useEffect, useMemo, useRef, useState, useSyncExternalStore,
} from 'react';
import { playClickSound, haptic } from '../utils/feedback';
import { saveSetting } from '../utils/settings';
import type { AccidentalMode, NotationMode } from '../utils/music';
import {
  type QuickAccessId,
  quickAccessItem,
  GENERIC_QA_ICON,
  subscribeQuickAccess,
  getQuickAccessEnabled,
  getPinnedQuick,
  hasSeenQaHint,
  markQaHintSeen,
} from '../utils/quickAccess';

type AnswerMode = 'tap' | 'voice';
type Phase = 'sunk' | 'revealed' | 'open';

// Reveal / sink timing and gesture tolerances (design §"Reveal / sink").
const SINK_MS = 5000;
const HINT_MS = 6000;
const DOUBLE_TAP_MS = 300;
const TAP_MOVE_PX = 10;
const DRAG_ASIDE_PX = 40;

export interface QuickAccessProps {
  t: (s: string) => string;
  voiceSupported: boolean;
  askForMic: () => void;
  notation: NotationMode;
  setNotation: (n: NotationMode) => void;
  accidental: AccidentalMode;
  setAccidental: (a: AccidentalMode) => void;
  showScore: boolean;
  setShowScore: (v: boolean) => void;
  silentMode: boolean;
  setSilentMode: (v: boolean) => void;
  noteVolume: number;
  setNoteVolume: (v: number) => void;
  answerMode: AnswerMode;
  setAnswerMode: (m: AnswerMode) => void;
  showMastery: boolean;
  setShowMastery: (v: boolean) => void;
}

/**
 * The opt-in floating Quick Access control on the home screen: a transparent
 * double-tap zone on the physical right edge that reveals a glowing circle;
 * tapping the circle opens a downward strip of the player's pinned settings,
 * each a glowing icon that cycles that setting in place. It sinks away on its
 * own after {@link SINK_MS}, on another double-tap in the zone, or when dragged
 * aside.
 *
 * Renders nothing unless Quick Access is enabled and at least one setting is
 * pinned. Mounted on the home screen only and only outside a running drill
 * (gated at the call site in <App>).
 */
export default function QuickAccess(props: QuickAccessProps) {
  const { t, voiceSupported, askForMic } = props;
  const enabled = useSyncExternalStore(subscribeQuickAccess, getQuickAccessEnabled);
  const pinnedRaw = useSyncExternalStore(subscribeQuickAccess, getPinnedQuick);
  const hintSeen = useSyncExternalStore(subscribeQuickAccess, hasSeenQaHint);

  // Drop the voice-only item when voice isn't available on this platform.
  const pinned = useMemo(
    () => pinnedRaw.filter(
      (id): id is QuickAccessId => id !== 'answerMode' || voiceSupported,
    ),
    [pinnedRaw, voiceSupported],
  );

  const [phase, setPhase] = useState<Phase>('sunk');
  const [lastChangedId, setLastChangedId] = useState<QuickAccessId | null>(null);

  const sinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const fabDown = useRef<{ x: number; dragged: boolean } | null>(null);

  const clearSink = () => {
    if (sinkTimer.current) { clearTimeout(sinkTimer.current); sinkTimer.current = null; }
  };
  const armSink = () => {
    clearSink();
    sinkTimer.current = setTimeout(() => setPhase('sunk'), SINK_MS);
  };

  // Current raw value + narrow-and-apply for each pinnable setting. Both are
  // rebuilt every render straight from props, so they always read current.
  const values: Record<QuickAccessId, unknown> = {
    notation: props.notation,
    accidental: props.accidental,
    showScore: props.showScore,
    silentMode: props.silentMode,
    noteVolume: props.noteVolume,
    answerMode: props.answerMode,
    showMastery: props.showMastery,
  };
  const applyValue: Record<QuickAccessId, (v: unknown) => void> = {
    notation: (v) => props.setNotation(v as NotationMode),
    accidental: (v) => props.setAccidental(v as AccidentalMode),
    showScore: (v) => props.setShowScore(v as boolean),
    silentMode: (v) => props.setSilentMode(v as boolean),
    noteVolume: (v) => props.setNoteVolume(v as number),
    answerMode: (v) => props.setAnswerMode(v as AnswerMode),
    showMastery: (v) => props.setShowMastery(v as boolean),
  };

  const cycle = (id: QuickAccessId) => {
    const item = quickAccessItem(id);
    const nextVal = item.next(values[id]);
    playClickSound();
    haptic.tap();
    applyValue[id](nextVal);
    saveSetting(item.prefKey, nextVal);
    if (id === 'answerMode' && nextVal === 'voice') askForMic();
    setLastChangedId(id);
    armSink();
  };

  // Tear down the sink timer on unmount.
  useEffect(() => () => {
    if (sinkTimer.current) clearTimeout(sinkTimer.current);
  }, []);

  // First-run hint: shown by the edge once the player has pinned something but
  // has never revealed the widget. Auto-clears after HINT_MS so it never sticks.
  useEffect(() => {
    if (hintSeen || pinned.length === 0 || phase !== 'sunk') return;
    const id = setTimeout(() => markQaHintSeen(), HINT_MS);
    return () => clearTimeout(id);
  }, [hintSeen, pinned.length, phase]);

  // While the strip is open, a tap anywhere outside it collapses back to the
  // circle. Deferred one tick so the tap that opened it doesn't close it —
  // same shape as useAppNavigation's info-bubble dismiss.
  useEffect(() => {
    if (phase !== 'open') return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest('.qa-fab') || el?.closest('.qa-menu')) return;
      setPhase('revealed');
    };
    const id = window.setTimeout(
      () => document.addEventListener('pointerdown', onDown), 0,
    );
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [phase]);

  if (!enabled || pinned.length === 0) return null;

  const onZonePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // `e.timeStamp` (a monotonic DOM timestamp) rather than `Date.now()` so the
    // handler stays pure by the react-hooks lint rules.
    const now = e.timeStamp;
    const prev = lastTap.current;
    lastTap.current = { time: now, x: e.clientX, y: e.clientY };
    if (
      prev
      && now - prev.time < DOUBLE_TAP_MS
      && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < TAP_MOVE_PX
    ) {
      lastTap.current = null;
      haptic.tap();
      if (phase === 'sunk') {
        setPhase('revealed');
        armSink();
        if (!hintSeen) markQaHintSeen();
      } else {
        clearSink();
        setPhase('sunk');
      }
    }
  };

  const onFabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    fabDown.current = { x: e.clientX, dragged: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onFabPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = fabDown.current;
    if (!d || d.dragged) return;
    if (Math.abs(e.clientX - d.x) > DRAG_ASIDE_PX) {
      d.dragged = true;
      clearSink();
      setPhase('sunk');
    }
  };
  const onFabPointerUp = () => {
    const d = fabDown.current;
    fabDown.current = null;
    if (!d || d.dragged) return;
    playClickSound();
    haptic.tap();
    if (phase === 'revealed') {
      setPhase('open');
      armSink();
    } else if (phase === 'open') {
      cycle(lastChangedId ?? pinned[0]);
    }
  };

  // Strip order: the last-changed setting on top, then the rest in pinned order.
  const menuIds: QuickAccessId[] = lastChangedId && pinned.includes(lastChangedId)
    ? [lastChangedId, ...pinned.filter((id) => id !== lastChangedId)]
    : [...pinned];

  const circleIcon = lastChangedId
    ? quickAccessItem(lastChangedId).icon(values[lastChangedId])
    : GENERIC_QA_ICON;

  return (
    <div className="qa-root">
      <div className="qa-hotzone" onPointerUp={onZonePointerUp} aria-hidden="true" />

      {!hintSeen && phase === 'sunk' && (
        <div className="qa-hint" role="status">
          {t('Double-tap the edge to open quick access')}
        </div>
      )}

      {phase !== 'sunk' && (
        <button
          type="button"
          className="qa-fab"
          aria-label={t('Quick access')}
          aria-expanded={phase === 'open'}
          onPointerDown={onFabPointerDown}
          onPointerMove={onFabPointerMove}
          onPointerUp={onFabPointerUp}
        >
          <span className="qa-glyph">{circleIcon}</span>
        </button>
      )}

      {phase === 'open' && (
        <div className="qa-menu" role="group" aria-label={t('Quick access')}>
          {menuIds.map((id) => {
            const item = quickAccessItem(id);
            return (
              <button
                key={id}
                type="button"
                className="qa-menu-item"
                aria-label={t(item.label)}
                onClick={() => cycle(id)}
              >
                <span className="qa-glyph">{item.icon(values[id])}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
