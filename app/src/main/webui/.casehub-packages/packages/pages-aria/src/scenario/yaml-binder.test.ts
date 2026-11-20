import { describe, it, expect } from 'vitest';
import { DefaultScenarioScope } from '@casehubio/yaml-core/orchestration';
import { bindScenario } from './yaml-binder.js';
import type { SchedulerStep } from './types.js';
import type { ParallelStep, BlockStep } from '@casehubio/yaml-core/step';
import { stepSuccess } from '@casehubio/yaml-core/step';

function simplePlugin(name: string): SchedulerStep {
  return {
    kind: 'plugin', name: null, params: {}, decorators: {},
    entry: { qualifiedName: name, definition: { name, inputs: {}, outputs: {} }, action: { async execute() { return stepSuccess({}); } } },
  } as any;
}

describe('YamlBinder', () => {
  it('creates a single queue for flat sequential steps', () => {
    const scenario = {
      scenario: 'test',
      steps: [simplePlugin('click'), simplePlugin('fill')],
    };
    const scope = new DefaultScenarioScope();
    const result = bindScenario(scenario as any, scope);
    expect(result.queues).toHaveLength(1);
    expect(result.queues[0].steps).toHaveLength(2);
    expect(result.queues[0].id).toBe('main');
  });

  it('creates child queues for parallel step', () => {
    const parallel: ParallelStep = {
      kind: 'parallel', name: null, decorators: {},
      steps: [
        { kind: 'block', name: 'branch-a', steps: [simplePlugin('click') as any], decorators: {} } as BlockStep,
        { kind: 'block', name: 'branch-b', steps: [simplePlugin('click') as any], decorators: {} } as BlockStep,
      ],
    };
    const scenario = { scenario: 'test', steps: [parallel] };
    const scope = new DefaultScenarioScope();
    const result = bindScenario(scenario as any, scope);
    expect(result.queues).toHaveLength(3);
    const mainQueue = result.queues[0];
    expect(mainQueue.children).toHaveLength(2);
    expect(mainQueue.children[0].id).toBe('branch-a');
    expect(mainQueue.children[1].id).toBe('branch-b');
  });

  it('creates named primitives from orchestration block', () => {
    const scenario = {
      scenario: 'test',
      orchestration: {
        barriers: { 'all-ready': { count: 3 } },
        channels: { trades: { capacity: 10 } },
        signals: ['go'],
      },
      steps: [],
    };
    const scope = new DefaultScenarioScope();
    bindScenario(scenario as any, scope);
    expect(scope.latch('all-ready', 3).getCount()).toBe(3);
    expect(scope.channel('trades').isEmpty()).toBe(true);
    expect(scope.signal('go').isSignalled()).toBe(false);
  });

  it('pushes PreExtractedStep to queue without special handling', () => {
    const scenario = {
      scenario: 'test',
      steps: [
        { kind: 'signal-fire', name: 'go', decorators: {} },
        simplePlugin('click'),
      ],
    };
    const scope = new DefaultScenarioScope();
    const result = bindScenario(scenario as any, scope);
    expect(result.queues).toHaveLength(1);
    expect(result.queues[0].steps).toHaveLength(2);
  });

  it('rejects __anon_ prefix in top-level orchestration names', () => {
    const scenario = {
      scenario: 'test',
      orchestration: { signals: ['__anon_bad'] },
      steps: [],
    };
    const scope = new DefaultScenarioScope();
    expect(() => bindScenario(scenario as any, scope)).toThrow('__anon_');
  });

  it('handles sectioned scenarios', () => {
    const scenario = {
      scenario: 'test',
      sections: [
        { title: 'Intro', steps: [simplePlugin('click')] },
        { title: 'Body', steps: [simplePlugin('fill')] },
      ],
    };
    const scope = new DefaultScenarioScope();
    const result = bindScenario(scenario as any, scope);
    expect(result.queues).toHaveLength(1);
    expect(result.queues[0].steps).toHaveLength(2);
  });
});
