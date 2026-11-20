import { describe, it, expect } from 'vitest';
import { DefaultConsumerHandle } from './consumer-handle.js';

describe('DefaultConsumerHandle', () => {
  it('starts not stopped', () => {
    const handle = new DefaultConsumerHandle('enricher');
    expect(handle.isStopped()).toBe(false);
    expect(handle.signal.aborted).toBe(false);
  });

  it('stop sets isStopped and aborts signal', () => {
    const handle = new DefaultConsumerHandle('enricher');
    handle.stop();
    expect(handle.isStopped()).toBe(true);
    expect(handle.signal.aborted).toBe(true);
  });

  it('name returns the consumer name', () => {
    const handle = new DefaultConsumerHandle('my-consumer');
    expect(handle.name).toBe('my-consumer');
  });

  it('double stop is a no-op', () => {
    const handle = new DefaultConsumerHandle('test');
    handle.stop();
    handle.stop();
    expect(handle.isStopped()).toBe(true);
  });

  it('pause gates the consumer, resume unblocks it', async () => {
    const handle = new DefaultConsumerHandle('enricher');
    expect(handle.isPaused()).toBe(false);
    handle.pause();
    expect(handle.isPaused()).toBe(true);

    let resumed = false;
    void handle.awaitResume().then(() => { resumed = true; });
    await new Promise(r => setTimeout(r, 0));
    expect(resumed).toBe(false);

    handle.resume();
    await new Promise(r => setTimeout(r, 0));
    expect(resumed).toBe(true);
    expect(handle.isPaused()).toBe(false);
  });

  it('awaitResume resolves immediately when not paused', async () => {
    const handle = new DefaultConsumerHandle('enricher');
    let resolved = false;
    void handle.awaitResume().then(() => { resolved = true; });
    await new Promise(r => setTimeout(r, 0));
    expect(resolved).toBe(true);
  });

  it('start restarts a stopped consumer', () => {
    const handle = new DefaultConsumerHandle('enricher');
    handle.stop();
    expect(handle.isStopped()).toBe(true);
    handle.start();
    expect(handle.isStopped()).toBe(false);
    expect(handle.signal.aborted).toBe(false);
  });

  it('start on a running consumer is a no-op', () => {
    const handle = new DefaultConsumerHandle('enricher');
    expect(handle.isStopped()).toBe(false);
    handle.start();
    expect(handle.isStopped()).toBe(false);
  });

  it('pause then stop then start resets all state', () => {
    const handle = new DefaultConsumerHandle('enricher');
    handle.pause();
    expect(handle.isPaused()).toBe(true);
    handle.stop();
    handle.start();
    expect(handle.isStopped()).toBe(false);
    expect(handle.isPaused()).toBe(false);
  });
});
