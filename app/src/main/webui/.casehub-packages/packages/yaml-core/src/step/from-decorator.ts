import type { DecoratedExecution, Context } from './decorator-chain.js';
import { withResolver } from './decorator-chain.js';
import type { Result } from './walker.js';
import { stepSuccess, stepFailureWithCategory } from './walker.js';
import { isTruthy } from '../truthiness.js';
import { ChannelClosedError } from '../orchestration/errors.js';
import { mergeAbortSignals } from './abort-utils.js';
import type { ObjectVariableSource } from '../types.js';

interface FromSpec {
  channel?: string;
  channels?: string[];
  as?: string;
  filter?: string;
  until?: string;
  name?: string;
}

function parseFromSpec(raw: unknown): FromSpec {
  if (typeof raw === 'string') return { channel: raw };
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const map = raw as Record<string, unknown>;
    const spec: FromSpec = {};
    if (map['channel'] !== undefined) spec.channel = map['channel'] as string;
    if (map['channels'] !== undefined) spec.channels = map['channels'] as string[];
    if (map['as'] !== undefined) spec.as = map['as'] as string;
    if (map['filter'] !== undefined) spec.filter = map['filter'] as string;
    if (map['until'] !== undefined) spec.until = map['until'] as string;
    if (map['name'] !== undefined) spec.name = map['name'] as string;
    return spec;
  }
  throw new Error(`Invalid from: spec — expected string or object, got ${typeof raw}`);
}

export function pushFromContext(
  resolver: import('../variable-resolver.js').VariableResolver,
  alias: string,
  item: unknown,
): import('../variable-resolver.js').VariableResolver {
  const source: ObjectVariableSource = {
    resolve(name: string): unknown {
      if (typeof item === 'object' && item !== null) {
        return (item as Record<string, unknown>)[name];
      }
      return item;
    },
    allowContainerReturn() { return true; },
  };
  return resolver.withObjectScope(alias, source);
}

export class FromDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly raw: unknown,
  ) {}

  async execute(context: Context): Promise<Result> {
    if (context.signal?.aborted) return stepFailureWithCategory('Cancelled', 'CANCELLED');

    const spec = parseFromSpec(this.raw);

    if (spec.until) {
      const resolved = context.resolver.resolveString(spec.until, 'from-until');
      if (isTruthy(resolved)) {
        return stepSuccess({ '__from.terminated': true });
      }
    }

    let effectiveSignal = context.signal;
    if (spec.name) {
      const consumer = context.scope.consumer(spec.name);
      if (consumer.isStopped()) return stepSuccess({ '__from.terminated': true });
      if (consumer.isPaused()) await consumer.awaitResume();
      effectiveSignal = effectiveSignal
        ? AbortSignal.any([effectiveSignal, consumer.signal])
        : consumer.signal;
    }

    let item: unknown;

    try {
      item = await this.receiveItem(spec, effectiveSignal ? { ...context, signal: effectiveSignal } : context);
    } catch (e) {
      if (e instanceof ChannelClosedError) {
        return stepSuccess({ '__from.closed': true });
      }
      if (e instanceof DOMException && e.name === 'AbortError') {
        return stepFailureWithCategory('Cancelled', 'CANCELLED');
      }
      throw e;
    }

    const alias = spec.as ?? 'from';
    const scoped = pushFromContext(context.resolver, alias, item);
    const scopedCtx = withResolver(context, scoped);

    if (spec.filter) {
      const resolved = scoped.resolveString(spec.filter, 'from-filter');
      if (!isTruthy(resolved)) {
        return stepSuccess({});
      }
    }

    return this.next.execute(scopedCtx);
  }

  private async receiveItem(spec: FromSpec, context: Context): Promise<unknown> {
    if (spec.channels) {
      return this.receiveFanIn(spec.channels, context);
    }
    const channelName = spec.channel;
    if (!channelName) throw new Error('from: requires channel or channels');
    if (context.signal) {
      return context.scope.channel<unknown>(channelName).receive(context.signal);
    }
    return context.scope.channel<unknown>(channelName).receive();
  }

  private async receiveFanIn(channelNames: string[], context: Context): Promise<unknown> {
    const controllers = channelNames.map(() => new AbortController());
    const promises = channelNames.map((name, i) => {
      const merged = mergeAbortSignals(context.signal, controllers[i]!.signal);
      return context.scope.channel<unknown>(name)
        .receive(merged)
        .then(item => ({ index: i, item }));
    });

    const winner = await Promise.race(promises);
    for (let i = 0; i < controllers.length; i++) {
      if (i !== winner.index) controllers[i]!.abort();
    }
    return winner.item;
  }
}
