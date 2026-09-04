import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  clearDebugLog,
  debugLogAsText,
  getDebugEntries,
  isVoiceVerbose,
  setVoiceVerbose,
  subscribeDebugLog,
} from '../utils/debugLog';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  /** Current dev "simulate Pro" state (always `false` in production). */
  devSimulatePro?: boolean;
  /** Toggle handler — passed only under `import.meta.env.DEV`. When omitted,
   *  the simulate-Pro row is not rendered. */
  onToggleSimulatePro?: (on: boolean) => void;
}

// A small on-screen viewer for the in-app debug log (see utils/debugLog.ts).
// Always mounted so it is reachable on a device with no DevTools — most of all
// the installed Android PWA. Collapsed to a single unobtrusive 🐞 button until
// tapped.
export default function DebugLogPanel({ devSimulatePro, onToggleSimulatePro }: Props = {}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const count = useSyncExternalStore(
    subscribeDebugLog,
    () => getDebugEntries().filter((e) => e.level === 'error').length,
  );

  const voiceOn = useSyncExternalStore(subscribeDebugLog, isVoiceVerbose);

  const preRef = useRef<HTMLPreElement | null>(null);
  // Subscribe the body to the store too: `count` (errors only) and `voiceOn`
  // are the only other subscriptions, so clearing a log that holds just
  // `[voice]` info lines changes neither and would otherwise leave this text
  // stale until the panel is closed and reopened. Equal strings are
  // `Object.is`-equal, so this adds no spurious re-renders.
  const text = useSyncExternalStore(subscribeDebugLog, debugLogAsText);
  useEffect(() => {
    if (open && preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight;
  }, [open, text]);

  const copy = async () => {
    const body = debugLogAsText();
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      // WebView / insecure context fallback.
      const ta = document.createElement('textarea');
      ta.value = body;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* nothing else to try */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  if (!open) {
    return (
      <button
        className="debuglog-fab"
        onClick={() => setOpen(true)}
        title={t('Debug log')}
        aria-label={t('Open debug log')}
      >
        🐞{count ? <span className="debuglog-fab-count">{count}</span> : null}
      </button>
    );
  }

  return (
    <div className="debuglog-panel" role="dialog" aria-label={t('Debug log')}>
      <div className="debuglog-head">
        <span className="debuglog-title">
          {voiceOn ? t('Errors + voice · auto-clears daily') : t('Errors · auto-clears daily')}
        </span>
        <div className="debuglog-actions">
          <button
            className="debuglog-btn"
            onClick={() => setVoiceVerbose(!voiceOn)}
          >
            {voiceOn ? t('Voice: on') : t('Voice: off')}
          </button>
          <button className="debuglog-btn" onClick={() => { void copy(); }}>
            {copied ? t('Copied') : t('Copy')}
          </button>
          <button className="debuglog-btn" onClick={clearDebugLog}>{t('Clear')}</button>
          <button className="debuglog-btn" onClick={() => setOpen(false)}>{t('Close')}</button>
        </div>
      </div>
      {import.meta.env.DEV && onToggleSimulatePro && (
        <label className="debuglog-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
          <input
            type="checkbox"
            checked={!!devSimulatePro}
            onChange={(e) => onToggleSimulatePro(e.target.checked)}
          />
          {t('Simulate Pro (dev only — no DB change)')}
        </label>
      )}
      <pre ref={preRef} className="debuglog-body">{text || t('(no errors)')}</pre>
    </div>
  );
}
