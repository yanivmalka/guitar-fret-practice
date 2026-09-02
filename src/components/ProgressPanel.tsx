import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { HistoryEntry, AccidentalMode, NotationMode } from '../utils/music';
import { displayNote } from '../utils/music';
import { historyForInstrument, fretMasteryMap, noteMasteryMap } from '../utils/mastery';
import {
  dailyStats, practiceStreak, lifetimeTotals, weakNotes, allBestsSummary,
} from '../utils/progress';
import { loadBest, saveBest } from '../utils/personalBest';
import type { InstrumentConfig } from '../utils/instruments';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  allHistory: Record<string, HistoryEntry[]>;
  noteNames: string[];
  accidental: AccidentalMode;
  notation?: NotationMode;
  instrument: InstrumentConfig;
  onClose: () => void;
  // "This setup" scope: the history + session score for the current settings combination.
  currentHistory: HistoryEntry[];
  sessionScore?: number;
  longestStreak?: number;
  currentHistoryKey?: string;
  // The strings / fret range the current setup actually drills — used to scope
  // the "This setup" not-practiced-yet lists to what that setup can cover.
  setupStrings: number[];
  setupFretFrom: number;
  setupFretTo: number;
  onClearCurrent?: () => void; // clears just the current settings combination
  onClearAll?: () => void;     // clears every combination
}

type Scope = 'setup' | 'all';

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

// ── shared analytics ────────────────────────────────────────────
interface Bucket { correct: number; wrong: number; timeout: number }
function bucketRate(b: Bucket) {
  const t = b.correct + b.wrong + b.timeout;
  return t === 0 ? 0 : b.correct / t;
}
function bucketCat(b: Bucket): 'mastered' | 'solid' | 'growing' {
  const r = bucketRate(b);
  if (r >= 0.75 && b.correct >= b.wrong + b.timeout) return 'mastered';
  if (r >= 0.4) return 'solid';
  return 'growing';
}
function tallyBuckets<K extends string | number>(
  history: HistoryEntry[], keyOf: (h: HistoryEntry) => K,
): Map<K, Bucket> {
  const m = new Map<K, Bucket>();
  for (const h of history) {
    const k = keyOf(h);
    let b = m.get(k);
    if (!b) { b = { correct: 0, wrong: 0, timeout: 0 }; m.set(k, b); }
    if (h.correct === true) b.correct++;
    else if (h.correct === false) b.wrong++;
    else b.timeout++;
  }
  return m;
}

// ── presentational primitives ──────────────────────────────────
function HeroTiles({ tiles }: { tiles: Array<{ v: ReactNode; l: string; gold?: boolean }> }) {
  return (
    <div className="sp2-hero">
      {tiles.map(t => (
        <div className="sp2-tile" key={t.l}>
          <span className={`sp2-tile-v${t.gold ? ' score-gold' : ''}`}>{t.v}</span>
          <span className="sp2-tile-l">{t.l}</span>
        </div>
      ))}
    </div>
  );
}

function BarRows({ rows }: { rows: Array<{ label: string; value: number; cat: 'mastered' | 'solid' | 'growing'; detail?: string }> }) {
  if (rows.length === 0) return <p className="encouragement">Not enough data yet.</p>;
  return (
    <div className="string-bars">
      {rows.map(r => (
        <div className="string-bar-row" key={r.label}>
          <span className="string-bar-label">{r.label}</span>
          <div className="string-bar-track">
            <div className={`string-bar-fill bar-${r.cat}`} style={{ width: `${r.value}%` }} />
          </div>
          <span className="string-bar-pct">{r.value}%</span>
          {r.detail && <span className="string-bar-counts">{r.detail}</span>}
        </div>
      ))}
    </div>
  );
}

// The "haven't practiced this yet" tail shown under a By-* breakdown: the
// notes / strings / frets in range that have no recorded answers at all.
function UnplayedChips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="sp2-unplayed">
      <p className="sp2-unplayed-title">Not practiced yet</p>
      <div className="note-stats">
        {items.map(x => (
          <span key={x} className="note-stat note-stat-muted">{x}</span>
        ))}
      </div>
    </div>
  );
}

