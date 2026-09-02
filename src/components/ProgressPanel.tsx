import { useMemo, useState } from 'react';
import type { HistoryEntry, AccidentalMode, NotationMode } from '../utils/music';
import { displayNote } from '../utils/music';
import { flattenHistory, fretMasteryMap } from '../utils/mastery';
import {
  dailyStats, practiceStreak, lifetimeTotals, weakNotes, allBestsSummary,
} from '../utils/progress';
import type { InstrumentConfig } from '../utils/instruments';
import { playClickSound, haptic } from '../utils/feedback';
import StatsPanel from './StatsPanel';

interface Props {
  allHistory: Record<string, HistoryEntry[]>;
  noteNames: string[];
  accidental: AccidentalMode;
  notation?: NotationMode;
  instrument: InstrumentConfig;
  onClose: () => void;
  // "This setup" tab: cumulative stats + session score for the current settings combination.
  currentHistory: HistoryEntry[];
  maxTime: number;
  maxQuestions: number;
  sessionScore?: number;
  longestStreak?: number;
  currentHistoryKey?: string;
  onClearCurrent?: () => void;
}

type Tab = 'current' | 'overview' | 'timeline' | 'fretboard' | 'focus';

const TAB_LABEL: Record<Tab, string> = {
  current: 'This setup',
  overview: 'Overview',
  timeline: 'Timeline',
  fretboard: 'Fretboard',
  focus: 'Focus',
};

const HEAT: Record<string, string> = {
  unplayed: 'var(--surface-2, #2a2a2a)',
  needsWork: '#c2410c',
  known: '#15803d',
};

function pct(n: number) { return `${Math.round(n * 100)}%`; }

// "6|0-12|byFret|dots" or "bass|6|0-12|byFret|dots" -> a short human caption.
function describeKey(key: string): string {
  const parts = key.split('|');
  let inst = '';
  if (parts.length === 5) { inst = parts.shift() === 'bass' ? '🎵 ' : '🎸 '; }
  const [strings, fret, mode, diff] = parts;
  const modeText = mode === 'byNote' ? 'by note' : 'by fret';
  return `${inst}str ${strings} · fr ${fret} · ${modeText} · ${diff}`;
}

