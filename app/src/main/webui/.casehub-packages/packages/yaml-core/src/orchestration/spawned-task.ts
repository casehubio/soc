export interface SpawnedTask {
  name(): string;
  isDone(): boolean;
  isFailed(): boolean;
  exception(): Error | undefined;
  join(): Promise<void>;
  joinWithTimeout(timeoutMs: number): Promise<boolean>;
  cancel(): void;
}

export class DefaultSpawnedTask implements SpawnedTask {
  private done = false;
  private failed = false;
  private error?: Error;
  private readonly promise: Promise<void>;
  private resolve!: () => void;
  private readonly taskName: string;
  private readonly controller = new AbortController();

  constructor(taskName: string, task: (signal: AbortSignal) => Promise<void>) {
    this.taskName = taskName;
    this.promise = new Promise<void>(res => { this.resolve = res; });
    task(this.controller.signal).then(() => {
      this.done = true;
      this.resolve();
    }).catch((err: Error) => {
      this.done = true;
      this.failed = true;
      this.error = err;
      this.resolve();
    });
  }

  name(): string { return this.taskName; }
  isDone(): boolean { return this.done; }
  isFailed(): boolean { return this.failed; }
  exception(): Error | undefined { return this.error; }
  cancel(): void { this.controller.abort(); }
  async join(): Promise<void> { await this.promise; }
  async joinWithTimeout(timeoutMs: number): Promise<boolean> {
    const timer = new Promise<boolean>(res => setTimeout(() => { res(false); }, timeoutMs));
    const done = this.promise.then(() => true);
    return Promise.race([done, timer]);
  }
}
