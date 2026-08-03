import { useState } from 'react';
import { saveSetting } from '../utils/settings';
import { STAGES } from '../utils/stages';

export type OnboardingResult = {
  stageIndex: number;
};

// Quick placement questions: string 6, by fret, dots only
const PLACEMENT_QUESTIONS: { fret: number; answer: string }[] = [
  { fret: 5,  answer: 'A'  },
  { fret: 12, answer: 'E'  },
  { fret: 3,  answer: 'G'  },
];

interface Props {
  onDone: (result: OnboardingResult) => void;
}

type Step = 'instrument' | 'level' | 'test' | 'result';

export default function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState<Step>('instrument');
  const [testIdx, setTestIdx]     = useState(0);
  const [correct, setCorrect]     = useState(0);
  const [testAnswer, setTestAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

  const NOTE_OPTIONS = ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#'];

  const finish = (stageIdx: number) => {
    saveSetting('onboardingDone', true);
    saveSetting('stageIndex', stageIdx);
    onDone({ stageIndex: stageIdx });
  };

  const skip = () => finish(0);

  const handleTestAnswer = (answer: string) => {
    const q = PLACEMENT_QUESTIONS[testIdx];
    const isCorrect = answer === q.answer;
    if (isCorrect) setCorrect(c => c + 1);
    setShowFeedback(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => {
      setShowFeedback(null);
      if (testIdx + 1 < PLACEMENT_QUESTIONS.length) {
        setTestIdx(i => i + 1);
        setTestAnswer('');
      } else {
        setStep('result');
      }
    }, 700);
  };

  // Determine start stage from score
  const resultStage = (() => {
    const score = correct + (showFeedback === 'correct' ? 1 : 0);
    if (score >= 3) return STAGES.findIndex(s => s.string === 6 && !s.dotsOnly && !s.wholeToneOnly && !s.byNote);
    if (score === 2) return STAGES.findIndex(s => s.string === 6 && !s.dotsOnly && s.wholeToneOnly && !s.byNote);
    if (score === 1) return STAGES.findIndex(s => s.string === 6 && s.dotsOnly && !s.byNote);
    return 0;
  })();

  if (step === 'instrument') return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-logo">🎸</div>
        <h2 className="onboarding-title">Guitar Fret Practice</h2>
        <p className="onboarding-sub">Master the fretboard with the clock method — one string at a time.</p>
        <p className="onboarding-question">What do you play?</p>
        <div className="onboarding-options">
          <button className="onboarding-btn" onClick={() => setStep('level')}>
            🎸 Guitar
          </button>
          <button className="onboarding-btn onboarding-btn-secondary" disabled title="Coming soon">
            🎵 Bass <span className="onboarding-soon">soon</span>
          </button>
        </div>
        <button className="onboarding-skip" onClick={skip}>Skip setup →</button>
      </div>
    </div>
  );

  if (step === 'level') return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-logo">🎸</div>
        <p className="onboarding-question">How well do you know the fretboard?</p>
        <div className="onboarding-options">
          <button className="onboarding-btn" onClick={() => finish(0)}>
            🌱 I'm just starting
            <span className="onboarding-hint">Begin at Stage 1 — dot frets on String 6</span>
          </button>
          <button className="onboarding-btn" onClick={() => setStep('test')}>
            🎯 I play but want to improve
            <span className="onboarding-hint">Quick 3-question test to find your level</span>
          </button>
          <button className="onboarding-btn" onClick={() => finish(0)}>
            🏆 I know the full neck
            <span className="onboarding-hint">Start from the beginning anyway — confirm your mastery</span>
          </button>
        </div>
        <button className="onboarding-skip" onClick={skip}>Skip →</button>
      </div>
    </div>
  );

  if (step === 'test') {
    const q = PLACEMENT_QUESTIONS[testIdx];
    return (
      <div className="onboarding">
        <div className="onboarding-card">
          <p className="onboarding-progress">{testIdx + 1} / {PLACEMENT_QUESTIONS.length}</p>
          <p className="onboarding-question">String 6 — what note is fret <strong>{q.fret}</strong>?</p>
          <div className="onboarding-note-grid">
            {NOTE_OPTIONS.map(n => (
              <button
                key={n}
                className={`onboarding-note-btn ${
                  showFeedback && n === q.answer ? 'onboarding-note-correct' :
                  showFeedback === 'wrong' && n === testAnswer ? 'onboarding-note-wrong' : ''
                }`}
                onClick={() => { if (!showFeedback) { setTestAnswer(n); handleTestAnswer(n); } }}
              >
                {n}
              </button>
            ))}
          </div>
          <button className="onboarding-skip" onClick={skip}>Skip test →</button>
        </div>
      </div>
    );
  }

  // result step
  const score = correct;
  const msgs = ['Keep going!', 'Good start!', 'Nice work!', 'Impressive!'];
  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-logo">{score >= 3 ? '🏆' : score >= 2 ? '🎯' : '🌱'}</div>
        <p className="onboarding-question">{msgs[score]}</p>
        <p className="onboarding-sub">
          {score}/3 correct — you'll start at{' '}
          <strong>{STAGES[Math.max(0, resultStage)].title}</strong>
        </p>
        <button className="onboarding-btn" onClick={() => finish(Math.max(0, resultStage))}>
          Let's go →
        </button>
        <button className="onboarding-skip" onClick={() => finish(0)}>Start from the beginning</button>
      </div>
    </div>
  );
}
