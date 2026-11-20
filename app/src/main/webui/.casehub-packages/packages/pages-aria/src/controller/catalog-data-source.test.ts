import { describe, it, expect } from 'vitest';
import { RegistryCatalogSource } from './catalog-data-source.js';
import { PluginRegistry, stepSuccess } from '@casehubio/yaml-core/step';

describe('RegistryCatalogSource', () => {
  it('fetchSummaries returns registered actions', async () => {
    const reg = new PluginRegistry();
    reg.register({
      name: 'test-action',
      description: 'A test',
      inputs: { x: { type: 'STRING', required: true } },
      outputs: {},
      execute: async () => stepSuccess({}),
    });
    const source = new RegistryCatalogSource(reg);
    const summaries = await source.fetchSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.name).toBe('test-action');
    expect(summaries[0]!.description).toBe('A test');
    expect(summaries[0]!.portability).toBe('ts');
    expect(summaries[0]!.inputCount).toBe(1);
    expect(summaries[0]!.source).toBe('plugin');
  });

  it('fetchDetail returns full parameter info', async () => {
    const reg = new PluginRegistry();
    reg.register({
      name: 'detailed',
      inputs: { id: { type: 'INTEGER', required: true, description: 'The ID' } },
      outputs: { result: { type: 'STRING', required: false } },
      execute: async () => stepSuccess({ result: 'ok' }),
    });
    const source = new RegistryCatalogSource(reg);
    const detail = await source.fetchDetail('detailed');
    expect(detail).not.toBeNull();
    expect(detail!.inputs['id']!.type).toBe('INTEGER');
    expect(detail!.inputs['id']!.required).toBe(true);
    expect(detail!.inputs['id']!.description).toBe('The ID');
    expect(detail!.outputs['result']).toBeDefined();
  });

  it('fetchDetail returns null for unknown action', async () => {
    const reg = new PluginRegistry();
    const source = new RegistryCatalogSource(reg);
    expect(await source.fetchDetail('nope')).toBeNull();
  });

  it('has default priority 0', () => {
    const source = new RegistryCatalogSource(new PluginRegistry());
    expect(source.priority).toBe(0);
  });

  it('accepts custom priority', () => {
    const source = new RegistryCatalogSource(new PluginRegistry(), 50);
    expect(source.priority).toBe(50);
  });
});
