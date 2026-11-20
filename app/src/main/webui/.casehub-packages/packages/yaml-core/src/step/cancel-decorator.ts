import type { DecoratedExecution, Context } from './decorator-chain.js';
import type { Result } from './walker.js';
import { stepFailureWithCategory } from './walker.js';
import { mergeAbortSignals } from './abort-utils.js';

export class CancelDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly signalName: string,
  ) {}

  async execute(context: Context): Promise<Result> {
    const orcSignal = context.scope.signal(this.signalName);
    if (orcSignal.isSignalled()) return stepFailureWithCategory('Cancelled', 'CANCELLED');

    const controller = new AbortController();
    orcSignal.await().then(() => controller.abort()).catch(() => {});

    const merged = mergeAbortSignals(context.signal, controller.signal);
    try {
      return await this.next.execute({ ...context, signal: merged });
    } finally {
      controller.abort();
    }
  }
}
