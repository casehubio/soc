export interface RoutingRationaleData {
  readonly capabilityTag: string;
  readonly strategyId: string;
  readonly selected: CandidateScore;
  readonly alternatives: readonly CandidateScore[];
  readonly policy: RoutingPolicySummary;
}

export interface CandidateScore {
  readonly workerId: string;
  readonly trustScore: number | null;
  readonly workloadScore: number;
  readonly phase: 'BOOTSTRAP' | 'QUALIFIED' | 'BORDERLINE' | 'EXCLUDED_PHASE2B' | 'EXCLUDED_PHASE3';
  readonly observations: number;
  readonly finalScore: number;
  readonly exclusionReason?: string;
  readonly rationale?: string;
  readonly additionalScores?: Readonly<Record<string, number>>;
}

export interface RoutingPolicySummary {
  readonly threshold: number;
  readonly borderlineMargin: number;
  readonly blendFactor: number;
  readonly minimumObservations: number;
  readonly qualityFloors: Readonly<Record<string, number>>;
  readonly cbrWeight: number;
  readonly bootstrapEscalationRequired: boolean;
}

export interface RoutingCandidateSelectedDetail {
  readonly workerId: string;
  readonly trustScore: number | null;
  readonly finalScore: number;
  readonly phase: CandidateScore['phase'];
}
