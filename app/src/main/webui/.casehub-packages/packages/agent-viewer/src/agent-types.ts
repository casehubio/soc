export type GoalPriority = 'PRIMARY' | 'SECONDARY';
export type ConstraintSeverity = 'HARD' | 'SOFT';
export type GoalVisibility = 'PUBLIC' | 'PRIVATE';
export type GoalLifecycleState = 'ACTIVE' | 'BLOCKED' | 'DEFERRED' | 'COMPLETED' | 'ABANDONED' | 'DORMANT';
export type GoalHorizon = 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM' | 'ASPIRATIONAL';
export type DegradationReason = 'RATE_LIMITED' | 'CONTEXT_EXHAUSTED' | 'OVERLOADED' | 'DOMAIN_MISMATCH';
export type ExclusionSource = 'DECLARED' | 'LEARNED';
export type ViolationKind = 'PER_DIMENSION' | 'AGGREGATE';

export type CapabilityStatus =
  | { readonly type: 'ready' }
  | { readonly type: 'degraded'; readonly reason: DegradationReason; readonly detail?: string }
  | { readonly type: 'overloaded'; readonly pressure: number; readonly threshold: number }
  | { readonly type: 'unavailable'; readonly reason?: string }
  | { readonly type: 'epistemically-weak'; readonly domain: string; readonly confidence: number }
  | { readonly type: 'excluded'; readonly domain: string; readonly source: ExclusionSource; readonly declineCount?: number }
  | { readonly type: 'behavioral-violation'; readonly violations: Record<string, number>; readonly kind: ViolationKind };

export interface DispositionValue {
  term: string;
  weight: number;
}

export interface Disposition {
  mbtiType?: string;
  enneagramType?: string;
  socialOrient?: string | DispositionValue[];
  ruleFollowing?: string | DispositionValue[];
  riskAppetite?: string | DispositionValue[];
  autonomy?: string | DispositionValue[];
  conflictMode?: string | DispositionValue[];
  delegation?: boolean;
  dispositionProfile?: DispositionValue[];
  styleProfile?: DispositionValue[];
}

export interface AgentVoiceProfile {
  description?: string;
  register?: string;
  accent?: string;
  catchphrases?: string[];
  speechPatterns?: string[];
  vocabularyUses?: string[];
  vocabularyAvoids?: string[];
  quirks?: string[];
}

export interface Capability {
  name: string;
  description?: string;
  tags?: string[];
  qualityHint?: number;
  health?: CapabilityStatus;
  capabilityVocabulary?: string;
  latencyHintP50Ms?: number;
  costHint?: string;
  modelRef?: string;
  inputTypes?: string[];
  outputTypes?: string[];
  epistemicDomains?: Record<string, number>;
  excludedDomains?: string[];
}

export interface Goal {
  name?: string;
  description: string;
  priority: GoalPriority;
  visibility?: GoalVisibility;
  capabilities?: string[];
  attributes?: Record<string, string>;
  lifecycleState?: GoalLifecycleState;
  horizon?: GoalHorizon;
}

export interface Constraint {
  name?: string;
  description: string;
  severity: ConstraintSeverity;
  visibility?: GoalVisibility;
}

export interface AgentDescriptor {
  agentId?: string;
  name: string;
  description?: string;
  version?: string;
  avatar?: string;
  slot?: string;
  slotVocabulary?: string;
  archetype?: string;
  archetypeAdjectives?: string[];
  provider?: string;
  modelFamily?: string;
  modelVersion?: string;
  weightsFingerprint?: string;
  domainVocabulary?: string;
  dispositionVocabulary?: string;
  styleVocabulary?: string;
  disposition?: Disposition;
  capabilities?: Capability[];
  jurisdiction?: string;
  dataHandlingPolicy?: string;
  tenancyId?: string;
  voice?: AgentVoiceProfile;
  goals?: Goal[];
  constraints?: Constraint[];
  briefing?: string;
}
