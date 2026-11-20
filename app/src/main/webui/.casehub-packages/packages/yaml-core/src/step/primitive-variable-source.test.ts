import { describe, it, expect } from 'vitest';
import { withPrimitiveVariables } from './primitive-variable-source.js';
import { VariableResolver } from '../variable-resolver.js';
import { DefaultScenarioScope } from '../orchestration/scenario-scope.js';

describe('withPrimitiveVariables', () => {
  it('resolves flag.* against scope', () => {
    const scope = new DefaultScenarioScope();
    scope.flag('shutdown').set();
    const resolver = withPrimitiveVariables(
      VariableResolver.forParams({}, {}, new Set()),
      scope,
    );
    expect(resolver.resolveString('${flag.shutdown}', 'test')).toBe('true');
    scope.close();
  });

  it('resolves counter.* against scope', () => {
    const scope = new DefaultScenarioScope();
    scope.counter('workers').increment();
    scope.counter('workers').increment();
    const resolver = withPrimitiveVariables(
      VariableResolver.forParams({}, {}, new Set()),
      scope,
    );
    expect(resolver.resolveString('${counter.workers}', 'test')).toBe('2');
    scope.close();
  });

  it('resolves signal.* against scope', () => {
    const scope = new DefaultScenarioScope();
    const resolver = withPrimitiveVariables(
      VariableResolver.forParams({}, {}, new Set()),
      scope,
    );
    expect(resolver.resolveString('${signal.ready}', 'test')).toBe('false');
    scope.signal('ready').signal();
    expect(resolver.resolveString('${signal.ready}', 'test')).toBe('true');
    scope.close();
  });
});
