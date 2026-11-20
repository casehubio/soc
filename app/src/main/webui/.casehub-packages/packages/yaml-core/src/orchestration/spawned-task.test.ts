import { describe, it, expect } from 'vitest';
import { DefaultSpawnedTask } from './spawned-task.js';

describe('DefaultSpawnedTask', () => {
  it('successful task — join resolves, isDone true, isFailed false', async () => {
    const task = new DefaultSpawnedTask('ok', async (_signal) => {});
    await task.join();
    expect(task.isDone()).toBe(true);
    expect(task.isFailed()).toBe(false);
    expect(task.exception()).toBeUndefined();
  });

  it('failing task — isDone true, isFailed true, exception set', async () => {
    const err = new Error('boom');
    const task = new DefaultSpawnedTask('fail', async (_signal) => { throw err; });
    await task.join();
    expect(task.isDone()).toBe(true);
    expect(task.isFailed()).toBe(true);
    expect(task.exception()).toBe(err);
  });

  it('name returns task name', () => {
    const task = new DefaultSpawnedTask('my-task', async (_signal) => {});
    expect(task.name()).toBe('my-task');
  });

  it('joinWithTimeout returns true when task completes in time', async () => {
    const task = new DefaultSpawnedTask('fast', async (_signal) => {});
    expect(await task.joinWithTimeout(1000)).toBe(true);
  });

  it('joinWithTimeout returns false when task exceeds timeout', async () => {
    const task = new DefaultSpawnedTask('slow', (_signal) =>
      new Promise<void>(resolve => setTimeout(resolve, 5000)),
    );
    expect(await task.joinWithTimeout(10)).toBe(false);
  });

  describe('cancel', () => {
    it('cancel aborts the task via AbortSignal', async () => {
      let aborted = false;
      const task = new DefaultSpawnedTask('test', async (signal) => {
        await new Promise<void>((_, reject) => {
          signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
        });
      });
      task.cancel();
      await task.join();
      expect(aborted).toBe(true);
      expect(task.isFailed()).toBe(true);
    });

    it('cancel on already-done task is a no-op', async () => {
      const task = new DefaultSpawnedTask('test', async (_signal) => {});
      await task.join();
      expect(task.isDone()).toBe(true);
      task.cancel();
      expect(task.isDone()).toBe(true);
      expect(task.isFailed()).toBe(false);
    });
  });
});
