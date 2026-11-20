export interface RequirementDefinition {
  readonly regulation: string;
  readonly requirement: string;
  readonly mechanism: string;
  readonly status: 'MET' | 'PARTIAL' | 'GAP' | 'BREACHED';
  readonly evidenceUrl?: string;
}
