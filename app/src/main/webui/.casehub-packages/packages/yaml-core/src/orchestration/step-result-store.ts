import type { StepResultStore } from './types.js';
import type { StepError } from './directives.js';

export class DefaultStepResultStore implements StepResultStore {
  private readonly _results = new Map<string, Record<string, unknown>>();
  private readonly _errors = new Map<string, StepError>();
  private readonly _completed = new Set<string>();
  private readonly _waiters: Array<{ check: () => boolean; resolve: () => void }> = [];

  recordSuccess(stepName: string, result: Record<string, unknown>): void {
    this._results.set(stepName, result);
    this._completed.add(stepName);
    this._notifyWaiters();
  }

  recordFailure(stepName: string, error: StepError): void {
    this._errors.set(stepName, error);
    this._completed.add(stepName);
    this._notifyWaiters();
  }

  result(stepName: string): Record<string, unknown> | undefined {
    return this._results.get(stepName);
  }

  error(stepName: string): StepError | undefined {
    return this._errors.get(stepName);
  }

  hasCompleted(stepName: string): boolean {
    return this._completed.has(stepName);
  }

  awaitAll(names: string[]): Promise<void> {
    if (names.every(n => this._completed.has(n))) return Promise.resolve();
    return new Promise(resolve => {
      this._waiters.push({ check: () => names.every(n => this._completed.has(n)), resolve });
    });
  }

  awaitCount(names: string[], threshold: number): Promise<void> {
    if (names.filter(n => this._completed.has(n)).length >= threshold) return Promise.resolve();
    return new Promise(resolve => {
      this._waiters.push({ check: () => names.filter(n => this._completed.has(n)).length >= threshold, resolve });
    });
  }

  private _notifyWaiters(): void {
    for (let i = this._waiters.length - 1; i >= 0; i--) {
      if (this._waiters[i]!.check()) {
        this._waiters[i]!.resolve();
        this._waiters.splice(i, 1);
      }
    }
  }
}
