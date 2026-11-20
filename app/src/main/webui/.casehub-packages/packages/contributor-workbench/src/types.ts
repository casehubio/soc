export interface ContributorDetail {
  actorId: string;
  globalScore: number | null;
  capabilityScores: Record<string, number>;
  dimensionScores: Record<string, number>;
  intakeClassification: IntakeClassificationEntry;
  recentOutcomes: ContributorOutcomeSummary[];
}

export interface IntakeClassificationEntry {
  lane: string;
  trustScore: number;
  observationCount: number;
  classificationReason: string;
  fastTrackThreshold: number;
  standardThreshold: number;
}

export interface ContributorOutcomeSummary {
  repo: string;
  prNumber: number;
  outcome: string;
  occurredAt: string;
}
