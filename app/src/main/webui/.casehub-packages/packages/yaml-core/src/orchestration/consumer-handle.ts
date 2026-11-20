export interface ConsumerHandle {
  readonly name: string;
  stop(): void;
  start(): void;
  pause(): void;
  resume(): void;
  awaitResume(): Promise<void>;
  isStopped(): boolean;
  isPaused(): boolean;
  readonly signal: AbortSignal;
}

export class DefaultConsumerHandle implements ConsumerHandle {
  private controller = new AbortController();
  private _paused = false;
  private _resumeResolve: (() => void) | null = null;
  private _resumePromise: Promise<void> | null = null;
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  stop(): void {
    this.controller.abort();
    if (this._resumeResolve) {
      this._resumeResolve();
      this._resumeResolve = null;
      this._resumePromise = null;
    }
    this._paused = false;
  }

  start(): void {
    if (!this.controller.signal.aborted) return;
    this.controller = new AbortController();
    this._paused = false;
    this._resumeResolve = null;
    this._resumePromise = null;
  }

  pause(): void {
    if (this._paused) return;
    this._paused = true;
    this._resumePromise = new Promise<void>(resolve => {
      this._resumeResolve = resolve;
    });
  }

  resume(): void {
    if (!this._paused) return;
    this._paused = false;
    if (this._resumeResolve) {
      this._resumeResolve();
      this._resumeResolve = null;
      this._resumePromise = null;
    }
  }

  async awaitResume(): Promise<void> {
    if (!this._paused) return;
    if (this._resumePromise) await this._resumePromise;
  }

  isStopped(): boolean {
    return this.controller.signal.aborted;
  }

  isPaused(): boolean {
    return this._paused;
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }
}
