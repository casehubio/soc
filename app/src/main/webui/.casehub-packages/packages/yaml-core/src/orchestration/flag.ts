export interface OrcFlag {
  set(): void;
  clear(): void;
  toggle(): boolean;
  get(): boolean;
}

export class DefaultOrcFlag implements OrcFlag {
  private value = false;

  set(): void { this.value = true; }
  clear(): void { this.value = false; }
  toggle(): boolean { this.value = !this.value; return this.value; }
  get(): boolean { return this.value; }
}
