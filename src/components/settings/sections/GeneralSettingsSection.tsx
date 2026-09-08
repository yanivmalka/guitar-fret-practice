import { SettingCard, SegmentedControl, PickRow, StepperMeter } from '../../SettingCard';
import {
  NOTE_VOLUME_MIN, NOTE_VOLUME_MAX, NOTE_VOLUME_STEP, NOTE_VOLUME_DEFAULT,
} from '../../../utils/audio';
import { ProGate } from '../../ProGate';
import { withClick as click } from '../../../utils/withClick';
import { saveSetting } from '../../../utils/settings';
import { LANGUAGES, type Lang } from '../../../i18n/translations';
import { PRO_MASTERY_LASTN_CHOICES, type MasteryWindow } from '../../../utils/mastery';
import type { Theme } from '../../../utils/theme';
import type { VoiceEnginePref } from '../../../utils/speech';

type AnswerMode = 'tap' | 'voice';

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
  noteVolume, setNoteVolume, theme, setTheme, voiceSupported, answerMode, setAnswerMode, askForMic,
  voiceEnginePref, pickVoiceEngine, voiceProfileStat, setSettingsOpen,
  setShowVoiceCalibration, showMastery, setShowMastery, masteryWindow, setMasteryWindow,
}: GeneralSettingsSectionProps) {
  return (
    <>
      <SettingCard
        label={t('Score & celebrations')}
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
        label={t('Theme')}
        help={t('Night is a warmer, dimmer palette for a dark room. Day is a light palette.')}
      >
        <PickRow
          ariaLabel={t('Theme')}
          value={theme}
          options={[
            { value: 'dark', label: t('Dark') },
            { value: 'night', label: t('Night') },
            { value: 'day', label: t('Day') },
          ]}
          onChange={(v) => setTheme(v)}
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
        pitch={t('Choose how many recent questions the mastery bars are counted from')}
      >
        <SettingCard
          label={t('Questions counted')}
          help={t('How many of your most recent questions the mastery bars are computed from. Free accounts use the last 250.')}
        >
          <PickRow
            ariaLabel={t('Questions counted')}
            value={masteryWindow.kind === 'lastN' ? String(masteryWindow.n) : '250'}
            options={PRO_MASTERY_LASTN_CHOICES.map((n) => ({
              value: String(n),
              label: n === 0 ? t('All') : String(n),
            }))}
            onChange={(v) => {
              const next: MasteryWindow = { kind: 'lastN', n: Number(v) };
              setMasteryWindow(next);
              saveSetting('pref_masteryWindow', next);
            }}
          />
        </SettingCard>
      </ProGate>
    </>
  );
}
