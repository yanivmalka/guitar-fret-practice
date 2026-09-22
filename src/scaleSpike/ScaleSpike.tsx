// ── ScaleSpike — standalone test harness for Exercise A ──────────────────
//
// Mirrors the existing pitch-spike.html pattern: an isolated page to see a
// new, not-yet-wired-into-App capability actually run before spending the
// effort to wire it into Practice/LearnHub navigation. Guitar only, Minor
// Pentatonic only (slice 1's only shipped scale type). Runs the whole-neck
// lit/dim board (scales-learning-spec.md's Session 3 correction note), not
// the earlier falling-lane Piano Tiles design.

import { useScaleBoardEngine } from '../hooks/useScaleBoardEngine';
import ScaleShapeBoard from '../components/ScaleShapeBoard';
import { buildScalePool } from '../learning/scaleDrill';
import { INSTRUMENTS } from '../utils/instruments';

const guitar = INSTRUMENTS.guitar;
const pool = buildScalePool(['minorPentatonic'], guitar.stringCount);

export default function ScaleSpike() {
  const engine = useScaleBoardEngine({
    instrument: { notes: guitar.notes, stringCount: guitar.stringCount, maxFret: guitar.maxFret },
    pool,
    questionCount: 8,
    timeLimit: 20,
  });

  return (
    <div style={{
      minHeight: '100vh', background: '#1a1a2e', color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      padding: 24, fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: 20 }}>Scale Spike — Build the Scale (Minor Pentatonic, whole neck)</h1>

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

      {engine.question && (
        <>
          <div>
            {engine.question.scaleTypeId} — position {engine.question.positionIndex} — root {engine.question.rootName} (string {engine.question.rootString}, fret {engine.question.rootFret})
          </div>
          <div>Found {engine.found} / {engine.question.shape.length}</div>
          <ScaleShapeBoard
            question={engine.question}
            noteTable={guitar.notes}
            stringCount={guitar.stringCount}
            maxFret={guitar.maxFret}
            dotFrets={guitar.dotFrets}
            accidental="sharps"
            notation="alpha"
            foundPositions={engine.foundPositions}
            wrongPosition={engine.wrongPosition}
            active={engine.running}
            onSelect={engine.selectPosition}
          />
        </>
      )}
    </div>
  );
}
