export class ParallelCompletionTracker {
  private readonly advancementCount: number;
  private readonly controllers: AbortController[];
  private completed = 0;
  private advancementResolve!: () => void;
  private readonly advancementPromise: Promise<void>;

  constructor(
    branchCount: number,
    advanceAfter: number,
    private readonly _cancelRemaining: boolean,
  ) {
    this.advancementCount = advanceAfter;
    this.controllers = Array.from({ length: branchCount }, () => new AbortController());
    this.advancementPromise = new Promise<void>(resolve => { this.advancementResolve = resolve; });
  }

  signalFor(index: number): AbortSignal {
    return this.controllers[index]!.signal;
  }

  branchDone(index: number): void {
    this.completed++;
    if (this.completed >= this.advancementCount) {
      this.advancementResolve();
      if (this._cancelRemaining) {
        for (let i = 0; i < this.controllers.length; i++) {
          if (i !== index) this.controllers[i]!.abort();
        }
      }
    }
  }

  async awaitAdvancement(): Promise<void> {
    await this.advancementPromise;
  }
}
