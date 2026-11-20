import type { ScenarioScope } from '@casehubio/yaml-core/orchestration';
import type { ConditionEvaluator } from '@casehubio/yaml-core/condition';
import type { VirtualClock } from './virtual-clock.js';

export interface ExecutionContext {
  scope: ScenarioScope;
  clock: VirtualClock;
  eventTarget: EventTarget;
  speed: number;
  conditionEvaluator: ConditionEvaluator;
}

export interface StepExecutor {
  canExecute(step: unknown): boolean;
  execute(step: unknown, context: ExecutionContext): Promise<void>;
}

export class AriaExecutor implements StepExecutor {
  constructor(
    private readonly _commandExecutor: (step: unknown, eventTarget?: EventTarget, speed?: number) => Promise<void>,
  ) {}

  canExecute(step: unknown): boolean {
    return (step as { delivery?: string }).delivery === 'aria';
  }

  execute(step: unknown, context: ExecutionContext): Promise<void> {
    return this._commandExecutor(step, context.eventTarget, context.speed);
  }
}
