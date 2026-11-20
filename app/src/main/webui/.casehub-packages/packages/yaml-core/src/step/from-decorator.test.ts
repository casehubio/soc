import { describe, it, expect } from 'vitest';
import { FromDecorator, pushFromContext } from './from-decorator.js';
import type { DecoratedExecution, Context } from './decorator-chain.js';
import type { Result } from './walker.js';
import { stepSuccess } from './walker.js';
import { DefaultScenarioScope } from '../orchestration/scenario-scope.js';
import { VariableResolver } from '../variable-resolver.js';
import { MapServiceRegistry } from './walker.js';

function makeContext(scope: import('../orchestration/types.js').ScenarioScope, signal?: AbortSignal): Context {
  return {
    params: {},
    services: new MapServiceRegistry(),
    scope,
    stepName: 'test',
    resolver: VariableResolver.forParams({}, {}, new Set()),
    signal,
  };
}

function mockAction(fn?: (ctx: Context) => Promise<Result>): DecoratedExecution {
  return {
    execute: fn ?? (async () => stepSuccess({})),
  };
}

describe('FromDecorator', () => {
  it('simple form: reads from named channel', async () => {
    const scope = new DefaultScenarioScope();
    const ch = scope.channel<Record<string, unknown>>('sensor');
    await ch.send({ value: 42, name: 'temp' });

    let capturedCtx: Context | undefined;
    const action = mockAction(async (ctx) => {
      capturedCtx = ctx;
      return stepSuccess({});
    });

    const decorator = new FromDecorator(action, 'sensor');
    const controller = new AbortController();
    const result = await decorator.execute(makeContext(scope, controller.signal));
    expect(result.kind).toBe('success');
    expect(capturedCtx).toBeDefined();

    const resolved = capturedCtx!.resolver.resolve('${from.value}');
    expect(resolved).toBe(42);
    scope.close();
  });

  it('full form with alias', async () => {
    const scope = new DefaultScenarioScope();
    const ch = scope.channel<Record<string, unknown>>('readings');
    await ch.send({ temp: 99 });

    let capturedCtx: Context | undefined;
    const action = mockAction(async (ctx) => {
      capturedCtx = ctx;
      return stepSuccess({});
    });

    const decorator = new FromDecorator(action, { channel: 'readings', as: 'reading' });
    const controller = new AbortController();
    const result = await decorator.execute(makeContext(scope, controller.signal));
    expect(result.kind).toBe('success');

    const resolved = capturedCtx!.resolver.resolve('${reading.temp}');
    expect(resolved).toBe(99);
    scope.close();
  });

  it('returns closed sentinel on ChannelClosedError', async () => {
    const scope = new DefaultScenarioScope();
    const ch = scope.channel<unknown>('events');
    ch.close();

    const decorator = new FromDecorator(mockAction(), 'events');
    const controller = new AbortController();
    const result = await decorator.execute(makeContext(scope, controller.signal));
    expect(result.kind).toBe('success');
    expect((result as any).output['__from.closed']).toBe(true);
    scope.close();
  });

  it('returns failure on AbortSignal already aborted', async () => {
    const scope = new DefaultScenarioScope();
    scope.channel<unknown>('events');
    const controller = new AbortController();
    controller.abort();

    const decorator = new FromDecorator(mockAction(), 'events');
    const result = await decorator.execute(makeContext(scope, controller.signal));
    expect(result.kind).toBe('failure');
    scope.close();
  });

  it('until: terminates when condition is true', async () => {
    const scope = new DefaultScenarioScope();
    scope.flag('shutdown').set();
    const resolver = VariableResolver.forParams({}, {}, new Set())
      .withScope('flag', (name) => { try { return String(scope.flag(name).get()); } catch { return undefined; } });
    const action = mockAction();
    const decorator = new FromDecorator(action, { channel: 'events', until: '${flag.shutdown}' });
    const ctx: Context = { ...makeContext(scope), resolver };
    const result = await decorator.execute(ctx);
    expect(result.kind).toBe('success');
    expect((result as any).output['__from.terminated']).toBe(true);
    scope.close();
  });

  it('named consumer: stop terminates the from:', async () => {
    const scope = new DefaultScenarioScope();
    const _ch = scope.channel<unknown>('events');
    const consumer = scope.consumer('enricher');
    consumer.stop();

    const action = mockAction();
    const decorator = new FromDecorator(action, { channel: 'events', name: 'enricher' });
    const controller = new AbortController();
    const result = await decorator.execute(makeContext(scope, controller.signal));
    expect(result.kind).toBe('success');
    expect((result as any).output['__from.terminated']).toBe(true);
    scope.close();
  });

  it('fan-in: first channel with data wins', async () => {
    const scope = new DefaultScenarioScope();
    scope.channel<unknown>('a');
    const chB = scope.channel<Record<string, unknown>>('b');
    await chB.send({ source: 'b' });

    let capturedCtx: Context | undefined;
    const action = mockAction(async (ctx) => {
      capturedCtx = ctx;
      return stepSuccess({});
    });

    const decorator = new FromDecorator(action, { channels: ['a', 'b'] });
    const controller = new AbortController();
    const result = await decorator.execute(makeContext(scope, controller.signal));
    expect(result.kind).toBe('success');

    const resolved = capturedCtx!.resolver.resolve('${from.source}');
    expect(resolved).toBe('b');
    scope.close();
  });
});

describe('pushFromContext', () => {
  it('injects item fields as variables under alias', () => {
    const resolver = VariableResolver.forParams({}, {}, new Set());
    const scoped = pushFromContext(resolver, 'reading', { value: 42, unit: 'C' });
    expect(scoped.resolve('${reading.value}')).toBe(42);
    expect(scoped.resolve('${reading.unit}')).toBe('C');
  });

  it('injects fields accessible via alias.field', () => {
    const resolver = VariableResolver.forParams({}, {}, new Set());
    const scoped = pushFromContext(resolver, 'item', { x: 1, y: 2 });
    expect(scoped.resolve('${item.x}')).toBe(1);
    expect(scoped.resolve('${item.y}')).toBe(2);
  });
});
