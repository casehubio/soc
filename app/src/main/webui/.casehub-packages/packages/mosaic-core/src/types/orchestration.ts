import type { PatternCategoryName } from './patterns/categories.js';

export type ExecutionState =
  | 'idle' | 'running' | 'waiting-for-agent'
  | 'waiting-for-event' | 'complete' | 'faulted' | 'cancelled';

export type ExecutionResult = 'completed' | 'failed' | 'escalated' | 'cancelled';

export type AgentRefType = 'worker' | 'channel' | 'human' | 'external' | 'composed';
export type AgentResultStatus = 'success' | 'failure' | 'timeout' | 'declined';

export interface AgentRef {
  readonly id?: string;
  readonly type: AgentRefType;
  readonly name?: string;
  readonly description?: string;
  readonly capabilities?: string[];
  readonly model?: string;
}

export interface AgentResult {
  readonly agentRef: AgentRef;
  readonly status: AgentResultStatus;
  readonly detail?: string;
  readonly error?: string;
  readonly duration?: number;
}

// --- YAML spec types (schema-derived discriminated unions) ---

export type AggregationSpec =
  | { type: 'pass-through' }
  | { type: 'collect-all' }
  | { type: 'majority-vote' }
  | { type: 'auction' };

export type TerminationSpec =
  | { type: 'max-iterations' }
  | { type: 'goal-reached' }
  | { type: 'judge-convergence' }
  | { type: 'all-agreed' }
  | { type: 'supervisor' }
  | { type: 'contested' }
  | { type: 'convergence' }
  | { type: 'single-pass' }
  | { type: 'agent-count' }
  | { type: 'accepted' }
  | { type: 'terminal-outcome' }
  | { type: 'deadline' };

export interface DispositionAxisWeight {
  readonly axis: string;
  readonly weight: number;
}

export type RoutingSpec =
  | { type: 'first-match'; guard?: string }
  | { type: 'round-robin' }
  | { type: 'sequential' }
  | { type: 'llm-selected'; model?: string; prompt?: string }
  | { type: 'select-all' }
  | { type: 'cbr-agent'; similarityThreshold?: number }
  | { type: 'disposition-aware'; axes?: DispositionAxisWeight[] };

export type RoutingAgentStatus =
  'selected' | 'skipped' | 'not-evaluated' | 'excluded';

export type DecompositionSpec =
  | { type: 'identity' }
  | { type: 'static' }
  | { type: 'llm' }
  | { type: 'hybrid' }
  | { type: 'heuristic' }
  | { type: 'goap' }
  | { type: 'capability-dependency' }
  | { type: 'forward-reasoning' };

export type ActivationSpec =
  | { type: 'on-dispatch' }
  | { type: 'max-iterations' };

export type TaskNodeSpec =
  | { type: 'primitive'; name?: string; description?: string; executor?: string }
  | { type: 'compound'; name?: string; subtasks?: TaskNodeSpec[] };

export type AgreementSpec =
  | { type: 'unanimous' }
  | { type: 'majority' }
  | { type: 'threshold' };

export interface GovernanceSpec {
  oversight?: {
    classifier?: string;
    reversible?: boolean;
    candidateGroups?: string[];
  };
  trustRouting?: {
    threshold?: number;
    minimumObservations?: number;
    borderlineMargin?: number;
    blendFactor?: number;
  };
  cbrRouting?: {
    successWeight?: number;
    gateExpiredWeight?: number;
    gateRejectedWeight?: number;
    failureWeight?: number;
  };
  attestation?: {
    observer?: string;
    capabilityTag?: string;
  };
}

export interface BaseAgentRefSpec {
  readonly name?: string;
  readonly description?: string;
  readonly capabilities?: string[];
  readonly model?: string;
}

export type AgentRefSpec =
  | (BaseAgentRefSpec & { type: 'worker' })
  | (BaseAgentRefSpec & { type: 'channel'; channelId?: string })
  | (BaseAgentRefSpec & { type: 'human' })
  | (BaseAgentRefSpec & { type: 'external' })
  | (BaseAgentRefSpec & { type: 'composed'; pattern?: PatternDefinitionRef });

export interface PatternDefinitionRef {
  type: string;
  [key: string]: unknown;
}

export interface FailurePolicySpec {
  onRoutingFailure?: 'FAIL' | 'RETRY_BROADER' | 'ESCALATE';
  onDeadlock?: 'FAIL' | 'ESCALATE' | 'RETRY_DIFFERENT';
  agentRetry?: {
    maxRetries?: number;
    backoffStrategy?: 'FIXED' | 'EXPONENTIAL' | 'EXPONENTIAL_WITH_JITTER';
    backoff?: string;
    onExhausted?: 'FAIL' | 'ESCALATE' | 'SKIP';
  };
  replanPolicy?: {
    maxReplans?: number;
    fallbackAction?: 'FAIL' | 'RETRY_BROADER' | 'ESCALATE';
  };
}

