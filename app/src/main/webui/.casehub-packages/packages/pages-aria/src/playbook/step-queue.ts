import type { DataTrigger, TimeTrigger } from './types.js';

export type QueueState = 'ready' | 'suspended' | 'blocked' | 'done';

export class StepQueue {
  state: QueueState = 'ready';
  position = 0;
  wakeTime: number | undefined = undefined;
  blockReason: Promise<void> | undefined = undefined;
  trigger: DataTrigger | TimeTrigger | undefined = undefined;
  children: StepQueue[] = [];

  constructor(
    public readonly id: string,
    public readonly steps: unknown[],
    public readonly parent?: StepQueue,
  ) {
    if (parent) parent.children.push(this);
  }

  currentStep(): unknown {
    return this.position < this.steps.length ? this.steps[this.position] : undefined;
  }

  advance(): void {
    this.position++;
  }

  isDone(): boolean {
    return this.position >= this.steps.length;
  }

  block(reason?: Promise<void>, wakeTime?: number): void {
    this.state = 'blocked';
    this.blockReason = reason;
    this.wakeTime = wakeTime;
  }

  unblock(): void {
    this.state = 'ready';
    this.wakeTime = undefined;
    this.blockReason = undefined;
  }

  suspend(trigger: DataTrigger | TimeTrigger): void {
    this.state = 'suspended';
    this.trigger = trigger;
  }

  activate(): void {
    this.state = 'ready';
    this.trigger = undefined;
  }
}
