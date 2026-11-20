import { Priority } from './priority.js';

export interface PriorityOrcSemaphore {
  acquire(priority: Priority): Promise<void>;
  tryAcquire(priority: Priority, timeoutMs: number): Promise<boolean>;
  release(): void;
  availablePermits(): number;
}

interface PriorityWaiter {
  priority: Priority;
  resolve: (acquired: boolean) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export class DefaultPriorityOrcSemaphore implements PriorityOrcSemaphore {
  private _permits: number;
  private _waiters: PriorityWaiter[] = [];

  constructor(permits: number) {
    if (permits < 1) throw new Error('permits must be >= 1');
    this._permits = permits;
  }

  acquire(priority: Priority): Promise<void> {
    if (this._permits > 0) {
      this._permits--;
      return Promise.resolve();
    }
    return new Promise<boolean>((resolve) => {
      this.insertWaiter({ priority, resolve });
    }).then(() => undefined);
  }

  tryAcquire(priority: Priority, timeoutMs: number): Promise<boolean> {
    if (this._permits > 0) {
      this._permits--;
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      const waiter: PriorityWaiter = { priority, resolve };
      waiter.timer = setTimeout(() => {
        const idx = this._waiters.indexOf(waiter);
        if (idx >= 0) this._waiters.splice(idx, 1);
        resolve(false);
      }, timeoutMs);
      this.insertWaiter(waiter);
    });
  }

  release(): void {
    const waiter = this._waiters.shift();
    if (waiter) {
      if (waiter.timer) clearTimeout(waiter.timer);
      waiter.resolve(true);
    } else {
      this._permits++;
    }
  }

  availablePermits(): number {
    return this._permits;
  }

  private insertWaiter(waiter: PriorityWaiter): void {
    let i = 0;
    while (i < this._waiters.length && this._waiters[i]!.priority >= waiter.priority) i++;
    this._waiters.splice(i, 0, waiter);
  }
}
