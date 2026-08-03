// Haptic feedback via navigator.vibrate
function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}

export const haptic = {
  correct:     () => vibrate(30),
  wrong:       () => vibrate([30, 40, 30]),
  stageChange: () => vibrate(60),
  tap:         () => vibrate(10),
};

// UI click sound — tiny oscillator burst (~20ms), no audio file needed
let _audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!_audioCtx) _audioCtx = new AudioContext();
    return _audioCtx;
  } catch { return null; }
}

export function playClickSound() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 1200;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.025);
}
