import type { InvokeHandler } from '@casehubio/yaml-core/step';
import type { InvokeBinding, Definition, AriaBinding } from '@casehubio/yaml-core/step';
import type { Action, Result, ServiceRegistry } from '@casehubio/yaml-core/step';
import { stepSuccess, stepFailure } from '@casehubio/yaml-core/step';
import type { AriaTarget } from '@casehubio/pages-primitives';

export class AriaInvokeHandler implements InvokeHandler {
  supports(binding: InvokeBinding): boolean {
    return binding.kind === 'aria';
  }

  create(_definition: Definition, binding: InvokeBinding): Action {
    const ariaBinding = binding as AriaBinding;
    return {
      async execute(params: Record<string, unknown>, services: ServiceRegistry): Promise<Result> {
        try {
          const eventTarget = services.lookup<EventTarget>({ name: 'EventTarget' });
          const speed = services.lookup<number>({ name: 'Speed' });
          const target = extractAriaTarget(params);
          const step = {
            action: ariaBinding.action,
            target,
            value: params['value'] as string | undefined,
            state: params['state'] as Record<string, unknown> | undefined,
            timeout: params['timeout'] as number | undefined,
            typing: params['typing'] as string | undefined,
            line: params['line'] as number | undefined,
            col: params['col'] as number | undefined,
            from: params['from'],
            to: params['to'],
            label: params['label'] as string | undefined,
            content: params['content'] as string | undefined,
            file: params['file'] as string | undefined,
            style: params['style'] as string | undefined,
          };
          const { executeStep } = await import('../../executor/command-executor.js');
          await executeStep(step as Parameters<typeof executeStep>[0], eventTarget, speed);
          return stepSuccess({});
        } catch (err) {
          return stepFailure((err as Error).message ?? String(err));
        }
      },
    };
  }
}

function extractAriaTarget(params: Record<string, unknown>): AriaTarget | undefined {
  if (!params['role']) return undefined;
  const target: AriaTarget = { role: params['role'] as string, name: params['name'] as string };
  if (params['index'] != null) target.index = params['index'] as string;
  if (params['within'] != null) target.within = params['within'] as AriaTarget;
  return target;
}
