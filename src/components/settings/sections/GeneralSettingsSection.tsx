import { useState } from 'react';
import { SettingCard, SegmentedControl, PickRow, StepperMeter } from '../../SettingCard';
import {
  NOTE_VOLUME_MIN, NOTE_VOLUME_MAX, NOTE_VOLUME_STEP, NOTE_VOLUME_DEFAULT,
} from '../../../utils/audio';
import { ProGate } from '../../ProGate';
import { QuickAccessEnableToggle, QuickAccessPinButton } from '../../QuickAccessPinButton';
import AppearancePicker from '../AppearancePicker';
import { withClick as click } from '../../../utils/withClick';
import { saveSetting } from '../../../utils/settings';
import { LANGUAGES, type Lang } from '../../../i18n/translations';
import {
  PRO_MASTERY_LASTN_CHOICES, describeMasteryWindow, type MasteryWindow,
} from '../../../utils/mastery';
import type { Season, Theme } from '../../../utils/theme';
import type { VoiceEnginePref } from '../../../utils/speech';

type AnswerMode = 'tap' | 'voice';
type WindowMode = MasteryWindow['kind'];

/** Local-calendar `YYYY-MM-DD` for a Date, matching what an `<input type="date">` emits. */
function localDayStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
/** Local midnight of a `YYYY-MM-DD` day, as an ISO instant. */
function startOfDayISO(dayStr: string): string {
  return new Date(`${dayStr}T00:00:00`).toISOString();
}
/** Local midnight of the day *after* `dayStr`, as an ISO instant — the half-open
 *  upper bound `applyMasteryWindow` expects (`>= fromISO && < toISO`). */
function dayAfterISO(dayStr: string): string {
  const x = new Date(`${dayStr}T00:00:00`);
  x.setDate(x.getDate() + 1);
  return x.toISOString();
}
/** Inverse of {@link dayAfterISO}: the inclusive "to" day a stored `toISO` came from. */
function toISOToDayStr(toISO: string): string {
  const x = new Date(toISO);
  x.setDate(x.getDate() - 1);
  return localDayStr(x);
}

/**
 * The general "Settings" drawer section body: score display, silent mode,
 * theme, language, voice answer mode / engine / profile, and the
 * fretboard-mastery overlay controls. Presentation only — every setter is
 * threaded in from <App>; this component imports no hooks.
 */
export interface GeneralSettingsSectionProps {
  t: (s: string) => string;
  lang: Lang;
  setLang: (l: Lang) => void;
  showScore: boolean;
  setShowScore: (v: boolean) => void;
  silentMode: boolean;
  setSilentMode: (v: boolean) => void;
  noteVolume: number;
  setNoteVolume: (v: number) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  season: Season;
  setSeason: (s: Season) => void;
  voiceSupported: boolean;
  answerMode: AnswerMode;
  setAnswerMode: (m: AnswerMode) => void;
  askForMic: () => void;
  voiceEnginePref: VoiceEnginePref;
  pickVoiceEngine: (p: VoiceEnginePref) => void;
  voiceProfileStat: { enabled: boolean; count: number } | null;
  setSettingsOpen: (v: boolean) => void;
  setShowVoiceCalibration: (v: boolean) => void;
  showMastery: boolean;
  setShowMastery: (v: boolean) => void;
  masteryWindow: MasteryWindow;
  setMasteryWindow: (w: MasteryWindow) => void;
}

