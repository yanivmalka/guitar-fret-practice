import { useState, useEffect } from 'react';
import type { HistoryEntry, AccidentalMode, NotationMode } from '../utils/music';
import { displayNote } from '../utils/music';
import { playClickSound, haptic } from '../utils/feedback';
import { loadBest, saveBest } from '../utils/personalBest';

interface Props {
  history: HistoryEntry[];
  maxTime: number;
  maxQuestions: number;
  accidental: AccidentalMode;
  notation?: NotationMode;
  everPlayed: boolean;
  sessionScore?: number;
  longestStreak?: number;
  historyKey?: string;
  onClear?: () => void;
  // When rendered inside another panel (the unified Stats & progress screen),
  // drop the outer .stats-panel chrome so it doesn't double up.
  embedded?: boolean;
}

type TopTab = 'score' | 'details';
type MainTab = 'notes' | 'strings';
type Filter = 'all' | 'correct' | 'wrong' | 'timeout';

const STRING_NAME: Record<number, string> = {
  1: 'S1 E', 2: 'S2 B', 3: 'S3 G', 4: 'S4 D', 5: 'S5 A', 6: 'S6 E',
};

interface StatBucket { correct: number; wrong: number; timeout: number }

function rate(b: StatBucket) {
  const total = b.correct + b.wrong + b.timeout;
  return total === 0 ? 0 : b.correct / total;
}

function category(b: StatBucket): 'mastered' | 'solid' | 'growing' {
  const r = rate(b);
  if (r >= 0.75 && b.correct >= b.wrong + b.timeout) return 'mastered';
  if (r >= 0.4) return 'solid';
  return 'growing';
}

function Pill({ label, v, filter, accidental, notation }: { label: string; v: StatBucket; filter: Filter; accidental?: AccidentalMode; notation?: NotationMode }) {
  const display = accidental ? displayNote(label, accidental, notation) : label;
  const fails = v.wrong + v.timeout;
  if (filter === 'all') {
    return (
      <span className="note-stat note-stat-split">
        <span className="note-stat-label">{display}</span>
        <span className="note-stat-good">✓{v.correct}</span>
        {fails > 0 && <span className="note-stat-bad">✗{fails}</span>}
      </span>
    );
  }
  const count = filter === 'correct' ? v.correct : filter === 'wrong' ? v.wrong : v.timeout;
  const total = v.correct + v.wrong + v.timeout;
  return <span className="note-stat">{display}: {count}/{total}</span>;
}

function GroupSection({ title, cls, items, filter, accidental, notation }: {
  title: string; cls: string;
  items: [string, StatBucket][];
  filter: Filter;
  accidental?: AccidentalMode;
  notation?: NotationMode;
}) {
  if (items.length === 0) return null;
  return (
    <div className="stat-group">
      <p className={`stat-group-title ${cls}`}>{title}</p>
      <div className="note-stats">
        {items.map(([key, v]) => <Pill key={key} label={key} v={v} filter={filter} accidental={accidental} notation={notation} />)}
      </div>
    </div>
  );
}

