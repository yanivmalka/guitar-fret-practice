import { useState } from 'react';
import type { HistoryEntry, AccidentalMode, NotationMode } from '../utils/music';
import { displayNote } from '../utils/music';

interface Props {
  history: HistoryEntry[];
  maxTime: number;
  maxQuestions: number;
  accidental: AccidentalMode;
  notation?: NotationMode;
  everPlayed: boolean;
}

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

export default function StatsPanel({ history, maxQuestions, accidental, notation }: Props) {
  const [tab, setTab] = useState<MainTab>('notes');
  const [filter, setFilter] = useState<Filter>('all');

  if (history.length === 0) return null;

  const total = history.length;
  const correct = history.filter(h => h.correct === true).length;
  const wrong = history.filter(h => h.correct === false).length;
  const timedOut = history.filter(h => h.skipped).length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);

  let encouragement = '';
  if (score >= 80) encouragement = '🔥 Amazing!';
  else if (score >= 60) encouragement = '💪 Great progress!';
  else if (score >= 40) encouragement = '👍 Getting there!';
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

  // Split into mastered/solid/growing for the active tab
  function splitBuckets<K extends string | number>(buckets: Record<K, StatBucket>): {
    mastered: [string, StatBucket][];
    solid: [string, StatBucket][];
    growing: [string, StatBucket][];
  } {
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

  // For string tab, replace numeric key with friendly name
  const namedStringGroups = {
    mastered: stringGroups.mastered.map(([k, v]) => [STRING_NAME[Number(k)] ?? `S${k}`, v] as [string, StatBucket]),
    solid: stringGroups.solid.map(([k, v]) => [STRING_NAME[Number(k)] ?? `S${k}`, v] as [string, StatBucket]),
    growing: stringGroups.growing.map(([k, v]) => [STRING_NAME[Number(k)] ?? `S${k}`, v] as [string, StatBucket]),
  };

  return (
    <div className="stats-panel">
      <div className="score-row">
        <span className="score">{score}%</span>
        <span className="encouragement">{encouragement}</span>
      </div>

      {/* Main tabs: Notes / Strings */}
      <div className="stats-tabs">
        <button className={`stats-tab ${tab === 'notes' ? 'stats-tab-active' : ''}`} onClick={() => setTab('notes')}>By Note</button>
        <button className={`stats-tab ${tab === 'strings' ? 'stats-tab-active' : ''}`} onClick={() => setTab('strings')}>By String</button>
      </div>

      {/* Filter chips */}
      <div className="filter-row">
        {(['all', 'correct', 'wrong', 'timeout'] as Filter[]).map(f => (
          <button key={f} className={`filter-chip ${filter === f ? 'filter-active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${total}/${maxQuestions})` : f === 'correct' ? `✓ ${correct}` : f === 'wrong' ? `✗ ${wrong}` : `⏱ ${timedOut}`}
          </button>
        ))}
      </div>

      {tab === 'notes' && (
        <>
          <GroupSection title="🏆 Mastered" cls="good"     items={noteGroups.mastered} filter={filter} accidental={accidental} notation={notation} />
          <GroupSection title="📈 Solid"    cls="solid"    items={noteGroups.solid}    filter={filter} accidental={accidental} notation={notation} />
          <GroupSection title="🌱 Growing"  cls="improving" items={noteGroups.growing}  filter={filter} accidental={accidental} notation={notation} />
        </>
      )}

      {tab === 'strings' && (
        <>
          {/* Per-string score bars */}
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

          <GroupSection title="🏆 Mastered" cls="good"      items={namedStringGroups.mastered} filter={filter} />
          <GroupSection title="📈 Solid"    cls="solid"     items={namedStringGroups.solid}    filter={filter} />
          <GroupSection title="🌱 Growing"  cls="improving"  items={namedStringGroups.growing}  filter={filter} />
        </>
      )}
    </div>
  );
}
