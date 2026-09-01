import { useCallback, useEffect, useRef, useState } from 'react';
import { displayNote, type AccidentalMode, type NotationMode } from '../utils/music';
import { captureUtterance } from '../utils/utteranceCapture';
import { computeMfcc, framesToJson, framesFromJson } from '../utils/mfcc';
import { dtwDistance } from '../utils/dtw';
import {
  addTemplate, deleteProfile, deleteTemplateByKey, getActiveProfile,
  listLabelTemplates, loadTemplates, recomputeReady, setActiveProfile, templateCounts,
  ADAPTIVE_PROFILE,
} from '../utils/voiceProfile';
import {
  LETTER_LABELS, ACCIDENTAL_LABELS, PROFILE_LABELS, profileVocabId,
} from '../utils/voiceProfileVocab';
import { resemblesSpokenNote } from '../utils/calibrationGate';
import { resetSpeechEngine } from '../utils/speech';
import type { SpeechNotation } from '../utils/speechVocab';
import { playClickSound, haptic } from '../utils/feedback';

const SAMPLES_PER_LABEL = 2;

interface Props {
  notation: NotationMode;
  accidental: AccidentalMode;
  onClose: () => void;
  /** Called after the profile changed so the parent can re-pick the engine. */
  onProfileChanged: () => void;
}

type RecState = 'idle' | 'recording' | 'thinking';

