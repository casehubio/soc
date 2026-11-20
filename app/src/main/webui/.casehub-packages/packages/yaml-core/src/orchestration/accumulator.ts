import type { OrcNumericPrimitive } from './numeric-primitive.js';

export interface OrcAccumulator {
  accumulate(value: number): void;
  get(): number;
  reset(): void;
}

export class DefaultOrcAccumulator implements OrcAccumulator, OrcNumericPrimitive {
  private value: number;
  private readonly listeners: Set<(value: number) => void> = new Set();

  constructor(
    private readonly op: (a: number, b: number) => number,
    private readonly identity: number,
  ) {
    this.value = identity;
  }

  accumulate(value: number): void { this.value = this.op(this.value, value); this.notifyListeners(); }
  get(): number { return this.value; }
  reset(): void { this.value = this.identity; this.notifyListeners(); }

  doubleValue(): number { return this.value; }
  onThresholdChange(listener: (value: number) => void): void { this.listeners.add(listener); }
  removeThresholdListener(listener: (value: number) => void): void { this.listeners.delete(listener); }

  private notifyListeners(): void {
    for (const listener of this.listeners) listener(this.value);
  }
}
