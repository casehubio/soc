import { describe, it, expect } from 'vitest';
import { DefaultOrcSemaphore } from './semaphore.js';

describe('DefaultOrcSemaphore', () => {
  it('acquire succeeds immediately when permits available', async () => {
    const sem = new DefaultOrcSemaphore(2);
    await sem.acquire();
    expect(sem.availablePermits()).toBe(1);
    await sem.acquire();
    expect(sem.availablePermits()).toBe(0);
  });

  it('acquire blocks when no permits, unblocks on release', async () => {
    const sem = new DefaultOrcSemaphore(1);
    await sem.acquire();
    let acquired = false;
    const p = sem.acquire().then(() => { acquired = true; });
    expect(acquired).toBe(false);
    sem.release();
    await p;
    expect(acquired).toBe(true);
  });

  it('FIFO ordering — first waiter gets next permit', async () => {
    const sem = new DefaultOrcSemaphore(1);
    await sem.acquire();
    const order: number[] = [];
    const p1 = sem.acquire().then(() => order.push(1));
    const p2 = sem.acquire().then(() => order.push(2));
    sem.release();
    sem.release();
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });

  it('release without prior acquire increases permits', () => {
    const sem = new DefaultOrcSemaphore(1);
    sem.release();
    expect(sem.availablePermits()).toBe(2);
  });

  it('tryAcquire returns false on timeout', async () => {
    const sem = new DefaultOrcSemaphore(0);
    expect(await sem.tryAcquire(10)).toBe(false);
  });

  it('tryAcquire returns true when permit becomes available', async () => {
    const sem = new DefaultOrcSemaphore(0);
    const p = sem.tryAcquire(1000);
    sem.release();
    expect(await p).toBe(true);
  });

  describe('AbortSignal', () => {
    it('acquire rejects with AbortError when signal aborts while waiting', async () => {
      const sem = new DefaultOrcSemaphore(0);
      const controller = new AbortController();
      const p = sem.acquire(controller.signal);
      controller.abort();
      await expect(p).rejects.toThrow('aborted');
    });

    it('acquire rejects immediately if signal already aborted', async () => {
      const sem = new DefaultOrcSemaphore(0);
      const controller = new AbortController();
      controller.abort();
      await expect(sem.acquire(controller.signal)).rejects.toThrow('aborted');
    });

    it('acquire resolves normally when permit available before abort', async () => {
      const sem = new DefaultOrcSemaphore(1);
      const controller = new AbortController();
      await expect(sem.acquire(controller.signal)).resolves.toBeUndefined();
      expect(sem.availablePermits()).toBe(0);
    });

    it('acquire removes waiter from queue on abort', async () => {
      const sem = new DefaultOrcSemaphore(0);
      const controller = new AbortController();
      const p = sem.acquire(controller.signal).catch(() => {});
      controller.abort();
      await p;
      sem.release();
      expect(sem.availablePermits()).toBe(1);
    });
  });
});
