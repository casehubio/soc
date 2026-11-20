import type { ResolvedStep, Result } from './walker.js';
import type { Context } from './decorator-chain.js';

export interface Runner {
  run(step: ResolvedStep, context: Context): Promise<Result>;
}

export interface DeadlineContext {
  readonly deadlineMs: number | undefined;
  isExpired(): boolean;
  remaining(): number | undefined;
}

export class DefaultDeadlineContext implements DeadlineContext {
  readonly deadlineMs: number | undefined;
  private readonly startMs: number;

  constructor(deadlineMs?: number) {
    this.deadlineMs = deadlineMs;
    this.startMs = Date.now();
  }

  isExpired(): boolean {
    if (this.deadlineMs === undefined) return false;
    return Date.now() - this.startMs >= this.deadlineMs;
  }

  remaining(): number | undefined {
    if (this.deadlineMs === undefined) return undefined;
    const r = this.deadlineMs - (Date.now() - this.startMs);
    return r > 0 ? r : 0;
  }
}

export class QuorumTracker {
  private readonly completed = new Set<string>();

  record(stepName: string): void {
    this.completed.add(stepName);
  }

  completedCount(ofSteps: string[]): number {
    return ofSteps.filter(name => this.completed.has(name)).length;
  }

  isSatisfied(required: number, ofSteps: string[]): boolean {
    return this.completedCount(ofSteps) >= required;
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Preserve the published static facade.
export class ScopeUtils {
  static buildResultScope(
    results: Record<string, Record<string, unknown>>,
  ): Record<string, string> {
    const flat: Record<string, string> = {};
    for (const [stepName, output] of Object.entries(results)) {
      for (const [key, value] of Object.entries(output)) {
        flat[`${stepName}.${key}`] = String(value);
      }
    }
    return flat;
  }
}
