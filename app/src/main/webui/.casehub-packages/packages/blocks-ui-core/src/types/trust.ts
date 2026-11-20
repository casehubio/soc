export type TrustLevel = 'high' | 'adequate' | 'low' | 'none';

export function trustLevelFromScore(score: number | undefined): TrustLevel {
  if (score === undefined || score === null) return 'none';
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'adequate';
  return 'low';
}
