import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  clearDebugLog,
  debugLogAsText,
  getDebugEntries,
  isVoiceVerbose,
  setVoiceVerbose,
  subscribeDebugLog,
} from '../utils/debugLog';

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
        title="Debug log"
        aria-label="Open debug log"
      >
        🐞{count ? <span className="debuglog-fab-count">{count}</span> : null}
      </button>
    );
  }

  return (
    <div className="debuglog-panel" role="dialog" aria-label="Debug log">
      <div className="debuglog-head">
        <span className="debuglog-title">
          {voiceOn ? 'Errors + voice · auto-clears daily' : 'Errors · auto-clears daily'}
        </span>
        <div className="debuglog-actions">
          <button
            className="debuglog-btn"
            onClick={() => setVoiceVerbose(!voiceOn)}
          >
            {voiceOn ? 'Voice: on' : 'Voice: off'}
          </button>
          <button className="debuglog-btn" onClick={() => { void copy(); }}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="debuglog-btn" onClick={clearDebugLog}>Clear</button>
          <button className="debuglog-btn" onClick={() => setOpen(false)}>Close</button>
        </div>
      </div>
      {import.meta.env.DEV && onToggleSimulatePro && (
        <label className="debuglog-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
          <input
            type="checkbox"
            checked={!!devSimulatePro}
            onChange={(e) => onToggleSimulatePro(e.target.checked)}
          />
          Simulate Pro (dev only — no DB change)
        </label>
      )}
      <pre ref={preRef} className="debuglog-body">{text || '(no errors)'}</pre>
    </div>
  );
}
