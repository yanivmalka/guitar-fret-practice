import { useState } from 'react';
import { saveSetting } from '../utils/settings';

interface Props {
  onDone: () => void;
}

// Quick placement questions: string 6, by fret, dots only
const PLACEMENT_QUESTIONS: { fret: number; answer: string }[] = [
  { fret: 5,  answer: 'A'  },
  { fret: 12, answer: 'E'  },
  { fret: 3,  answer: 'G'  },
];

type Step = 'instrument' | 'level' | 'test' | 'result';

const NOTE_OPTIONS = ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#'];

export default function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState<Step>('instrument');
  const [testIdx, setTestIdx]     = useState(0);
  const [correct, setCorrect]     = useState(0);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

  const finish = () => {
    saveSetting('onboardingDone', true);
    onDone();
  };

  const handleTestAnswer = (answer: string) => {
    const q = PLACEMENT_QUESTIONS[testIdx];
    const isCorrect = answer === q.answer;
    if (isCorrect) setCorrect(c => c + 1);
    setShowFeedback(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => {
      setShowFeedback(null);
      if (testIdx + 1 < PLACEMENT_QUESTIONS.length) {
        setTestIdx(i => i + 1);
      } else {
        setStep('result');
      }
    }, 700);
  };

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
        <button className="onboarding-skip" onClick={finish}>Skip setup →</button>
      </div>
    </div>
  );

  if (step === 'level') return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-logo">🎸</div>
        <p className="onboarding-question">How well do you know the fretboard?</p>
        <div className="onboarding-options">
          <button className="onboarding-btn" onClick={finish}>
            🌱 I'm just starting
            <span className="onboarding-hint">Start with dot frets on String 6</span>
          </button>
          <button className="onboarding-btn" onClick={() => setStep('test')}>
            🎯 I play but want to improve
            <span className="onboarding-hint">Quick 3-question test</span>
          </button>
          <button className="onboarding-btn" onClick={finish}>
            🏆 I know the full neck
            <span className="onboarding-hint">Jump right in</span>
          </button>
        </div>
        <button className="onboarding-skip" onClick={finish}>Skip →</button>
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
                  showFeedback === 'wrong' && n === PLACEMENT_QUESTIONS[testIdx]?.answer ? '' : ''
                }`}
                onClick={() => { if (!showFeedback) { handleTestAnswer(n); } }}
              >
                {n}
              </button>
            ))}
          </div>
          <button className="onboarding-skip" onClick={finish}>Skip test →</button>
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
          {score}/3 correct — use the selector panel to pick your string and difficulty.
        </p>
        <button className="onboarding-btn" onClick={finish}>
          Let's go →
        </button>
      </div>
    </div>
  );
}
