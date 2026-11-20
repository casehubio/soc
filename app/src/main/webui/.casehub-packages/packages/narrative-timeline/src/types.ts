export interface SignalDigest {
  readonly signalType: 'ROUTING' | 'CBR' | 'TRUST' | 'DELIBERATION' | 'STEP_OUTCOME';
  readonly summary: string;
  readonly keyFacts: Record<string, string>;
  readonly confidence: number;
}

export interface StepDecisionSummary {
  readonly caseId: string;
  readonly stepName: string;
  readonly signals: readonly SignalDigest[];
  readonly from: string;
  readonly to: string;
}

export interface DecisionNarrative {
  readonly caseId: string;
  readonly stepNames: readonly string[];
  readonly explanation: string;
  readonly evidenceSources: readonly string[];
  readonly confidence: number;
  readonly producedAt: string;
}

export interface NarrativeState {
  readonly steps: readonly StepDecisionSummary[];
  readonly narrative?: DecisionNarrative;
}
