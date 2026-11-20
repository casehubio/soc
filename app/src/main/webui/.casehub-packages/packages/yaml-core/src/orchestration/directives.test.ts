import { describe, it, expect } from 'vitest';
import { parseLoopDirective, parseRetryDirective, parseComputeBlock } from './directives.js';
import type { StepError } from './directives.js';

describe('parseLoopDirective', () => {
  it('parses number as count', () => {
    expect(parseLoopDirective(5)).toEqual({ type: 'count', count: 5 });
  });

  it('parses object with count and until as count-until', () => {
    expect(parseLoopDirective({ count: 3, until: '${done}' })).toEqual({
      type: 'count-until', count: 3, until: '${done}',
    });
  });

  it('parses object with until only', () => {
    expect(parseLoopDirective({ until: '${complete}' })).toEqual({
      type: 'until', until: '${complete}',
    });
  });

  it('passes through LoopDirective objects', () => {
    const existing = { type: 'count' as const, count: 2 };
    expect(parseLoopDirective(existing)).toEqual(existing);
  });

  it('throws on invalid input', () => {
    expect(() => parseLoopDirective('bad')).toThrow();
    expect(() => parseLoopDirective(null)).toThrow();
    expect(() => parseLoopDirective({})).toThrow();
  });
});

describe('parseRetryDirective', () => {
  it('parses number as simple', () => {
    expect(parseRetryDirective(3)).toEqual({ type: 'simple', max: 3 });
  });

  it('parses object with backoff and delay as full', () => {
    expect(parseRetryDirective({ max: 3, backoff: 'exponential', delay: '1s' })).toEqual({
      type: 'full', max: 3, backoff: 'exponential', delayMs: 1000,
    });
  });

  it('parses object with max only as simple', () => {
    expect(parseRetryDirective({ max: 5 })).toEqual({ type: 'simple', max: 5 });
  });

  it('throws on invalid input', () => {
    expect(() => parseRetryDirective('bad')).toThrow();
    expect(() => parseRetryDirective(null)).toThrow();
  });
});

describe('parseComputeBlock', () => {
  it('parses engine and expression', () => {
    expect(parseComputeBlock({ engine: 'js', expression: '1 + 1' }, 'mvel')).toEqual({
      engine: 'js', expression: '1 + 1',
    });
  });

  it('uses default engine when not specified', () => {
    expect(parseComputeBlock({ expression: 'x > 0' }, 'mvel')).toEqual({
      engine: 'mvel', expression: 'x > 0',
    });
  });

  it('throws when expression is missing', () => {
    expect(() => parseComputeBlock({}, 'mvel')).toThrow();
  });
});

describe('StepError', () => {
  it('has required fields', () => {
    const err: StepError = { message: 'failed', exceptionClass: 'Error', stackTrace: 'at ...' };
    expect(err.message).toBe('failed');
  });
});

describe('parseLoopDirective — continuous', () => {
  it('parses continuous string', () => {
    expect(parseLoopDirective('continuous')).toEqual({ type: 'continuous' });
  });
});

describe('parseRetryDirective — conditional', () => {
  it('parses conditional retry with on categories', () => {
    expect(parseRetryDirective({ max: 3, on: ['TIMEOUT', 'TRANSIENT'] })).toEqual({
      type: 'conditional', max: 3, on: ['TIMEOUT', 'TRANSIENT'],
    });
  });

  it('parses conditional retry with except categories', () => {
    expect(parseRetryDirective({ max: 2, except: ['PERMANENT'] })).toEqual({
      type: 'conditional', max: 2, except: ['PERMANENT'],
    });
  });

  it('parses conditional retry with backoff and delay', () => {
    expect(parseRetryDirective({ max: 3, on: ['TIMEOUT'], backoff: 'exponential', delay: '1s' })).toEqual({
      type: 'conditional', max: 3, on: ['TIMEOUT'], backoff: 'exponential', delayMs: 1000,
    });
  });
});
