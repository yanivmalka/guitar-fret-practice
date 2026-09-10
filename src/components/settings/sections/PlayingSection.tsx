import { SettingCard, SegmentedControl } from '../../SettingCard';
import { ProGate } from '../../ProGate';
import FretRangeControl from '../../FretRangeControl';
import FretRangeNeck from '../../FretRangeNeck';
import { withClick as click } from '../../../utils/withClick';
import { saveSetting } from '../../../utils/settings';
import { COMING_SOON_INSTRUMENTS, type InstrumentId, type InstrumentConfig } from '../../../utils/instruments';
import type { AccidentalMode, NotationMode } from '../../../utils/music';

/**
 * The "Playing" drawer section body (instrument picker + note-name notation +
 * the Pro precise fret-range window). Presentation only — every setter is
 * threaded in from <App>; this component imports no hooks.
 */
export interface PlayingSectionProps {
  t: (s: string) => string;
  instrument: InstrumentConfig;
  instrumentId: InstrumentId;
  admin: boolean;
  running: boolean;
  paused: boolean;
  stop: () => void;
  applyInstrument: (id: InstrumentId) => void;
  setPreloaded: (v: boolean) => void;
  notation: NotationMode;
  setNotation: (n: NotationMode) => void;
  accidental: AccidentalMode;
  setAccidental: (a: AccidentalMode) => void;
  fretRange: {
    useFretRange: boolean;
    fretLo: number;
    fretHi: number;
    onPreciseToggle: () => void;
    onWindow: (lo: number, hi: number) => void;
  };
}

export default function PlayingSection({
  t, instrument, instrumentId, admin, running, paused, stop,
  applyInstrument, setPreloaded, notation, setNotation, accidental, setAccidental, fretRange,
}: PlayingSectionProps) {
  return (
    <>
      <SettingCard
        label={t('Instruments')}
        help={t('Switches tuning, string count and fret range, then reloads the note samples.')}
      >
        <div className="pick-row" role="group" aria-label={t('Instruments')}>
          {([['guitar', '🎸', t('Guitar')], ['bass', '🎵', t('Bass')]] as const).map(([id, emoji, name]) => (
            <button
              key={id}
              type="button"
              className={`pick-btn${instrumentId === id ? ' pick-btn-on' : ''}`}
              aria-pressed={instrumentId === id}
              onClick={click(() => {
                if (id === instrumentId) return;
                if (running || paused) stop();
                applyInstrument(id);
                setPreloaded(false);
              })}
            >
              {emoji} {name}
            </button>
          ))}
        </div>
        {/* Roadmap instruments the engine can't drill yet — shown to admins
            inside the same card as Guitar/Bass, as a second row of smaller
            disabled buttons, so the plan reads as part of the picker. */}
        {admin && (
          <div className="pick-soon-row" role="group" aria-label={t('Coming soon')}>
            {COMING_SOON_INSTRUMENTS.map((ci) => (
              <button
                key={ci.label}
                type="button"
                className="pick-btn-soon"
                disabled
                aria-disabled="true"
                title={`${t('Coming soon')} — ${ci.tuning}`}
              >
                {ci.emoji} {t(ci.label)}
              </button>
            ))}
          </div>
        )}
      </SettingCard>
      {/* Two display preferences, one tile each. Both are display-only —
          `notesMatch` keeps answer-checking spelling-agnostic. "Note names"
          is letters vs solfège syllables; "Sharps or flats" is which sign an
          enharmonic note (C♯ / D♭) is shown with on the question, the note
          wheel and the feedback line. The sharp/flat primer is worded with
          the vocabulary that matches the chosen notation (A-B-C → "sharp /
          flat"; Do-Re-Mi → "dièse / bémol", i.e. Hebrew "דיאז / במול"). */}
      <SettingCard
        label={t('Note names')}
        help={
          <>
            {t("Display only — the drill itself doesn't change.")}{' '}
            {t('Letters (A, B, C…) or solfège syllables (Do, Re, Mi…).')}
          </>
        }
      >
        <div className="pick-row" role="group" aria-label={t('Note names')}>
          {([['alpha', 'A B C'], ['solfege', 'Do Re Mi']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={`pick-btn${notation === val ? ' pick-btn-on' : ''}`}
              aria-pressed={notation === val}
              onClick={click(() => { setNotation(val); saveSetting('pref_notation', val); })}
            >
              {label}
            </button>
          ))}
        </div>
      </SettingCard>
      <SettingCard
        label={t('Sharps or flats')}
        help={
          <>
            {t("Display only — the drill itself doesn't change.")}{' '}
            {notation === 'solfege'
              ? t('A dièse (♯) is a half-step higher; a bémol (♭) is a half-step lower. The same pitch can be written either way — Do♯ and Re♭ are one note. Pick which sign you see.')
              : t('A sharp (♯) is a half-step higher; a flat (♭) is a half-step lower. The same pitch can be written either way — C♯ and D♭ are one note. Pick which sign you see.')}
          </>
        }
      >
        <div className="pick-row" role="group" aria-label={t('Sharps or flats')}>
          {([
            ['sharps', notation === 'solfege' ? t('Dièse (♯)') : t('Sharp (♯)')],
            ['flats', notation === 'solfege' ? t('Bémol (♭)') : t('Flat (♭)')],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={`pick-btn${accidental === val ? ' pick-btn-on' : ''}`}
              aria-pressed={accidental === val}
              onClick={click(() => { setAccidental(val); saveSetting('pref_accidental', val); })}
            >
              {label}
            </button>
          ))}
        </div>
      </SettingCard>
      {/* Precise fret-range window (Pro). It used to sit under the neck on
          the home screen; it lives here now, with its own neck picture
          whose dark silhouette tracks the slider. The home-screen neck
          still reflects the chosen window. */}
      <SettingCard
        label={t('Fret range')}
        help={t('Drill only part of the neck. Drag the handles to set the exact fret window — the shaded area is muted out, both here and on the home-screen neck.')}
      >
        <ProGate
          feature="fretRange"
          variant="overlay"
          pitch={t('Pick an exact fret N–M window to drill')}
        >
          <div className="fret-range-block">
            <SegmentedControl
              ariaLabel={t('Precise fret range')}
              value={fretRange.useFretRange ? 'on' : 'off'}
              options={[
                { value: 'on', label: t('On') },
                { value: 'off', label: t('Off') },
              ]}
              onChange={() => fretRange.onPreciseToggle()}
            />
            <FretRangeNeck
              instrument={instrument}
              lo={fretRange.fretLo}
              hi={fretRange.fretHi}
              disabled={!fretRange.useFretRange}
            />
            <FretRangeControl
              maxFret={instrument.maxFret}
              lo={fretRange.fretLo}
              hi={fretRange.fretHi}
              onChange={fretRange.onWindow}
              disabled={!fretRange.useFretRange}
            />
          </div>
        </ProGate>
      </SettingCard>
    </>
  );
}
