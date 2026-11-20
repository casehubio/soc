import { describe, it, expect } from 'vitest';
import { fieldTypeFor } from './field-renderer.js';

describe('fieldTypeFor', () => {
  it('returns "text" for plain string', () => {
    expect(fieldTypeFor({ type: 'string' })).toBe('text');
  });

  it('returns "select" for string with enum', () => {
    expect(fieldTypeFor({ type: 'string', enum: ['A', 'B'] })).toBe('select');
  });

  it('returns "number" for integer', () => {
    expect(fieldTypeFor({ type: 'integer' })).toBe('number');
  });

  it('returns "number" for number type', () => {
    expect(fieldTypeFor({ type: 'number' })).toBe('number');
  });

  it('returns "checkbox" for boolean', () => {
    expect(fieldTypeFor({ type: 'boolean' })).toBe('checkbox');
  });

  it('returns "textarea" for JQ expression descriptions', () => {
    expect(fieldTypeFor({ type: 'string', description: 'JQ predicate over CaseContext' })).toBe('textarea');
  });

  it('returns "textarea" for expression descriptions', () => {
    expect(fieldTypeFor({ type: 'string', description: 'JQ expression producing output' })).toBe('textarea');
  });

  it('returns "string-array" for array of strings', () => {
    expect(fieldTypeFor({ type: 'array', items: { type: 'string' } })).toBe('string-array');
  });

  it('returns "object" for nested object with properties', () => {
    expect(fieldTypeFor({ type: 'object', properties: { a: { type: 'string' } } })).toBe('object');
  });

  it('returns "json" for object with only additionalProperties', () => {
    expect(fieldTypeFor({ type: 'object', additionalProperties: true })).toBe('json');
  });

  it('returns "json" for array of objects', () => {
    expect(fieldTypeFor({ type: 'array', items: { type: 'object' } })).toBe('json');
  });

  it('returns "oneOf" when oneOf is present', () => {
    expect(fieldTypeFor({ oneOf: [{ type: 'string' }, { type: 'object' }] })).toBe('oneOf');
  });
});
