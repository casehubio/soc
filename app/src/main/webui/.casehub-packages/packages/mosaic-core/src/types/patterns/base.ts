import type { AgencyCategoryName } from './categories.js';
import type { AgentRefSpec, FailurePolicySpec } from '../orchestration.js';

export interface BasePatternCategory {
  category: AgencyCategoryName;
  type: string;
  name?: string;
  description?: string;
  task?: string;
  agents?: AgentRefSpec[];
  failurePolicy?: FailurePolicySpec;
}

export interface CommunicationPatternCategory extends BasePatternCategory {
  category: 'communication';
  type: 'channel-execution' | 'channel-summary';
}

export interface GovernancePatternCategory extends BasePatternCategory {
  category: 'governance';
  type: 'judgment' | 'oversight' | 'attestation' | 'trust';
}
