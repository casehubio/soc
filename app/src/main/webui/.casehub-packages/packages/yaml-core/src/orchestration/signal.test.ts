import { describe, it, expect } from 'vitest';
import { DefaultOrcSignal } from './signal.js';

describe('DefaultOrcSignal', () => {
  describe('one-shot mode', () => {
    it('resolves waiters on signal', async () => {
      const s = new DefaultOrcSignal();
      const p = s.await();
      s.signal('data');
      await p;
      expect(s.payload()).toBe('data');
    });

    it('resolves immediately if already signalled', async () => {
      const s = new DefaultOrcSignal();
      s.signal();
      await s.await();
      expect(s.isSignalled()).toBe(true);
    });

    it('resolves multiple waiters', async () => {
      const s = new DefaultOrcSignal();
      const results: string[] = [];
      const p1 = s.await().then(() => results.push('a'));
      const p2 = s.await().then(() => results.push('b'));
      s.signal();
      await Promise.all([p1, p2]);
      expect(results).toHaveLength(2);
    });

    it('timeout returns false when not signalled', async () => {
      const s = new DefaultOrcSignal();
      const result = s.await(10);
      expect(await result).toBe(false);
    });

    it('timeout returns true when signalled before expiry', async () => {
      const s = new DefaultOrcSignal();
      const p = s.await(1000);
      s.signal();
      expect(await p).toBe(true);
    });
  });

  describe('repeatable mode', () => {
    it('resets after signal — next await waits again', async () => {
      const s = new DefaultOrcSignal(true);
      const p1 = s.await();
      s.signal('first');
      await p1;
      expect(s.isSignalled()).toBe(false);

      const p2 = s.await();
      s.signal('second');
      await p2;
      expect(s.payload()).toBe('second');
    });
  });

  describe('AbortSignal', () => {
    it('await rejects with AbortError when signal aborts while waiting', async () => {
      const s = new DefaultOrcSignal();
      const controller = new AbortController();
      const p = s.await(controller.signal);
      controller.abort();
      await expect(p).rejects.toThrow('aborted');
    });

    it('await rejects immediately if signal already aborted', async () => {
      const s = new DefaultOrcSignal();
      const controller = new AbortController();
      controller.abort();
      await expect(s.await(controller.signal)).rejects.toThrow('aborted');
    });

    it('await resolves normally when signal fires before abort', async () => {
      const s = new DefaultOrcSignal();
      const controller = new AbortController();
      s.signal('data');
      await expect(s.await(controller.signal)).resolves.toBeUndefined();
    });
  });
});
