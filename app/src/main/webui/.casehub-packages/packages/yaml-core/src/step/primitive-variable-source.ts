import type { ScenarioScope } from '../orchestration/types.js';
import type { VariableResolver } from '../variable-resolver.js';

export function withPrimitiveVariables(
  resolver: VariableResolver,
  scope: ScenarioScope,
): VariableResolver {
  return resolver
    .withScope('flag', (name) => {
      try { return String(scope.flag(name).get()); } catch { return undefined; }
    })
    .withScope('counter', (name) => {
      try { return String(scope.counter(name).get()); } catch { return undefined; }
    })
    .withScope('gauge', (name) => {
      try { return String(scope.gauge(name, 0).get()); } catch { return undefined; }
    })
    .withScope('signal', (name) => {
      try { return String(scope.signal(name).isSignalled()); } catch { return undefined; }
    })
    .withScope('accumulator', (name) => {
      try { return String(scope.accumulator(name, (a, b) => a + b, 0).get()); } catch { return undefined; }
    });
}
