export type { PlaybookPatternCategory, PlaybookPatternType } from '@casehubio/yaml-core/patterns';

export * from './categories.js';
export * from './base.js';
export * from './orchestration.js';
export * from './deliberation.js';
export * from './perception.js';
export * from './optimisation.js';
export * from './social.js';
export * from './normalize.js';

export type {
  RoutingSpec, DecompositionSpec, ActivationSpec, GovernanceSpec,
  AgentRefSpec, BaseAgentRefSpec, FailurePolicySpec, JudgmentSpecDef,
  JudgmentTriggerSpec, JudgmentCallerSpec, AgreementSpec, TaskNodeSpec,
  PatternDefinitionRef,
} from '../orchestration.js';

import type { PlaybookPatternCategory } from '@casehubio/yaml-core/patterns';
import type { OrchestrationPatternCategory } from './orchestration.js';
import type { DeliberationPatternCategory } from './deliberation.js';
import type { PerceptionPatternCategory } from './perception.js';
import type { OptimisationPatternCategory } from './optimisation.js';
import type { SocialPatternCategory } from './social.js';
import type {
  CommunicationPatternCategory,
  GovernancePatternCategory,
} from './base.js';

export type PatternCategory =
  | PlaybookPatternCategory
  | OrchestrationPatternCategory
  | DeliberationPatternCategory
  | PerceptionPatternCategory
  | CommunicationPatternCategory
  | GovernancePatternCategory
  | OptimisationPatternCategory
  | SocialPatternCategory;
