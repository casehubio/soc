import { describe, it, expect } from 'vitest';
import { InvocationJournal, SimulationOverlay, SimulationRuntime } from './simulation-runtime.js';
import type { SimulationConfig } from './simulation-runtime.js';

describe('InvocationJournal', () => {
  it('records and queries entries by qualified name', () => {
    const journal = new InvocationJournal();
    journal.record('agent-provider.invoke', 'default-tenant',
      { prompt: 'hello' }, { response: 'hi' }, 'DOMAIN_PLAUSIBLE');
    journal.record('case-memory-store.query', 'default-tenant',
      { key: 'k1' }, { value: 'v1' }, 'RECORDED_REAL');
    journal.record('agent-provider.invoke', 'default-tenant',
      { prompt: 'bye' }, { response: 'goodbye' }, 'DOMAIN_PLAUSIBLE');

    expect(journal.entries()).toHaveLength(3);
    expect(journal.entriesFor('agent-provider.invoke')).toHaveLength(2);
    expect(journal.countFor('agent-provider.invoke')).toBe(2);
    expect(journal.countFor('case-memory-store.query')).toBe(1);
    expect(journal.countFor('unknown')).toBe(0);
  });
});

describe('SimulationRuntime', () => {
  it('pushes and pops overlays', () => {
    const runtime = new SimulationRuntime();
    expect(runtime.hasActiveOverlay()).toBe(false);

    const config: SimulationConfig = { strategies: { 'agent-provider.invoke': 'sequential' }, corpus: [], capture: [] };
    const overlay = runtime.pushOverlay(config);
    expect(runtime.hasActiveOverlay()).toBe(true);

    runtime.popOverlay(overlay);
    expect(runtime.hasActiveOverlay()).toBe(false);
  });

  it('resolves strategies top-down from overlay stack', () => {
    const runtime = new SimulationRuntime();
    const config1: SimulationConfig = { strategies: { 'a': 'sequential' }, corpus: [], capture: [] };
    const config2: SimulationConfig = { strategies: { 'a': 'random', 'b': 'key-lookup' }, corpus: [], capture: [] };

    runtime.pushOverlay(config1);
    const overlay2 = runtime.pushOverlay(config2);

    expect(runtime.strategyFor('a')).toBe('random');
    expect(runtime.strategyFor('b')).toBe('key-lookup');

    runtime.popOverlay(overlay2);
    expect(runtime.strategyFor('a')).toBe('sequential');
    expect(runtime.strategyFor('b')).toBeUndefined();
  });

  it('activeJournal returns top overlay journal', () => {
    const runtime = new SimulationRuntime();
    expect(runtime.activeJournal()).toBeUndefined();

    const config: SimulationConfig = { strategies: {}, corpus: [], capture: [] };
    runtime.pushOverlay(config);
    const journal = runtime.activeJournal();
    expect(journal).toBeDefined();
  });

  it('recordJournal records to active overlay', () => {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = { strategies: {}, corpus: [], capture: [] };
    runtime.pushOverlay(config);

    runtime.recordJournal('spi.method', 'tenant1', { in: 1 }, { out: 2 }, 'RECORDED_REAL');
    expect(runtime.activeJournal()!.countFor('spi.method')).toBe(1);
  });

  it('recordJournal is no-op when no overlay active', () => {
    const runtime = new SimulationRuntime();
    expect(() => runtime.recordJournal('spi.method', 't', {}, {}, 'RECORDED_REAL')).not.toThrow();
  });

  it('popAll clears all overlays', () => {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = { strategies: {}, corpus: [], capture: [] };
    runtime.pushOverlay(config);
    runtime.pushOverlay(config);
    expect(runtime.hasActiveOverlay()).toBe(true);

    runtime.popAll();
    expect(runtime.hasActiveOverlay()).toBe(false);
  });

  it('fallthroughRealism returns configured value or default', () => {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = {
      strategies: {}, corpus: [], capture: [],
      fallthroughRealism: { 'agent-provider.invoke': 'PLACEHOLDER' },
    };
    runtime.pushOverlay(config);

    expect(runtime.fallthroughRealism('agent-provider.invoke')).toBe('PLACEHOLDER');
    expect(runtime.fallthroughRealism('unknown')).toBe('RECORDED_REAL');
  });

  it('resolve with sequential strategy returns corpus entries in order', () => {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = {
      strategies: { 'cases.startCase': 'sequential' },
      corpus: [{ inline: { 'cases.startCase': [
        { input: {}, output: { caseId: 'case-1' } },
        { input: {}, output: { caseId: 'case-2' } },
      ] } }],
      capture: [],
    };
    runtime.pushOverlay(config);

    const r1 = runtime.resolve('cases.startCase', {});
    expect(r1).toEqual({ output: { caseId: 'case-1' }, realism: 'STRUCTURALLY_VALID' });

    const r2 = runtime.resolve('cases.startCase', {});
    expect(r2).toEqual({ output: { caseId: 'case-2' }, realism: 'STRUCTURALLY_VALID' });

    const r3 = runtime.resolve('cases.startCase', {});
    expect(r3).toEqual({ output: { caseId: 'case-1' }, realism: 'STRUCTURALLY_VALID' });
  });

  it('resolve with key-lookup strategy matches by input', () => {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = {
      strategies: { 'agent.invoke': 'key-lookup' },
      corpus: [{ inline: { 'agent.invoke': [
        { input: { prompt: 'hello' }, output: { response: 'hi' } },
        { input: { prompt: 'bye' }, output: { response: 'goodbye' } },
      ] } }],
      capture: [],
    };
    runtime.pushOverlay(config);

    const r1 = runtime.resolve('agent.invoke', { prompt: 'bye' });
    expect(r1).toEqual({ output: { response: 'goodbye' }, realism: 'DOMAIN_PLAUSIBLE' });

    const r2 = runtime.resolve('agent.invoke', { prompt: 'unknown' });
    expect(r2).toEqual({ output: {}, realism: 'PLACEHOLDER' });
  });

  it('resolve with passthrough strategy returns undefined', () => {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = {
      strategies: { 'spi.method': 'passthrough' }, corpus: [], capture: [],
    };
    runtime.pushOverlay(config);

    expect(runtime.resolve('spi.method', {})).toBeUndefined();
  });

  it('resolve returns undefined when no strategy matches', () => {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = {
      strategies: { 'a': 'sequential' }, corpus: [], capture: [],
    };
    runtime.pushOverlay(config);

    expect(runtime.resolve('b', {})).toBeUndefined();
  });

  it('allEntriesFor collects from all overlays', () => {
    const runtime = new SimulationRuntime();
    const config1: SimulationConfig = { strategies: {}, corpus: [], capture: [] };
    const config2: SimulationConfig = { strategies: {}, corpus: [], capture: [] };
    runtime.pushOverlay(config1);
    runtime.recordJournal('spi.method', 't', {}, { v: 1 }, 'RECORDED_REAL');
    runtime.pushOverlay(config2);
    runtime.recordJournal('spi.method', 't', {}, { v: 2 }, 'DOMAIN_PLAUSIBLE');

    const all = runtime.allEntriesFor('spi.method');
    expect(all).toHaveLength(2);
    expect(all[0]!.output).toEqual({ v: 1 });
    expect(all[1]!.output).toEqual({ v: 2 });
  });
});

