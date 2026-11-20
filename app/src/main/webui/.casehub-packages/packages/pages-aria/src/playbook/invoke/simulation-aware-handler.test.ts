import { describe, it, expect } from 'vitest';
import { SimulationAwareInvokeHandler } from './simulation-aware-handler.js';
import { MapServiceRegistry, SimulationRuntime } from '@casehubio/yaml-core/step';
import type { SimulationConfig } from '@casehubio/yaml-core/step';

describe('SimulationAwareInvokeHandler', () => {
  const handler = new SimulationAwareInvokeHandler();
  const def = { name: 'graphql', inputs: {}, outputs: {} };
  const binding = { kind: 'graphql-domain' as const };

  it('supports graphql-domain binding', () => {
    expect(handler.supports({ kind: 'graphql-domain' })).toBe(true);
    expect(handler.supports({ kind: 'rest', method: '', url: '', headers: {}, body: {} })).toBe(false);
  });

  it('resolves from simulation corpus when strategy matches', async () => {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = {
      strategies: { 'cases.startCase': 'sequential' },
      corpus: [{ inline: { 'cases.startCase': [
        { input: {}, output: { caseId: 'case-1' } },
      ] } }],
      capture: [],
    };
    runtime.pushOverlay(config);

    const services = new MapServiceRegistry()
      .register({ name: 'SimulationRuntime' }, runtime);
    const action = handler.create(def, binding);
    const result = await action.execute(
      { domain: 'cases', operation: 'startCase', params: {} },
      services,
    );

    expect(result.kind).toBe('success');
    expect(result.output).toEqual({ caseId: 'case-1' });

    const entries = runtime.allEntriesFor('cases.startCase');
    expect(entries).toHaveLength(1);
    expect(entries[0]!.dataRealism).toBe('STRUCTURALLY_VALID');
  });

  it('records fallthrough when no strategy matches', async () => {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = {
      strategies: { 'other.op': 'sequential' },
      corpus: [],
      capture: [],
    };
    runtime.pushOverlay(config);

    const services = new MapServiceRegistry()
      .register({ name: 'SimulationRuntime' }, runtime);
    const action = handler.create(def, binding);
    const result = await action.execute(
      { domain: 'cases', operation: 'startCase', params: {} },
      services,
    );

    expect(result.kind).toBe('success');
    const entries = runtime.allEntriesFor('cases.startCase');
    expect(entries).toHaveLength(1);
    expect(entries[0]!.dataRealism).toBe('RECORDED_REAL');
  });

  it('succeeds without simulation context', async () => {
    const services = new MapServiceRegistry();
    const action = handler.create(def, binding);
    const result = await action.execute(
      { domain: 'cases', operation: 'startCase', params: {} },
      services,
    );

    expect(result.kind).toBe('success');
  });
});
