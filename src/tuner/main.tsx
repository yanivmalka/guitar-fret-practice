import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Tuner from './Tuner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Tuner />
  </StrictMode>,
);
