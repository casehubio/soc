import { describe, it, expect } from 'vitest';
import { createCatalogListHandler } from './catalog-list-handler.js';
import type { Catalog, CatalogEntry, Action } from '@casehubio/yaml-core/step';
import { stepSuccess } from '@casehubio/yaml-core/step';

function mockCatalog(entries: Record<string, CatalogEntry>): Catalog {
  return {
    resolve: (name) => entries[name],
    availableActions: () => new Set(Object.keys(entries)),
  };
}

function entry(name: string, portability = 'ts' as string): CatalogEntry {
  const action: Action = { execute: async () => stepSuccess({}) };
  return {
    qualifiedName: name,
    definition: {
      name,
      description: `desc-${name}`,
      inputs: { x: { type: 'STRING', required: true } },
      outputs: {},
      portability: portability as 'ts',
    },
    action,
  };
}

describe('createCatalogListHandler', () => {
  it('list returns all actions as summaries', () => {
    const handler = createCatalogListHandler(mockCatalog({ a: entry('a'), b: entry('b', 'universal') }));
    const summaries = handler.list();
    expect(summaries).toHaveLength(2);
    expect(summaries.find(s => s.name === 'a')!.portability).toBe('ts');
    expect(summaries.find(s => s.name === 'b')!.portability).toBe('universal');
  });

  it('list includes input/output counts', () => {
    const handler = createCatalogListHandler(mockCatalog({ a: entry('a') }));
    const summaries = handler.list();
    expect(summaries[0]!.inputCount).toBe(1);
    expect(summaries[0]!.outputCount).toBe(0);
  });

  it('detail returns full info for known action', () => {
    const handler = createCatalogListHandler(mockCatalog({ a: entry('a') }));
    const detail = handler.detail('a');
    expect(detail).not.toBeNull();
    expect(detail!.name).toBe('a');
    expect(detail!.inputs['x']!.type).toBe('STRING');
    expect(detail!.inputs['x']!.required).toBe(true);
  });

  it('detail returns null for unknown action', () => {
    const handler = createCatalogListHandler(mockCatalog({}));
    expect(handler.detail('nope')).toBeNull();
  });

  it('detail includes portability', () => {
    const handler = createCatalogListHandler(mockCatalog({ a: entry('a', 'universal') }));
    const detail = handler.detail('a');
    expect(detail!.portability).toBe('universal');
  });
});
