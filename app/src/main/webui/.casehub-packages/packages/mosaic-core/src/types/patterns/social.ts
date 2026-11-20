import type { AgentRefSpec, FailurePolicySpec } from '../orchestration.js';

export type SocialPatternType = 'memory-hygiene' | 'cognition' | 'reflection';

export interface RetentionConfig {
  retentionThreshold?: number;
  confidenceWeight?: number;
  recencyWeight?: number;
  scopeWeight?: number;
  trustWeight?: number;
}

export interface MoodBaseline {
  pleasure?: number;
  arousal?: number;
  dominance?: number;
}

export interface MoodConfigSpec {
  baseline?: MoodBaseline;
  decayTimeConstant?: string;
  maxDisplacement?: number;
  moodInfluence?: number;
  staleStateTimeout?: string;
}

export interface DriveConfigSpec {
  axisWeights?: Record<string, number>;
  changeThreshold?: number;
  moodPleasureModulation?: number;
  moodArousalModulation?: number;
  personalityModulationStrength?: number;
  maxIntensity?: number;
  minIntensity?: number;
  affiliationDecayThreshold?: number;
  affiliationStaleDuration?: string;
  autonomyConfidenceFloor?: number;
  narrativeModulationStrength?: number;
}

export interface PersonalityEvolutionConfigSpec {
  decayFactor?: number;
  l2Ceiling?: number;
  dampeningFactor?: number;
}

export interface UserModelConfigSpec {
  minSignalsForSynthesis?: number;
  synthesisCooldown?: string;
  decayRate?: number;
  positiveWeight?: number;
  negativeWeight?: number;
  stageConfig?: Record<string, unknown>;
  expectedTickInterval?: string;
  evictionTimeout?: string;
  memoryDomain?: string;
  caseType?: string;
  maxObservationsInPrompt?: number;
}

export interface StrategyLearningConfigSpec {
  minSignalsForConversationCase?: number;
  minCasesForReflection?: number;
  maxReflectionSources?: number;
  maxGuidelines?: number;
  defaultDimensionValue?: number;
  maxBufferSize?: number;
  staleStateTimeout?: string;
  memoryDomain?: string;
  engagementCaseType?: string;
  profileCaseType?: string;
}

export interface MentalModelConfigSpec {
  beliefHalfLife?: string;
  desireHalfLife?: string;
  intentionHalfLife?: string;
  confidenceFloor?: number;
  projectionFloor?: number;
  minSignalsForInference?: number;
  inferenceCooldown?: string;
  maxSignalsInPrompt?: number;
  maxBufferSize?: number;
  evictionTimeout?: string;
  expectedTickInterval?: string;
  memoryDomain?: string;
  caseType?: string;
}

export interface NarrativeSynthesisGateSpec {
  minNewReflections?: number;
  noveltyThreshold?: number;
  quietPeriodBypass?: string;
}

export interface NarrativeConfigSpec {
  synthesisGate?: NarrativeSynthesisGateSpec;
  maxEpisodes?: number;
  maxThemes?: number;
  themeSalienceFloor?: number;
  maxReflectionsPerSynthesis?: number;
  memoryDomain?: string;
  caseType?: string;
}

export interface GoalProposalConfigSpec {
  proposalThreshold?: number;
  relevanceThreshold?: number;
  maxDriveGoals?: number;
  staleAfter?: string;
  cooldown?: string;
  failureAbandonmentThreshold?: number;
}

export interface GoalEscalationConfigSpec {
  escalationSalienceThreshold?: number;
  minAxisAlignmentWeight?: number;
  crossAxisMinWeight?: number;
  minCrossAxisCount?: number;
  escalationCycles?: number;
  demotionCycles?: number;
  maxPrimaryDriveGoals?: number;
}

export interface CognitiveGoalConfigSpec {
  enabled?: boolean;
  caseCreationThreshold?: number;
  surfacingCooldown?: string;
  driveWeight?: number;
  minimumSurfacingPriority?: number;
}

export interface NormDetectionConfigSpec {
  minObservationsForNorm?: number;
  establishedThreshold?: number;
  decliningThreshold?: number;
  minAgentsForNorm?: number;
  memoryDomain?: string;
  caseType?: string;
}

export interface CollectiveGoalConfigSpec {
  alignmentThreshold?: number;
  minAlignedAgents?: number;
  cooldown?: string;
}

export interface CognitionConfig {
  drive?: DriveConfigSpec;
  mood?: MoodConfigSpec;
  personalityEvolution?: PersonalityEvolutionConfigSpec;
  userModel?: UserModelConfigSpec;
  strategyLearning?: StrategyLearningConfigSpec;
  mentalModel?: MentalModelConfigSpec;
  narrative?: NarrativeConfigSpec;
  goalProposal?: GoalProposalConfigSpec;
  goalEscalation?: GoalEscalationConfigSpec;
  normDetection?: NormDetectionConfigSpec;
  collectiveGoal?: CollectiveGoalConfigSpec;
  retention?: RetentionConfig;
  cognitiveGoal?: CognitiveGoalConfigSpec;
}

export interface SocialPatternCategory {
  category: 'social';
  type: SocialPatternType;
  name?: string;
  description?: string;
  task?: string;
  agents?: AgentRefSpec[];
  failurePolicy?: FailurePolicySpec;
  cognition?: CognitionConfig;
  retention?: RetentionConfig;
}
