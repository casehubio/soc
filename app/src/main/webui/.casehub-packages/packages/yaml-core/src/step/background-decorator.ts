import type { DecoratedExecution, Context } from './decorator-chain.js';
import type { Result } from './walker.js';
import { stepSuccess } from './walker.js';

export class BackgroundDecorator implements DecoratedExecution {
  constructor(private readonly next: DecoratedExecution) {}

  async execute(context: Context): Promise<Result> {
    const handle = context.scope.spawn(
      context.stepName,
      async (signal: AbortSignal) => {
        await this.next.execute({ ...context, signal });
      },
    );
    return stepSuccess({ '__background.handle': handle.name() });
  }
}