function Expander({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <>
      <button className={`sp2-exp${open ? ' sp2-exp-open' : ''}`} onClick={onToggle}>
        <span>{label}</span>
        <span className="sp2-chev" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && <div className="sp2-exp-body">{children}</div>}
    </>
  );
}

const HEAT: Record<string, string> = {
  unplayed: '#24244a',
  needsWork: '#ff9d2e',
  known: '#34e07a',
};

// Short open-note label ("String 1 · high E" -> "E") for the heatmap rows.
function shortStringLabel(label: string | undefined, n: number): string {
  const parts = (label ?? '').split(/[·\s]+/).filter(Boolean);
  return parts[parts.length - 1] ?? `S${n}`;
}

function FretHeatmap({ history, instrument }: { history: HistoryEntry[]; instrument: InstrumentConfig }) {
  const frets = Array.from({ length: instrument.maxFret + 1 }, (_, f) => f);
  return (
    <div className="sp2-heat-scroll">
      <div className="sp2-heat">
        {Array.from({ length: instrument.stringCount }, (_, row) => {
          const stringNumber = row + 1;
          const map = fretMasteryMap(history, stringNumber);
          return (
            <div className="sp2-heat-row" key={stringNumber}>
              <span className="sp2-heat-str">{shortStringLabel(instrument.stringLabels[stringNumber], stringNumber)}</span>
              {frets.map(fret => {
                const stat = map[fret];
                const level = stat?.level ?? 'unplayed';
                const title = stat && stat.level !== 'unplayed'
                  ? `String ${stringNumber} fret ${fret} — ${pct(stat.accuracy)}`
                  : `String ${stringNumber} fret ${fret} — not played`;
                return <span key={fret} className="sp2-heat-cell" title={title} style={{ background: HEAT[level] }} />;
              })}
            </div>
          );
        })}
        <div className="sp2-heat-row sp2-heat-nums">
          <span className="sp2-heat-str" />
          {frets.map(fret => (
            <span key={fret} className="sp2-heat-num">{instrument.dotFrets.includes(fret) ? fret : ''}</span>
          ))}
        </div>
      </div>
      <div className="sp2-heat-legend">
        <span><i style={{ background: HEAT.known }} /> known</span>
        <span><i style={{ background: HEAT.needsWork }} /> needs work</span>
        <span><i style={{ background: HEAT.unplayed }} /> unplayed</span>
      </div>
    </div>
  );
}

function Timeline({ history }: { history: HistoryEntry[] }) {
  const days = dailyStats(history).slice(-14);
  if (days.length === 0) {
    return <p className="encouragement">Older sessions have no date stamp, so the timeline is empty. New sessions fill it in.</p>;
  }
  const maxCount = Math.max(...days.map(d => d.count), 1);
  return (
    <div className="string-bars">
      {days.map(d => (
        <div key={d.date} className="string-bar-row">
          <span className="string-bar-label">{d.date.slice(5)}</span>
          <div className="string-bar-track">
            <div className="string-bar-fill bar-solid" style={{ width: pct(d.count / maxCount) }} />
          </div>
          <span className="string-bar-pct">{pct(d.accuracy)}</span>
          <span className="string-bar-counts">{d.count}q · ⚡{d.avgSeconds.toFixed(1)}s</span>
        </div>
      ))}
    </div>
  );
}

