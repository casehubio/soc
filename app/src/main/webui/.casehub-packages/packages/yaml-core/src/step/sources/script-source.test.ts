import { describe, it, expect, vi } from 'vitest';
import { ScriptSource } from './script-source.js';
import type { ScriptFileEntry } from './script-source.js';
import type { InvokeHandler } from '../invoke/invoke-handler.js';
import { stepSuccess } from '../walker.js';
import type { CatalogEntry, MapServiceRegistry } from '../walker.js';

const scriptEntry: ScriptFileEntry = {
  name: 'transform',
  runtime: 'python3',
  scriptPath: '/scripts/transform.py',
  schema: {
    inputs: { data: { type: 'STRING', required: true } },
    outputs: { result: { type: 'STRING', required: false } },
  },
};

function makeHandler(): InvokeHandler {
  return {
    supports: vi.fn(() => true),
    create: vi.fn(() => ({ execute: vi.fn(async () => stepSuccess({ result: 'done' })) })),
  };
}

describe('ScriptSource', () => {
  it('priority is 400', () => {
    const source = new ScriptSource([], makeHandler());
    expect(source.priority).toBe(400);
  });

  it('populate creates entries with correct definition and invoke binding', () => {
    const handler = makeHandler();
    const source = new ScriptSource([scriptEntry], handler);
    const entries = new Map<string, CatalogEntry>();
    source.populate(entries);
    expect(entries.size).toBe(1);
    const entry = entries.get('transform')!;
    expect(entry.qualifiedName).toBe('transform');
    expect(entry.definition.name).toBe('transform');
    expect(entry.definition.invoke).toEqual({
      kind: 'script', runtime: 'python3', script: '/scripts/transform.py', timeout: '30s', env: {},
    });
  });

  it('populate does not overwrite existing entries', () => {
    const handler = makeHandler();
    const source = new ScriptSource([scriptEntry], handler);
    const existing: CatalogEntry = { qualifiedName: 'transform', definition: scriptEntry as never, action: { execute: vi.fn() } };
    const entries = new Map<string, CatalogEntry>([['transform', existing]]);
    source.populate(entries);
    expect(entries.get('transform')).toBe(existing);
  });

  it('action wraps with ValidatingAction — wrong type triggers validation failure', async () => {
    const handler = makeHandler();
    const source = new ScriptSource([scriptEntry], handler);
    const entries = new Map<string, CatalogEntry>();
    source.populate(entries);
    const action = entries.get('transform')!.action;
    const result = await action.execute({ data: 123 }, {} as MapServiceRegistry);
    expect(result.kind).toBe('failure');
    expect((result as { kind: 'failure'; message: string }).message).toContain('validation failed');
  });
});
