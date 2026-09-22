import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import ScaleSpike from './ScaleSpike';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ScaleSpike />
  </StrictMode>,
);
