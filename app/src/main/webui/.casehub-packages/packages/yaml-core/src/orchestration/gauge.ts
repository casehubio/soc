export interface OrcGauge<T> {
  set(value: T): void;
  get(): T;
  compareAndSet(expect: T, update: T): boolean;
}

export class DefaultOrcGauge<T> implements OrcGauge<T> {
  private value: T;

  constructor(initial: T) { this.value = initial; }

  set(value: T): void { this.value = value; }
  get(): T { return this.value; }
  compareAndSet(expect: T, update: T): boolean {
    if (this.value === expect) { this.value = update; return true; }
    return false;
  }
}
