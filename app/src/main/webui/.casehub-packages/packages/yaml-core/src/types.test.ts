import { describe, it, expect } from 'vitest';
import {
  parseValue, rawValue, canAcceptType, isScalarParam,
  parseParameterType, validateParamValue, parseScalarParam,
  chainSources, drillFields, nestedSource, forEachContextSource,
  parseForEachDirective, drillOnlySource, UnresolvedVariableError,
} from './types.js';
import type { ObjectVariableSource } from './types.js';

describe('parseValue', () => {
  it('STRING returns string as-is', () => {
    expect(parseValue('STRING', 'hello')).toEqual({ type: 'string', value: 'hello' });
  });

  it('INTEGER parses valid int', () => {
    expect(parseValue('INTEGER', '42')).toEqual({ type: 'integer', value: 42 });
  });

  it('INTEGER throws on invalid', () => {
    expect(() => parseValue('INTEGER', 'abc')).toThrow("Cannot parse 'abc' as INTEGER");
  });

  it('NUMBER parses valid float', () => {
    expect(parseValue('NUMBER', '3.14')).toEqual({ type: 'number', value: 3.14 });
  });

  it('NUMBER throws on invalid', () => {
    expect(() => parseValue('NUMBER', 'xyz')).toThrow("Cannot parse 'xyz' as NUMBER");
  });

  it('BOOLEAN parses truthy values', () => {
    for (const v of ['true', 'yes', 'on', 'y', '1', 'TRUE', 'Yes']) {
      expect(parseValue('BOOLEAN', v)).toEqual({ type: 'boolean', value: true });
    }
  });

  it('BOOLEAN parses falsy values', () => {
    for (const v of ['false', 'no', 'off', 'n', '0', 'FALSE', 'No']) {
      expect(parseValue('BOOLEAN', v)).toEqual({ type: 'boolean', value: false });
    }
  });

  it('BOOLEAN throws on invalid', () => {
    expect(() => parseValue('BOOLEAN', 'maybe')).toThrow("Cannot parse 'maybe' as BOOLEAN");
  });

  it('ARRAY splits on comma and trims', () => {
    expect(parseValue('ARRAY', 'a, b , c')).toEqual({ type: 'array', value: ['a', 'b', 'c'] });
  });
});

describe('rawValue', () => {
  it('extracts value from ParsedValue', () => {
    expect(rawValue({ type: 'string', value: 'hi' })).toBe('hi');
    expect(rawValue({ type: 'integer', value: 5 })).toBe(5);
    expect(rawValue({ type: 'boolean', value: true })).toBe(true);
    expect(rawValue({ type: 'array', value: ['a', 'b'] })).toEqual(['a', 'b']);
  });
});

describe('canAcceptType', () => {
  it('same type returns true', () => {
    expect(canAcceptType('STRING', 'STRING')).toBe(true);
    expect(canAcceptType('INTEGER', 'INTEGER')).toBe(true);
    expect(canAcceptType('ARRAY', 'ARRAY')).toBe(true);
  });

  it('STRING accepts scalar types', () => {
    expect(canAcceptType('STRING', 'INTEGER')).toBe(true);
    expect(canAcceptType('STRING', 'NUMBER')).toBe(true);
    expect(canAcceptType('STRING', 'BOOLEAN')).toBe(true);
  });

  it('STRING rejects compound types', () => {
    expect(canAcceptType('STRING', 'ARRAY')).toBe(false);
    expect(canAcceptType('STRING', 'OBJECT')).toBe(false);
  });

  it('NUMBER accepts INTEGER', () => {
    expect(canAcceptType('NUMBER', 'INTEGER')).toBe(true);
  });

  it('other combos return false', () => {
    expect(canAcceptType('INTEGER', 'NUMBER')).toBe(false);
    expect(canAcceptType('BOOLEAN', 'STRING')).toBe(false);
    expect(canAcceptType('ARRAY', 'STRING')).toBe(false);
  });
});

describe('isScalarParam', () => {
  it('true for scalar types', () => {
    expect(isScalarParam('STRING')).toBe(true);
    expect(isScalarParam('INTEGER')).toBe(true);
    expect(isScalarParam('NUMBER')).toBe(true);
    expect(isScalarParam('BOOLEAN')).toBe(true);
  });

  it('false for compound types', () => {
    expect(isScalarParam('ARRAY')).toBe(false);
    expect(isScalarParam('OBJECT')).toBe(false);
  });
});

