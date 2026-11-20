import type { OrcSemaphore } from './types.js';

interface Waiter {
  resolve: (acquired: boolean) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export class DefaultOrcSemaphore implements OrcSemaphore {
  private _permits: number;
  private _waiters: Waiter[] = [];

  constructor(permits: number) {
    this._permits = permits;
  }

  acquire(signal?: AbortSignal): Promise<void> {
    if (signal) return this._acquireWithSignal(signal);
    if (this._permits > 0) {
      this._permits--;
      return Promise.resolve();
    }
    return new Promise<boolean>((resolve) => {
      this._waiters.push({ resolve });
    }).then(() => undefined);
  }

  private _acquireWithSignal(signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      return Promise.reject(new DOMException('The operation was aborted', 'AbortError'));
    }
    if (this._permits > 0) {
      this._permits--;
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

  tryAcquire(timeoutMs: number): Promise<boolean> {
    if (this._permits > 0) {
      this._permits--;
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      const waiter: Waiter = { resolve };
      waiter.timer = setTimeout(() => {
        const idx = this._waiters.indexOf(waiter);
        if (idx >= 0) this._waiters.splice(idx, 1);
        resolve(false);
      }, timeoutMs);
      this._waiters.push(waiter);
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
}
