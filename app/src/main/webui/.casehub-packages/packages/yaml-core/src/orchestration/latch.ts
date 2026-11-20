import type { OrcLatch } from './types.js';

interface Waiter {
  resolve: (timedOut: boolean) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export class DefaultOrcLatch implements OrcLatch {
  private _count: number;
  private _waiters: Waiter[] = [];

  constructor(count: number) {
    this._count = Math.max(0, count);
  }

  countDown(): void {
    if (this._count <= 0) return;
    this._count--;
    if (this._count === 0) {
      const waiters = this._waiters;
      this._waiters = [];
      for (const w of waiters) {
        if (w.timer) clearTimeout(w.timer);
        w.resolve(true);
      }
    }
  }

  await(signal?: AbortSignal): Promise<void>;
  await(timeoutMs: number): Promise<boolean>;
  await(timeoutOrSignal?: number | AbortSignal): Promise<void | boolean> {
    if (timeoutOrSignal instanceof AbortSignal) {
      return this._awaitWithSignal(timeoutOrSignal);
    }
    const timeoutMs = timeoutOrSignal;
    if (this._count === 0) {
      return timeoutMs !== undefined ? Promise.resolve(true) : Promise.resolve();
    }
    return new Promise<boolean>((resolve) => {
      const waiter: Waiter = { resolve };
      if (timeoutMs !== undefined) {
        waiter.timer = setTimeout(() => {
          const idx = this._waiters.indexOf(waiter);
          if (idx >= 0) this._waiters.splice(idx, 1);
          resolve(false);
        }, timeoutMs);
      }
      this._waiters.push(waiter);
    }).then((result) => (timeoutMs !== undefined ? result : undefined));
  }

  private _awaitWithSignal(signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      return Promise.reject(new DOMException('The operation was aborted', 'AbortError'));
    }
    if (this._count === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        resolve: () => { resolve(); },
      };
      const onAbort = () => {
        const idx = this._waiters.indexOf(waiter);
        if (idx >= 0) this._waiters.splice(idx, 1);
        reject(new DOMException('The operation was aborted', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      this._waiters.push(waiter);
    });
  }

  getCount(): number {
    return this._count;
  }
}
