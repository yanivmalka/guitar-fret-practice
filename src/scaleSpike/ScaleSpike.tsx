// ── ScaleSpike — standalone test harness for Exercise A ──────────────────
//
// Mirrors the existing pitch-spike.html pattern: an isolated page to see a
// new, not-yet-wired-into-App capability actually run before spending the
// effort to wire it into Practice/LearnHub navigation. Guitar only, Minor
// Pentatonic only (slice 1's only shipped scale type). Runs the real Piano
// Tiles mechanic (scales-learning-spec.md's Session 2 correction note), not
// the earlier static-grid design.

import { useScaleTilesEngine } from '../hooks/useScaleTilesEngine';
import ScaleTilesBoard from '../components/ScaleTilesBoard';
import { buildScalePool } from '../learning/scaleDrill';
import { INSTRUMENTS } from '../utils/instruments';

const guitar = INSTRUMENTS.guitar;
const pool = buildScalePool(['minorPentatonic'], guitar.stringCount);

export default function ScaleSpike() {
  const engine = useScaleTilesEngine({
    instrument: { notes: guitar.notes, stringCount: guitar.stringCount, maxFret: guitar.maxFret },
    pool,
    questionCount: 8,
    beatMs: 900,
  });

  return (
    <div style={{
      minHeight: '100vh', background: '#1a1a2e', color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      padding: 24, fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: 20 }}>Scale Spike — Build the Scale (Minor Pentatonic, Piano Tiles)</h1>

      {!engine.running && (
        <button onClick={engine.start} style={{ padding: '10px 24px', fontSize: 16 }}>
          Start
        </button>
      )}
      {engine.running && (
        <button onClick={engine.stop} style={{ padding: '10px 24px', fontSize: 16 }}>
          Stop
        </button>
      )}

      <div>Question {engine.questionNumber} / {engine.questionCount}</div>
      <div>Score: {engine.session.score} · Streak: {engine.session.streak}</div>

      {engine.run && (
        <>
          <div>
            {engine.run.scaleTypeId} — position {engine.run.positionIndex} — root {engine.run.rootName} (string {engine.run.rootString}, fret {engine.run.rootFret})
          </div>
          <div>Hits {engine.hits} / {engine.run.tiles.length}</div>
          <ScaleTilesBoard
            run={engine.run}
            resolutions={engine.resolutions}
            stringCount={guitar.stringCount}
            active={engine.running}
            onTapLane={engine.tapLane}
          />
        </>
      )}
    </div>
  );
}
