import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './stats-redesign.css';
import StatsRedesign from './StatsRedesign';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StatsRedesign />
  </StrictMode>,
);
