import type { Definition, InvokeBinding } from './types.js';

export type Portability = 'universal' | 'java' | 'ts' | 'both';
export type RuntimeEnvironment = 'java' | 'ts';

export interface PortabilityViolation {
  actionName: string;
  actionPortability: Portability;
  runtime: RuntimeEnvironment;
  message: string;
}

const UNIVERSAL_BINDINGS = new Set(['rest', 'graphql', 'graphql-domain', 'process']);

export function inferPortability(invoke: InvokeBinding | undefined): Portability {
  if (!invoke) return 'ts';
  return UNIVERSAL_BINDINGS.has(invoke.kind) ? 'universal' : 'ts';
}

export function isCompatible(portability: Portability, runtime: RuntimeEnvironment): boolean {
  if (portability === 'universal' || portability === 'both') return true;
  return portability === runtime;
}

export function validatePortability(
  actions: Definition[],
  runtime: RuntimeEnvironment,
): PortabilityViolation[] {
  const violations: PortabilityViolation[] = [];
  for (const action of actions) {
    const portability = action.portability ?? 'ts';
    if (!isCompatible(portability, runtime)) {
      violations.push({
        actionName: action.name,
        actionPortability: portability,
        runtime,
        message: `Action '${action.name}' requires '${portability}' runtime but current runtime is '${runtime}'`,
      });
    }
  }
  return violations;
}
