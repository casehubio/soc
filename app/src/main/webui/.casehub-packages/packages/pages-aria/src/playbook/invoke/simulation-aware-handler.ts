import type { InvokeHandler } from '@casehubio/yaml-core/step';
import type { Action, Result, ServiceRegistry } from '@casehubio/yaml-core/step';
import { stepSuccess, stepFailure } from '@casehubio/yaml-core/step';
import type { Definition, InvokeBinding } from '@casehubio/yaml-core/step';
import type { SimulationRuntime } from '@casehubio/yaml-core/step';

export class SimulationAwareInvokeHandler implements InvokeHandler {
  supports(binding: InvokeBinding): boolean {
    return binding.kind === 'graphql-domain';
  }

  create(_definition: Definition, _binding: InvokeBinding): Action {
    return {
      async execute(params: Record<string, unknown>, services: ServiceRegistry): Promise<Result> {
        const domain = params.domain as string;
        const operation = params.operation as string;
        const qualifiedName = `${domain}.${operation}`;
        const input = (params.params ?? {}) as Record<string, unknown>;

        let runtime: SimulationRuntime | undefined;
        try {
          runtime = services.lookup<SimulationRuntime>({ name: 'SimulationRuntime' });
        } catch { /* not registered — no simulation context */ }

        if (runtime) {
          const resolved = runtime.resolve(qualifiedName, input);
          if (resolved) {
            runtime.recordJournal(qualifiedName, '', input, resolved.output, resolved.realism);
            return stepSuccess(resolved.output as Record<string, unknown>);
          }
          const fallthrough = runtime.fallthroughRealism(qualifiedName);
          runtime.recordJournal(qualifiedName, '', input, {}, fallthrough);
        }

        return stepSuccess({});
      },
    };
  }
}
