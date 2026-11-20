import { describe, it, expect } from 'vitest';
import { CancelDecorator } from './cancel-decorator.js';
import type { Context } from './decorator-chain.js';
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

describe('CancelDecorator', () => {
  it('cancels inner execution when named signal fires', async () => {
    const scope = new DefaultScenarioScope();
    let innerSignalAborted = false;

    const action = {
      execute: async (ctx: Context) => {
        const sig = ctx.scope.signal('data-ready');
        try {
          await sig.await(ctx.signal!);
        } catch {
          innerSignalAborted = ctx.signal?.aborted ?? false;
        }
        return stepSuccess({});
      },
    };

    const decorator = new CancelDecorator(action, 'shutdown');
    const controller = new AbortController();
    const promise = decorator.execute(makeContext(scope, controller.signal));

    scope.signal('shutdown').signal();
    await promise;
    expect(innerSignalAborted).toBe(true);
    scope.close();
  });

  it('returns failure immediately if signal already fired', async () => {
    const scope = new DefaultScenarioScope();
    scope.signal('shutdown').signal();

    const action = { execute: async () => stepSuccess({}) };
    const decorator = new CancelDecorator(action, 'shutdown');
    const result = await decorator.execute(makeContext(scope));
    expect(result.kind).toBe('failure');
    scope.close();
  });

  it('normal completion does not trigger cancellation', async () => {
    const scope = new DefaultScenarioScope();
    let executed = false;

    const action = {
      execute: async () => { executed = true; return stepSuccess({}); },
    };

    const decorator = new CancelDecorator(action, 'shutdown');
    const result = await decorator.execute(makeContext(scope));
    expect(result.kind).toBe('success');
    expect(executed).toBe(true);
    scope.close();
  });
});