describe('parseParameterType', () => {
  it('recognizes all 6 types case-insensitively', () => {
    expect(parseParameterType('string')).toBe('STRING');
    expect(parseParameterType('Integer')).toBe('INTEGER');
    expect(parseParameterType('NUMBER')).toBe('NUMBER');
    expect(parseParameterType('boolean')).toBe('BOOLEAN');
    expect(parseParameterType('Array')).toBe('ARRAY');
    expect(parseParameterType('OBJECT')).toBe('OBJECT');
  });

  it('maps DECIMAL to NUMBER', () => {
    expect(parseParameterType('decimal')).toBe('NUMBER');
    expect(parseParameterType('DECIMAL')).toBe('NUMBER');
  });

  it('maps LIST to ARRAY (migration alias)', () => {
    expect(parseParameterType('LIST')).toBe('ARRAY');
    expect(parseParameterType('list')).toBe('ARRAY');
  });

  it('throws on unknown type', () => {
    expect(() => parseParameterType('MAP')).toThrow("Unknown ParameterType: 'MAP'");
  });
});

describe('validateParamValue', () => {
  it('STRING validates typeof string', () => {
    expect(validateParamValue('STRING', 'hello')).toBe(true);
    expect(validateParamValue('STRING', 42)).toBe(false);
  });

  it('INTEGER validates number + isInteger', () => {
    expect(validateParamValue('INTEGER', 42)).toBe(true);
    expect(validateParamValue('INTEGER', 3.14)).toBe(false);
    expect(validateParamValue('INTEGER', 'x')).toBe(false);
  });

  it('NUMBER validates typeof number', () => {
    expect(validateParamValue('NUMBER', 3.14)).toBe(true);
    expect(validateParamValue('NUMBER', 42)).toBe(true);
    expect(validateParamValue('NUMBER', 'x')).toBe(false);
  });

  it('BOOLEAN validates typeof boolean', () => {
    expect(validateParamValue('BOOLEAN', true)).toBe(true);
    expect(validateParamValue('BOOLEAN', false)).toBe(true);
    expect(validateParamValue('BOOLEAN', 'true')).toBe(false);
  });

  it('ARRAY validates Array.isArray', () => {
    expect(validateParamValue('ARRAY', [1, 2])).toBe(true);
    expect(validateParamValue('ARRAY', 'not array')).toBe(false);
  });

  it('OBJECT validates non-null non-array object', () => {
    expect(validateParamValue('OBJECT', { a: 1 })).toBe(true);
    expect(validateParamValue('OBJECT', null)).toBe(false);
    expect(validateParamValue('OBJECT', [1])).toBe(false);
    expect(validateParamValue('OBJECT', 'str')).toBe(false);
  });
});

describe('parseScalarParam', () => {
  it('STRING returns raw', () => {
    expect(parseScalarParam('STRING', 'hello')).toBe('hello');
  });

  it('INTEGER parses valid, throws on invalid', () => {
    expect(parseScalarParam('INTEGER', '10')).toBe(10);
    expect(() => parseScalarParam('INTEGER', 'abc')).toThrow();
  });

  it('NUMBER parses valid, throws on invalid', () => {
    expect(parseScalarParam('NUMBER', '2.5')).toBe(2.5);
    expect(() => parseScalarParam('NUMBER', 'abc')).toThrow();
  });

  it('BOOLEAN parses truthy and falsy', () => {
    expect(parseScalarParam('BOOLEAN', 'yes')).toBe(true);
    expect(parseScalarParam('BOOLEAN', 'off')).toBe(false);
    expect(() => parseScalarParam('BOOLEAN', 'maybe')).toThrow();
  });

  it('ARRAY and OBJECT throw', () => {
    expect(() => parseScalarParam('ARRAY', '[]')).toThrow("compound type 'ARRAY'");
    expect(() => parseScalarParam('OBJECT', '{}')).toThrow("compound type 'OBJECT'");
  });
});

describe('chainSources', () => {
  it('returns first defined value', () => {
    const s1 = (k: string) => k === 'a' ? 'from-s1' : undefined;
    const s2 = (k: string) => k === 'a' ? 'from-s2' : k === 'b' ? 'from-s2' : undefined;
    const chained = chainSources(s1, s2);
    expect(chained('a')).toBe('from-s1');
    expect(chained('b')).toBe('from-s2');
  });

  it('returns undefined if none match', () => {
    const s1 = () => undefined;
    expect(chainSources(s1)('x')).toBeUndefined();
  });
});

