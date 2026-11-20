import type { InvokeHandler } from './invoke-handler.js';
import type { Action, Result } from '../walker.js';
import { stepSuccess, stepFailure } from '../walker.js';
import type { Definition, InvokeBinding, ProcessBinding } from '../types.js';

export type ProcessExecutor = (command: string, args: string[], env: Record<string, string>, workingDir?: string, timeoutMs?: number) => Promise<{ stdout: string; stderr: string; exitCode: number }>;

export class ProcessInvokeHandler implements InvokeHandler {
  constructor(private readonly executor: ProcessExecutor) {}

  supports(binding: InvokeBinding): boolean { return binding.kind === 'process'; }

  create(definition: Definition, binding: InvokeBinding): Action {
    const processBinding = binding as ProcessBinding;
    const executor = this.executor;
    return {
      async execute(params: Record<string, unknown>): Promise<Result> {
        try {
          const env = { ...processBinding.env };
          for (const [k, v] of Object.entries(params)) {
            env[k] = typeof v === 'string' ? v : JSON.stringify(v);
          }
          const result = await executor(processBinding.command, processBinding.args, env, processBinding.workingDir);
          if (result.exitCode !== 0) {
            const errorOutput = processBinding.onError === 'stderr' ? result.stderr : result.stdout;
            return stepFailure(`Process '${processBinding.command}' exited with code ${result.exitCode}: ${errorOutput}`);
          }
          if (processBinding.output === 'json') {
            try {
              const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
              return stepSuccess(parsed);
            } catch {
              return stepSuccess({ stdout: result.stdout });
            }
          }
          return stepSuccess({ stdout: result.stdout, stderr: result.stderr });
        } catch (err) {
          return stepFailure(`Process '${processBinding.command}' failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    };
  }
}
