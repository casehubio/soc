import type { AgentRefSpec, FailurePolicySpec } from '../orchestration.js';

export interface PromptSignature {
  id: string;
  baseSystemPrompt?: string;
}

export type OptimiserType = 'few-shot' | 'instruction';

export interface PromptOptimiser {
  type: OptimiserType;
  diversityStrategy?: string;
}

export interface PromptOptimisationConfig {
  maxExamples?: number;
  minQualityThreshold?: number;
  minOutcomeCount?: number;
  minVariantOutcomes?: number;
}

export interface PromptSafetyConfig {
  qualityFloor?: number;
  maxExperimentCycles?: number;
  circuitBreakerThreshold?: number;
}

export type ConfidenceScorerType = 'arousal' | 'surprise' | 'composite';

export interface ConfidenceScorer {
  type: ConfidenceScorerType;
}

export interface PromptExample {
  input: string;
  output: string;
  outcome?: string;
  qualityScore?: number;
}

export interface PromptOptimisationPipeline {
  signature: PromptSignature;
  optimiser: PromptOptimiser;
  config?: PromptOptimisationConfig;
  safety?: PromptSafetyConfig;
  confidenceScorer?: ConfidenceScorer;
  examples?: PromptExample[];
}

export interface OptimisationPatternCategory {
  category: 'optimisation';
  type: 'prompt-optimisation';
  name?: string;
  description?: string;
  task?: string;
  agents?: AgentRefSpec[];
  failurePolicy?: FailurePolicySpec;
  pipelines?: Record<string, PromptOptimisationPipeline>;
}
