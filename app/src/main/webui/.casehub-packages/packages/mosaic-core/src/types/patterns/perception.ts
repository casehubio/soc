import type { AgentRefSpec, FailurePolicySpec } from '../orchestration.js';

export type PerceptionPatternType = 'summarisation' | 'narrative' | 'observation';

export interface SummarisationLevel {
  grouping: 'windowed' | 'keyed';
  summariser: { type: string; config?: Record<string, unknown> };
  emit: string;
}

export interface PipelineSpec {
  name?: string;
  source: string;
  levels: SummarisationLevel[];
}

export type WorldSectionType = 'entity-group' | 'text' | 'item-list';

export interface WorldSection {
  type: WorldSectionType;
  requiredTags?: string[];
  resolutions?: string[];
}

export interface RendererSpec {
  verbatimThreshold: number;
  groupedThreshold: number;
}

export interface WorldSpec {
  actions?: string[];
  entities?: Record<string, unknown>;
  sections?: WorldSection[];
  pipeline?: string[];
  renderer?: RendererSpec;
}

export interface PerceptionPatternCategory {
  category: 'perception';
  type: PerceptionPatternType;
  name?: string;
  description?: string;
  task?: string;
  agents?: AgentRefSpec[];
  failurePolicy?: FailurePolicySpec;
  pipeline?: PipelineSpec;
  world?: WorldSpec;
}
