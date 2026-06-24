import { useState } from 'react';
import type { HistoryEntry } from '../utils/music';

interface Props {
  history: HistoryEntry[];
  maxTime: number;
}

type Filter = 'all' | 'correct' | 'wrong' | 'timeout';

export default function StatsPanel({ history }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  if (history.length === 0) return null;

  const total = history.length;
  const correct = history.filter(h => h.correct === true).length;
  const wrong = history.filter(h => h.correct === false).length;
  const timedOut = history.filter(h => h.skipped).length;

  // Generous score
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

  // Categorize: mastered (>= 75% correct), solid (>= 40%), growing (< 40%)
  const mastered = noteEntries.filter(([, v]) => {
    const t = v.correct + v.wrong + v.timeout;
    return v.correct / t >= 0.75;
  });
  const solid = noteEntries.filter(([, v]) => {
    const t = v.correct + v.wrong + v.timeout;
    const rate = v.correct / t;
    return rate >= 0.4 && rate < 0.75;
  });
  const growing = noteEntries.filter(([, v]) => {
    const t = v.correct + v.wrong + v.timeout;
    return v.correct / t < 0.4;
  });

  const renderGroup = (entries: [string, { correct: number; wrong: number; timeout: number }][], filterType: Filter) => {
    return entries.map(([note, v]) => {
      const noteTotal = v.correct + v.wrong + v.timeout;
      let display = '';
      if (filterType === 'correct') display = `${v.correct}/${total}`;
      else if (filterType === 'wrong') display = `${v.wrong}/${total}`;
      else if (filterType === 'timeout') display = `${v.timeout}/${total}`;
      else display = `${noteTotal}/${total}`;
      return <span key={note} className="note-stat">{note}: {display}</span>;
    });
  };

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

      {(filter === 'all' || filter === 'correct') && mastered.length > 0 && (
        <div className="stat-group">
          <p className="good">🏆 Mastered:</p>
          <div className="note-stats">{renderGroup(mastered, filter)}</div>
        </div>
      )}
      {(filter === 'all' || filter === 'correct' || filter === 'wrong') && solid.length > 0 && (
        <div className="stat-group">
          <p className="solid">📈 Solid:</p>
          <div className="note-stats">{renderGroup(solid, filter)}</div>
        </div>
      )}
      {(filter === 'all' || filter === 'wrong' || filter === 'timeout') && growing.length > 0 && (
        <div className="stat-group">
          <p className="improving">🌱 Growing:</p>
          <div className="note-stats">{renderGroup(growing, filter)}</div>
        </div>
      )}
    </div>
  );
}
