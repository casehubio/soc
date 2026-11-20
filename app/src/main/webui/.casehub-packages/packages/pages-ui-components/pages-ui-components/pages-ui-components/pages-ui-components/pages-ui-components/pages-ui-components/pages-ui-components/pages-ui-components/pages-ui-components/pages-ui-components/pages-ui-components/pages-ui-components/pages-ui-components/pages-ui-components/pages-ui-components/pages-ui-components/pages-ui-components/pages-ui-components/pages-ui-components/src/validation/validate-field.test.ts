import { describe, it, expect } from 'vitest';
import { validateField } from './validate-field.js';


describe('validateField', () => {
  it('returns "Required" for empty required string', () => {
    expect(validateField({ type: 'string' }, '', true)).toBe('Required');
  });

  it('returns null for non-required empty value', () => {
    expect(validateField({ type: 'string' }, '', false)).toBeNull();
  });

  it('returns "Required" for undefined required value', () => {
    expect(validateField({ type: 'string' }, undefined, true)).toBe('Required');
  });

  it('returns "Required" for null required value', () => {
    expect(validateField({ type: 'string' }, null, true)).toBe('Required');
  });

  it('returns null for undefined non-required value', () => {
    expect(validateField({ type: 'string' }, undefined, false)).toBeNull();
  });

  it('validates minimum on number', () => {
    expect(validateField({ type: 'number', minimum: 5 }, 3, false)).toBe('Must be at least 5');
  });

  it('passes minimum on number', () => {
    expect(validateField({ type: 'number', minimum: 5 }, 5, false)).toBeNull();
  });

  it('validates maximum on number', () => {
    expect(validateField({ type: 'number', maximum: 10 }, 15, false)).toBe('Must be at most 10');
  });

  it('validates exclusiveMinimum', () => {
    expect(validateField({ type: 'number', exclusiveMinimum: 5 }, 5, false)).toBe('Must be greater than 5');
  });

  it('passes exclusiveMinimum', () => {
    expect(validateField({ type: 'number', exclusiveMinimum: 5 }, 6, false)).toBeNull();
  });

  it('validates exclusiveMaximum', () => {
    expect(validateField({ type: 'number', exclusiveMaximum: 10 }, 10, false)).toBe('Must be less than 10');
  });

  it('passes exclusiveMaximum', () => {
    expect(validateField({ type: 'number', exclusiveMaximum: 10 }, 9, false)).toBeNull();
  });

  it('validates multipleOf', () => {
    expect(validateField({ type: 'number', multipleOf: 3 }, 7, false)).toBe('Must be a multiple of 3');
  });

  it('passes multipleOf', () => {
    expect(validateField({ type: 'number', multipleOf: 3 }, 9, false)).toBeNull();
  });

  it('handles floating-point multipleOf without false positives', () => {
    expect(validateField({ type: 'number', multipleOf: 0.1 }, 0.3, false)).toBeNull();
  });

  it('validates minLength on string', () => {
    expect(validateField({ type: 'string', minLength: 3 }, 'ab', false)).toBe('Must be at least 3 characters');
  });

  it('validates maxLength on string', () => {
    expect(validateField({ type: 'string', maxLength: 5 }, 'toolong', false)).toBe('Must be at most 5 characters');
  });

  it('validates pattern', () => {
    expect(validateField({ type: 'string', pattern: '^[a-z]+$' }, 'ABC', false)).toBe('Invalid format');
  });

  it('passes pattern', () => {
    expect(validateField({ type: 'string', pattern: '^[a-z]+$' }, 'abc', false)).toBeNull();
  });

  it('validates enum membership', () => {
    expect(validateField({ type: 'string', enum: ['a', 'b'] }, 'c', false)).toBe('Must be one of: a, b');
  });

  it('passes enum membership', () => {
    expect(validateField({ type: 'string', enum: ['a', 'b'] }, 'a', false)).toBeNull();
  });

  it('validates minItems on array', () => {
    expect(validateField({ type: 'array', minItems: 2 }, ['one'], false)).toBe('Must have at least 2 items');
  });

  it('validates maxItems on array', () => {
    expect(validateField({ type: 'array', maxItems: 2 }, ['a', 'b', 'c'], false)).toBe('Must have at most 2 items');
  });

  it('passes array within bounds', () => {
    expect(validateField({ type: 'array', minItems: 1, maxItems: 3 }, ['a', 'b'], false)).toBeNull();
  });

  it('returns null for valid string within constraints', () => {
    expect(validateField({ type: 'string', minLength: 1, maxLength: 10 }, 'hello', false)).toBeNull();
  });

  it('returns null for valid number within constraints', () => {
    expect(validateField({ type: 'number', minimum: 0, maximum: 100 }, 50, false)).toBeNull();
  });
});
