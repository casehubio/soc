export type PatternType =
  | 'sequence'
  | 'parallel'
  | 'supervisor'
  | 'loop'
  | 'conditional'
  | 'voting'
  | 'debate'
  | 'htn';

export type AgentRefType = 'worker' | 'human' | 'external' | 'composed' | 'channel';

export interface AgentRef {
  type: AgentRefType;
  name: string;
  description?: string;
  capabilities?: string[];
  model?: string;
  pattern?: PatternSpec;
}

export interface AggregationSpec {
  type: string;
}

export interface TerminationSpec {
  type: string;
  iterations?: number;
  resolvedStatuses?: string[];
  maxDisputeRounds?: number;
  when?: string;
}

export interface JudgmentTrigger {
  type: string;
  threshold?: number;
  extractor?: string;
  every?: number;
}

export interface JudgmentCaller {
  type: string;
  callerName?: string;
  callerNames?: string[];
  agreement?: { type: string };
}

export interface JudgmentSpec {
  trigger: JudgmentTrigger;
  caller: JudgmentCaller;
}

export interface FailurePolicy {
  onRoutingFailure?: string;
  onDeadlock?: string;
  agentRetry?: {
    maxRetries?: number;
    backoff?: string;
    backoffStrategy?: string;
    onExhausted?: string;
  };
}

export interface PatternSpec {
  type: PatternType;
  name?: string;
  description?: string;
  task?: string;
  agents?: AgentRef[];
  aggregation?: AggregationSpec;
  termination?: TerminationSpec[];
  judgment?: JudgmentSpec;
  failurePolicy?: FailurePolicy;
  maxRounds?: number;
  judge?: AgentRef;
  routing?: { type: string; guard?: string };
  maxIterations?: number;
  exitCondition?: string;
  branches?: Array<{ condition: string; agent: AgentRef; description?: string }>;
  rootTask?: unknown;
  governance?: unknown;
}
