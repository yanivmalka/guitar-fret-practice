import { useState, useRef, useEffect } from 'react';
import type { InstrumentConfig } from '../utils/instruments';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';
import FretRangeControl from './FretRangeControl';
import { calculateMinimalFretRange } from '../utils/noteCalculator';

interface FretRangeConflictDialogProps {
  instrument: InstrumentConfig;
  currentFretLo: number;
  currentFretHi: number;
  selectedStrings: number[];
  minNotes?: number; // Default: 4
  onResolve: (action: 'auto' | 'manual' | 'cancel', newLo?: number, newHi?: number) => void;
  isOpen: boolean;
}

export default function FretRangeConflictDialog({
  instrument,
  currentFretLo,
  currentFretHi,
  selectedStrings,
  minNotes = 4,
  onResolve,
  isOpen,
}: FretRangeConflictDialogProps) {
  const { t } = useTranslation();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customLo, setCustomLo] = useState(currentFretLo);
  const [customHi, setCustomHi] = useState(currentFretHi);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Calculate the minimal range automatically
  const minimalRange = calculateMinimalFretRange(instrument, selectedStrings, minNotes);
  const suggestedLo = minimalRange?.[0] ?? currentFretLo;
  const suggestedHi = minimalRange?.[1] ?? currentFretHi;

  useEffect(() => {
    setCustomLo(suggestedLo);
    setCustomHi(suggestedHi);
  }, [suggestedLo, suggestedHi]);

  const handleClickOutside = (e: MouseEvent) => {
    if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
      setShowCustomPicker(false);
    }
  };

  useEffect(() => {
    if (showCustomPicker) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showCustomPicker]);

  if (!isOpen) return null;

  const handleAutoExpand = () => {
    playClickSound();
    haptic.tap();
    onResolve('auto', suggestedLo, suggestedHi);
  };

  const handleManualExpand = () => {
    playClickSound();
    haptic.tap();
    setShowCustomPicker(true);
  };

  const handleCustomRangeChange = (lo: number, hi: number) => {
    setCustomLo(lo);
    setCustomHi(hi);
  };

  const handleCustomRangeConfirm = () => {
    playClickSound();
    haptic.tap();
    setShowCustomPicker(false);
    onResolve('manual', customLo, customHi);
  };

  const handleCancel = () => {
    playClickSound();
    haptic.tap();
    setShowCustomPicker(false);
    onResolve('cancel');
  };

  return (
    <>
      {/* Semi-transparent overlay */}
      <div className="fret-range-conflict-overlay" onClick={handleCancel} />

      {/* Dialog */}
      <div ref={dialogRef} className="fret-range-conflict-dialog">
        <h3 className="fret-range-conflict-title">
          {t('Fret range too small')}
        </h3>
        
        <p className="fret-range-conflict-message">
          {t('The current fret range')} ({currentFretLo}–{currentFretHi}) 
          {t(' allows fewer than ')} {minNotes} {t('unique notes')} 
          {t(' with the selected strings. Please expand the range.')}
        </p>

        <div className="fret-range-conflict-buttons">
          {/* Button 1: Auto expand to minimum */}
          <button
            className="fret-range-conflict-btn fret-range-conflict-btn-primary"
            onClick={handleAutoExpand}
          >
            <span className="fret-range-conflict-btn-label">
              {t('Expand to minimum')}
            </span>
            <span className="fret-range-conflict-btn-detail">
              {suggestedLo}–{suggestedHi}
            </span>
          </button>

          {/* Button 2: Manual expand */}
          <button
            className="fret-range-conflict-btn fret-range-conflict-btn-secondary"
            onClick={handleManualExpand}
          >
            <span className="fret-range-conflict-btn-label">
              {t('I will expand')}
            </span>
            <span className="fret-range-conflict-btn-detail">
              {t('Custom range')}
            </span>
          </button>

          {/* Button 3: Keep as is (cancel) */}
          <button
            className="fret-range-conflict-btn fret-range-conflict-btn-tertiary"
            onClick={handleCancel}
          >
            <span className="fret-range-conflict-btn-label">
              {t('Keep as is')}
            </span>
            <span className="fret-range-conflict-btn-detail">
              {currentFretLo}–{currentFretHi}
            </span>
          </button>
        </div>
      </div>

      {/* Floating custom picker panel */}
      {showCustomPicker && (
        <div ref={pickerRef} className="fret-range-conflict-picker-panel">
          <div className="fret-range-conflict-picker-header">
            <h4>{t('Set fret range')}</h4>
            <button
              className="fret-range-conflict-picker-close"
              onClick={() => setShowCustomPicker(false)}
              aria-label={t('Close')}
            >
              ✕
            </button>
          </div>

          <div className="fret-range-conflict-picker-body">
            <FretRangeControl
              maxFret={instrument.maxFret}
              lo={customLo}
              hi={customHi}
              onChange={handleCustomRangeChange}
            />
          </div>

          <div className="fret-range-conflict-picker-footer">
            <button
              className="fret-range-conflict-btn fret-range-conflict-btn-primary"
              onClick={handleCustomRangeConfirm}
            >
              {t('Apply')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
