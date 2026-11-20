import type { InvokeHandler } from './invoke-handler.js';
import type { Action, Result } from '../walker.js';
import { stepSuccess, stepFailure } from '../walker.js';
import type { Definition, InvokeBinding, AgentBinding } from '../types.js';

export type AgentInvoker = (descriptor: string, params: Record<string, unknown>, options: { model?: string; timeout?: string; structuredOutput: boolean }) => Promise<Record<string, unknown>>;

export class AgentInvokeHandler implements InvokeHandler {
  constructor(private readonly invoker: AgentInvoker) {}

  supports(binding: InvokeBinding): boolean { return binding.kind === 'agent'; }

  create(definition: Definition, binding: InvokeBinding): Action {
    const agentBinding = binding as AgentBinding;
    const invoker = this.invoker;
    return {
      async execute(params: Record<string, unknown>): Promise<Result> {
        try {
          const result = await invoker(agentBinding.descriptor, params, {
            ...(agentBinding.model !== undefined ? { model: agentBinding.model } : {}),
            ...(agentBinding.timeout !== undefined ? { timeout: agentBinding.timeout } : {}),
            structuredOutput: agentBinding.structuredOutput,
          });
          return stepSuccess(result);
        } catch (err) {
          return stepFailure(`Agent '${agentBinding.descriptor}' failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    };
  }
}