export default function GeneralSettingsSection({
  t, lang, setLang, showScore, setShowScore, silentMode, setSilentMode,
  noteVolume, setNoteVolume, theme, setTheme, season, setSeason, voiceSupported, answerMode, setAnswerMode, askForMic,
  voiceEnginePref, pickVoiceEngine, voiceProfileStat, setSettingsOpen,
  setShowVoiceCalibration, showMastery, setShowMastery, masteryWindow, setMasteryWindow,
}: GeneralSettingsSectionProps) {
  const todayStr = localDayStr(new Date());
  // Which sub-control of the "Mastery time window" card is visible. Seeded from
  // the persisted window, but tracked separately so "A range" can be shown while
  // its two dates are still being filled in (an invalid range is never persisted).
  const [winMode, setWinMode] = useState<WindowMode>(masteryWindow.kind);
  // Remembered so switching Recent → Day → Recent is lossless.
  const [lastNMemo, setLastNMemo] = useState(
    masteryWindow.kind === 'lastN' ? masteryWindow.n : 250,
  );
  const [daySel, setDaySel] = useState(
    masteryWindow.kind === 'onDay' ? masteryWindow.dayISO.slice(0, 10) : todayStr,
  );
  const [rangeFrom, setRangeFrom] = useState(
    masteryWindow.kind === 'dateRange' ? masteryWindow.fromISO.slice(0, 10) : '',
  );
  const [rangeTo, setRangeTo] = useState(
    masteryWindow.kind === 'dateRange' ? toISOToDayStr(masteryWindow.toISO) : '',
  );

  const commitWindow = (w: MasteryWindow) => {
    setMasteryWindow(w);
    saveSetting('pref_masteryWindow', w);
  };
  const commitRange = (from: string, to: string) => {
    if (from && to && from <= to) {
      commitWindow({ kind: 'dateRange', fromISO: startOfDayISO(from), toISO: dayAfterISO(to) });
    }
  };

  const windowSummary = describeMasteryWindow(masteryWindow, t);

  return (
    <>
      <SettingCard
        label={t('Quick access')}
        help={t('A floating button on the home screen for the settings you flip most. Pin up to 5 with the pushpins below, then double-tap the lower-right of the screen outside a drill to open it.')}
      >
        <QuickAccessEnableToggle />
      </SettingCard>
      <SettingCard
        label={t('Score & celebrations')}
        pin={<QuickAccessPinButton itemId="showScore" />}
        help={<>{t('Live score, streak multiplier and celebrations are shown.')} <em>{t('Every answer is still recorded to your stats and personal bests either way.')}</em></>}
      >
        <SegmentedControl
          ariaLabel={t('Score')}
          value={showScore ? 'on' : 'off'}
          options={[
            { value: 'on', label: t('On') },
            { value: 'off', label: t('Off') },
          ]}
          onChange={(v) => { const on = v === 'on'; setShowScore(on); saveSetting('pref_showScore', on); }}
        />
      </SettingCard>
      <SettingCard
        label={t('Silent mode')}
        pin={<QuickAccessPinButton itemId="silentMode" />}
        help={t('Visual-only questions — no note playback or chime. Haptics and on-screen celebrations stay on. Great for practising with headphones off or a guitar in hand.')}
      >
        <SegmentedControl
          ariaLabel={t('Silent mode')}
          value={silentMode ? 'on' : 'off'}
          options={[
            { value: 'on', label: t('On') },
            { value: 'off', label: t('Off') },
          ]}
          onChange={(v) => { const on = v === 'on'; setSilentMode(on); saveSetting('pref_silentMode', on); }}
        />
      </SettingCard>
      <SettingCard
        label={t('Note volume')}
        pin={<QuickAccessPinButton itemId="noteVolume" />}
        help={t('How loud the drill note samples play. Drag the slider or use − / + to boost it if the notes sound weak; the limiter keeps even the loudest setting from distorting.')}
      >
        <StepperMeter
          ariaLabel={t('Note volume')}
          value={noteVolume}
          min={NOTE_VOLUME_MIN}
          max={NOTE_VOLUME_MAX}
          step={NOTE_VOLUME_STEP}
          formatValue={(v) => `${Math.round((v / NOTE_VOLUME_DEFAULT) * 100)}%`}
          onChange={(v) => { setNoteVolume(v); saveSetting('pref_noteVolume', v); }}
        />
      </SettingCard>
      <SettingCard
        label={t('Appearance')}
        help={t('Theme sets how light or dark the app is: Night is a warmer, dimmer palette for a dark room, Day is a light one. Season sets the colours layered over it — Winter is the original look. Each tile previews the palette you would get.')}
      >
        <AppearancePicker
          t={t}
          mode={theme}
          setMode={setTheme}
          season={season}
          setSeason={setSeason}
        />
      </SettingCard>
      <SettingCard label={t('Language')}>
        <PickRow
          ariaLabel={t('Language')}
          value={lang}
          options={LANGUAGES}
          onChange={(l) => { setLang(l); }}
        />
      </SettingCard>
      {voiceSupported && (
        <>
          <SettingCard
            label={t('How you answer')}
            pin={<QuickAccessPinButton itemId="answerMode" />}
            help={t('Voice mode asks for microphone permission the first time.')}
          >
            <PickRow
              ariaLabel={t('Answer mode')}
              value={answerMode}
              options={[
                { value: 'tap', label: <>👆 {t('Tap')}</> },
                { value: 'voice', label: <>🎤 {t('Voice')}</> },
              ]}
              onChange={(m) => {
                setAnswerMode(m);
                saveSetting('pref_answerMode', m);
                if (m === 'voice') askForMic();
              }}
            />
          </SettingCard>
          {/* Voice engine + personal profile only matter once Voice is the
              chosen answer mode, so they live nested under it. */}
          {answerMode === 'voice' && (
            <ProGate
              feature="voiceProfile"
              variant="replace"
              pitch={t('A personal voice profile built from your own calibration recordings')}
            >
              <SettingCard
                label={t('Voice engine')}
                help={t('Auto picks the best available. Personal uses your calibrated profile; General uses the built-in model.')}
              >
                <PickRow
                  ariaLabel={t('Voice engine')}
                  value={voiceEnginePref}
                  options={[
                    { value: 'auto', label: t('Auto') },
                    { value: 'profile', label: t('Personal') },
                    { value: 'general', label: t('General') },
                  ]}
                  onChange={(v) => pickVoiceEngine(v)}
                />
              </SettingCard>
              <SettingCard
                label={t('Your voice profile')}
                help={t('Calibrating your own voice improves recognition when answering by voice.')}
              >
                {voiceProfileStat && voiceProfileStat.count > 0 && (
                  <div className="sp2-hero">
                    <div className="sp2-tile">
                      <span className="sp2-tile-v">{voiceProfileStat.count}</span>
                      <span className="sp2-tile-l">{t('recordings')}</span>
                    </div>
                    <div className="sp2-tile">
                      <span className="sp2-tile-v" style={{ color: voiceProfileStat.enabled ? '#34e07a' : '#ff9d2e' }}>
                        {voiceProfileStat.enabled ? t('On') : t('Off')}
                      </span>
                      <span className="sp2-tile-l">{t('enabled')}</span>
                    </div>
                  </div>
                )}
                <button
                  className="set-card-btn"
                  onClick={click(() => { setSettingsOpen(false); setShowVoiceCalibration(true); })}
                >🎙️ {voiceProfileStat && voiceProfileStat.count > 0
                  ? t('Add / review recordings')
                  : t('Calibrate my voice')}</button>
              </SettingCard>
            </ProGate>
          )}
        </>
      )}
      <SettingCard
        label={t('Mastery on the fretboard')}
        pin={<QuickAccessPinButton itemId="showMastery" />}
        help={<>{t('The per-note / per-fret accuracy bars drawn over the circle and grid while stopped or paused.')} <em>{t('Mastery keeps being tracked and shows on the Stats screen either way.')}</em></>}
      >
        <SegmentedControl
          ariaLabel={t('Mastery on the fretboard')}
          value={showMastery ? 'on' : 'off'}
          options={[
            { value: 'on', label: t('On') },
            { value: 'off', label: t('Off') },
          ]}
          onChange={(v) => { const on = v === 'on'; setShowMastery(on); saveSetting('pref_showMastery', on); }}
        />
      </SettingCard>
      <ProGate
        feature="masteryMaps"
        variant="replace"
        pitch={t('Point the mastery bars at a recent-question count, a single day, or a date range')}
      >
        <SettingCard
          label={t('Mastery time window')}
          help={<>
            {t('What slice of your history the mastery bars are computed from. Free accounts use the last 250 questions. Older history saved without a date is not counted for a specific day or range.')}
            {' '}<em>{windowSummary}</em>
          </>}
        >
          <SegmentedControl
            ariaLabel={t('Mastery time window')}
            value={winMode}
            options={[
              { value: 'lastN', label: t('Recent') },
              { value: 'onDay', label: t('A day') },
              { value: 'dateRange', label: t('A range') },
            ]}
            onChange={(m) => {
              setWinMode(m);
              if (m === 'lastN') commitWindow({ kind: 'lastN', n: lastNMemo });
              else if (m === 'onDay') commitWindow({ kind: 'onDay', dayISO: daySel });
              else commitRange(rangeFrom, rangeTo);
            }}
          />
          {winMode === 'lastN' && (
            <PickRow
              ariaLabel={t('Questions counted')}
              value={String(lastNMemo)}
              options={PRO_MASTERY_LASTN_CHOICES.map((n) => ({
                value: String(n),
                label: n === 0 ? t('All') : String(n),
              }))}
              onChange={(v) => {
                const n = Number(v);
                setLastNMemo(n);
                commitWindow({ kind: 'lastN', n });
              }}
            />
          )}
          {winMode === 'onDay' && (
            <label className="set-date-field">
              <span>{t('A day')}</span>
              <input
                type="date"
                className="set-date-input"
                max={todayStr}
                value={daySel}
                onChange={(e) => {
                  const d = e.target.value;
                  if (!d) return;
                  setDaySel(d);
                  commitWindow({ kind: 'onDay', dayISO: d });
                }}
              />
            </label>
          )}
          {winMode === 'dateRange' && (
            <div className="set-date-range">
              <label className="set-date-field">
                <span>{t('From')}</span>
                <input
                  type="date"
                  className="set-date-input"
                  max={rangeTo || todayStr}
                  value={rangeFrom}
                  onChange={(e) => {
                    const from = e.target.value;
                    setRangeFrom(from);
                    commitRange(from, rangeTo);
                  }}
                />
              </label>
              <label className="set-date-field">
                <span>{t('To')}</span>
                <input
                  type="date"
                  className="set-date-input"
                  min={rangeFrom || undefined}
                  max={todayStr}
                  value={rangeTo}
                  onChange={(e) => {
                    const to = e.target.value;
                    setRangeTo(to);
                    commitRange(rangeFrom, to);
                  }}
                />
              </label>
            </div>
          )}
        </SettingCard>
      </ProGate>
    </>
  );
}
