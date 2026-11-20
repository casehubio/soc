import { describe, it, expect } from 'vitest';
import { DefaultStepResultStore } from './step-result-store.js';

describe('DefaultStepResultStore', () => {
  it('records and retrieves success', () => {
    const store = new DefaultStepResultStore();
    store.recordSuccess('step-1', { count: 42 });
    expect(store.result('step-1')).toEqual({ count: 42 });
    expect(store.hasCompleted('step-1')).toBe(true);
    expect(store.error('step-1')).toBeUndefined();
  });

  it('records and retrieves failure', () => {
    const store = new DefaultStepResultStore();
    const err = { message: 'boom', exceptionClass: 'Error', stackTrace: 'at ...' };
    store.recordFailure('step-2', err);
    expect(store.error('step-2')).toEqual(err);
    expect(store.hasCompleted('step-2')).toBe(true);
    expect(store.result('step-2')).toBeUndefined();
  });

  it('returns undefined for unknown steps', () => {
    const store = new DefaultStepResultStore();
    expect(store.result('nope')).toBeUndefined();
    expect(store.error('nope')).toBeUndefined();
    expect(store.hasCompleted('nope')).toBe(false);
  });

  describe('awaitAll', () => {
    it('resolves immediately when all already complete', async () => {
      const store = new DefaultStepResultStore();
      store.recordSuccess('a', {});
      store.recordSuccess('b', {});
      await store.awaitAll(['a', 'b']);
    });

    it('resolves when all named steps complete', async () => {
      const store = new DefaultStepResultStore();
      const promise = store.awaitAll(['a', 'b']);
      let resolved = false;
      void promise.then(() => { resolved = true; });
      store.recordSuccess('a', {});
      await Promise.resolve();
      expect(resolved).toBe(false);
      store.recordSuccess('b', {});
      await Promise.resolve();
      expect(resolved).toBe(true);
    });

    it('resolves on failure too (completion, not success)', async () => {
      const store = new DefaultStepResultStore();
      const promise = store.awaitAll(['a']);
      store.recordFailure('a', { message: 'err', exceptionClass: 'E', stackTrace: '' });
      await promise;
    });
  });

  describe('awaitCount', () => {
    it('resolves when threshold count of steps complete', async () => {
      const store = new DefaultStepResultStore();
      const promise = store.awaitCount(['a', 'b', 'c'], 2);
      let resolved = false;
      void promise.then(() => { resolved = true; });
      store.recordSuccess('a', {});
      await Promise.resolve();
      expect(resolved).toBe(false);
      store.recordSuccess('c', {});
      await Promise.resolve();
      expect(resolved).toBe(true);
    });

    it('resolves immediately when already met', async () => {
      const store = new DefaultStepResultStore();
      store.recordSuccess('a', {});
      store.recordSuccess('b', {});
      await store.awaitCount(['a', 'b', 'c'], 2);
    });
  });
});
