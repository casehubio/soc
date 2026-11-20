import type { EventTimelineStrategy } from '@casehubio/pages-viz';
import type { StageConfig } from '../types.js';
import { stateProgressionStrategy } from './state-progression.js';
import type { StateData, ResolveStatus } from './state-progression.js';

export interface CommitmentLifecycleData {
  readonly id: string;
  readonly currentStage: string;
  readonly stages: ReadonlyArray<{
    readonly key: string;
    readonly actor?: string;
    readonly timestamp?: string;
    readonly status: string;
  }>;
  readonly messages?: ReadonlyArray<{
    readonly sender: string;
    readonly content: string;
    readonly timestamp: string;
  }>;
}

export function commitmentLifecycleStrategy(options?: {
  stages?: readonly StageConfig[];
  resolveStatus?: ResolveStatus;
}): EventTimelineStrategy<StateData> {
  const base = stateProgressionStrategy(options);
  return {
    ...base,
    transformData(raw: unknown): StateData {
      const commitment = raw as CommitmentLifecycleData;
      return {
        currentState: commitment.currentStage,
        transitions: commitment.stages.map(s => ({
          state: s.key,
          ...(s.actor !== undefined ? { actor: s.actor } : {}),
          ...(s.timestamp !== undefined ? { timestamp: s.timestamp } : {}),
        })),
      };
    },
  };
}
