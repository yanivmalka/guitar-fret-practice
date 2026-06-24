const openMidi = [64, 59, 55, 50, 45, 40];
const baseUrl = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/';
const cache: Record<string, AudioBuffer> = {};
let activeSources: AudioBufferSourceNode[] = [];
let soundEndTime = 0;
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function midiName(midi: number): string {
  const n = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  return n[midi % 12] + (Math.floor(midi / 12) - 1);
}

async function loadSample(midi: number): Promise<AudioBuffer | null> {
  const name = midiName(midi);
  if (cache[name]) return cache[name];
  try {
    const buf = await (await fetch(baseUrl + name + '.mp3')).arrayBuffer();
    cache[name] = await getCtx().decodeAudioData(buf);
    return cache[name];
  } catch { return null; }
}

export function stopPlayback() {
  activeSources.forEach(s => { try { s.stop(); } catch {} });
  activeSources = [];
  soundEndTime = 0;
}

export function isSoundPlaying(): boolean {
  return Date.now() < soundEndTime;
}

export async function playNote(stringNum: number, fret: number) {
  stopPlayback();
  const ctx = getCtx();
  if (ctx.state === 'suspended') await ctx.resume();
  const midi = openMidi[stringNum - 1] + fret;
  const buffer = await loadSample(midi);
  if (!buffer) return;
  [0, 0.4, 0.8].forEach((t, i) => {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    src.connect(gain);
    gain.connect(ctx.destination);
    const dur = i < 2 ? 0.4 : 0.8;
    gain.gain.setValueAtTime(0.7, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + t + dur);
    src.start(ctx.currentTime + t);
    src.stop(ctx.currentTime + t + dur);
    activeSources.push(src);
  });
  soundEndTime = Date.now() + 1600;
}

export function beep() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 440;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

export async function playNoteSingle(stringNum: number, fret: number) {
  stopPlayback();
  const ctx = getCtx();
  if (ctx.state === 'suspended') await ctx.resume();
  const midi = openMidi[stringNum - 1] + fret;
  const buffer = await loadSample(midi);
  if (!buffer) return;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  src.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  src.start();
  src.stop(ctx.currentTime + 0.4);
  activeSources.push(src);
  soundEndTime = Date.now() + 400;
}

export async function preloadAllSamples(): Promise<void> {
  const promises: Promise<unknown>[] = [];
  for (let s = 0; s < 6; s++)
    for (let f = 0; f <= 18; f++)
      promises.push(loadSample(openMidi[s] + f));
  await Promise.allSettled(promises);
}
