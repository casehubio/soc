import type { EventTimelineNode, EventNodeStatus, EventTimelineStrategy } from '@casehubio/pages-viz';
import type { StageConfig } from '../types.js';

export const QHORUS_STAGES: readonly StageConfig[] = [
  { key: 'OPEN', label: 'Open' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { key: 'FULFILLED', label: 'Fulfilled', terminal: 'success' },
  { key: 'DECLINED', label: 'Declined', terminal: 'failure' },
  { key: 'FAILED', label: 'Failed', terminal: 'failure' },
  { key: 'DELEGATED', label: 'Delegated', terminal: 'transfer' },
  { key: 'EXPIRED', label: 'Expired', terminal: 'failure' },
];

export interface StateData {
  currentState: string;
  transitions?: ReadonlyArray<{ state: string; actor?: string; timestamp?: string }>;
}

export type ResolveStatus = (
  stage: StageConfig,
  currentState: string,
  transitions: Array<{ state: string; actor?: string; timestamp?: string }>,
  stages: readonly StageConfig[],
) => EventNodeStatus;

export function defaultResolveStatus(
  stage: StageConfig,
  currentState: string,
  transitions: Array<{ state: string; actor?: string; timestamp?: string }>,
  _stages: readonly StageConfig[],
): EventNodeStatus {
  if (stage.key === currentState) {
    if (stage.terminal === 'success') return 'completed';
    if (stage.terminal === 'failure') return 'failed';
    if (stage.terminal === 'transfer') return 'completed';
    return 'active';
  }
  if (transitions.length > 0) {
    return transitions.some(t => t.state === stage.key) ? 'completed' : 'skipped';
  }
  return 'pending';
}

export function linearResolveStatus(
  stage: StageConfig,
  currentState: string,
  _transitions: Array<{ state: string; actor?: string; timestamp?: string }>,
  stages: readonly StageConfig[],
): EventNodeStatus {
  const currentIndex = stages.findIndex(s => s.key === currentState);
  if (currentIndex === -1) return 'pending';
  const stageIndex = stages.indexOf(stage as StageConfig);
  if (stageIndex < currentIndex) return 'completed';
  if (stageIndex === currentIndex) {
    if (stage.terminal === 'success') return 'completed';
    if (stage.terminal === 'failure') return 'failed';
    if (stage.terminal === 'transfer') return 'completed';
    return 'active';
  }
  return 'pending';
}

export function stateProgressionStrategy(options?: {
  stages?: readonly StageConfig[];
  resolveStatus?: ResolveStatus;
}): EventTimelineStrategy<StateData> {
  const stages = options?.stages ?? QHORUS_STAGES;
  const resolve = options?.resolveStatus ?? defaultResolveStatus;

  return {
    toNodes(data: StateData): EventTimelineNode[] {
      const transitions = data.transitions ? [...data.transitions] : [];
      const transitionMap = new Map<string, { state: string; actor?: string; timestamp?: string }>();
      for (const t of transitions) {
        transitionMap.set(t.state, t);
      }

      return stages.map(stage => {
        const transition = transitionMap.get(stage.key);
        return {
          key: stage.key,
          label: stage.label,
          status: resolve(stage, data.currentState, transitions, stages),
          ...(transition?.timestamp != null && { timestamp: transition.timestamp }),
          ...(transition?.actor != null && { actor: transition.actor }),
        };
      });
    },
    defaultLayout: 'horizontal',
  };
}