describe('drillFields', () => {
  it('drills into nested objects by dot path', () => {
    const map = { a: { b: { c: 42 } } };
    expect(drillFields(map, 'a.b.c')).toBe(42);
  });

  it('returns undefined for missing key', () => {
    expect(drillFields({ a: 1 }, 'b')).toBeUndefined();
  });

  it('returns undefined when hitting non-object', () => {
    expect(drillFields({ a: 'str' }, 'a.b')).toBeUndefined();
  });

  it('returns undefined when hitting array', () => {
    expect(drillFields({ a: [1, 2] }, 'a.0')).toBeUndefined();
  });

  it('single key returns top-level value', () => {
    expect(drillFields({ x: 99 }, 'x')).toBe(99);
  });
});

describe('nestedSource', () => {
  it('resolves top-level key as string', () => {
    const src = nestedSource({ grp: { val: 1 } });
    expect(src('grp')).toBe('[object Object]');
  });

  it('drills into nested keys', () => {
    const src = nestedSource({ grp: { val: 42 } });
    expect(src('grp.val')).toBe('42');
  });

  it('returns undefined for missing group', () => {
    const src = nestedSource({});
    expect(src('missing')).toBeUndefined();
  });

  it('returns undefined for missing nested field', () => {
    const src = nestedSource({ grp: { a: 1 } });
    expect(src('grp.b')).toBeUndefined();
  });
});

describe('forEachContextSource', () => {
  it('resolves simple values', () => {
    const src = forEachContextSource({ x: 'hello' }, null);
    expect(src('x')).toBe('hello');
  });

  it('drills into row fields', () => {
    const src = forEachContextSource(null, { item: { name: 'widget', price: 10 } });
    expect(src('item.name')).toBe('widget');
    expect(src('item.price')).toBe('10');
  });

  it('throws on missing field in row', () => {
    const src = forEachContextSource(null, { item: { name: 'x' } });
    expect(() => src('item.missing')).toThrow("Field 'missing' not found in 'item'");
  });

  it('throws when accessing row without field path', () => {
    const src = forEachContextSource(null, { item: { name: 'x' } });
    expect(() => src('item')).toThrow("'item' is a row");
  });

  it('returns undefined for unknown key', () => {
    const src = forEachContextSource({ a: '1' }, null);
    expect(src('unknown')).toBeUndefined();
  });
});

describe('parseForEachDirective', () => {
  it('null returns null', () => {
    expect(parseForEachDirective(null)).toBeNull();
    expect(parseForEachDirective(undefined)).toBeNull();
  });

  it('string returns group-ref', () => {
    expect(parseForEachDirective('myGroup')).toEqual({ type: 'group-ref', groupName: 'myGroup' });
  });

  it('{as, in: array} returns inline', () => {
    expect(parseForEachDirective({ as: 'item', in: [1, 2] })).toEqual({
      type: 'inline', as: 'item', in: [1, 2],
    });
  });

  it('inline without as throws', () => {
    expect(() => parseForEachDirective({ in: [1, 2] })).toThrow("'as' variable name is required");
  });

  it('{in: string} returns group-ref with in as groupName', () => {
    expect(parseForEachDirective({ in: 'items' })).toEqual({ type: 'group-ref', groupName: 'items' });
  });

  it('{as, in: string} returns group-ref with as', () => {
    expect(parseForEachDirective({ as: 'item', in: 'items' })).toEqual({
      type: 'group-ref', groupName: 'items', as: 'item',
    });
  });

  it('{as only} returns group-ref with as as groupName', () => {
    expect(parseForEachDirective({ as: 'items' })).toEqual({ type: 'group-ref', groupName: 'items' });
  });

  it('throws on array input', () => {
    expect(() => parseForEachDirective([1, 2])).toThrow('Invalid forEach value');
  });

  it('throws on invalid type', () => {
    expect(() => parseForEachDirective(42)).toThrow('Invalid forEach value');
  });
});

describe('drillOnlySource', () => {
  it('delegates resolve and disables container return', () => {
    const inner: ObjectVariableSource = {
      resolve: (name: string) => name === 'x' ? 42 : undefined,
      allowContainerReturn: () => true,
    };
    const wrapped = drillOnlySource(inner);
    expect(wrapped.resolve('x')).toBe(42);
    expect(wrapped.resolve('y')).toBeUndefined();
    expect(wrapped.allowContainerReturn()).toBe(false);
  });
});

describe('UnresolvedVariableError', () => {
  it('sets name, variableName, elementContext', () => {
    const err = new UnresolvedVariableError('foo', 'panel1', 'not found');
    expect(err.name).toBe('UnresolvedVariableError');
    expect(err.variableName).toBe('foo');
    expect(err.elementContext).toBe('panel1');
    expect(err.message).toContain("Unresolved variable 'foo'");
    expect(err.message).toContain("'panel1'");
  });
});
