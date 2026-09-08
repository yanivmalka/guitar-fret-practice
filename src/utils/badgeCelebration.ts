import type { CelebratedBadge } from '../components/BadgeCelebration';

// Merge two lists of freshly-earned badges, keeping one entry per family — the
// later one wins, so a family that reached Bronze mid-round and Silver at the
// end is celebrated once, at Silver.
export function mergeCelebrated(prev: CelebratedBadge[], next: CelebratedBadge[]): CelebratedBadge[] {
  const byFamily = new Map<string, CelebratedBadge>();
  for (const b of [...prev, ...next]) byFamily.set(b.id, b);
  return [...byFamily.values()];
}
