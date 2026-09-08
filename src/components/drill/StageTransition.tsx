/**
 * The brief "STAGE COMPLETE / <name>" banner shown on an Auto Advance
 * boundary between curriculum stages. Presentation only — <App> owns the
 * `stageTransition` data and the hold timer.
 */
export default function StageTransition({
  stageTransition, t,
}: {
  stageTransition: { name: string; from: number; to: number };
  t: (s: string) => string;
}) {
  return (
    <div className="stage-transition" role="status" aria-live="polite">
      <div className="stage-transition-label">{t('STAGE COMPLETE')}</div>
      <div className="stage-transition-name">{stageTransition.name}</div>
      {stageTransition.from !== stageTransition.to && (
        <div className="stage-transition-progress" dir="ltr">
          {stageTransition.from} → {stageTransition.to} {t('QUESTIONS')}
        </div>
      )}
    </div>
  );
}
