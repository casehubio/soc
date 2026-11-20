import type { ScenarioScope } from '@casehubio/yaml-core/orchestration';
import { StepQueue } from './step-queue.js';
import type { SchedulerStep, OrchestrationBlock, DataTrigger, TimeTrigger } from './types.js';
import type { ParallelStep, BlockStep } from '@casehubio/yaml-core/step';

export interface BindResult {
  queues: StepQueue[];
  triggers: Map<string, DataTrigger | TimeTrigger>;
}

export function bindScenario(
  scenario: { orchestration?: OrchestrationBlock; steps?: SchedulerStep[]; sections?: Array<{ steps: SchedulerStep[] }> },
  scope: ScenarioScope,
): BindResult {
  if (scenario.orchestration) {
    bindOrchestrationBlock(scenario.orchestration, scope);
  }

  const allSteps = scenario.sections
    ? scenario.sections.flatMap(s => s.steps)
    : (scenario.steps ?? []);

  const triggers = new Map<string, DataTrigger | TimeTrigger>();
  const mainQueue = new StepQueue('main', []);
  const allQueues: StepQueue[] = [mainQueue];

  buildQueueTree(allSteps, mainQueue, allQueues, triggers, scope);

  return { queues: allQueues, triggers };
}

function bindOrchestrationBlock(block: OrchestrationBlock, scope: ScenarioScope): void {
  const allNames = [
    ...Object.keys(block.barriers ?? {}),
    ...Object.keys(block.channels ?? {}),
    ...(block.signals ?? []),
    ...Object.keys(block.machines ?? {}),
    ...Object.keys(block.quorums ?? {}),
  ];
  for (const name of allNames) {
    if (name.startsWith('__anon_')) {
      throw new Error(`Orchestration name '${name}' uses reserved '__anon_' prefix`);
    }
  }

  for (const [name, def] of Object.entries(block.barriers ?? {})) {
    scope.latch(name, def.count);
  }
  for (const [name, def] of Object.entries(block.quorums ?? {})) {
    scope.latch(name, def.required);
  }
  for (const [name, def] of Object.entries(block.channels ?? {})) {
    scope.channel(name, def.capacity);
  }
  for (const name of block.signals ?? []) {
    scope.signal(name);
  }
  for (const [name, def] of Object.entries(block.machines ?? {})) {
    scope.stateMachine(name, def.states, def.initial);
  }
}

function buildQueueTree(
  steps: SchedulerStep[],
  currentQueue: StepQueue,
  allQueues: StepQueue[],
  triggers: Map<string, DataTrigger | TimeTrigger>,
  _scope: ScenarioScope,
): void {
  for (const step of steps) {
    if (step.kind === 'parallel') {
      const parallel = step as ParallelStep;
      for (const child of parallel.steps) {
        if (child.kind === 'block') {
          const block = child as BlockStep;
          const childQueue = new StepQueue(block.name ?? `branch-${allQueues.length}`, block.steps as unknown[], currentQueue);
          allQueues.push(childQueue);
        }
      }
      (currentQueue.steps as unknown[]).push(step);
    } else {
      (currentQueue.steps as unknown[]).push(step);
    }
  }
}
