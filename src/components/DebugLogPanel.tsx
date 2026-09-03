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

// A small on-screen viewer for the in-app debug log (see utils/debugLog.ts).
// Always mounted so it is reachable on a device with no DevTools — most of all
// the installed Android PWA. Collapsed to a single unobtrusive 🐞 button until
// tapped.
export default function DebugLogPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const count = useSyncExternalStore(
    subscribeDebugLog,
    () => getDebugEntries().filter((e) => e.level === 'error').length,
  );

  const voiceOn = useSyncExternalStore(subscribeDebugLog, isVoiceVerbose);

  const preRef = useRef<HTMLPreElement | null>(null);
  const text = open ? debugLogAsText() : '';
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
      <pre ref={preRef} className="debuglog-body">{text || t('(no errors)')}</pre>
    </div>
  );
}
