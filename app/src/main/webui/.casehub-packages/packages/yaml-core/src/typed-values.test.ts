import { describe, it, expect } from 'vitest';
import { TypedName, TypedMap, TypedVariables } from './typed-values.js';
import type { TypedSchema } from './typed-values.js';

describe('TypedName', () => {
  it('parses "name:TYPE" format', () => {
    const result = TypedName.parse('age:INTEGER');
    expect(result.name).toBe('age');
    expect(result.type).toBe('INTEGER');
  });

  it('defaults to STRING when no type specified', () => {
    const result = TypedName.parse('label');
    expect(result.name).toBe('label');
    expect(result.type).toBe('STRING');
  });

  it('parses lowercase types', () => {
    const result = TypedName.parse('count:integer');
    expect(result.name).toBe('count');
    expect(result.type).toBe('INTEGER');
  });

  it('parses BOOLEAN type', () => {
    const result = TypedName.parse('active:BOOLEAN');
    expect(result.name).toBe('active');
    expect(result.type).toBe('BOOLEAN');
  });

  it('parses NUMBER type', () => {
    const result = TypedName.parse('price:NUMBER');
    expect(result.name).toBe('price');
    expect(result.type).toBe('NUMBER');
  });

  it('throws for unknown type', () => {
    expect(() => TypedName.parse('x:UNKNOWN')).toThrow('UNKNOWN');
  });

  it('trims whitespace', () => {
    const result = TypedName.parse(' name : STRING ');
    expect(result.name).toBe('name');
    expect(result.type).toBe('STRING');
  });
});

describe('TypedMap', () => {
  it('stores schema and provides typeOf', () => {
    const map = TypedMap.fromEntries({
      name: { type: 'STRING', value: 'Alice' },
      age: { type: 'INTEGER', value: 30 },
    });
    expect(map.typeOf('name')).toBe('STRING');
    expect(map.typeOf('age')).toBe('INTEGER');
    expect(map.value('name')).toBe('Alice');
    expect(map.value('age')).toBe(30);
  });

  it('returns undefined for unknown names', () => {
    const map = TypedMap.fromEntries({});
    expect(map.typeOf('missing')).toBeUndefined();
    expect(map.value('missing')).toBeUndefined();
  });

  it('exposes full schema', () => {
    const map = TypedMap.fromEntries({
      x: { type: 'NUMBER', value: 3.14 },
      y: { type: 'BOOLEAN', value: true },
    });
    const schema = map.schema();
    expect(schema).toEqual({ x: 'NUMBER', y: 'BOOLEAN' });
  });

  it('implements TypedSchema interface', () => {
    const map = TypedMap.fromEntries({
      a: { type: 'STRING', value: 'test' },
    });
    const asSchema: TypedSchema = map;
    expect(asSchema.typeOf('a')).toBe('STRING');
    expect(asSchema.schema()).toEqual({ a: 'STRING' });
  });
});

describe('TypedVariables', () => {
  it('parses typed variable declarations', () => {
    const result = TypedVariables.parse({
      'count:INTEGER': '42',
      'name': 'Alice',
      'active:BOOLEAN': 'true',
    });
    expect(result.typeOf('count')).toBe('INTEGER');
    expect(result.value('count')).toBe(42);
    expect(result.typeOf('name')).toBe('STRING');
    expect(result.value('name')).toBe('Alice');
    expect(result.typeOf('active')).toBe('BOOLEAN');
    expect(result.value('active')).toBe(true);
  });
});
