import { describe, it, expect } from 'vitest';
import { DefaultPriorityOrcSemaphore } from './priority-semaphore.js';
import { Priority } from './priority.js';

describe('DefaultPriorityOrcSemaphore', () => {
  it('acquire succeeds immediately when permits available', async () => {
    const sem = new DefaultPriorityOrcSemaphore(2);
    await sem.acquire(Priority.NORMAL);
    expect(sem.availablePermits()).toBe(1);
  });

  it('acquire blocks when no permits, unblocks on release', async () => {
    const sem = new DefaultPriorityOrcSemaphore(1);
    await sem.acquire(Priority.NORMAL);
    let acquired = false;
    const p = sem.acquire(Priority.NORMAL).then(() => { acquired = true; });
    expect(acquired).toBe(false);
    sem.release();
    await p;
    expect(acquired).toBe(true);
  });

  it('higher priority acquires before lower priority', async () => {
    const sem = new DefaultPriorityOrcSemaphore(1);
    await sem.acquire(Priority.NORMAL);
    const order: string[] = [];
    const pBg = sem.acquire(Priority.BACKGROUND).then(() => order.push('bg'));
    const pHi = sem.acquire(Priority.HIGH).then(() => order.push('high'));
    sem.release();
    sem.release();
    await Promise.all([pBg, pHi]);
    expect(order).toEqual(['high', 'bg']);
  });

  it('tryAcquire returns false on timeout', async () => {
    const sem = new DefaultPriorityOrcSemaphore(1);
    await sem.acquire(Priority.NORMAL);
    expect(await sem.tryAcquire(Priority.NORMAL, 10)).toBe(false);
  });

  it('tryAcquire returns true when permit becomes available', async () => {
    const sem = new DefaultPriorityOrcSemaphore(1);
    await sem.acquire(Priority.NORMAL);
    const p = sem.tryAcquire(Priority.NORMAL, 1000);
    sem.release();
    expect(await p).toBe(true);
  });

  it('rejects permits < 1', () => {
    expect(() => new DefaultPriorityOrcSemaphore(0)).toThrow('permits must be >= 1');
  });

  it('release without prior acquire increases permits', () => {
    const sem = new DefaultPriorityOrcSemaphore(1);
    sem.release();
    expect(sem.availablePermits()).toBe(2);
  });

  it('same priority preserves FIFO order', async () => {
    const sem = new DefaultPriorityOrcSemaphore(1);
    await sem.acquire(Priority.NORMAL);
    const order: number[] = [];
    const p1 = sem.acquire(Priority.NORMAL).then(() => order.push(1));
    const p2 = sem.acquire(Priority.NORMAL).then(() => order.push(2));
    sem.release();
    sem.release();
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });
});
