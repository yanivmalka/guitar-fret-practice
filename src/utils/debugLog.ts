// ── In-app debug log ──────────────────────────────────────────────────
//
// A tiny, dependency-free ring buffer for diagnostic events (voice
// recognition, pause/visibility, …). It exists so problems can be inspected
// on a device with no DevTools — most importantly the installed Android PWA,
// where `import.meta.env.DEV` is false and there is no console to read.
//
// - Capacity-bounded (old entries drop off the front).
// - Mirrored to `localStorage` so a reload / crash doesn't lose the trail.
// - Auto-clears once per calendar day so it can't grow forever; `clear()`
//   wipes it on demand.
//
// Write through `vlog(tag, data?)`. It also `console.debug`s in dev builds so
// the browser console still works as before.

export interface DebugEntry {
  t: number;          // epoch ms
  tag: string;        // e.g. "[voice] start"
  data?: string;      // JSON-stringified payload (best-effort)
}

const MAX_ENTRIES = 400;
const LS_KEY = 'debugLog.entries';
const LS_DAY = 'debugLog.day';

let entries: DebugEntry[] = [];
const listeners = new Set<() => void>();
let flushTimer: number | null = null;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): void {
  try {
    if (localStorage.getItem(LS_DAY) !== today()) {
      // New day — start the trail fresh.
      localStorage.setItem(LS_DAY, today());
      localStorage.removeItem(LS_KEY);
      entries = [];
      return;
    }
    const raw = localStorage.getItem(LS_KEY);
    entries = raw ? (JSON.parse(raw) as DebugEntry[]) : [];
  } catch {
    entries = [];
  }
}
load();

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(entries));
      localStorage.setItem(LS_DAY, today());
    } catch {
      /* storage full / unavailable — keep the in-memory copy */
    }
  }, 500);
}

function emit(): void {
  listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

export function vlog(tag: string, data?: unknown): void {
  if (import.meta.env.DEV) {
    console.debug(tag, data ?? '');
  }
  let payload: string | undefined;
  if (data !== undefined) {
    try {
      payload = typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
      payload = String(data);
    }
  }
  entries.push({ t: Date.now(), tag, data: payload });
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  scheduleFlush();
  emit();
}

export function getDebugEntries(): readonly DebugEntry[] {
  return entries;
}

export function clearDebugLog(): void {
  entries = [];
  try {
    localStorage.removeItem(LS_KEY);
    localStorage.setItem(LS_DAY, today());
  } catch {
    /* ignore */
  }
  emit();
}

export function subscribeDebugLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Whole log as copy-pasteable text, oldest first. */
export function debugLogAsText(): string {
  return entries
    .map((e) => {
      const ts = new Date(e.t).toISOString().slice(11, 23);
      return e.data ? `${ts}  ${e.tag}  ${e.data}` : `${ts}  ${e.tag}`;
    })
    .join('\n');
}
