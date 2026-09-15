import { useMemo, useState } from 'react';
import { useTuner } from './useTuner';
import NoteWheel from './NoteWheel';
import { STANDARD_TUNING_STRINGS } from './standardTuning';
import { centsFromNote } from './noteUtils';
import { audibleErrorPercent, classifyCents, isInTune, zoneColor } from './tuningZones';

// Zero-design prototype: this only needs to prove the pitch-detection works.
// Layout/visuals are intentionally left to the later integration pass (see
// src/tuner/README.md).
export default function Tuner() {
  const { status, reading, errorMessage, start, stop } = useTuner();

  // Locking (pinning) a note means "this is the string I'm tuning" — the
  // wheel holds that note at 12 o'clock instead of following whatever pitch
  // is detected, and the compass measures distance from THAT note rather
  // than from whichever note the raw frequency happens to be closest to.
  const [pinnedNote, setPinnedNote] = useState<string | null>(null);

  const handleSelectNote = (note: string) => {
    setPinnedNote((prev) => (prev === note ? null : note));
  };

  const targetNote = pinnedNote ?? (reading ? reading.note.name : null);

  const cents = useMemo(() => {
    if (!reading) return null;
    if (pinnedNote) return centsFromNote(reading.frequency, pinnedNote);
    return reading.note.cents;
  }, [reading, pinnedNote]);

  const zone = cents !== null ? classifyCents(cents) : null;
  const stringNumbers = targetNote ? STANDARD_TUNING_STRINGS[targetNote] : undefined;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>Tuner (prototype)</h1>

      {status === 'idle' && <button onClick={() => void start()}>Start listening</button>}
      {status === 'requesting' && <p>Requesting microphone permission…</p>}
      {status === 'listening' && <button onClick={stop}>Stop</button>}
      {status === 'denied' && (
        <div>
          <p>Microphone permission was denied. Allow microphone access in the browser and try again.</p>
          <button onClick={() => void start()}>Try again</button>
        </div>
      )}
      {status === 'error' && (
        <div>
          <p>Error: {errorMessage}</p>
          <button onClick={() => void start()}>Try again</button>
        </div>
      )}

      {status === 'listening' && (
        <div style={{ marginTop: 24 }}>
          <p style={{ maxWidth: 340, color: '#888', fontSize: 13 }}>
            Click a note on the wheel to lock ("pin") it at 12 o'clock — that's the string you're tuning. Click it
            again to go back to auto-detect.
          </p>

          {targetNote && (
            <div style={{ marginBottom: 8 }}>
              {pinnedNote ? 'Tuning: ' : 'Detected: '}
              <strong>{targetNote}</strong>
              {stringNumbers && ` — string ${stringNumbers.join(' or ')}`}
              {pinnedNote && (
                <button style={{ marginLeft: 8 }} onClick={() => setPinnedNote(null)}>
                  Unpin
                </button>
              )}
            </div>
          )}

          <NoteWheel
            targetNote={targetNote}
            pinnedNote={pinnedNote}
            cents={cents}
            onSelectNote={handleSelectNote}
            pinLabel="Click to pin this note at 12 o'clock"
            unpinLabel="Click to unpin"
          />

          {reading ? (
            <>
              <div style={{ fontSize: 64 }}>
                {reading.note.name}
                <sub>{reading.note.octave}</sub>
              </div>
              <div>{reading.frequency.toFixed(1)} Hz</div>
              {cents !== null && zone && (
                <div style={{ color: zoneColor(zone) }}>
                  {cents > 0 ? '+' : ''}
                  {cents} cents
                  {isInTune(cents) ? (
                    ' — in tune'
                  ) : (
                    <>
                      {' — '}
                      {cents < 0 ? 'tighten (raise pitch)' : 'loosen (lower pitch)'}
                      {(zone === 'noticeable' || zone === 'off') && ` · ~${audibleErrorPercent(cents)}% of the audible threshold`}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <p>Listening… play a note.</p>
          )}
        </div>
      )}
    </div>
  );
}
