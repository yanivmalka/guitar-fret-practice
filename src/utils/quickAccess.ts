// Quick Access — the opt-in floating control on the home screen that exposes a
// handful of often-flipped settings as a short strip of glowing icons.
//
// Modelled on `src/utils/pinnedBadges.ts` (an ordered `string[]` in
// localStorage, capped, cloud-synced last-writer-wins via `SYNCED_KEYS`) plus
// the tiny external-store shape from `src/utils/adminViewAsUser.ts`, so the
// Settings pin buttons and the home-screen widget stay in sync within a
// session without a reload.
//
// Exactly seven settings are pinnable and at most five can be pinned at once.
// Every pinnable setting is a two-state toggle except Note volume, which cycles
// through four discrete loudness steps.

import { loadSetting, saveSetting } from './settings';
import { NOTE_VOLUME_MIN, NOTE_VOLUME_MAX, NOTE_VOLUME_DEFAULT } from './audio';

export const ENABLED_KEY = 'pref_quickAccessEnabled';
export const PINNED_KEY = 'pref_pinnedQuickAccess';
export const HINT_KEY = 'qaHintSeen';
export const MAX_QUICK_PINNED = 5;

export type QuickAccessId =
  | 'notation'
  | 'accidental'
  | 'showScore'
  | 'silentMode'
  | 'noteVolume'
  | 'answerMode'
  | 'showMastery';

export interface QuickAccessItem {
  id: QuickAccessId;
  /** localStorage `pref_*` key the setting persists to. */
  prefKey: string;
  /** English label, run through `t()` for the aria-label. */
  label: string;
  /** Only offered / cyclable when voice input is supported. */
  voiceOnly?: boolean;
  /** Current raw pref value -> the next raw value in the cycle. */
  next: (cur: unknown) => unknown;
  /** Current raw pref value -> the glyph shown for that state. */
  icon: (cur: unknown) => string;
}

// ── Note volume: four discrete steps across the makeup-gain range ──────
// "Mute" is the quietest the gain slider allows (NOTE_VOLUME_MIN); true
// silence is the separate Silent mode toggle.
const VOL_STEPS = [NOTE_VOLUME_MIN, 4, 7, NOTE_VOLUME_MAX] as const;
const VOL_ICONS = ['🔇', '🔈', '🔉', '🔊'] as const;

function volIndex(cur: unknown): number {
  const v = typeof cur === 'number' ? cur : NOTE_VOLUME_DEFAULT;
  let best = 0;
  let bestDist = Infinity;
  VOL_STEPS.forEach((step, i) => {
    const d = Math.abs(step - v);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

/** Glyph shown on the main circle before the first change this session. */
export const GENERIC_QA_ICON = '🎛️';

export const QUICK_ACCESS_ITEMS: readonly QuickAccessItem[] = [
  {
    id: 'notation',
    prefKey: 'pref_notation',
    label: 'Note names',
    next: (cur) => (cur === 'solfege' ? 'alpha' : 'solfege'),
    icon: (cur) => (cur === 'solfege' ? 'Do' : 'ABC'),
  },
  {
    id: 'accidental',
    prefKey: 'pref_accidental',
    label: 'Sharps or flats',
    next: (cur) => (cur === 'flats' ? 'sharps' : 'flats'),
    icon: (cur) => (cur === 'flats' ? '♭' : '♯'),
  },
  {
    id: 'showScore',
    prefKey: 'pref_showScore',
    label: 'Score & celebrations',
    next: (cur) => cur === false,
    icon: (cur) => (cur === false ? '☆' : '⭐'),
  },
  {
    id: 'silentMode',
    prefKey: 'pref_silentMode',
    label: 'Silent mode',
    next: (cur) => cur !== true,
    icon: (cur) => (cur === true ? '🔇' : '🔊'),
  },
  {
    id: 'noteVolume',
    prefKey: 'pref_noteVolume',
    label: 'Note volume',
    next: (cur) => VOL_STEPS[(volIndex(cur) + 1) % VOL_STEPS.length],
    icon: (cur) => VOL_ICONS[volIndex(cur)],
  },
  {
    id: 'answerMode',
    prefKey: 'pref_answerMode',
    label: 'How you answer',
    voiceOnly: true,
    next: (cur) => (cur === 'voice' ? 'tap' : 'voice'),
    icon: (cur) => (cur === 'voice' ? '🎤' : '👆'),
  },
  {
    id: 'showMastery',
    prefKey: 'pref_showMastery',
    label: 'Mastery on the fretboard',
    next: (cur) => cur === false,
    icon: (cur) => (cur === false ? '🙈' : '👁️'),
  },
];

const ITEM_IDS = new Set<string>(QUICK_ACCESS_ITEMS.map((i) => i.id));

export function quickAccessItem(id: QuickAccessId): QuickAccessItem {
  const it = QUICK_ACCESS_ITEMS.find((i) => i.id === id);
  if (!it) throw new Error(`unknown quick-access item: ${id}`);
  return it;
}

// ── External store ───────────────────────────────────────────────────
// A module-level listener set + cached snapshots, so `useSyncExternalStore`
// consumers (the pin buttons and the home widget) re-render together the
// instant anything flips, with no reload.

const listeners = new Set<() => void>();
function emit(): void {
  for (const fn of listeners) fn();
}

export function subscribeQuickAccess(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

function sanitizePinned(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== 'string' || !ITEM_IDS.has(x) || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
    if (out.length >= MAX_QUICK_PINNED) break;
  }
  return out;
}

let enabled: boolean = loadSetting<boolean>(ENABLED_KEY, false);
let pinned: string[] = sanitizePinned(loadSetting<unknown>(PINNED_KEY, []));
let hintSeen: boolean = loadSetting<boolean>(HINT_KEY, false);

export function getQuickAccessEnabled(): boolean {
  return enabled;
}

export function setQuickAccessEnabled(on: boolean): void {
  if (enabled === on) return;
  enabled = on;
  saveSetting(ENABLED_KEY, on);
  emit();
}

/** Stable reference between changes — safe as a `useSyncExternalStore` snapshot. */
export function getPinnedQuick(): string[] {
  return pinned;
}

export function isQuickPinned(id: QuickAccessId): boolean {
  return pinned.includes(id);
}

/**
 * Add or remove `id` from the pinned strip. Same include / exclude / cap logic
 * as `PinnedBadges.toggle`: adding past `MAX_QUICK_PINNED` is a no-op.
 */
export function togglePinnedQuick(id: QuickAccessId): void {
  if (!ITEM_IDS.has(id)) return;
  let next: string[];
  if (pinned.includes(id)) {
    next = pinned.filter((x) => x !== id);
  } else {
    if (pinned.length >= MAX_QUICK_PINNED) return;
    next = [...pinned, id];
  }
  pinned = next;
  saveSetting(PINNED_KEY, next);
  emit();
}

export function hasSeenQaHint(): boolean {
  return hintSeen;
}

export function markQaHintSeen(): void {
  if (hintSeen) return;
  hintSeen = true;
  saveSetting(HINT_KEY, true);
  emit();
}
