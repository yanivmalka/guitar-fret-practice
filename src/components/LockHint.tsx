// A transient "why is this locked" tile for a control that a *setting* — not a
// subscription tier — has taken away. Tier locks keep their own <ProGate>
// upsell; this is for cases like "Identify the interval" being unavailable
// while sound is off. Tapping the control calls `showLockHint(el, message)`: a
// small tile rises next to the control, holds for ~2 seconds, then sinks away.
// Purely presentational and self-dismissing — the caller still suppresses the
// control's real action itself.

import { useCallback, useEffect, useRef, useState } from 'react';

const HOLD_MS = 2000;
const SINK_MS = 260;

interface HintState {
  message: string;
  top: number;
  left: number;
  phase: 'in' | 'leaving';
  key: number;
}

export function useLockHint() {
  const [hint, setHint] = useState<HintState | null>(null);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sinkRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (holdRef.current) clearTimeout(holdRef.current);
    if (sinkRef.current) clearTimeout(sinkRef.current);
    holdRef.current = null;
    sinkRef.current = null;
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setHint((h) => (h ? { ...h, phase: 'leaving' } : null));
    sinkRef.current = setTimeout(() => setHint(null), SINK_MS);
  }, [clearTimers]);

  const showLockHint = useCallback((anchor: HTMLElement, message: string) => {
    clearTimers();
    const r = anchor.getBoundingClientRect();
    keyRef.current += 1;
    // Anchor to the top-centre of the control; the tile renders `position:
    // fixed` and is nudged back inside the viewport by the CSS transform +
    // this clamp.
    const left = Math.min(Math.max(r.left + r.width / 2, 12), window.innerWidth - 12);
    const top = Math.max(r.top - 10, 12);
    setHint({ message, top, left, phase: 'in', key: keyRef.current });
    holdRef.current = setTimeout(dismiss, HOLD_MS);
  }, [clearTimers, dismiss]);

  // A scroll or resize would strand the tile away from its control — drop it.
  useEffect(() => {
    if (!hint) return;
    const drop = () => dismiss();
    const opts = { capture: true, passive: true } as AddEventListenerOptions;
    window.addEventListener('scroll', drop, opts);
    window.addEventListener('resize', drop);
    return () => {
      window.removeEventListener('scroll', drop, opts);
      window.removeEventListener('resize', drop);
    };
  }, [hint, dismiss]);

  useEffect(() => clearTimers, [clearTimers]);

  const lockHintNode = hint ? (
    <div
      key={hint.key}
      className={`lock-hint${hint.phase === 'leaving' ? ' lock-hint--leaving' : ''}`}
      role="status"
      aria-live="polite"
      style={{ top: hint.top, left: hint.left }}
    >
      <span className="lock-hint-icon" aria-hidden="true">🔒</span>
      <span className="lock-hint-text">{hint.message}</span>
    </div>
  ) : null;

  return { showLockHint, lockHintNode };
}
