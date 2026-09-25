// Ad pacing: decides *when* the Free-tier ad strip appears.
//
// The rule (product owner): an ad line shows up after a random 1–5 finished
// rounds, and only while the user is browsing — never during a drill. Every
// drill engine reports two moments here: a round that ran to its natural end
// (`noteRoundCompleted`) and a round being started (`noteRoundStarted`). The
// strip becomes "pending" when the counter reaches the current threshold, stays
// up while the user browses, and is taken down the moment the next round starts
// (or when the user closes it). Each cycle then draws a fresh 1–5 threshold.
//
// Who sees ads at all is NOT decided here: `<AdBanner>` gates on
// `can('noAds', tier)`. This module is only the pacing state, held in a tiny
// external store (like devSimulateTier) so every engine can report into it
// without a context provider. In-memory on purpose — a fresh launch starts a
// fresh cycle, and nothing here is worth syncing.

export const AD_MIN_ROUNDS = 1;
export const AD_MAX_ROUNDS = 5;

function drawThreshold(): number {
  return AD_MIN_ROUNDS + Math.floor(Math.random() * (AD_MAX_ROUNDS - AD_MIN_ROUNDS + 1));
}

let roundsSinceAd = 0;
let threshold = drawThreshold();
let pending = false;
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }

export function isAdPending(): boolean {
  return pending;
}

export function subscribeAdPending(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

/** A round ran to its natural end. Raises the strip once the count reaches the
 *  current threshold. Rounds stopped early by the user do not count. */
export function noteRoundCompleted(): void {
  if (pending) return;
  roundsSinceAd += 1;
  if (roundsSinceAd >= threshold) {
    pending = true;
    emit();
  }
}

/** A round is starting: take the strip down (the user is practising again). */
export function noteRoundStarted(): void {
  dismissAd();
}

/** Take the strip down and begin a new cycle with a fresh random threshold. */
export function dismissAd(): void {
  if (!pending) return;
  pending = false;
  roundsSinceAd = 0;
  threshold = drawThreshold();
  emit();
}
