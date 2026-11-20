export type TaskStatus = 'PENDING' | 'RUNNING' | 'DELEGATED' | 'SUSPENDED'
  | 'COMPLETED' | 'FAULTED' | 'REJECTED' | 'OBSOLETE' | 'CANCELLED';

export type MilestoneLifecycleStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';

export interface PlanItemSnapshot {
  readonly id: string;
  readonly bindingName: string;
  readonly status: TaskStatus;
  readonly createdAt: string;
}

export interface MilestoneSnapshot {
  readonly name: string;
  readonly status: MilestoneLifecycleStatus;
}

export interface TrustScoreSnapshot {
  readonly bindingName: string;
  readonly workerId: string;
  readonly score: number;
}

export interface AdaptiveDecisionSnapshot {
  readonly trigger: string;
  readonly condition: string;
  readonly fired: boolean;
  readonly timestamp: string;
  readonly affectedBindings?: readonly string[];
}

export interface CaseRuntimeState {
  readonly planItems: readonly PlanItemSnapshot[];
  readonly milestones: readonly MilestoneSnapshot[];
  readonly timestamp: string;
  readonly caseStatus?: string;
  readonly trustScores?: readonly TrustScoreSnapshot[];
  readonly adaptiveDecisions?: readonly AdaptiveDecisionSnapshot[];
  readonly parallelGroups?: readonly (readonly string[])[];
}