export default function ProgressPanel({
  allHistory, noteNames, accidental, notation, instrument, onClose,
  currentHistory, maxTime, maxQuestions, sessionScore, longestStreak, currentHistoryKey, onClearCurrent,
}: Props) {
  const [tab, setTab] = useState<Tab>('current');
  const click = (fn: () => void) => () => { playClickSound(); haptic.tap(); fn(); };

  const all = useMemo(() => flattenHistory(allHistory), [allHistory]);
  const days = useMemo(() => dailyStats(all), [all]);
  const streak = useMemo(() => practiceStreak(days), [days]);
  const totals = useMemo(() => lifetimeTotals(all, days), [all, days]);
  const weak = useMemo(() => weakNotes(all, noteNames), [all, noteNames]);
  const bests = useMemo(() => allBestsSummary(), [allHistory]);

  if (all.length === 0) {
    return (
      <div className="stats-panel">
        <div className="stats-header-row">
          <span className="score">Stats &amp; progress</span>
          <button className="stats-clear-history" onClick={click(onClose)}>Close ✕</button>
        </div>
        <p className="encouragement">Play a few rounds and your all-time progress shows up here.</p>
      </div>
    );
  }

  const recentDays = days.slice(-14);
  const maxCount = Math.max(...recentDays.map(d => d.count), 1);

  return (
    <div className="stats-panel">
      <div className="stats-header-row">
        <span className="score">Stats &amp; progress</span>
        <button className="stats-clear-history" onClick={click(onClose)}>Close ✕</button>
      </div>

      <div className="stats-tabs">
        {(['current', 'overview', 'timeline', 'fretboard', 'focus'] as Tab[]).map(t => (
          <button
            key={t}
            className={`stats-tab ${tab === t ? 'stats-tab-active' : ''}`}
            onClick={click(() => setTab(t))}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'current' && (
        <StatsPanel
          embedded
          history={currentHistory}
          maxTime={maxTime}
          maxQuestions={maxQuestions}
          accidental={accidental}
          notation={notation}
          everPlayed
          sessionScore={sessionScore}
          longestStreak={longestStreak}
          historyKey={currentHistoryKey}
          onClear={onClearCurrent}
        />
      )}

      {tab === 'overview' && (
        <div className="score-summary">
          <div className="score-summary-line">
            <span className="score-summary-label">Questions answered</span>
            <span className="score-summary-value">{totals.totalQuestions}</span>
          </div>
          <div className="score-summary-line">
            <span className="score-summary-label">All-time accuracy</span>
            <span className="score-summary-value score-gold">{pct(totals.accuracy)}</span>
          </div>
          <div className="score-summary-line">
            <span className="score-summary-label">Avg speed</span>
            <span className="score-summary-value">⚡ {totals.avgSeconds.toFixed(1)}s</span>
          </div>
          <div className="score-summary-line">
            <span className="score-summary-label">Best speed</span>
            <span className="score-summary-value">🏆 {totals.bestSeconds.toFixed(1)}s</span>
          </div>
          <div className="score-summary-line">
            <span className="score-summary-label">Days practiced</span>
            <span className="score-summary-value">{totals.daysPracticed}</span>
          </div>
          <div className="score-summary-line">
            <span className="score-summary-label">Practice streak</span>
            <span className="score-summary-value">🔥 {streak.current} <span className="score-detail">(best {streak.longest})</span></span>
          </div>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="string-bars">
          {recentDays.length === 0 && (
            <p className="encouragement">Older sessions have no date stamp, so the timeline is empty. New sessions will fill it in.</p>
          )}
          {recentDays.map(d => (
            <div key={d.date} className="string-bar-row">
              <span className="string-bar-label">{d.date.slice(5)}</span>
              <div className="string-bar-track">
                <div
                  className="string-bar-fill bar-solid"
                  style={{ width: pct(d.count / maxCount) }}
                />
              </div>
              <span className="string-bar-pct">{pct(d.accuracy)}</span>
              <span className="string-bar-counts">{d.count}q · ⚡{d.avgSeconds.toFixed(1)}s</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'fretboard' && (
        <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 10 }}>
            <tbody>
              {Array.from({ length: instrument.stringCount }, (_, row) => {
                const stringNumber = row + 1; // 1 = highest-pitched
                const map = fretMasteryMap(all, stringNumber);
                return (
                  <tr key={stringNumber}>
                    <td style={{ padding: '0 6px 0 0', whiteSpace: 'nowrap', opacity: 0.7 }}>
                      {instrument.stringLabels[stringNumber] ?? `S${stringNumber}`}
                    </td>
                    {Array.from({ length: instrument.maxFret + 1 }, (_, fret) => {
                      const stat = map[fret];
                      const level = stat?.level ?? 'unplayed';
                      const title = stat && stat.level !== 'unplayed'
                        ? `String ${stringNumber} fret ${fret} — ${pct(stat.accuracy)}`
                        : `String ${stringNumber} fret ${fret} — not played`;
                      return (
                        <td
                          key={fret}
                          title={title}
                          style={{
                            width: 14, height: 14, background: HEAT[level],
                            border: '1px solid var(--bg, #1c1c1c)',
                          }}
                        />
                      );
                    })}
                  </tr>
                );
              })}
              <tr>
                <td />
                {Array.from({ length: instrument.maxFret + 1 }, (_, fret) => (
                  <td key={fret} style={{ textAlign: 'center', opacity: 0.5 }}>
                    {instrument.dotFrets.includes(fret) ? fret : ''}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, opacity: 0.8 }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: HEAT.known, verticalAlign: '-1px' }} /> known</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: HEAT.needsWork, verticalAlign: '-1px' }} /> needs work</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: HEAT.unplayed, verticalAlign: '-1px' }} /> unplayed</span>
          </div>
        </div>
      )}

      {tab === 'focus' && (
        <>
          <div className="stat-group">
            <p className="stat-group-title improving">🌱 Weakest notes</p>
            <div className="note-stats">
              {weak.length === 0 && <span className="note-stat">Nothing below 70% — nice.</span>}
              {weak.map(w => (
                <span key={w.label} className="note-stat">
                  {displayNote(w.label, accidental, notation)}: {pct(w.accuracy)}
                </span>
              ))}
            </div>
          </div>
          <div className="stat-group">
            <p className="stat-group-title good">🏆 Personal bests</p>
            <div className="string-bars">
              {bests.slice(0, 8).map(b => (
                <div key={b.key} className="string-bar-row">
                  <span className="string-bar-label" style={{ minWidth: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {describeKey(b.key)}
                  </span>
                  <span className="string-bar-pct score-gold">{b.best.score}</span>
                  <span className="string-bar-counts">🔥{b.best.streak} · {b.best.accuracy}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
