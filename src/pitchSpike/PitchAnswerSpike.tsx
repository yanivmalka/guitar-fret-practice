import type { CSSProperties } from 'react';
import { usePitchAnswerSpike, type LogEntry } from './usePitchAnswerSpike';

// Zero-design prototype — the point is measuring real numbers on a real
// device, not a polished screen. See README.md for how to run the spike and
// what a go/no-go needs.
export default function PitchAnswerSpike() {
  const {
    micStatus,
    errorMessage,
    start,
    stop,
    question,
    liveReading,
    lastResult,
    log,
    noisyRoom,
    setNoisyRoom,
    nextQuestion,
    clearLog,
  } = usePitchAnswerSpike();

  const stringLabel = question ? `string ${question.stringIdx + 1}` : '';

  const summary = summarize(log);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 720 }}>
      <h1>Pitch-answer spike (throwaway)</h1>
      <p style={{ color: '#888', fontSize: 13 }}>
        Measures whether "play the note on the guitar" works as an answer modality — see
        premium-product-plan.md §7. Not wired into the real app or the real drill engine.
      </p>

      {micStatus === 'idle' && <button onClick={() => void start()}>Start listening</button>}
      {micStatus === 'requesting' && <p>Requesting microphone permission…</p>}
      {micStatus === 'denied' && (
        <div>
          <p>Microphone permission was denied.</p>
          <button onClick={() => void start()}>Try again</button>
        </div>
      )}
      {micStatus === 'error' && (
        <div>
          <p>Error: {errorMessage}</p>
          <button onClick={() => void start()}>Try again</button>
        </div>
      )}

      {micStatus === 'listening' && (
        <div style={{ marginTop: 16 }}>
          <button onClick={stop}>Stop</button>
          <label style={{ marginLeft: 16 }}>
            <input type="checkbox" checked={noisyRoom} onChange={(e) => setNoisyRoom(e.target.checked)} /> Noisy room
            (tag every attempt below until unchecked)
          </label>

          <div style={{ marginTop: 16, padding: 16, border: '1px solid #ccc', borderRadius: 8 }}>
            {!question && <button onClick={nextQuestion}>Start question</button>}

            {question && (
              <>
                <div style={{ fontSize: 14, color: '#888' }}>Play this note:</div>
                <div style={{ fontSize: 48 }}>
                  {question.noteName} <span style={{ fontSize: 20, color: '#888' }}>({stringLabel}, fret {question.fret})</span>
                </div>

                <div style={{ marginTop: 8, minHeight: 24, fontSize: 13, color: '#888' }}>
                  {liveReading
                    ? `hearing: ${liveReading.noteName} · ${liveReading.frequency.toFixed(1)} Hz · clarity ${liveReading.clarity.toFixed(2)}`
                    : 'listening…'}
                </div>

                {lastResult && (
                  <div style={{ marginTop: 12, fontWeight: 'bold', color: lastResult.outcome === 'correct' ? 'green' : 'crimson' }}>
                    {lastResult.outcome === 'correct'
                      ? `✅ correct — ${lastResult.latencyMs}ms, ${lastResult.cents}c, octave ${lastResult.correctOctave ? 'match' : 'MISMATCH'}, clarity ${lastResult.clarity?.toFixed(2)}`
                      : '⏱️ timeout — no matching pitch detected'}
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <button onClick={nextQuestion}>Next question</button>
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <strong>Summary ({summary.total} attempts):</strong>{' '}
            {summary.total === 0
              ? 'no attempts yet'
              : `pitch-class correct ${summary.pctCorrect}% · octave-exact ${summary.pctOctaveExact}% · timeouts ${summary.timeouts} · avg latency ${summary.avgLatencyMs ?? '—'}ms`}
            {log.length > 0 && (
              <button style={{ marginLeft: 12 }} onClick={() => void copyLog(log)}>
                Copy log as JSON
              </button>
            )}
            {log.length > 0 && (
              <button style={{ marginLeft: 8 }} onClick={clearLog}>
                Clear log
              </button>
            )}
          </div>

          <table style={{ marginTop: 12, fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={cellStyle}>target</th>
                <th style={cellStyle}>outcome</th>
                <th style={cellStyle}>detected</th>
                <th style={cellStyle}>cents</th>
                <th style={cellStyle}>octave</th>
                <th style={cellStyle}>clarity</th>
                <th style={cellStyle}>latency</th>
                <th style={cellStyle}>noisy</th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry) => (
                <tr key={entry.at}>
                  <td style={cellStyle}>
                    {entry.targetNote} (s{entry.targetString} f{entry.targetFret})
                  </td>
                  <td style={cellStyle}>{entry.outcome}</td>
                  <td style={cellStyle}>{entry.detectedNote ?? '—'}</td>
                  <td style={cellStyle}>{entry.cents ?? '—'}</td>
                  <td style={cellStyle}>{entry.correctOctave === null ? '—' : entry.correctOctave ? 'yes' : 'no'}</td>
                  <td style={cellStyle}>{entry.clarity?.toFixed(2) ?? '—'}</td>
                  <td style={cellStyle}>{entry.latencyMs ?? '—'}</td>
                  <td style={cellStyle}>{entry.noisyRoom ? 'yes' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cellStyle: CSSProperties = { border: '1px solid #ddd', padding: '2px 6px', textAlign: 'left' };

function summarize(log: LogEntry[]) {
  const total = log.length;
  const correct = log.filter((e) => e.outcome === 'correct');
  const octaveExact = correct.filter((e) => e.correctOctave);
  const timeouts = log.filter((e) => e.outcome === 'timeout').length;
  const latencies = correct.map((e) => e.latencyMs).filter((v): v is number => v !== null);
  const avgLatencyMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
  return {
    total,
    pctCorrect: total > 0 ? Math.round((correct.length / total) * 100) : 0,
    pctOctaveExact: total > 0 ? Math.round((octaveExact.length / total) * 100) : 0,
    timeouts,
    avgLatencyMs,
  };
}

async function copyLog(log: LogEntry[]) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    alert(`Copied ${log.length} entries to clipboard.`);
  } catch {
    alert('Could not access clipboard — copy manually from the browser console instead.');
    console.log(JSON.stringify(log, null, 2));
  }
}