// A one-time, on-device calibration. Instead of every accidental note as a
// whole phrase, the user records nine short isolated words: the seven
// natural letters plus the accidental words "sharp"/"dièse" and "flat".
// At question time the recogniser splits the spoken answer and matches each
// part. Nothing leaves the device.
//
// Recording is automatic: the user presses "Start" once and then just
// speaks each word as it appears. Every capture is checked against the
// bundled general reference (`calibrationGate`) so background noise is not
// saved as a template, and each take can be deleted individually if it
// still came out wrong.
export default function VoiceCalibration({ notation, accidental, onClose, onProfileChanged }: Props) {
  const vocabId = profileVocabId(notation as SpeechNotation);
  const [profile, setProfile] = useState(() => getActiveProfile() ?? 'My profile');
  const [idx, setIdx] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [takes, setTakes] = useState<{ key: string; createdAt: number }[]>([]);
  const [rec, setRec] = useState<RecState>('idle');
  const [level, setLevel] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  // Raw PCM of the most recent capture, so the user can hear what was recorded.
  const lastPcmRef = useRef<{ pcm: Float32Array; sampleRate: number } | null>(null);
  const [hasLast, setHasLast] = useState(false);
  const [selfTest, setSelfTest] = useState<string[] | null>(null);
  const [testing, setTesting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  // Consecutive failed/empty/rejected captures while running; a short run of
  // them means the mic is unusable or the room is too noisy, so auto mode
  // stops instead of looping forever.
  const autoMissRef = useRef(0);

  const label = PROFILE_LABELS[idx];
  const isAccidental = (ACCIDENTAL_LABELS as readonly string[]).includes(label);
  // The accidental word follows the notation: "sharp"/"flat" for A-B-C,
  // "dièse"/"bémol" for do-re-mi. Always shown in its own language, never
  // transliterated to Hebrew.
  const accidentalWord = label === '#'
    ? (notation === 'solfege' ? 'dièse' : 'sharp')
    : (notation === 'solfege' ? 'bémol' : 'flat');
  const prompt = isAccidental
    ? accidentalWord
    : displayNote(label, accidental, notation);
  const hint = isAccidental
    ? 'Say just this word, on its own'
    : 'Say just the note name, on its own';

  // Display text for any label (letter or accidental), for the self-test list.
  const labelText = useCallback((l: string) => {
    if ((ACCIDENTAL_LABELS as readonly string[]).includes(l)) {
      return l === '#'
        ? (notation === 'solfege' ? 'dièse' : 'sharp')
        : (notation === 'solfege' ? 'bémol' : 'flat');
    }
    return displayNote(l, accidental, notation);
  }, [notation, accidental]);

  const refreshCounts = useCallback(async (name: string) => {
    const c = await templateCounts(name, vocabId, true);
    setCounts(c);
  }, [vocabId]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const c = await templateCounts(profile, vocabId, true);
      if (alive) setCounts(c);
    })();
    return () => { alive = false; };
  }, [profile, vocabId]);

  // The individual takes for the word on screen, so the user can delete a
  // specific bad recording rather than wiping the whole label.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const t = await listLabelTemplates(profile, vocabId, label);
      if (alive) setTakes(t);
    })();
    return () => { alive = false; };
  }, [profile, vocabId, label, counts]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (autoTimerRef.current !== null) clearTimeout(autoTimerRef.current);
  }, []);

  const total = PROFILE_LABELS.length;
  const doneLabels = PROFILE_LABELS.filter((n) => (counts[n] ?? 0) >= SAMPLES_PER_LABEL).length;
  const allDone = doneLabels === total;

  const record = useCallback(async () => {
    if (rec !== 'idle') return;
    playClickSound(); haptic.tap();
    setErr(null);
    setRec('recording');
    const abort = new AbortController();
    abortRef.current = abort;
    // Everything from here is wrapped so a failure in capture, feature
    // extraction or storage can never leave `rec` stuck non-idle — that
    // would disable every button on the panel (Previous/Next/Delete/…).
    try {
      let captured: { pcm: Float32Array; sampleRate: number } | null = null;
      try {
        captured = await captureUtterance({
          signal: abort.signal,
          onLevel: (rms) => setLevel(Math.min(1, rms * 6)),
        });
      } catch {
        setErr('Could not use the microphone — try again');
        autoMissRef.current++;
        return;
      }
      setLevel(0);
      if (abort.signal.aborted) return;
      if (!captured) {
        setErr('No sound captured — try again, closer to the mic');
        autoMissRef.current++;
        return;
      }
      lastPcmRef.current = captured;
      setHasLast(true);
      setRec('thinking');
      try {
        const { frames } = computeMfcc(captured.pcm, captured.sampleRate);
        if (!frames.length) {
          setErr('Recording too short — try again');
          autoMissRef.current++;
        } else if (!(await resemblesSpokenNote(frames, label, vocabId))) {
          // Sounded like noise, not a spoken note — don't save it.
          setErr("That didn't sound like a note — try again");
          autoMissRef.current++;
        } else {
          await addTemplate(profile, vocabId, label, framesToJson(frames));
          await refreshCounts(profile);
          autoMissRef.current = 0;
          haptic.tap();
        }
      } catch {
        setErr('Saving the recording failed');
        autoMissRef.current++;
      }
    } finally {
      setRec('idle');
    }
  }, [rec, profile, vocabId, label, refreshCounts]);

  const stopRun = useCallback(() => {
    setRunning(false);
    autoMissRef.current = 0;
    if (autoTimerRef.current !== null) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    abortRef.current?.abort();
  }, []);

  const toggleRun = () => {
    playClickSound(); haptic.tap();
    if (running) { stopRun(); return; }
    autoMissRef.current = 0;
    setErr(null);
    setRunning(true);
  };

  // Once started, keep cycling — record the current word, and when it has
  // enough samples jump to the next word that still needs some — so the user
  // only has to speak, never tap anything between takes.
  useEffect(() => {
    if (!running || rec !== 'idle') return;
    if (autoMissRef.current >= 3) { stopRun(); return; }

    const needsHere = (counts[label] ?? 0) < SAMPLES_PER_LABEL;
    if (needsHere) {
      autoTimerRef.current = window.setTimeout(() => { void record(); }, 800);
    } else {
      const nextAfter = PROFILE_LABELS.findIndex(
        (n, i) => i > idx && (counts[n] ?? 0) < SAMPLES_PER_LABEL,
      );
      const nextAny = nextAfter >= 0
        ? nextAfter
        : PROFILE_LABELS.findIndex((n) => (counts[n] ?? 0) < SAMPLES_PER_LABEL);
      if (nextAny >= 0) setIdx(nextAny);
      else stopRun(); // everything recorded
    }

    return () => {
      if (autoTimerRef.current !== null) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [running, rec, counts, idx, label, record, stopRun]);

  const playLast = useCallback(() => {
    const cap = lastPcmRef.current;
    if (!cap) return;
    playClickSound();
    try {
      const Ctor = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      const buf = ctx.createBuffer(1, cap.pcm.length, cap.sampleRate);
      buf.getChannelData(0).set(cap.pcm);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => { void ctx.close().catch(() => { /* noop */ }); };
      src.start();
    } catch { /* playback is a nicety — ignore failures */ }
  }, []);

  // Compare every recorded word against every other and flag pairs that are
  // acoustically too close to tell apart — the usual culprits are B/E/G/D.
  const runSelfTest = useCallback(async () => {
    setTesting(true);
    try {
      const rows = await loadTemplates(profile, vocabId);
      const byLabel = new Map<string, Float32Array[][]>();
      for (const r of rows) {
        const arr = byLabel.get(r.label) ?? [];
        arr.push(framesFromJson(r.frames));
        byLabel.set(r.label, arr);
      }
      const labels = [...byLabel.keys()];
      const warns: string[] = [];
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const a = byLabel.get(labels[i])!;
          const b = byLabel.get(labels[j])!;
          let cross = Infinity;
          for (const x of a) for (const y of b) cross = Math.min(cross, dtwDistance(x, y));
          // Tightest spread within either label, as a yardstick for "close".
          let within = Infinity;
          for (const set of [a, b]) {
            for (let p = 0; p < set.length; p++) {
              for (let q = p + 1; q < set.length; q++) {
                within = Math.min(within, dtwDistance(set[p], set[q]));
              }
            }
          }
          // Without at least one within-label pair there is no yardstick for
          // "close", so skip rather than warn on everything.
          if (!Number.isFinite(within) || !Number.isFinite(cross)) continue;
          if (cross <= within * 1.15) {
            warns.push(
              `“${labelText(labels[i])}” and “${labelText(labels[j])}” sound very similar — re-record one of them.`,
            );
          }
        }
      }
      setSelfTest(warns);
    } finally {
      setTesting(false);
    }
  }, [profile, vocabId, labelText]);

  const removeTake = async (key: string) => {
    playClickSound(); haptic.tap();
    await deleteTemplateByKey(key);
    await refreshCounts(profile);
  };

  const step = (d: number) => {
    playClickSound(); haptic.tap();
    setIdx((i) => Math.max(0, Math.min(total - 1, i + d)));
  };

  const finish = async () => {
    playClickSound(); haptic.tap();
    setActiveProfile(profile);
    await recomputeReady(vocabId, [...PROFILE_LABELS], SAMPLES_PER_LABEL);
    resetSpeechEngine();
    onProfileChanged();
    onClose();
  };

  const wipe = async () => {
    playClickSound();
    await deleteProfile(profile);
    await recomputeReady(vocabId, [...PROFILE_LABELS]);
    resetSpeechEngine();
    onProfileChanged();
    await refreshCounts(profile);
  };

  const wipeLearned = async () => {
    playClickSound();
    await deleteProfile(ADAPTIVE_PROFILE);
    resetSpeechEngine();
    onProfileChanged();
  };

  const here = counts[label] ?? 0;
  const lettersDone = LETTER_LABELS.filter((n) => (counts[n] ?? 0) >= SAMPLES_PER_LABEL).length;

  return (
    <div className="vcal-backdrop" role="dialog" aria-label="Voice calibration">
      <div className="vcal-card">
        <div className="vcal-head">
          <span className="vcal-title">Personal voice calibration</span>
          <button className="vcal-x" onClick={() => { playClickSound(); onClose(); }} aria-label="Close">✕</button>
        </div>

        <label className="vcal-profile">
          Profile name
          <input
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            spellCheck={false}
          />
        </label>

        <div className="vcal-progress">
          Recorded {doneLabels}/{total} ({lettersDone}/{LETTER_LABELS.length} notes, {doneLabels - lettersDone}/{ACCIDENTAL_LABELS.length} accidentals)
          <div className="vcal-progress-track">
            <div className="vcal-progress-fill" style={{ width: `${(doneLabels / total) * 100}%` }} />
          </div>
        </div>

        <div className="vcal-prompt">
          <span className="vcal-prompt-label">Say:</span>
          <span className="vcal-note">{prompt}</span>
          <span className="vcal-here">{here} / {SAMPLES_PER_LABEL} recordings</span>
        </div>
        <div className="vcal-hint">{hint}</div>

        <div className={`vcal-meter${rec === 'recording' ? ' is-live' : ''}`}>
          <div className="vcal-meter-fill" style={{ width: `${level * 100}%` }} />
        </div>

        {err && <div className="vcal-err">{err}</div>}

        {hasLast && (
          <button className="vcal-btn vcal-link" onClick={playLast} disabled={rec !== 'idle'}>
            ▶ Play last recording
          </button>
        )}

        <button
          className="vcal-btn vcal-auto"
          onClick={toggleRun}
          disabled={allDone && !running}
        >
          {running
            ? (rec === 'recording' ? '● Listening…' : '⏸ Stop')
            : '▶️ Start'}
        </button>
        {running && (
          <div className="vcal-hint">Speak the word on screen — calibration advances on its own</div>
        )}

        <div className="vcal-takes">
          {takes.length === 0
            ? <span className="vcal-here">No recordings for “{prompt}” yet</span>
            : takes.map((t, i) => (
              <span key={t.key} className="vcal-take">
                Take {i + 1}
                <button
                  className="vcal-take-x"
                  onClick={() => void removeTake(t.key)}
                  disabled={rec !== 'idle' || running}
                  aria-label={`Delete take ${i + 1} of ${prompt}`}
                >✕</button>
              </span>
            ))}
        </div>

        <div className="vcal-actions">
          <button className="vcal-btn" onClick={() => step(-1)} disabled={idx === 0 || rec !== 'idle' || running}>Previous</button>
          <button className="vcal-btn" onClick={() => step(1)} disabled={idx === total - 1 || rec !== 'idle' || running}>Next</button>
        </div>

        <div className="vcal-actions vcal-actions-sec">
          <button className="vcal-btn vcal-link vcal-danger" onClick={wipe} disabled={running}>Delete profile</button>
        </div>

        <div className="vcal-actions vcal-actions-sec">
          <button className="vcal-btn vcal-link" onClick={wipeLearned} disabled={running}>
            Reset automatic learning of the general mode
          </button>
        </div>

        {allDone && (
          <div className="vcal-actions vcal-actions-sec">
            <button
              className="vcal-btn vcal-link"
              onClick={() => void runSelfTest()}
              disabled={testing || rec !== 'idle' || running}
            >
              {testing ? 'Checking recordings…' : 'Self-test recordings'}
            </button>
          </div>
        )}
        {selfTest && (
          <div className="vcal-selftest">
            {selfTest.length === 0
              ? <span className="vcal-here">All words are distinct enough — looks good.</span>
              : selfTest.map((w, i) => <div key={i} className="vcal-err">{w}</div>)}
          </div>
        )}

        <button className="vcal-btn vcal-finish" onClick={finish} disabled={!allDone || rec !== 'idle'}>
          {allDone ? 'Finish & enable' : `${total - doneLabels} to go`}
        </button>
      </div>
    </div>
  );
}
