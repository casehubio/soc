import type { InvokeHandler } from './invoke-handler.js';
import type { Action, Result } from '../walker.js';
import { stepSuccess, stepFailure } from '../walker.js';
import type { Definition, InvokeBinding, GraphqlBinding } from '../types.js';

export class GraphqlInvokeHandler implements InvokeHandler {
  constructor(private readonly endpoint: string) {}

  supports(binding: InvokeBinding): boolean { return binding.kind === 'graphql'; }

  create(definition: Definition, binding: InvokeBinding): Action {
    const gqlBinding = binding as GraphqlBinding;
    const endpoint = this.endpoint;
    return {
      async execute(params: Record<string, unknown>): Promise<Result> {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: gqlBinding.query, variables: params }),
          });
          const body = await response.json() as Record<string, unknown>;
          return stepSuccess(body);
        } catch (err) {
          return stepFailure(`GraphQL query failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    };
  }
}
