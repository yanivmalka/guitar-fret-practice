// ── GameFlow — F.3: Game Home → World → Stage → Drill ───────────────────
//
// Builds on the F.1 seam
//
//   Stage → Drill (useDrillSession) → SessionResult → buildStageResult →
//   recordStageResult → localStorage['gameProgress']
//
// and the F.2 stage list, wrapping both in a Worlds layer. Three screens,
// one component, plain nested conditionals — no router, no per-screen
// component files:
//
//   Game Home     — the list of `WORLDS`.
//   World         — the `STAGES` whose `worldId` matches the picked world.
//   Drill         — the unchanged F.1 drill UI (`StageRunner`).
//
// Back walks that chain in reverse: Drill → World → Game Home → exit Game.
//
// Unlock and best-stars are untouched from F.2: `isStageUnlocked()` from
// `gameProgress.ts` still decides which stage rows are playable (the first
// stage in global game order is always open; each later one opens once the
// stage before it has ≥ 1★), and `bestStars` still supplies the 0–3★ shown
// per stage. Worlds are NOT separately lockable — a world with no unlocked
// stages is still openable and just shows its stages as locked.
//
// Still deliberately out of scope: styled StageList / StarRating / WorldCard
// components, i18n (titleKey is shown raw), any new persistence, and
// DrillConfig.candidates / real instrument resolution.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import NoteCircle from '../components/NoteCircle';
import FretGrid from '../components/FretGrid';
import { useDerivedNotes } from '../hooks/useDerivedNotes';
import { useDrillSession } from '../hooks/useDrillSession';
import { useScoring } from '../hooks/useScoring';
import { unlockAudio } from '../utils/audio';
import { STAGES } from './stages';
import { WORLDS } from './worlds';
import { buildStageResult, type StageResult } from './stageResult';
import { loadGameProgress, recordStageResult, isStageUnlocked } from '../utils/gameProgress';
import type { GameProgress, Stage } from './models';
import { useDrillHistorySink } from './useDrillHistorySink';

// 0–3 → "★★☆" — inline, not a component. A later task gets the real widget.
function starGlyphs(n: number): string {
  const c = Math.max(0, Math.min(3, n));
  return '★'.repeat(c) + '☆'.repeat(3 - c);
}

// Stages of one world, in play order.
function stagesOfWorld(worldId: string): Stage[] {
  return STAGES.filter((s) => s.worldId === worldId).sort((a, b) => a.order - b.order);
}

