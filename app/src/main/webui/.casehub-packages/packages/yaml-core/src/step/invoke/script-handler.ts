import type { InvokeHandler } from './invoke-handler.js';
import type { Action, Result } from '../walker.js';
import { stepSuccess, stepFailure } from '../walker.js';
import type { Definition, InvokeBinding, ScriptBinding } from '../types.js';

export type ScriptExecutor = (runtime: string, script: string, env: Record<string, string>, workingDir?: string, timeoutMs?: number) => Promise<string>;

export class ScriptInvokeHandler implements InvokeHandler {
  constructor(private readonly executor: ScriptExecutor) {}

  supports(binding: InvokeBinding): boolean { return binding.kind === 'script'; }

  create(definition: Definition, binding: InvokeBinding): Action {
    const scriptBinding = binding as ScriptBinding;
    const executor = this.executor;
    return {
      async execute(params: Record<string, unknown>): Promise<Result> {
        try {
          const env = { ...scriptBinding.env };
          for (const [k, v] of Object.entries(params)) {
            if (typeof v === 'string') env[k] = v;
            else env[k] = JSON.stringify(v);
          }
          const output = await executor(scriptBinding.runtime, scriptBinding.script, env, scriptBinding.workingDir);
          try {
            const parsed = JSON.parse(output) as Record<string, unknown>;
            return stepSuccess(parsed);
          } catch {
            return stepSuccess({ output });
          }
        } catch (err) {
          return stepFailure(`Script execution failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    };
  }
}
