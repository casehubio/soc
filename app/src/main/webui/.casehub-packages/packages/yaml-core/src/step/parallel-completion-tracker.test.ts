import { describe, it, expect } from 'vitest';
import { ParallelCompletionTracker } from './parallel-completion-tracker.js';

describe('ParallelCompletionTracker', () => {
  it('resolves advancement after N branches complete', async () => {
    const tracker = new ParallelCompletionTracker(3, 1, false);
    let advanced = false;
    void tracker.awaitAdvancement().then(() => { advanced = true; });
    tracker.branchDone(0);
    await new Promise(r => setTimeout(r, 0));
    expect(advanced).toBe(true);
  });

  it('waits for all N when advanceAfter equals branchCount', async () => {
    const tracker = new ParallelCompletionTracker(3, 3, false);
    let advanced = false;
    void tracker.awaitAdvancement().then(() => { advanced = true; });
    tracker.branchDone(0);
    tracker.branchDone(1);
    await new Promise(r => setTimeout(r, 0));
    expect(advanced).toBe(false);
    tracker.branchDone(2);
    await new Promise(r => setTimeout(r, 0));
    expect(advanced).toBe(true);
  });

  it('cancelRemaining aborts other branches after advancement', async () => {
    const tracker = new ParallelCompletionTracker(3, 1, true);
    tracker.branchDone(1);
    await Promise.resolve();
    expect(tracker.signalFor(0).aborted).toBe(true);
    expect(tracker.signalFor(1).aborted).toBe(false);
    expect(tracker.signalFor(2).aborted).toBe(true);
  });

  it('signals are not aborted without cancelRemaining', async () => {
    const tracker = new ParallelCompletionTracker(3, 1, false);
    tracker.branchDone(0);
    await Promise.resolve();
    expect(tracker.signalFor(1).aborted).toBe(false);
    expect(tracker.signalFor(2).aborted).toBe(false);
  });
});
