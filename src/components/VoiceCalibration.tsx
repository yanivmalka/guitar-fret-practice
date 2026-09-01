import { useCallback, useEffect, useRef, useState } from 'react';
import { displayNote, type AccidentalMode, type NotationMode } from '../utils/music';
import { captureUtterance } from '../utils/utteranceCapture';
import { computeMfcc, framesToJson } from '../utils/mfcc';
import {
  addTemplate, clearLabel, deleteProfile, getActiveProfile,
  recomputeReady, setActiveProfile, templateCounts, ADAPTIVE_PROFILE,
} from '../utils/voiceProfile';
import {
  LETTER_LABELS, ACCIDENTAL_LABELS, PROFILE_LABELS, profileVocabId,
} from '../utils/voiceProfileVocab';
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
export default function VoiceCalibration({ notation, accidental, onClose, onProfileChanged }: Props) {
  const vocabId = profileVocabId(notation as SpeechNotation);
  const [profile, setProfile] = useState(() => getActiveProfile() ?? 'הפרופיל שלי');
  const [idx, setIdx] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [rec, setRec] = useState<RecState>('idle');
  const [level, setLevel] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const label = PROFILE_LABELS[idx];
  const isAccidental = (ACCIDENTAL_LABELS as readonly string[]).includes(label);
  const prompt = isAccidental
    ? (label === '#'
        ? (notation === 'solfege' ? 'דּיאָז' : 'שארפ')
        : 'במול')
    : displayNote(label, accidental, notation);
  const hint = isAccidental
    ? 'תגיד רק את המילה הזאת, לבד'
    : 'תגיד רק את שם התו, לבד';

  const refreshCounts = useCallback(async (name: string) => {
    const c = await templateCounts(name, vocabId);
    setCounts(c);
  }, [vocabId]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const c = await templateCounts(profile, vocabId);
      if (alive) setCounts(c);
    })();
    return () => { alive = false; };
  }, [profile, vocabId]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const total = PROFILE_LABELS.length;
  const doneLabels = PROFILE_LABELS.filter((n) => (counts[n] ?? 0) >= SAMPLES_PER_LABEL).length;
  const allDone = doneLabels === total;

  const record = async () => {
    if (rec !== 'idle') return;
    playClickSound(); haptic.tap();
    setErr(null);
    setRec('recording');
    const abort = new AbortController();
    abortRef.current = abort;
    const captured = await captureUtterance({
      signal: abort.signal,
      onLevel: (rms) => setLevel(Math.min(1, rms * 6)),
    });
    setLevel(0);
    if (abort.signal.aborted) { setRec('idle'); return; }
    if (!captured) {
      setErr('לא נקלט קול — נסה שוב, קרוב יותר למיקרופון');
      setRec('idle');
      return;
    }
    setRec('thinking');
    try {
      const { frames } = computeMfcc(captured.pcm, captured.sampleRate);
      if (!frames.length) {
        setErr('ההקלטה קצרה מדי — נסה שוב');
      } else {
        await addTemplate(profile, vocabId, label, framesToJson(frames));
        await refreshCounts(profile);
        haptic.tap();
      }
    } catch {
      setErr('שמירת ההקלטה נכשלה');
    }
    setRec('idle');
  };

  const redo = async () => {
    playClickSound();
    await clearLabel(profile, vocabId, label);
    await refreshCounts(profile);
  };

  const step = (d: number) => {
    playClickSound(); haptic.tap();
    setIdx((i) => Math.max(0, Math.min(total - 1, i + d)));
  };

  const finish = async () => {
    playClickSound(); haptic.tap();
    setActiveProfile(profile);
    await recomputeReady(vocabId, [...PROFILE_LABELS], SAMPLES_PER_LABEL - 1 || 1);
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
    <div className="vcal-backdrop" role="dialog" aria-label="כיול קול">
      <div className="vcal-card">
        <div className="vcal-head">
          <span className="vcal-title">כיול קול אישי</span>
          <button className="vcal-x" onClick={() => { playClickSound(); onClose(); }} aria-label="סגור">✕</button>
        </div>

        <label className="vcal-profile">
          שם פרופיל
          <input
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            spellCheck={false}
          />
        </label>

        <div className="vcal-progress">
          נקלטו {doneLabels}/{total} ({lettersDone}/{LETTER_LABELS.length} תווים, {doneLabels - lettersDone}/{ACCIDENTAL_LABELS.length} סימנים)
          <div className="vcal-progress-track">
            <div className="vcal-progress-fill" style={{ width: `${(doneLabels / total) * 100}%` }} />
          </div>
        </div>

        <div className="vcal-prompt">
          <span className="vcal-prompt-label">תגיד:</span>
          <span className="vcal-note">{prompt}</span>
          <span className="vcal-here">{here} / {SAMPLES_PER_LABEL} הקלטות</span>
        </div>
        <div className="vcal-hint">{hint}</div>

        <div className={`vcal-meter${rec === 'recording' ? ' is-live' : ''}`}>
          <div className="vcal-meter-fill" style={{ width: `${level * 100}%` }} />
        </div>

        {err && <div className="vcal-err">{err}</div>}

        <div className="vcal-actions">
          <button className="vcal-btn" onClick={() => step(-1)} disabled={idx === 0 || rec !== 'idle'}>הקודם</button>
          <button className="vcal-btn vcal-rec" onClick={record} disabled={rec !== 'idle'}>
            {rec === 'recording' ? '● מקליט…' : rec === 'thinking' ? '…' : '🎤 הקלט'}
          </button>
          <button className="vcal-btn" onClick={() => step(1)} disabled={idx === total - 1 || rec !== 'idle'}>הבא</button>
        </div>

        <div className="vcal-actions vcal-actions-sec">
          <button className="vcal-btn vcal-link" onClick={redo} disabled={here === 0 || rec !== 'idle'}>הקלט מחדש</button>
          <button className="vcal-btn vcal-link vcal-danger" onClick={wipe} disabled={rec !== 'idle'}>מחק פרופיל</button>
        </div>

        <div className="vcal-actions vcal-actions-sec">
          <button className="vcal-btn vcal-link" onClick={wipeLearned} disabled={rec !== 'idle'}>
            אפס למידה אוטומטית של המצב הכללי
          </button>
        </div>

        <button className="vcal-btn vcal-finish" onClick={finish} disabled={!allDone || rec !== 'idle'}>
          {allDone ? 'סיום והפעלה' : `עוד ${total - doneLabels}`}
        </button>
      </div>
    </div>
  );
}
