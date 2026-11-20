import { describe, it, expect } from 'vitest';
import { VerifySimulationHandler } from './verify-simulation-handler.js';
import { MapServiceRegistry, SimulationRuntime } from '@casehubio/yaml-core/step';
import type { SimulationConfig } from '@casehubio/yaml-core/step';

describe('VerifySimulationHandler', () => {
  const handler = new VerifySimulationHandler();
  const def = { name: 'verify-simulation', inputs: {}, outputs: {} };
  const binding = { kind: 'verify-simulation' as const };

  function runtimeWithEntries(): SimulationRuntime {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = { strategies: {}, corpus: [], capture: [] };
    runtime.pushOverlay(config);
    runtime.recordJournal('agent.invoke', 't1', { prompt: 'hello' }, { response: 'hi' }, 'DOMAIN_PLAUSIBLE');
    runtime.recordJournal('agent.invoke', 't1', { prompt: 'bye' }, { response: 'goodbye' }, 'DOMAIN_PLAUSIBLE');
    runtime.recordJournal('cases.startCase', 't1', { id: 'c1' }, { caseId: 'case-1' }, 'RECORDED_REAL');
    return runtime;
  }

  it('supports verify-simulation binding', () => {
    expect(handler.supports({ kind: 'verify-simulation' })).toBe(true);
    expect(handler.supports({ kind: 'graphql-domain' })).toBe(false);
  });

  it('passes when invocation count matches', async () => {
    const services = new MapServiceRegistry()
      .register({ name: 'SimulationRuntime' }, runtimeWithEntries());
    const action = handler.create(def, binding);
    const result = await action.execute(
      { invoked: 'agent.invoke', count: 2 },
      services,
    );
    expect(result.kind).toBe('success');
    expect(result.output).toEqual({ invocationCount: 2 });
  });

  it('fails when invocation count does not match', async () => {
    const services = new MapServiceRegistry()
      .register({ name: 'SimulationRuntime' }, runtimeWithEntries());
    const action = handler.create(def, binding);
    const result = await action.execute(
      { invoked: 'agent.invoke', count: 5 },
      services,
    );
    expect(result.kind).toBe('failure');
    expect(result.message).toContain('Expected 5');
  });

  it('passes when at least one invocation exists (no count)', async () => {
    const services = new MapServiceRegistry()
      .register({ name: 'SimulationRuntime' }, runtimeWithEntries());
    const action = handler.create(def, binding);
    const result = await action.execute(
      { invoked: 'agent.invoke' },
      services,
    );
    expect(result.kind).toBe('success');
  });

  it('fails when no invocations exist', async () => {
    const services = new MapServiceRegistry()
      .register({ name: 'SimulationRuntime' }, runtimeWithEntries());
    const action = handler.create(def, binding);
    const result = await action.execute(
      { invoked: 'unknown.method' },
      services,
    );
    expect(result.kind).toBe('failure');
    expect(result.message).toContain('at least one invocation');
  });

  it('passes all-simulated check when all entries are simulated', async () => {
    const services = new MapServiceRegistry()
      .register({ name: 'SimulationRuntime' }, runtimeWithEntries());
    const action = handler.create(def, binding);
    const result = await action.execute(
      { invoked: 'agent.invoke', 'all-simulated': true },
      services,
    );
    expect(result.kind).toBe('success');
  });

  it('fails all-simulated check when entries are real', async () => {
    const services = new MapServiceRegistry()
      .register({ name: 'SimulationRuntime' }, runtimeWithEntries());
    const action = handler.create(def, binding);
    const result = await action.execute(
      { invoked: 'cases.startCase', 'all-simulated': true },
      services,
    );
    expect(result.kind).toBe('failure');
    expect(result.message).toContain('simulated');
  });

  it('passes input-contains check when matching entry exists', async () => {
    const services = new MapServiceRegistry()
      .register({ name: 'SimulationRuntime' }, runtimeWithEntries());
    const action = handler.create(def, binding);
    const result = await action.execute(
      { invoked: 'agent.invoke', 'input-contains': { prompt: 'hello' } },
      services,
    );
    expect(result.kind).toBe('success');
  });

  it('fails input-contains check when no matching entry exists', async () => {
    const services = new MapServiceRegistry()
      .register({ name: 'SimulationRuntime' }, runtimeWithEntries());
    const action = handler.create(def, binding);
    const result = await action.execute(
      { invoked: 'agent.invoke', 'input-contains': { prompt: 'nonexistent' } },
      services,
    );
    expect(result.kind).toBe('failure');
    expect(result.message).toContain('input-contains');
  });

  it('fails when no simulation context available', async () => {
    const services = new MapServiceRegistry();
    const action = handler.create(def, binding);
    const result = await action.execute(
      { invoked: 'agent.invoke' },
      services,
    );
    expect(result.kind).toBe('failure');
    expect(result.message).toContain('simulation context');
  });
});
