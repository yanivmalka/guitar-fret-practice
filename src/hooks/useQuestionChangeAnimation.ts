import { useEffect, useRef } from 'react';

// Subtle in-place transition when the question changes. Animates the single
// existing .note-display / .fret-display node via the Web Animations API — no
// React remount, so there is never more than one element and the layout box
// never grows or shifts. Transform/opacity only; direction-agnostic (works in
// LTR and RTL). questionSeq bumps once per question (incl. Auto Advance).
// Returns the ref to attach to the display node.
export function useQuestionChangeAnimation(questionSeq: number) {
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
  return questionDisplayRef;
}
