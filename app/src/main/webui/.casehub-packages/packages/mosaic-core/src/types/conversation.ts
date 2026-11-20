import type { CommitmentRecord, CommitmentState } from './commitment.js';
import type { TransitionRecord } from './commitment.js';

export const EPISTEMIC_STATUSES = ['ESTABLISHED', 'PENDING', 'DISPUTED'] as const;
export type EpistemicStatus = typeof EPISTEMIC_STATUSES[number];

export const CONVERGENCE_STATES = [
  'PROGRESSING', 'CONVERGING', 'CONSENSUS', 'DEADLOCK', 'DIMINISHING_RETURNS',
] as const;
export type ConvergenceState = typeof CONVERGENCE_STATES[number];

export interface ConvergenceSignal {
  readonly state: ConvergenceState;
  readonly confidence: number;
  readonly reason: string;
}

export interface GroundedFact {
  readonly id: string;
  readonly topic: string;
  readonly content: string;
  readonly epistemicStatus: EpistemicStatus;
  readonly acknowledgedBy: readonly string[];
  readonly disputedBy: readonly string[];
  readonly round: number;
}

export interface CommonGroundState {
  readonly facts: readonly GroundedFact[];
}

export interface PointClassification {
  readonly priority: string;
  readonly scope: string;
  readonly location?: string;
}

export interface ConversationEntry {
  readonly entryType: string;
  readonly content: string;
  readonly agentRole: string;
  readonly round: number;
  readonly timestamp?: string;
}

export interface ConversationPoint {
  readonly id: string;
  readonly topic: string;
  readonly round: number;
  readonly classification: PointClassification;
  readonly entries: readonly ConversationEntry[];
  readonly status: string;
  readonly convergenceSignal?: ConvergenceSignal;
}

export interface SubTaskFinding {
  readonly id: string;
  readonly pointId: string;
  readonly taskType: string;
  readonly content: string;
  readonly status: string;
  readonly round: number;
}

export interface FlagEntry {
  readonly id: string;
  readonly pointId: string;
  readonly content: string;
  readonly flaggedBy: string;
  readonly round: number;
}

export interface RoundMemo {
  readonly agentRole: string;
  readonly content: string;
  readonly round: number;
}

export interface ObligationChain {
  readonly pointId: string;
  readonly correlationId: string;
  readonly commitment: CommitmentRecord;
  readonly transitions: readonly TransitionRecord[];
}

export interface ConversationState {
  readonly points: readonly ConversationPoint[];
  readonly convergence: ConvergenceSignal;
  readonly commonGround: CommonGroundState;
  readonly humanFlags: readonly FlagEntry[];
  readonly memos: readonly RoundMemo[];
  readonly subTaskFindings: readonly SubTaskFinding[];
  readonly obligations: readonly ObligationChain[];
  readonly currentRound: number;
}