export default function StatsPanel({ history, maxTime: _maxTime, accidental, notation, sessionScore, longestStreak, historyKey: hKey, onClear, embedded }: Props) {
  const [topTab, setTopTab] = useState<TopTab>('score');
  const [tab, setTab] = useState<MainTab>('notes');
  const [filter, setFilter] = useState<Filter>('all');

  // Same click feedback wrapper used across the app (sound + haptic).
  const click = (fn: () => void) => () => { playClickSound(); haptic.tap(); fn(); };

  const total = history.length;
  const correct = history.filter(h => h.correct === true).length;
  const currentScore = sessionScore ?? 0;
  const currentStreak = longestStreak ?? 0;
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

  // Save personal best (hook must be unconditional)
  useEffect(() => {
    if (!hKey || currentScore === 0 || total === 0) return;
    const prev = loadBest(hKey);
    if (!prev || currentScore > prev.score) {
      saveBest(hKey, { score: currentScore, streak: currentStreak, accuracy });
    }
  }, [hKey, currentScore, currentStreak, accuracy, total]);

  if (total === 0) {
    return embedded
      ? <p className="encouragement">No rounds recorded for this setup yet. Play a round and its stats show up here.</p>
      : null;
  }

  const wrong = history.filter(h => h.correct === false).length;
  const timedOut = history.filter(h => h.skipped).length;

  // Speed stats
  const correctEntries = history.filter(h => h.correct === true);
  const speedAvg = correctEntries.length > 0
    ? Math.round((correctEntries.reduce((sum, h) => sum + h.seconds, 0) / correctEntries.length) * 10) / 10
    : 0;
  const speedBest = correctEntries.length > 0
    ? Math.round(Math.min(...correctEntries.map(h => h.seconds)) * 10) / 10
    : 0;

  // Personal best
  const prevBest = hKey ? loadBest(hKey) : null;
  const isNewBest = prevBest ? currentScore > prevBest.score : currentScore > 0;

  let encouragement = '';
  if (accuracy >= 80) encouragement = '🔥 Amazing!';
  else if (accuracy >= 60) encouragement = '💪 Great progress!';
  else if (accuracy >= 40) encouragement = '👍 Getting there!';
  else encouragement = '🎯 Keep building!';

  // --- BY NOTE buckets ---
  const byNoteBuckets: Record<string, StatBucket> = {};
  history.forEach(h => {
    const key = displayNote(h.note, accidental, notation);
    if (!byNoteBuckets[key]) byNoteBuckets[key] = { correct: 0, wrong: 0, timeout: 0 };
    if (h.correct === true) byNoteBuckets[key].correct++;
    else if (h.correct === false) byNoteBuckets[key].wrong++;
    else byNoteBuckets[key].timeout++;
  });

  // --- BY STRING buckets ---
  const byStringBuckets: Record<number, StatBucket> = {};
  history.forEach(h => {
    if (!byStringBuckets[h.string]) byStringBuckets[h.string] = { correct: 0, wrong: 0, timeout: 0 };
    if (h.correct === true) byStringBuckets[h.string].correct++;
    else if (h.correct === false) byStringBuckets[h.string].wrong++;
    else byStringBuckets[h.string].timeout++;
  });

  const shouldShow = (v: StatBucket) => {
    if (filter === 'correct') return v.correct > 0;
    if (filter === 'wrong') return v.wrong > 0;
    if (filter === 'timeout') return v.timeout > 0;
    return true;
  };

  function splitBuckets<K extends string | number>(buckets: Record<K, StatBucket>) {
    const mastered: [string, StatBucket][] = [];
    const solid: [string, StatBucket][] = [];
    const growing: [string, StatBucket][] = [];
    (Object.entries(buckets) as [string, StatBucket][]).forEach(([key, v]) => {
      if (!shouldShow(v)) return;
      const cat = category(v);
      if (cat === 'mastered') mastered.push([key, v]);
      else if (cat === 'solid') solid.push([key, v]);
      else growing.push([key, v]);
    });
    return { mastered, solid, growing };
  }

  const noteGroups = splitBuckets(byNoteBuckets);
  const stringGroups = splitBuckets(byStringBuckets);
  const namedStringGroups = {
    mastered: stringGroups.mastered.map(([k, v]) => [STRING_NAME[Number(k)] ?? `S${k}`, v] as [string, StatBucket]),
    solid: stringGroups.solid.map(([k, v]) => [STRING_NAME[Number(k)] ?? `S${k}`, v] as [string, StatBucket]),
    growing: stringGroups.growing.map(([k, v]) => [STRING_NAME[Number(k)] ?? `S${k}`, v] as [string, StatBucket]),
  };

  const inner = (
    <>
      {/* Top-level tabs: Score / Details */}
      <div className="stats-tabs">
        <button className={`stats-tab ${topTab === 'score' ? 'stats-tab-active' : ''}`} onClick={click(() => setTopTab('score'))}>Score</button>
        <button className={`stats-tab ${topTab === 'details' ? 'stats-tab-active' : ''}`} onClick={click(() => setTopTab('details'))}>Details</button>
      </div>

      {/* Clear history + accuracy header */}
      <div className="stats-header-row">
        <span className="score">{accuracy}% <span className="score-detail">({correct}/{total})</span></span>
        {onClear && <button className="stats-clear-history" onClick={click(onClear)}>Clear History ✕</button>}
      </div>

      {topTab === 'score' && (
        <>
          <div className="score-row">
            <span className="encouragement">{encouragement}</span>
          </div>

          {currentScore > 0 && (
            <div className="score-summary">
              <div className="score-summary-line">
                <span className="score-summary-label">Score</span>
                <span className="score-summary-value score-gold">{currentScore}</span>
              </div>
              {currentStreak >= 2 && (
                <div className="score-summary-line">
                  <span className="score-summary-label">Best Streak</span>
                  <span className="score-summary-value">🔥 {currentStreak}</span>
                </div>
              )}
              {correctEntries.length > 0 && (
                <div className="score-summary-line">
                  <span className="score-summary-label">Avg Speed</span>
                  <span className="score-summary-value">⚡ {speedAvg}s</span>
                </div>
              )}
              {speedBest > 0 && (
                <div className="score-summary-line">
                  <span className="score-summary-label">Best Speed</span>
                  <span className="score-summary-value">🏆 {speedBest}s</span>
                </div>
              )}
            </div>
          )}

          {/* Personal best comparison */}
          {prevBest && (
            <div className="score-best">
              {isNewBest
                ? <span className="score-best-new">🏆 NEW PERSONAL BEST!</span>
                : <span className="score-best-prev">Previous best: {prevBest.score} pts ({prevBest.accuracy}%)</span>
              }
            </div>
          )}
          {!prevBest && currentScore > 0 && (
            <div className="score-best">
              <span className="score-best-new">🏆 First score recorded!</span>
            </div>
          )}
        </>
      )}

      {topTab === 'details' && (
        <>
          <div className="score-row">
            <span className="encouragement">✓{correct} ✗{wrong} ⏱{timedOut}</span>
          </div>

          {/* Sub tabs: Notes / Strings */}
          <div className="stats-tabs">
            <button className={`stats-tab ${tab === 'notes' ? 'stats-tab-active' : ''}`} onClick={click(() => setTab('notes'))}>By Note</button>
            <button className={`stats-tab ${tab === 'strings' ? 'stats-tab-active' : ''}`} onClick={click(() => setTab('strings'))}>By String</button>
          </div>

          <div className="filter-row">
            {(['all', 'correct', 'wrong', 'timeout'] as Filter[]).map(f => (
              <button key={f} className={`filter-chip ${filter === f ? 'filter-active' : ''}`} onClick={click(() => setFilter(filter === f && f !== 'all' ? 'all' : f))}>
                {f === 'all' ? `All (${total})` : f === 'correct' ? `✓ ${correct}` : f === 'wrong' ? `✗ ${wrong}` : `⏱ ${timedOut}`}
              </button>
            ))}
          </div>

          {tab === 'notes' && (
            <>
              <GroupSection title="🏆 Mastered" cls="good" items={noteGroups.mastered} filter={filter} accidental={accidental} notation={notation} />
              <GroupSection title="📈 Solid" cls="solid" items={noteGroups.solid} filter={filter} accidental={accidental} notation={notation} />
              <GroupSection title="🌱 Growing" cls="improving" items={noteGroups.growing} filter={filter} accidental={accidental} notation={notation} />
            </>
          )}

          {tab === 'strings' && (
            <>
              <div className="string-bars">
                {(Object.entries(byStringBuckets) as [string, StatBucket][])
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([strKey, v]) => {
                    const strNum = Number(strKey);
                    const t = v.correct + v.wrong + v.timeout;
                    const pct = t === 0 ? 0 : Math.round((v.correct / t) * 100);
                    const cat = category(v);
                    const barCls = cat === 'mastered' ? 'bar-mastered' : cat === 'solid' ? 'bar-solid' : 'bar-growing';
                    return (
                      <div key={strKey} className="string-bar-row">
                        <span className="string-bar-label">{STRING_NAME[strNum]}</span>
                        <div className="string-bar-track">
                          <div className={`string-bar-fill ${barCls}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="string-bar-pct">{pct}%</span>
                        <span className="string-bar-counts">✓{v.correct} ✗{v.wrong} ⏱{v.timeout}</span>
                      </div>
                    );
                  })}
              </div>
              <GroupSection title="🏆 Mastered" cls="good" items={namedStringGroups.mastered} filter={filter} />
              <GroupSection title="📈 Solid" cls="solid" items={namedStringGroups.solid} filter={filter} />
              <GroupSection title="🌱 Growing" cls="improving" items={namedStringGroups.growing} filter={filter} />
            </>
          )}
        </>
      )}
    </>
  );

  return embedded ? inner : <div className="stats-panel">{inner}</div>;
}
