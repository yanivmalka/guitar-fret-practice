/**
 * The "Press back again to exit" toast shown when hardware / browser Back is
 * pressed on the bare home screen. Presentation only; <App> owns the
 * `exitHint` flag and the 2-second arm/disarm timer.
 */
export default function ExitHintToast({ t }: { t: (s: string) => string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', left: '50%', bottom: 32, transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.82)', color: '#fff', padding: '10px 18px',
        borderRadius: 999, fontSize: 14, zIndex: 9999, pointerEvents: 'none',
        maxWidth: '80vw', textAlign: 'center',
      }}
    >
      {t('Press back again to exit')}
    </div>
  );
}
