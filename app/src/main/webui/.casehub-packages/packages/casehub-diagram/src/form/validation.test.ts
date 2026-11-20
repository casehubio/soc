import { describe, it, expect } from 'vitest';
import { validateField } from './validation.js';

describe('validateField', () => {
  it('returns "Required" for empty required string', () => {
    expect(validateField({ type: 'string' }, '', true)).toBe('Required');
  });

  it('returns null for empty optional string', () => {
    expect(validateField({ type: 'string' }, '', false)).toBeNull();
  });

  it('returns null for valid string', () => {
    expect(validateField({ type: 'string' }, 'hello', true)).toBeNull();
  });

  it('validates minimum on number', () => {
    expect(validateField({ type: 'integer', minimum: 1 }, 0, false)).toBe('Must be at least 1');
  });

  it('validates maximum on number', () => {
    expect(validateField({ type: 'integer', maximum: 10 }, 15, false)).toBe('Must be at most 10');
  });

  it('validates minLength on string', () => {
    expect(validateField({ type: 'string', minLength: 3 }, 'ab', true)).toBe('Must be at least 3 characters');
  });

  it('validates pattern on string', () => {
    expect(validateField({ type: 'string', pattern: '^[a-z]+$' }, 'ABC', false)).toBe('Invalid format');
  });

  it('returns null when number is in range', () => {
    expect(validateField({ type: 'integer', minimum: 1, maximum: 10 }, 5, false)).toBeNull();
  });
});
