export type ExecutionState =
  | 'IDLE' | 'RUNNING' | 'WAITING_FOR_AGENT'
  | 'WAITING_FOR_EVENT' | 'COMPLETE' | 'FAULTED' | 'CANCELLED';

export type ExecutionResult = 'COMPLETED' | 'FAILED' | 'ESCALATED' | 'CANCELLED';

export type AgentRefType = 'WORKER' | 'CHANNEL' | 'HUMAN' | 'EXTERNAL' | 'COMPOSED';
export type AgentResultStatus = 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'DECLINED';

export interface AgentRef {
  readonly id: string;
  readonly type: AgentRefType;
  readonly name?: string;
}

export interface AgentResult {
  readonly agentRef: AgentRef;
  readonly status: AgentResultStatus;
  readonly detail?: string;
  readonly error?: string;
  readonly duration?: number;
}

export type PatternType =
  | 'SEQUENCE' | 'PARALLEL' | 'LOOP' | 'CONDITIONAL'
  | 'SUPERVISOR' | 'DEBATE' | 'VOTING' | 'HTN';

export type RoutingFailureAction = 'FAIL' | 'RETRY_BROADER' | 'ESCALATE';
export type AggregationFailureAction = 'FAIL' | 'ESCALATE' | 'RETRY_DIFFERENT';
export type BackoffStrategy = 'FIXED' | 'LINEAR' | 'EXPONENTIAL';

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
  readonly pattern: PatternType;
  readonly routingStrategy?: string;
  readonly decompositionStrategy?: string;
  readonly activationStrategy?: string;
  readonly aggregationStrategy?: string;
  readonly terminationStrategy?: string;
  readonly failurePolicy: FailurePolicy;
}

export type OrchestrationEventType =
  | 'EXECUTION_STARTED' | 'ROUTING_DECISION' | 'ACTIVATION_EVALUATED'
  | 'AGENT_DISPATCHED' | 'AGENT_RESULT' | 'AGENT_FAILED'
  | 'AGGREGATION_COMPLETED' | 'TERMINATION_EVALUATED' | 'EXECUTION_COMPLETED';

export type RoutingOutcome = 'SELECTED' | 'UNRESOLVABLE' | 'ESCALATE';
export type AggregationOutcome = 'RESOLVED' | 'PARTIAL' | 'DEADLOCKED';
export type TerminationOutcome = 'CONTINUE' | 'COMPLETE' | 'FAILED' | 'ESCALATE';

export interface ExecutionStartedPayload {
  readonly type: 'EXECUTION_STARTED';
  readonly model: ExecutionModel;
}

export interface RoutingDecisionPayload {
  readonly type: 'ROUTING_DECISION';
  readonly outcome: RoutingOutcome;
  readonly selectedAgents?: readonly AgentRef[];
  readonly reason?: string;
}

export interface ActivationPayload {
  readonly type: 'ACTIVATION_EVALUATED';
  readonly conditionMet: boolean;
  readonly conditionExpression?: string;
}

export interface AgentDispatchPayload {
  readonly type: 'AGENT_DISPATCHED';
  readonly agentRef: AgentRef;
}

export interface AgentResultPayload {
  readonly type: 'AGENT_RESULT' | 'AGENT_FAILED';
  readonly agentRef: AgentRef;
  readonly status: AgentResultStatus;
  readonly detail?: string;
  readonly error?: string;
  readonly duration?: number;
}

export interface AggregationPayload {
  readonly type: 'AGGREGATION_COMPLETED';
  readonly outcome: AggregationOutcome;
  readonly remainingCount?: number;
}

export interface TerminationPayload {
  readonly type: 'TERMINATION_EVALUATED';
  readonly outcome: TerminationOutcome;
  readonly reason?: string;
}

export interface ExecutionCompletedPayload {
  readonly type: 'EXECUTION_COMPLETED';
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
