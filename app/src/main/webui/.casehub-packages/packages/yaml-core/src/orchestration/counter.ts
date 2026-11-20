import type { OrcNumericPrimitive } from './numeric-primitive.js';

export interface OrcCounter {
  increment(): void;
  decrement(): void;
  add(delta: number): void;
  get(): number;
  reset(): void;
}

export class DefaultOrcCounter implements OrcCounter, OrcNumericPrimitive {
  private value = 0;
  private readonly listeners: Set<(value: number) => void> = new Set();

  increment(): void { this.value++; this.notifyListeners(); }
  decrement(): void { this.value--; this.notifyListeners(); }
  add(delta: number): void { this.value += delta; this.notifyListeners(); }
  get(): number { return this.value; }
  reset(): void { this.value = 0; this.notifyListeners(); }

  doubleValue(): number { return this.value; }
  onThresholdChange(listener: (value: number) => void): void { this.listeners.add(listener); }
  removeThresholdListener(listener: (value: number) => void): void { this.listeners.delete(listener); }

  private notifyListeners(): void {
    for (const listener of this.listeners) listener(this.value);
  }
}