// ── one scope's worth of stats ─────────────────────────────────
function ScopeView({
  scope, history, noteNames, accidental, notation, instrument,
  sessionScore, longestStreak, currentHistoryKey,
  setupStrings, setupFretFrom, setupFretTo,
}: {
  scope: Scope;
  history: HistoryEntry[];
  noteNames: string[];
  accidental: AccidentalMode;
  notation?: NotationMode;
  instrument: InstrumentConfig;
  sessionScore?: number;
  longestStreak?: number;
  currentHistoryKey?: string;
  setupStrings: number[];
  setupFretFrom: number;
  setupFretTo: number;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => () => { playClickSound(); haptic.tap(); setOpen(o => (o === id ? null : id)); };

  const days = useMemo(() => dailyStats(history), [history]);
  const streak = useMemo(() => practiceStreak(days), [days]);
  const totals = useMemo(() => lifetimeTotals(history, days), [history, days]);
  const weak = useMemo(() => weakNotes(history, noteNames), [history, noteNames]);
  const bests = useMemo(() => allBestsSummary(instrument.id), [history, instrument.id]);

  const noteRows = useMemo(() => {
    const m = tallyBuckets(history, h => displayNote(h.note, accidental, notation));
    return [...m.entries()]
      .map(([label, b]) => ({ label, value: Math.round(bucketRate(b) * 100), cat: bucketCat(b), n: b.correct + b.wrong + b.timeout }))
      .filter(r => r.n > 0)
      .sort((a, b) => a.value - b.value);
  }, [history, accidental, notation]);

  // Notes in the current note set that have no recorded answers at all — the
  // gaps the "By note" bars can't show because they only plot played notes.
  const unplayedNotes = useMemo(() => {
    const map = noteMasteryMap(history, noteNames);
    return noteNames
      .filter(n => map[n].level === 'unplayed')
      .map(n => displayNote(n, accidental, notation));
  }, [history, noteNames, accidental, notation]);

  const stringRows = useMemo(() => {
    const m = tallyBuckets(history, h => h.string);
    return [...m.entries()]
      .sort(([a], [b]) => a - b)
      .map(([num, b]) => ({
        label: instrument.stringLabels[num] ?? `S${num}`,
        value: Math.round(bucketRate(b) * 100),
        cat: bucketCat(b),
        detail: `✓${b.correct} ✗${b.wrong} ⏱${b.timeout}`,
      }));
  }, [history, instrument]);

  // The strings / frets the active scope is allowed to cover. "All time" spans
  // the whole neck; "This setup" is limited to what the current setup drills,
  // so it never lists frets or strings that setup can't reach.
  const scopeStrings = useMemo(() => (
    scope === 'setup'
      ? [...setupStrings].sort((a, b) => a - b)
      : Array.from({ length: instrument.stringCount }, (_, i) => i + 1)
  ), [scope, setupStrings, instrument.stringCount]);

  const scopeFrets = useMemo(() => {
    const [lo, hi] = scope === 'setup'
      ? [setupFretFrom, setupFretTo]
      : [0, instrument.maxFret];
    return Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);
  }, [scope, setupFretFrom, setupFretTo, instrument.maxFret]);

  // Strings in scope with no recorded answers yet.
  const unplayedStrings = useMemo(() => {
    const played = new Set(history.map(h => h.string));
    return scopeStrings
      .filter(num => !played.has(num))
      .map(num => instrument.stringLabels[num] ?? `S${num}`);
  }, [history, scopeStrings, instrument]);

  const fretRows = useMemo(() => {
    const m = tallyBuckets(history, h => h.fret);
    return [...m.entries()]
      .map(([fret, b]) => ({
        label: `Fret ${fret}`,
        value: Math.round(bucketRate(b) * 100),
        cat: bucketCat(b),
        detail: `✓${b.correct} ✗${b.wrong} ⏱${b.timeout}`,
        fret,
      }))
      .sort((a, b) => a.value - b.value || a.fret - b.fret);
  }, [history]);

  // Frets in scope with no recorded answers yet.
  const unplayedFrets = useMemo(() => {
    const played = new Set(history.map(h => h.fret));
    return scopeFrets.filter(f => !played.has(f)).map(f => `Fret ${f}`);
  }, [history, scopeFrets]);

  if (history.length === 0) {
    return (
      <p className="encouragement">
        {scope === 'setup'
          ? 'No rounds recorded for this setup yet. Play a round and its stats show up here.'
          : 'Play a few rounds and your all-time progress shows up here.'}
      </p>
    );
  }

  const bestStreak = Math.max(longestStreak ?? 0, currentHistoryKey ? loadBest(currentHistoryKey)?.streak ?? 0 : 0);

  const heroTiles = scope === 'setup'
    ? [
        { v: pct(totals.accuracy), l: 'accuracy', gold: true },
        { v: <>🔥 {bestStreak}</>, l: 'best streak' },
        { v: <>⚡ {totals.avgSeconds.toFixed(1)}s</>, l: 'avg speed' },
      ]
    : [
        { v: pct(totals.accuracy), l: 'accuracy', gold: true },
        { v: <>🔥 {streak.current}</>, l: 'day streak' },
        { v: totals.totalQuestions, l: 'answered' },
      ];

  return (
    <>
      <HeroTiles tiles={heroTiles} />

      {scope === 'setup' && (sessionScore ?? 0) > 0 && (
        <div className="score-summary">
          <div className="score-summary-line">
            <span className="score-summary-label">Last round</span>
            <span className="score-summary-value score-gold">{sessionScore} pts</span>
          </div>
          {totals.bestSeconds > 0 && (
            <div className="score-summary-line">
              <span className="score-summary-label">Best speed</span>
              <span className="score-summary-value">🏆 {totals.bestSeconds.toFixed(1)}s</span>
            </div>
          )}
        </div>
      )}

      <div className="stat-group">
        <p className="stat-group-title improving">🎯 Weakest notes</p>
        <div className="note-stats">
          {weak.length === 0 && <span className="note-stat">Nothing below 70% — nice.</span>}
          {weak.map(w => (
            <span key={w.label} className="note-stat note-stat-split">
              <span className="note-stat-label">{displayNote(w.label, accidental, notation)}</span>
              <span className="note-stat-bad">{pct(w.accuracy)}</span>
            </span>
          ))}
        </div>
      </div>

      <Expander label="By note" open={open === 'note'} onToggle={toggle('note')}>
        {noteRows.length > 0 && <BarRows rows={noteRows} />}
        <UnplayedChips items={unplayedNotes} />
      </Expander>
      <Expander label="By string" open={open === 'string'} onToggle={toggle('string')}>
        {stringRows.length > 0 && <BarRows rows={stringRows} />}
        <UnplayedChips items={unplayedStrings} />
      </Expander>
      <Expander label="By fret" open={open === 'byfret'} onToggle={toggle('byfret')}>
        {fretRows.length > 0 && <BarRows rows={fretRows} />}
        <UnplayedChips items={unplayedFrets} />
      </Expander>
      <Expander label="Fretboard heatmap" open={open === 'fret'} onToggle={toggle('fret')}>
        <FretHeatmap history={history} instrument={instrument} />
      </Expander>
      <Expander label="Daily timeline" open={open === 'time'} onToggle={toggle('time')}>
        <Timeline history={history} />
      </Expander>
      {scope === 'all' && (
        <Expander label="Personal bests" open={open === 'bests'} onToggle={toggle('bests')}>
          <div className="string-bars">
            {bests.length === 0 && <p className="encouragement">No personal bests recorded yet.</p>}
            {bests.slice(0, 8).map(b => (
              <div key={b.key} className="string-bar-row">
                <span className="string-bar-label" style={{ minWidth: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>
                  {describeKey(b.key)}
                </span>
                <span className="string-bar-pct score-gold">{b.best.score}</span>
                <span className="string-bar-counts">🔥{b.best.streak} · {b.best.accuracy}%</span>
              </div>
            ))}
          </div>
        </Expander>
      )}
    </>
  );
}

export default function ProgressPanel({
  allHistory, noteNames, accidental, notation, instrument, onClose,
  currentHistory, sessionScore, longestStreak, currentHistoryKey,
  setupStrings, setupFretFrom, setupFretTo, onClearCurrent, onClearAll,
}: Props) {
  const [scope, setScope] = useState<Scope>('setup');
  const [confirm, setConfirm] = useState<null | Scope>(null);
  const click = (fn: () => void) => () => { playClickSound(); haptic.tap(); fn(); };

  const all = useMemo(
    () => historyForInstrument(allHistory, instrument.id),
    [allHistory, instrument.id],
  );

  // Persist the current session's personal best, same as the old panel did.
  const currentScore = sessionScore ?? 0;
  const currentStreak = longestStreak ?? 0;
  const currentCorrect = currentHistory.filter(h => h.correct === true).length;
  const currentAccuracy = currentHistory.length === 0
    ? 0 : Math.round((currentCorrect / currentHistory.length) * 100);
  useEffect(() => {
    if (!currentHistoryKey || currentScore === 0 || currentHistory.length === 0) return;
    const prev = loadBest(currentHistoryKey);
    if (!prev || currentScore > prev.score) {
      saveBest(currentHistoryKey, { score: currentScore, streak: currentStreak, accuracy: currentAccuracy });
    }
  }, [currentHistoryKey, currentScore, currentStreak, currentAccuracy, currentHistory.length]);

  const history = scope === 'setup' ? currentHistory : all;

  return (
    <div className="stats-panel sp2">
      <div className="sp2-head">
        <button className="sp2-back" onClick={click(onClose)}>‹ Back</button>
        <span className="sp2-title">Stats &amp; progress</span>
      </div>

      <div className="sp2-scope">
        <button
          className={`sp2-scope-btn${scope === 'setup' ? ' sp2-scope-active' : ''}`}
          onClick={click(() => setScope('setup'))}
        >This setup</button>
        <button
          className={`sp2-scope-btn${scope === 'all' ? ' sp2-scope-active' : ''}`}
          onClick={click(() => setScope('all'))}
        >All time</button>
      </div>
      <p className="sp2-scope-cap">
        {scope === 'setup'
          ? (currentHistoryKey ? describeKey(currentHistoryKey) : 'the current settings')
          : `across every ${instrument.label.toLowerCase()} settings combination`}
      </p>

      <ScopeView
        key={scope}
        scope={scope}
        history={history}
        noteNames={noteNames}
        accidental={accidental}
        notation={notation}
        instrument={instrument}
        sessionScore={sessionScore}
        longestStreak={longestStreak}
        currentHistoryKey={currentHistoryKey}
        setupStrings={setupStrings}
        setupFretFrom={setupFretFrom}
        setupFretTo={setupFretTo}
      />

      {history.length > 0 && (
        <button className="sp2-danger" onClick={click(() => setConfirm(scope))}>
          {scope === 'setup' ? 'Clear history for this setup' : 'Clear all history'}
        </button>
      )}

      {confirm && (
        <div className="mic-overlay" onClick={click(() => setConfirm(null))}>
          <div className="mic-card" onClick={e => e.stopPropagation()}>
            <div className="mic-card-title">
              {confirm === 'setup' ? 'Clear this setup’s history?' : 'Clear all stats?'}
            </div>
            <p className="mic-card-body">
              {confirm === 'setup'
                ? 'This erases the practice history for the current settings combination only. Other combinations and your personal bests are kept.'
                : 'This permanently erases your entire practice history and resets the all-time mastery for every note, string and settings combination. Your personal bests are kept.'}
              {' '}<strong>This can&rsquo;t be undone.</strong>
            </p>
            <div className="mic-card-actions">
              <button
                className="mic-btn mic-btn-danger"
                onClick={click(() => {
                  const which = confirm;
                  setConfirm(null);
                  if (which === 'setup') onClearCurrent?.();
                  else onClearAll?.();
                })}
              >
                Delete anyway
              </button>
              <button className="mic-btn mic-btn-ghost" onClick={click(() => setConfirm(null))}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
