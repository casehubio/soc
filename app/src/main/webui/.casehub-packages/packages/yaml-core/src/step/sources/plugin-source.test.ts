import { describe, it, expect, vi } from 'vitest';
import { RuntimePluginSource } from './plugin-source.js';
import { PluginRegistry } from '../plugin-registry.js';
import { stepSuccess } from '../walker.js';
import type { CatalogEntry } from '../walker.js';

describe('RuntimePluginSource', () => {
  it('priority is 200', () => {
    const registry = new PluginRegistry();
    const source = new RuntimePluginSource(registry);
    expect(source.priority).toBe(200);
  });

  it('populate delegates to registry createSource', () => {
    const registry = new PluginRegistry();
    registry.register({
      name: 'hello',
      inputs: { name: { type: 'STRING', required: true } },
      outputs: {},
      execute: vi.fn(async () => stepSuccess({})),
    });
    const source = new RuntimePluginSource(registry);
    const entries = new Map<string, CatalogEntry>();
    source.populate(entries);
    expect(entries.has('hello')).toBe(true);
    expect(entries.get('hello')!.qualifiedName).toBe('hello');
  });

  it('entries from registry appear in populated map with correct definition', () => {
    const registry = new PluginRegistry();
    registry.register({
      name: 'greet',
      description: 'Greet someone',
      inputs: { who: { type: 'STRING', required: true } },
      outputs: { msg: { type: 'STRING', required: false } },
      execute: vi.fn(async () => stepSuccess({ msg: 'hi' })),
    });
    const source = new RuntimePluginSource(registry);
    const entries = new Map<string, CatalogEntry>();
    source.populate(entries);
    const entry = entries.get('greet')!;
    expect(entry.definition.name).toBe('greet');
    expect(entry.definition.description).toBe('Greet someone');
    expect(entry.definition.inputs['who']!.type).toBe('STRING');
  });
});
