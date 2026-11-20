import { describe, it, expect, vi } from 'vitest';
import { YamlDefinitionSource } from './yaml-source.js';
import type { InvokeHandler } from '../invoke/invoke-handler.js';
import { stepSuccess } from '../walker.js';
import type { CatalogEntry } from '../walker.js';
import type { DefinitionFile } from '../types.js';

function makeHandler(supports = true): InvokeHandler {
  return {
    supports: vi.fn(() => supports),
    create: vi.fn(() => ({ execute: vi.fn(async () => stepSuccess({})) })),
  };
}

const parsedFile: DefinitionFile = {
  actions: {
    greet: {
      name: 'greet',
      inputs: { name: { type: 'STRING', required: true } },
      outputs: { message: { type: 'STRING', required: false } },
      invoke: { kind: 'mcp', tool: 'greeter' },
    },
  },
};

const namespacedFile: DefinitionFile = {
  namespace: 'myns',
  actions: {
    hello: {
      name: 'hello',
      inputs: {},
      outputs: {},
      invoke: { kind: 'mcp', tool: 'hello-tool' },
    },
  },
};

describe('YamlDefinitionSource', () => {
  it('priority is 100', () => {
    const source = new YamlDefinitionSource([]);
    expect(source.priority).toBe(100);
  });

  it('addParsedFile + populate creates entries for actions with invoke bindings', () => {
    const handler = makeHandler();
    const source = new YamlDefinitionSource([handler]);
    source.addParsedFile(parsedFile);
    const entries = new Map<string, CatalogEntry>();
    source.populate(entries);
    expect(entries.has('greet')).toBe(true);
    expect(entries.get('greet')!.qualifiedName).toBe('greet');
    expect(entries.get('greet')!.definition.name).toBe('greet');
  });

  it('namespaced actions get both qualified and short names', () => {
    const handler = makeHandler();
    const source = new YamlDefinitionSource([handler]);
    source.addParsedFile(namespacedFile);
    const entries = new Map<string, CatalogEntry>();
    source.populate(entries);
    expect(entries.has('myns.hello')).toBe(true);
    expect(entries.has('hello')).toBe(true);
    expect(entries.get('myns.hello')!.qualifiedName).toBe('myns.hello');
    expect(entries.get('hello')!.qualifiedName).toBe('myns.hello');
  });

  it('handler that does not support binding — action not added', () => {
    const handler = makeHandler(false);
    const source = new YamlDefinitionSource([handler]);
    source.addParsedFile(parsedFile);
    const entries = new Map<string, CatalogEntry>();
    source.populate(entries);
    expect(entries.size).toBe(0);
  });

  it('populate does not overwrite existing entries', () => {
    const handler = makeHandler();
    const source = new YamlDefinitionSource([handler]);
    source.addParsedFile(parsedFile);
    const existing: CatalogEntry = { qualifiedName: 'greet', definition: parsedFile.actions['greet']!, action: { execute: vi.fn() } };
    const entries = new Map<string, CatalogEntry>([['greet', existing]]);
    source.populate(entries);
    expect(entries.get('greet')).toBe(existing);
  });

  it('addFile parses raw YAML via DefinitionParser', () => {
    const handler = makeHandler();
    const source = new YamlDefinitionSource([handler]);
    source.addFile({
      actions: {
        greet: {
          inputs: { name: { type: 'STRING', required: true } },
          outputs: { message: 'STRING' },
          invoke: { mcp: 'greeter' },
        },
      },
    });
    const entries = new Map<string, CatalogEntry>();
    source.populate(entries);
    expect(entries.has('greet')).toBe(true);
    expect(entries.get('greet')!.definition.inputs['name']!.type).toBe('STRING');
  });
});
