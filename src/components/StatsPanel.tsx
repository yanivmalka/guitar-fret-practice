import { useState } from 'react';
import type { HistoryEntry, AccidentalMode } from '../utils/music';
import { displayNote } from '../utils/music';

interface Props {
  history: HistoryEntry[];
  maxTime: number;
  accidental: AccidentalMode;
}

type Filter = 'all' | 'correct' | 'wrong' | 'timeout';

export default function StatsPanel({ history, accidental }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  if (history.length === 0) return null;

  const total = history.length;
  const correct = history.filter(h => h.correct === true).length;
  const wrong = history.filter(h => h.correct === false).length;
  const timedOut = history.filter(h => h.skipped).length;

  const score = Math.round(((correct * 1.0 + timedOut * 0.3) / total) * 100);

  let encouragement = '';
  if (score >= 80) encouragement = '🔥 Amazing!';
  else if (score >= 60) encouragement = '💪 Great progress!';
  else if (score >= 40) encouragement = '👍 Getting there!';
  else encouragement = '🎯 Keep building!';

  // Group notes by result category
  const byNote: Record<string, { correct: number; wrong: number; timeout: number }> = {};
  history.forEach(h => {
    if (!byNote[h.note]) byNote[h.note] = { correct: 0, wrong: 0, timeout: 0 };
    if (h.correct === true) byNote[h.note].correct++;
    else if (h.correct === false) byNote[h.note].wrong++;
    else byNote[h.note].timeout++;
  });

  const noteEntries = Object.entries(byNote);

  // Categorize: only count correct vs (wrong+timeout) — never master if failures dominate
  const mastered = noteEntries.filter(([, v]) => {
    const attempts = v.correct + v.wrong + v.timeout;
    return v.correct / attempts >= 0.75 && v.correct >= v.wrong + v.timeout;
  });
  const solid = noteEntries.filter(([, v]) => {
    const rate = v.correct / (v.correct + v.wrong + v.timeout);
    return rate >= 0.4 && rate < 0.75;
  });
  const growing = noteEntries.filter(([, v]) => v.correct / (v.correct + v.wrong + v.timeout) < 0.4);

  // Render note pill
  const renderNote = (note: string, v: { correct: number; wrong: number; timeout: number }) => {
    const label = displayNote(note, accidental);
    const fails = v.wrong + v.timeout;
    if (filter === 'all') {
      return (
        <span key={note} className="note-stat note-stat-split">
          <span className="note-stat-label">{label}</span>
          <span className="note-stat-good">✓{v.correct}</span>
          {fails > 0 && <span className="note-stat-bad">✗{fails}</span>}
        </span>
      );
    }
    const count = filter === 'correct' ? v.correct : filter === 'wrong' ? v.wrong : v.timeout;
    const total = v.correct + v.wrong + v.timeout;
    return <span key={note} className="note-stat">{label}: {count}/{total}</span>;
  };

  // Filter: show group only if it has notes matching the filter
  const shouldShowNote = (v: { correct: number; wrong: number; timeout: number }) => {
    if (filter === 'correct') return v.correct > 0;
    if (filter === 'wrong') return v.wrong > 0;
    if (filter === 'timeout') return v.timeout > 0;
    return true;
  };

  const filteredMastered = mastered.filter(([, v]) => shouldShowNote(v));
  const filteredSolid = solid.filter(([, v]) => shouldShowNote(v));
  const filteredGrowing = growing.filter(([, v]) => shouldShowNote(v));

  return (
    <div className="stats-panel">
      <div className="score-row">
        <span className="score">{score}%</span>
        <span className="encouragement">{encouragement}</span>
      </div>

      <div className="filter-row">
        {(['all', 'correct', 'wrong', 'timeout'] as Filter[]).map(f => (
          <button key={f} className={`filter-chip ${filter === f ? 'filter-active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${total})` : f === 'correct' ? `✓ (${correct})` : f === 'wrong' ? `✗ (${wrong})` : `⏱ (${timedOut})`}
          </button>
        ))}
      </div>

      {filteredMastered.length > 0 && (
        <div className="stat-group">
          <p className="stat-group-title good">🏆 Mastered</p>
          <div className="note-stats">{filteredMastered.map(([n, v]) => renderNote(n, v))}</div>
        </div>
      )}
      {filteredSolid.length > 0 && (
        <div className="stat-group">
          <p className="stat-group-title solid">📈 Solid</p>
          <div className="note-stats">{filteredSolid.map(([n, v]) => renderNote(n, v))}</div>
        </div>
      )}
      {filteredGrowing.length > 0 && (
        <div className="stat-group">
          <p className="stat-group-title improving">🌱 Growing</p>
          <div className="note-stats">{filteredGrowing.map(([n, v]) => renderNote(n, v))}</div>
        </div>
      )}
    </div>
  );
}
