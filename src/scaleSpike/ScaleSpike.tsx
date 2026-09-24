// ── ScaleSpike — standalone test harness for Exercise A ──────────────────
//
// Mirrors the existing pitch-spike.html pattern: an isolated page to see a
// capability actually run outside the app's navigation. Minor Pentatonic
// only (slice 1's only shipped scale type). Runs the full-screen falling-
// tiles board (scales-learning-spec.md's Session 5 correction). `?bass` in
// the URL switches to the 4-string bass.

import { useMemo } from 'react';
import { useScaleFallEngine } from '../hooks/useScaleFallEngine';
import ScaleFallBoard from '../components/ScaleFallBoard';
import { buildScalePool } from '../learning/scaleDrill';
import { INSTRUMENTS } from '../utils/instruments';
import { setAudioInstrument } from '../utils/audio';

const inst = new URLSearchParams(location.search).has('bass') ? INSTRUMENTS.bass : INSTRUMENTS.guitar;
setAudioInstrument(inst);
const pool = buildScalePool(['minorPentatonic'], inst.stringCount);

export default function ScaleSpike() {
  const instrument = useMemo(
    () => ({ notes: inst.notes, stringCount: inst.stringCount, maxFret: inst.maxFret, openMidi: inst.openMidi }),
    [],
  );
  const speed = useMemo(() => ({ start: 1.2, max: 2.5, accel: 0.015 }), []);
  const engine = useScaleFallEngine({ instrument, pool, questionCount: 4, speed });

  return (
    <div style={{
      minHeight: '100vh', background: '#1a1a2e', color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      padding: 24, fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: 20 }}>Scale Spike — Build the Scale ({inst.id}, falling tiles)</h1>
      {!engine.running && (
        <button onClick={engine.start} style={{ padding: '10px 24px', fontSize: 16 }}>Start</button>
      )}
      <div>Score: {engine.session.score} · Streak: {engine.session.streak}</div>

      {engine.running && engine.stream && (
        <ScaleFallBoard
          stream={engine.stream}
          rowStates={engine.rowStates}
          nextRow={engine.nextRow}
          wrongTile={engine.wrongTile}
          noteTable={inst.notes}
          stringCount={inst.stringCount}
          accidental="sharps"
          notation="alpha"
          frameListenerRef={engine.frameListenerRef}
          onTap={engine.tap}
          bannerLabel={(q) => {
            const s = engine.stream!.questions[q];
            return `${s.scaleTypeId} · ${s.rootName} · box ${s.positionIndex}`;
          }}
          header={<span>Scale {engine.questionNumber} / {engine.questionCount} · Score {engine.session.score}</span>}
          onExit={engine.stop}
          exitLabel="Stop"
        />
      )}
    </div>
  );
}