describe('SimulationOverlay', () => {
  it('inlineCorpusFor returns entries for qualified name', () => {
    const config: SimulationConfig = {
      strategies: {},
      corpus: [
        { inline: { 'a': [{ input: {}, output: { x: 1 } }] } },
        { inline: { 'a': [{ input: {}, output: { x: 2 } }], 'b': [{ input: {}, output: { y: 1 } }] } },
      ],
      capture: [],
    };
    const overlay = new SimulationOverlay(config);

    expect(overlay.inlineCorpusFor('a')).toHaveLength(2);
    expect(overlay.inlineCorpusFor('b')).toHaveLength(1);
    expect(overlay.inlineCorpusFor('c')).toHaveLength(0);
  });

  it('nextSequential cycles through entries', () => {
    const config: SimulationConfig = {
      strategies: {},
      corpus: [{ inline: { 'a': [
        { input: {}, output: { v: 1 } },
        { input: {}, output: { v: 2 } },
      ] } }],
      capture: [],
    };
    const overlay = new SimulationOverlay(config);

    expect(overlay.nextSequential('a')!.output).toEqual({ v: 1 });
    expect(overlay.nextSequential('a')!.output).toEqual({ v: 2 });
    expect(overlay.nextSequential('a')!.output).toEqual({ v: 1 });
  });

  it('nextSequential returns undefined for empty corpus', () => {
    const config: SimulationConfig = { strategies: {}, corpus: [], capture: [] };
    const overlay = new SimulationOverlay(config);
    expect(overlay.nextSequential('a')).toBeUndefined();
  });
});

describe('discriminated corpus format', () => {
  it('resolve uses per-entry realism when provided', () => {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = {
      strategies: { 'agent.invoke': 'sequential' },
      corpus: [{ inline: { 'agent.invoke': [
        { input: {}, output: { r: 1 }, realism: 'RECORDED_REAL' },
        { input: {}, output: { r: 2 }, realism: 'DOMAIN_PLAUSIBLE' },
      ] } }],
      capture: [],
    };
    runtime.pushOverlay(config);

    const r1 = runtime.resolve('agent.invoke', {});
    expect(r1!.realism).toBe('RECORDED_REAL');

    const r2 = runtime.resolve('agent.invoke', {});
    expect(r2!.realism).toBe('DOMAIN_PLAUSIBLE');
  });

  it('resolve falls back to strategy default when entry has no realism', () => {
    const runtime = new SimulationRuntime();
    const config: SimulationConfig = {
      strategies: { 'a': 'key-lookup' },
      corpus: [{ inline: { 'a': [
        { input: { k: 1 }, output: { v: 1 } },
      ] } }],
      capture: [],
    };
    runtime.pushOverlay(config);

    const r = runtime.resolve('a', { k: 1 });
    expect(r!.realism).toBe('DOMAIN_PLAUSIBLE');
  });
});
