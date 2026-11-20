import type {
  AgentRefSpec, FailurePolicySpec, AggregationSpec, TerminationSpec,
  RoutingSpec, DecompositionSpec, ActivationSpec, GovernanceSpec,
  JudgmentSpecDef,
} from '../orchestration.js';

export type OrchestrationPatternType =
  'supervisor' | 'choreography' | 'saga' | 'decomposition';

export interface OrchestrationPatternCategory {
  category: 'orchestration';
  type: OrchestrationPatternType;
  name?: string;
  description?: string;
  task?: string;
  agents?: AgentRefSpec[];
  routing?: RoutingSpec;
  decomposition?: DecompositionSpec;
  activation?: ActivationSpec;
  aggregation?: AggregationSpec;
  termination?: TerminationSpec[];
  judgment?: JudgmentSpecDef;
  governance?: GovernanceSpec;
  failurePolicy?: FailurePolicySpec;
}
