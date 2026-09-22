import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PitchAnswerSpike from './PitchAnswerSpike';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PitchAnswerSpike />
  </StrictMode>,
);
