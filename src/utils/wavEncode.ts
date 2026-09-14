// ── Minimal 16-bit PCM WAV encoder ──────────────────────────────────────
//
// Turns the raw mono float PCM this app already captures (`captureUtterance`)
// into a standard WAV file, so a recording can be saved to disk and fed back
// through `scripts/eval-voice.mts` / `scripts/wav-lib.mts`, which decode the
// same 16-bit mono format.

export function encodeWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const buf = new ArrayBuffer(44 + pcm.length * bytesPerSample);
  const view = new DataView(buf);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * bytesPerSample, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, pcm.length * bytesPerSample, true);

  let off = 44;
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return buf;
}
