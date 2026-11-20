import { describe, it, expect } from 'vitest';
import { ChannelClosedError, IllegalTransitionError, SemaphoreReentrancyError } from './errors.js';

describe('ChannelClosedError', () => {
  it('includes channel name in message', () => {
    const err = new ChannelClosedError('trades');
    expect(err.message).toContain('trades');
    expect(err.name).toBe('ChannelClosedError');
    expect(err).toBeInstanceOf(Error);
  });

  it('chains cause when provided', () => {
    const cause = new Error('upstream');
    const err = new ChannelClosedError('trades', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('IllegalTransitionError', () => {
  it('includes machine name and states', () => {
    const err = new IllegalTransitionError('workflow', 'idle', 'complete');
    expect(err.message).toContain('workflow');
    expect(err.message).toContain('idle');
    expect(err.message).toContain('complete');
    expect(err.name).toBe('IllegalTransitionError');
  });
});

describe('SemaphoreReentrancyError', () => {
  it('includes name and step context', () => {
    const err = new SemaphoreReentrancyError('db-write', 'step-3');
    expect(err.message).toContain('db-write');
    expect(err.message).toContain('step-3');
    expect(err.name).toBe('SemaphoreReentrancyError');
  });
});