export default function GameFlow({ onExit }: { onExit: () => void }) {
  // Progress is loaded once and then kept in state so a finished run updates
  // the lists without a reload. `recordStageResult` returns the freshly
  // persisted record, so we never re-read localStorage after mount.
  const [progress, setProgress] = useState<GameProgress>(() => loadGameProgress());
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  // The most recent finished run, shown as a one-line banner on the lists.
  const [lastResult, setLastResult] = useState<StageResult | null>(null);

  const selectedStage = selectedStageId
    ? STAGES.find((s) => s.id === selectedStageId) ?? null
    : null;

  // ── Drill + Stage Result ─────────────────────────────────────────────
  if (selectedStage) {
    // The next stage in the same world, and whether it is playable *now*
    // (i.e. after this run's stars have been folded into `progress`). When it
    // is, the result screen offers "Next stage"; when it is not — last stage
    // of the world, or the run did not earn the 1★ that unlocks it — the
    // result screen falls back to "Back to stages".
    const worldStages = stagesOfWorld(selectedStage.worldId);
    const here = worldStages.findIndex((s) => s.id === selectedStage.id);
    const nextStage = here >= 0 ? worldStages[here + 1] ?? null : null;
    const nextPlayable =
      nextStage && isStageUnlocked(nextStage.id, progress) ? nextStage : null;

    return (
      // `key` remounts the drill (and every hook it owns) per stage, so
      // switching stages never carries drill/scoring state across.
      <StageRunner
        key={selectedStage.id}
        stage={selectedStage}
        best={progress.bestStars[selectedStage.id] ?? 0}
        nextStageTitle={nextPlayable?.titleKey ?? null}
        onFinish={(result) => {
          setProgress(recordStageResult(result));
          setLastResult(result);
        }}
        onNextStage={
          nextPlayable
            ? () => {
                setLastResult(null);
                setSelectedStageId(nextPlayable.id);
              }
            : undefined
        }
        onBackToStages={() => setSelectedStageId(null)}
      />
    );
  }

  // ── World: the picked world's stages ─────────────────────────────────
  const selectedWorld = selectedWorldId
    ? WORLDS.find((w) => w.id === selectedWorldId) ?? null
    : null;

  if (selectedWorld) {
    const worldStages = stagesOfWorld(selectedWorld.id);
    const anyUnlocked = worldStages.some((s) => isStageUnlocked(s.id, progress));
    return (
      <div className="app" style={panelStyle}>
        <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between' }}>
          <button className="clear-btn" onClick={() => setSelectedWorldId(null)}>
            ← Worlds
          </button>
          <strong>{selectedWorld.titleKey}</strong>
        </div>

        {lastResult && (
          <div style={{ alignSelf: 'stretch', opacity: 0.85 }}>
            Last run — {lastResult.stageId}: {starGlyphs(lastResult.stars)} ({lastResult.stars}/3) ·
            accuracy {lastResult.sessionResult.accuracy}% · best now{' '}
            {progress.bestStars[lastResult.stageId] ?? 0}★
          </div>
        )}

        {worldStages.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No stages in this world yet.</div>
        ) : (
          <>
            {!anyUnlocked && (
              <div style={{ opacity: 0.7 }}>🔒 No stages unlocked here yet.</div>
            )}
            <div
              style={{
                alignSelf: 'stretch',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {worldStages.map((stage) => {
                const unlocked = isStageUnlocked(stage.id, progress);
                const best = progress.bestStars[stage.id] ?? 0;
                return (
                  <button
                    key={stage.id}
                    className="clear-btn"
                    disabled={!unlocked}
                    onClick={() => {
                      setLastResult(null);
                      setSelectedStageId(stage.id);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      opacity: unlocked ? 1 : 0.45,
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <span>
                      {unlocked ? '' : '🔒 '}
                      {stage.titleKey}
                    </span>
                    <span style={{ letterSpacing: 3, whiteSpace: 'nowrap' }}>
                      {starGlyphs(best)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Game Home: the list of worlds ───────────────────────────────────
  const worlds = [...WORLDS].sort((a, b) => a.order - b.order);
  return (
    <div className="app" style={panelStyle}>
      <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between' }}>
        <button className="clear-btn" onClick={onExit}>
          ← Back
        </button>
        <strong>Game · worlds</strong>
      </div>

      {lastResult && (
        <div style={{ alignSelf: 'stretch', opacity: 0.85 }}>
          Last run — {lastResult.stageId}: {starGlyphs(lastResult.stars)} ({lastResult.stars}/3) ·
          accuracy {lastResult.sessionResult.accuracy}% · best now{' '}
          {progress.bestStars[lastResult.stageId] ?? 0}★
        </div>
      )}

      <div
        style={{
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {worlds.map((world) => {
          const worldStages = stagesOfWorld(world.id);
          const earned = worldStages.reduce((sum, s) => sum + (progress.bestStars[s.id] ?? 0), 0);
          const anyUnlocked = worldStages.some((s) => isStageUnlocked(s.id, progress));
          return (
            <button
              key={world.id}
              className="clear-btn"
              onClick={() => setSelectedWorldId(world.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span>
                {anyUnlocked ? '' : '🔒 '}
                {world.titleKey}
              </span>
              <span style={{ whiteSpace: 'nowrap', opacity: 0.8 }}>
                {earned}/{worldStages.length * 3}★ · {worldStages.length} stages
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── StageRunner — one stage's drill + its result screen ─────────────────
//
// The drill itself is verbatim from the F.1 spike (the stage arrives as a
// prop; a finished run is handed up via `onFinish`, and the parent owns
// `recordStageResult` / progress). F.4 adds the result screen: stars,
// accuracy, longest streak, current best, a "new best" note, and the
// Retry / Next stage / Back actions. `Next stage` is shown only when the
// parent passes `onNextStage` (a next stage in this world that is unlocked
// now); otherwise the screen offers only Retry and Back to stages.
function StageRunner({
  stage,
  best,
  nextStageTitle,
  onFinish,
  onNextStage,
  onBackToStages,
}: {
  stage: Stage;
  best: number;
  nextStageTitle?: string | null;
  onFinish: (result: StageResult) => void;
  onNextStage?: () => void;
  onBackToStages: () => void;
}) {
  const drill = stage.drill;
  const isByNote = drill.mode === 'byNote';

  // A Game-only scoring instance. `useScoring` holds no persistence, so this
  // is fully isolated from Practice's session score / multiplier / HUD.
  const scoring = useScoring();
  // A Game-only, in-memory history sink — never useHistory, selectorHistory,
  // or the cloud (see useDrillHistorySink).
  const historySink = useDrillHistorySink();

  const [activeString, setActiveString] = useState(drill.primaryString);
  const [stageResult, setStageResult] = useState<StageResult | null>(null);
  // The saved best *before* the current run, captured on each `startStage`,
  // so the result screen can tell whether this run set a new record. `best`
  // (the prop) already reflects the run just recorded by the time the result
  // screen renders, so it cannot be compared against itself.
  const [bestBeforeRun, setBestBeforeRun] = useState(best);

  const session = useDrillSession(drill, {
    setActiveString,
    history: historySink,
    scoring: {
      onCorrect: scoring.onCorrect,
      onWrong: scoring.onWrong,
      onTimeout: scoring.onTimeout,
      getQuestionTime: scoring.getQuestionTime,
      session: scoring.session,
      showScore: true,
    },
  });

  // Render data for NoteCircle / FretGrid, straight from the drill config.
  // `'guitar'` is a spike shortcut: the seed stages are guitar stages and the
  // live note table is guitar's on a fresh app. (F.2 does not resolve the
  // real instrument, nor DrillConfig.candidates — both known, neither
  // blocking this task.)
  const derived = useDerivedNotes(
    activeString,
    drill.fretFrom,
    drill.fretTo,
    drill.wholeToneOnly,
    drill.dotsOnly,
    drill.accidental,
    drill.order,
    false,
    drill.isMulti ? drill.strings : [],
    'guitar',
  );

  // End-of-run detection. Mirrors App's approach (watch `running` fall from
  // true to false) rather than the engine's `onComplete`, so `session.result`
  // is read only after the final history entry has settled into state.
  const wasRunningRef = useRef(false);
  useEffect(() => {
    const wasRunning = wasRunningRef.current;
    wasRunningRef.current = session.running;
    if (
      wasRunning &&
      !session.running &&
      !session.paused &&
      session.result.questionsAnswered > 0 &&
      !stageResult
    ) {
      const result = buildStageResult(stage, session.result);
      setStageResult(result);
      // Parent owns persistence: it folds this into GameProgress and shows
      // the updated stars back on the list. Guarded by `!stageResult`, so
      // this fires exactly once per run even though `onFinish` is a fresh
      // closure on every parent render.
      onFinish(result);
    }
  }, [session.running, session.paused, session.result, stage, stageResult, onFinish]);

  const startStage = () => {
    unlockAudio();
    setBestBeforeRun(best);
    setStageResult(null);
    scoring.reset();
    scoring.beginRun(drill.timeLimit, drill.questionCount);
    session.start(drill.questionCount, drill.timeLimit, isByNote);
  };

  const leave = () => {
    session.stop();
    onBackToStages();
  };

  if (stageResult) {
    const r = stageResult.sessionResult;
    const isNewBest = stageResult.stars >= 1 && stageResult.stars > bestBeforeRun;
    return (
      <div className="app" style={panelStyle}>
        <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between' }}>
          <button className="clear-btn" onClick={onBackToStages}>
            ← Back
          </button>
          <strong>{stage.titleKey}</strong>
        </div>

        <h2 style={{ margin: 0 }}>Stage complete</h2>
        <div style={{ fontSize: 44, letterSpacing: 8 }}>{starGlyphs(stageResult.stars)}</div>
        <div>{stageResult.stars} / 3 stars this run</div>
        {isNewBest && <div style={{ fontWeight: 700 }}>🎉 New best!</div>}

        <div>Accuracy: {r.accuracy}%</div>
        <div>Longest streak: {r.longestStreak}</div>
        <div>
          Correct: {r.questionsCorrect}/{r.questionsAnswered}
        </div>
        <div style={{ opacity: 0.8 }}>Best stars: {best}★</div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="clear-btn" onClick={startStage}>
            Retry
          </button>
          {onNextStage ? (
            <button className="clear-btn" onClick={onNextStage}>
              Next stage ▶{nextStageTitle ? ` — ${nextStageTitle}` : ''}
            </button>
          ) : null}
          <button className="clear-btn" onClick={onBackToStages}>
            Back to stages
          </button>
        </div>
      </div>
    );
  }

  const idle = !session.running && !session.paused;

  return (
    <div className="app" style={{ ...panelStyle, alignItems: 'center' }}>
      <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between' }}>
        <button className="clear-btn" onClick={leave}>
          ← Stages
        </button>
        <strong>{stage.titleKey}</strong>
      </div>

      {idle ? (
        <button className="clear-btn" onClick={startStage}>
          Start stage
        </button>
      ) : (
        <>
          <div>
            Q {session.questionNumber}/{drill.questionCount} · {session.remaining}s
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>
            {isByNote
              ? session.currentNote ?? '—'
              : session.currentFret !== null
                ? `fret ${session.currentFret}`
                : '—'}
          </div>
          <div style={{ minHeight: 20 }}>{session.feedback}</div>
          <button className="clear-btn" onClick={session.stop}>
            Stop
          </button>
        </>
      )}

      {!idle &&
        (isByNote ? (
          <FretGrid
            fretFrom={drill.fretFrom}
            fretTo={drill.fretTo}
            guitarString={activeString}
            validFrets={new Set(Object.values(derived.noteFrets).flat())}
            active={session.running && !session.paused && !session.answered}
            correctFrets={session.remainingFrets}
            wrongFret={session.wrongFret}
            foundFrets={session.foundFrets}
            onSelect={session.selectFret}
          />
        ) : (
          <NoteCircle
            notes={derived.cofList}
            activeNotes={derived.activeNotes}
            active={session.running && !session.paused && !session.answered}
            correctNote={session.correctCofNote}
            wrongNote={session.wrongCofNote}
            onSelect={session.selectAnswer}
            guitarString={activeString}
            fretDots={derived.fretDots}
            noteFrets={derived.noteFrets}
            byString={false}
            startIndex={derived.startIndex}
            showDots
            accidental={drill.accidental}
            notation="alpha"
          />
        ))}
    </div>
  );
}

const panelStyle: CSSProperties = {
  padding: 20,
  gap: 12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
};
