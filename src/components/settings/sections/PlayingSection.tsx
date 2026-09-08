import { SettingCard, SegmentedControl } from '../../SettingCard';
import { ProGate } from '../../ProGate';
import FretRangeControl from '../../FretRangeControl';
import FretRangeNeck from '../../FretRangeNeck';
import { withClick as click } from '../../../utils/withClick';
import { saveSetting } from '../../../utils/settings';
import { COMING_SOON_INSTRUMENTS, type InstrumentId, type InstrumentConfig } from '../../../utils/instruments';
import type { NotationMode } from '../../../utils/music';

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
  applyInstrument, setPreloaded, notation, setNotation, fretRange,
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
      {/* Note-name notation used to be its own drawer row; it's really a
          display preference for the instrument, so it lives here now. The
          helper line also carries the short Natural / Sharp / Flat primer,
          worded with the vocabulary that matches the chosen notation
          (A-B-C → "sharp / flat"; Do-Re-Mi → "dièse / bémol", i.e. Hebrew
          "דיאז / במול"). No standalone spelling toggle: a question shows
          both enharmonic names side by side ("C♯ = D♭"). */}
      <SettingCard
        label={t('Notes')}
        help={
          <>
            {t("Display only — the drill itself doesn't change.")}{' '}
            {notation === 'solfege'
              ? t('A natural note has no sign (Do, Re, Mi…). A dièse (♯) is a half-step higher; a bémol (♭) is a half-step lower. The same pitch can be written either way — Do♯ and Re♭ are one note, and a question shows both.')
              : t('A natural note has no sign (C, D, E…). A sharp (♯) is a half-step higher; a flat (♭) is a half-step lower. The same pitch can be written either way — C♯ and D♭ are one note, and a question shows both.')}
          </>
        }
      >
        <div className="pick-row" role="group" aria-label={t('Notes')}>
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
