import type { InvokeHandler } from './invoke-handler.js';
import type { Action, Result } from '../walker.js';
import { stepSuccess, stepFailure } from '../walker.js';
import type { Definition, InvokeBinding, RestBinding } from '../types.js';

export class RestInvokeHandler implements InvokeHandler {
  supports(binding: InvokeBinding): boolean { return binding.kind === 'rest'; }

  create(definition: Definition, binding: InvokeBinding): Action {
    const restBinding = binding as RestBinding;
    return {
      async execute(params: Record<string, unknown>): Promise<Result> {
        try {
          const response = await fetch(restBinding.url, {
            method: restBinding.method,
            headers: { 'Content-Type': 'application/json', ...restBinding.headers },
            body: restBinding.method !== 'GET' ? JSON.stringify({ ...restBinding.body, ...params }) : null,
          });
          const body = await response.json() as Record<string, unknown>;
          return stepSuccess(body);
        } catch (err) {
          return stepFailure(`REST call to '${restBinding.url}' failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    };
  }
}
