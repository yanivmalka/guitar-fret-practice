/**
 * The full-screen 3-2-1 count-in overlay shown before the first question.
 * Presentation only — <App> owns the countdown timer.
 */
export default function CountdownOverlay({ countdown }: { countdown: number }) {
  return (
    <div className="countdown-overlay">
      <span className="countdown-num" key={countdown}>{countdown}</span>
    </div>
  );
}
