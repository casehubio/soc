import { describe, it, expect } from 'vitest';
import { BackgroundDecorator } from './background-decorator.js';
import type { Context } from './decorator-chain.js';
import { stepSuccess } from './walker.js';
import { DefaultScenarioScope } from '../orchestration/scenario-scope.js';
import { VariableResolver } from '../variable-resolver.js';
import { MapServiceRegistry } from './walker.js';

function makeContext(scope: import('../orchestration/types.js').ScenarioScope): Context {
  return {
    params: {},
    services: new MapServiceRegistry(),
    scope,
    stepName: 'bg-task',
    resolver: VariableResolver.forParams({}, {}, new Set()),
  };
}

describe('BackgroundDecorator', () => {
  it('resolves immediately with handle name', async () => {
    const scope = new DefaultScenarioScope();
    let started = false;

    const action = {
      execute: async () => {
        started = true;
        return stepSuccess({});
      },
    };

    const decorator = new BackgroundDecorator(action);
    const result = await decorator.execute(makeContext(scope));
    expect(result.kind).toBe('success');
    expect((result as any).output['__background.handle']).toBe('bg-task');

    await new Promise(r => setTimeout(r, 10));
    expect(started).toBe(true);
    scope.close();
  });

  it('scope.close() cancels background task', async () => {
    const scope = new DefaultScenarioScope();
    let aborted = false;

    const action = {
      execute: async (ctx: Context) => {
        await new Promise<void>((_, reject) => {
          ctx.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('aborted'));
          }, { once: true });
        });
        return stepSuccess({});
      },
    };

    const decorator = new BackgroundDecorator(action);
    await decorator.execute(makeContext(scope));
    scope.close();
    await new Promise(r => setTimeout(r, 10));
    expect(aborted).toBe(true);
  });
});
