import { playClickSound, haptic } from './feedback';

// Wrap a handler so the standard UI click sound + haptic fire before it runs.
// This is the `click()` helper used throughout App for interactive controls
// (see the "Conventions" note in CLAUDE.md).
export const withClick = <T,>(fn: () => T) => () => {
  playClickSound();
  haptic.tap();
  return fn();
};
