import type { InvokeHandler } from '@casehubio/yaml-core/step';
import type { Action, Result, ServiceRegistry } from '@casehubio/yaml-core/step';
import { stepSuccess, stepFailure } from '@casehubio/yaml-core/step';
import type { Definition, InvokeBinding } from '@casehubio/yaml-core/step';
import type { SimulationRuntime } from '@casehubio/yaml-core/step';
import { inputContains } from '@casehubio/yaml-core/step';

export class VerifySimulationHandler implements InvokeHandler {
  supports(binding: InvokeBinding): boolean {
    return binding.kind === 'verify-simulation';
  }

  create(_definition: Definition, _binding: InvokeBinding): Action {
    return {
      async execute(params: Record<string, unknown>, services: ServiceRegistry): Promise<Result> {
        let runtime: SimulationRuntime;
        try {
          runtime = services.lookup<SimulationRuntime>({ name: 'SimulationRuntime' });
        } catch {
          return stepFailure('verify-simulation requires an active simulation context');
        }

        const qualifiedName = params.invoked as string;
        if (!qualifiedName) {
          return stepFailure("verify-simulation requires 'invoked' parameter");
        }

        const entries = runtime.allEntriesFor(qualifiedName);

        if (params.count !== undefined) {
          const expected = params.count as number;
          if (entries.length !== expected) {
            return stepFailure(
              `Expected ${expected} invocation(s) of '${qualifiedName}', got ${entries.length}`,
            );
          }
        } else if (entries.length === 0) {
          return stepFailure(
            `Expected at least one invocation of '${qualifiedName}', got none`,
          );
        }

        if (params['all-simulated'] !== undefined) {
          const expectSimulated = params['all-simulated'] as boolean;
          const allMatch = entries.every(e =>
            expectSimulated ? e.dataRealism !== 'RECORDED_REAL' : e.dataRealism === 'RECORDED_REAL',
          );
          if (!allMatch) {
            return stepFailure(
              `Expected all invocations of '${qualifiedName}' to be ${expectSimulated ? 'simulated' : 'real'}`,
            );
          }
        }

        const inputPattern = params['input-contains'] as Record<string, unknown> | undefined;
        if (inputPattern) {
          const hasMatch = entries.some(e => inputContains(e.input, inputPattern));
          if (!hasMatch) {
            return stepFailure(
              `No invocation of '${qualifiedName}' matches input-contains: ${JSON.stringify(inputPattern)}`,
            );
          }
        }

        return stepSuccess({ invocationCount: entries.length });
      },
    };
  }
}