export type JudgmentTriggerSpec =
  | { type: 'alwaysYield' }
  | { type: 'neverYield' }
  | { type: 'iterationBased'; every?: number }
  | { type: 'confidenceThreshold'; threshold?: number; extractor?: string };

export type JudgmentCallerSpec =
  | { type: 'single'; callerName?: string }
  | { type: 'fanOut'; callerNames?: string[] }
  | { type: 'escalationChain'; callerNames?: string[] };

export interface JudgmentSpecDef {
  trigger?: JudgmentTriggerSpec;
  caller?: JudgmentCallerSpec;
  agreement?: AgreementSpec;
}

// --- Runtime types (mosaic-owned, not schema-derived) ---

export type RoutingFailureAction = 'fail' | 'retry-broader' | 'escalate';
export type AggregationFailureAction = 'fail' | 'escalate' | 'retry-different';
export type BackoffStrategy = 'fixed' | 'linear' | 'exponential';

export interface AgentRetryPolicy {
  readonly maxRetries: number;
  readonly backoffStrategy: BackoffStrategy;
  readonly initialDelayMs?: number;
}

export interface FailurePolicy {
  readonly routingFailureAction: RoutingFailureAction;
  readonly aggregationFailureAction: AggregationFailureAction;
  readonly agentRetryPolicy?: AgentRetryPolicy;
}

export interface ExecutionModel {
  readonly pattern: PatternCategoryName;
  readonly routingStrategy?: string;
  readonly decompositionStrategy?: string;
  readonly activationStrategy?: string;
  readonly aggregationStrategy?: string;
  readonly terminationStrategy?: string;
  readonly failurePolicy: FailurePolicy;
}

export type OrchestrationEventType =
  | 'execution-started' | 'routing-decision' | 'activation-evaluated'
  | 'agent-dispatched' | 'agent-result' | 'agent-failed'
  | 'aggregation-completed' | 'termination-evaluated' | 'execution-completed';

export type RoutingOutcome = 'selected' | 'unresolvable' | 'escalate';
export type AggregationOutcome = 'resolved' | 'partial' | 'deadlocked';
export type TerminationOutcome = 'continue' | 'complete' | 'failed' | 'escalate';

export interface ExecutionStartedPayload {
  readonly type: 'execution-started';
  readonly model: ExecutionModel;
}

export interface RoutingDecisionPayload {
  readonly type: 'routing-decision';
  readonly outcome: RoutingOutcome;
  readonly selectedAgents?: readonly AgentRef[];
  readonly reason?: string;
}

export interface ActivationPayload {
  readonly type: 'activation-evaluated';
  readonly conditionMet: boolean;
  readonly conditionExpression?: string;
}

export interface AgentDispatchPayload {
  readonly type: 'agent-dispatched';
  readonly agentRef: AgentRef;
}

export interface AgentResultPayload {
  readonly type: 'agent-result' | 'agent-failed';
  readonly agentRef: AgentRef;
  readonly status: AgentResultStatus;
  readonly detail?: string;
  readonly error?: string;
  readonly duration?: number;
}

export interface AggregationPayload {
  readonly type: 'aggregation-completed';
  readonly outcome: AggregationOutcome;
  readonly remainingCount?: number;
}

export interface TerminationPayload {
  readonly type: 'termination-evaluated';
  readonly outcome: TerminationOutcome;
  readonly reason?: string;
}

export interface ExecutionCompletedPayload {
  readonly type: 'execution-completed';
  readonly result: ExecutionResult;
  readonly reason?: string;
}

export type OrchestrationPayload =
  | ExecutionStartedPayload
  | RoutingDecisionPayload
  | ActivationPayload
  | AgentDispatchPayload
  | AgentResultPayload
  | AggregationPayload
  | TerminationPayload
  | ExecutionCompletedPayload;

export interface OrchestrationAuditEvent {
  readonly id: string;
  readonly eventType: OrchestrationEventType;
  readonly executionId: string;
  readonly timestamp: string;
  readonly iteration?: number;
  readonly payload: OrchestrationPayload;
}

export interface ExecutionSnapshot {
  readonly executionId: string;
  readonly state: ExecutionState;
  readonly model: ExecutionModel;
  readonly result?: ExecutionResult;
  readonly activeAgents: readonly AgentRef[];
  readonly completedAgents: readonly AgentResult[];
  readonly iteration?: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
}
