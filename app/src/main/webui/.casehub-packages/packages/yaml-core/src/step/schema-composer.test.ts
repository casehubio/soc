import { describe, it, expect } from 'vitest';
import { SchemaComposer } from './schema-composer.js';
import type { Catalog, CatalogEntry, Action } from './walker.js';

const noop: Action = { execute: async () => ({ kind: 'success', output: {}, executionMetadata: {} }) };

function mockCatalog(actions: Record<string, CatalogEntry>): Catalog {
  return {
    resolve: (name) => actions[name],
    availableActions: () => new Set(Object.keys(actions)),
  };
}

function catalogEntry(name: string, inputs: Record<string, { type: string }>): CatalogEntry {
  const inputParams: Record<string, { type: string; required: boolean }> = {};
  for (const [k, v] of Object.entries(inputs)) {
    inputParams[k] = { type: v.type, required: true };
  }
  return {
    qualifiedName: name,
    definition: { name, inputs: inputParams as never, outputs: {} },
    action: noop,
  };
}

describe('SchemaComposer', () => {
  it('compose produces JSON Schema with oneOf', () => {
    const catalog = mockCatalog({ greet: catalogEntry('greet', {}) });
    const schema = SchemaComposer.compose(catalog) as { type: string; oneOf: unknown[] };
    expect(schema.type).toBe('object');
    expect(Array.isArray(schema.oneOf)).toBe(true);
    expect(schema.oneOf.length).toBeGreaterThan(0);
  });

  it('includes action-specific properties with input types', () => {
    const catalog = mockCatalog({
      send: catalogEntry('send', { message: { type: 'STRING' }, count: { type: 'INTEGER' } }),
    });
    const schema = SchemaComposer.compose(catalog) as { oneOf: Array<{ properties: Record<string, { type?: string; properties?: Record<string, { type: string }> }> }> };
    const sendVariant = schema.oneOf.find(v => v.properties?.['send']);
    expect(sendVariant).toBeDefined();
    const sendProp = sendVariant!.properties['send'] as { properties: Record<string, { type: string }> };
    expect(sendProp.properties?.['message']?.type).toBe('string');
    expect(sendProp.properties?.['count']?.type).toBe('integer');
  });

  it('includes decorator keys in shared properties', () => {
    const catalog = mockCatalog({});
    const schema = SchemaComposer.compose(catalog) as { properties: Record<string, unknown> };
    expect(schema.properties).toHaveProperty('if');
    expect(schema.properties).toHaveProperty('retry');
    expect(schema.properties).toHaveProperty('timeout');
    expect(schema.properties).toHaveProperty('semaphore');
  });

  it('includes built-in step types', () => {
    const catalog = mockCatalog({});
    const schema = SchemaComposer.compose(catalog) as { oneOf: Array<{ required?: string[] }> };
    const requiredSets = schema.oneOf.map(v => v.required ?? []);
    expect(requiredSets.some(r => r.includes('invoke'))).toBe(true);
    expect(requiredSets.some(r => r.includes('block'))).toBe(true);
    expect(requiredSets.some(r => r.includes('if') && r.includes('then'))).toBe(true);
    expect(requiredSets.some(r => r.includes('match') && r.includes('cases'))).toBe(true);
    expect(requiredSets.some(r => r.includes('parallel'))).toBe(true);
  });

  it('maps ParameterType to JSON Schema types', () => {
    const catalog = mockCatalog({
      typed: catalogEntry('typed', {
        s: { type: 'STRING' },
        n: { type: 'NUMBER' },
        b: { type: 'BOOLEAN' },
        a: { type: 'ARRAY' },
        o: { type: 'OBJECT' },
      }),
    });
    const schema = SchemaComposer.compose(catalog) as { oneOf: Array<{ properties: Record<string, { properties?: Record<string, { type: string }> }> }> };
    const typedVariant = schema.oneOf.find(v => v.properties?.['typed']);
    const props = (typedVariant!.properties['typed'] as { properties: Record<string, { type: string }> }).properties;
    expect(props['s']!.type).toBe('string');
    expect(props['n']!.type).toBe('number');
    expect(props['b']!.type).toBe('boolean');
    expect(props['a']!.type).toBe('array');
    expect(props['o']!.type).toBe('object');
  });
});
