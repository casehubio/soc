export { type TrustLevel, trustLevelFromScore } from '@casehubio/mosaic-core';

/**
 * Maturity phase based on observation count
 */
export type MaturityPhase = 'bootstrap' | 'calibrating' | 'mature';

/**
 * Global trust score response from ledger
 */
export interface TrustScoreResponse {
  actorId: string;
  globalScore?: number; // OptionalDouble from backend
  capabilityScores: Record<string, number>;
  dimensionScores: Record<string, number>;
}

/**
 * Per-capability trust score detail
 */
export interface CapabilityScoreResponse {
  actorId: string;
  capabilityTag: string;
  score?: number; // OptionalDouble
  decisionCount: number;
  qualityScores: Record<string, number>;
}



/**
 * Determine maturity phase from observation count
 */
export function maturityFromCount(count: number): MaturityPhase {
  if (count < 10) return 'bootstrap';
  if (count <= 50) return 'calibrating';
  return 'mature';
}
