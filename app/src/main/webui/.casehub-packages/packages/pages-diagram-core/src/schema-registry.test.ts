import { describe, it, expect, beforeEach } from 'vitest';
import { registerPropertySchema, getPropertySchema, clearPropertySchemas } from './schema-registry.js';

describe('schema-registry', () => {
  beforeEach(() => { clearPropertySchemas(); });

  it('returns undefined for unregistered type', () => {
    expect(getPropertySchema('unknown')).toBeUndefined();
  });

  it('registers and retrieves a schema', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    registerPropertySchema('myNode', schema);
    expect(getPropertySchema('myNode')).toEqual(schema);
  });

  it('overwrites on re-register', () => {
    registerPropertySchema('myNode', { v: 1 });
    registerPropertySchema('myNode', { v: 2 });
    expect(getPropertySchema('myNode')).toEqual({ v: 2 });
  });
});
