export interface GateDecision {
  readonly decision: string;
  readonly actor: string;
  readonly attestation: string;
  readonly trustScoreBefore: number;
  readonly trustScoreAfter: number;
  readonly dimension: string;
}
