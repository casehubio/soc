import type { Action, Result, ServiceRegistry } from './walker.js';
import { stepSuccess, stepFailure, stepFailureWithCategory } from './walker.js';
import type { ScenarioScope } from '../orchestration/types.js';
import { parseLoopDirective, parseRetryDirective } from '../orchestration/directives.js';
import { parseDuration } from '../orchestration/duration-parser.js';
import { isTruthy } from '../truthiness.js';
import { VariableResolver } from '../variable-resolver.js';
import type { ObjectVariableSource } from '../types.js';
import { ThresholdCondition } from '../orchestration/threshold-condition.js';
import type { OrcNumericPrimitive } from '../orchestration/numeric-primitive.js';
import { parsePriority, Priority } from '../orchestration/priority.js';
import { FromDecorator } from './from-decorator.js';
import { CancelDecorator } from './cancel-decorator.js';
import { BackgroundDecorator } from './background-decorator.js';
import { SimulationRuntime } from './simulation-runtime.js';
import type { SimulationConfig, CorpusEntry } from './simulation-runtime.js';

export interface Context {
  readonly params: Record<string, unknown>;
  readonly services: ServiceRegistry;
  readonly scope: ScenarioScope;
  readonly stepName: string;
  readonly resolver: VariableResolver;
  readonly signal?: AbortSignal;
}

export function withResolver(ctx: Context, resolver: VariableResolver): Context {
  return { ...ctx, resolver };
}

export interface DecoratedExecution {
  execute(context: Context): Promise<Result>;
}

class CoreExecution implements DecoratedExecution {
  constructor(private readonly action: Action) {}
  async execute(context: Context): Promise<Result> {
    return this.action.execute(context.params, context.services);
  }
}

class WhenDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly condition: string,
  ) {}
  async execute(context: Context): Promise<Result> {
    const resolved = context.resolver.resolveString(this.condition, 'when-guard');
    if (!isTruthy(resolved)) {
      return stepSuccess({});
    }
    return this.next.execute(context);
  }
}

class ForEachDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly raw: unknown,
  ) {}
  async execute(context: Context): Promise<Result> {
    if (typeof this.raw !== 'object' || this.raw === null) {
      return stepFailure("forEach must be a map with 'in' and 'as' keys");
    }
    const spec = this.raw as Record<string, unknown>;
    const inVal = spec['in'];
    const as = (spec['as'] as string) ?? 'item';
    const parallel = spec['parallel'] === true;

    let items: unknown[];
    if (Array.isArray(inVal)) {
      items = inVal;
    } else {
      const resolved = context.resolver.resolve(String(inVal ?? ''));
      if (!Array.isArray(resolved)) {
        return stepFailure("forEach 'in' did not resolve to a list");
      }
      items = resolved;
    }
    if (items.length === 0) return stepSuccess({});

    if (spec['collect'] === 'all') {
      return this.executeCollectAll(items, as, context);
    }
    if (parallel) {
      return this.executeParallel(items, as, context);
    }
    return this.executeSequential(items, as, context);
  }

  private async executeCollectAll(items: unknown[], as: string, ctx: Context): Promise<Result> {
    const results: unknown[] = [];
    let failures = 0;
    for (let i = 0; i < items.length; i++) {
      const scoped = pushEachContext(ctx.resolver, as, items[i], i);
      const r = await this.next.execute(withResolver(ctx, scoped));
      if (r.kind === 'success') results.push(r.output);
      else failures++;
    }
    if (failures === items.length) return stepFailure('forEach collect: all items failed');
    return stepSuccess({ '__forEach.collected': results });
  }

  private async executeSequential(items: unknown[], as: string, ctx: Context): Promise<Result> {
    let last: Result = stepSuccess({});
    for (let i = 0; i < items.length; i++) {
      const scoped = pushEachContext(ctx.resolver, as, items[i], i);
      last = await this.next.execute(withResolver(ctx, scoped));
      if (last.kind === 'failure') return last;
    }
    return last;
  }

  private async executeParallel(items: unknown[], as: string, ctx: Context): Promise<Result> {
    const promises = items.map((item, i) => {
      const scoped = pushEachContext(ctx.resolver, as, item, i);
      return this.next.execute(withResolver(ctx, scoped));
    });
    const results = await Promise.all(promises);
    for (const r of results) {
      if (r.kind === 'failure') return r;
    }
    return results[results.length - 1]!;
  }
}

function pushEachContext(resolver: VariableResolver, as: string, item: unknown, index: number): VariableResolver {
  const eachSource: ObjectVariableSource = {
    resolve(name: string): unknown {
      if (name === 'index') return index;
      if (name === as) return item;
      if (typeof item === 'object' && item !== null) {
        const prefix = as + '.';
        if (name.startsWith(prefix)) return (item as Record<string, unknown>)[name.substring(prefix.length)];
      }
      return undefined;
    },
    allowContainerReturn() { return true; },
  };
  return resolver.withObjectScope('each', eachSource);
}

class LoopDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly raw: unknown,
  ) {}
  async execute(context: Context): Promise<Result> {
    const directive = parseLoopDirective(this.raw);

    if (directive.type === 'continuous') {
      let lastResult: Result = stepSuccess({});
      while (true) {
        if (context.signal?.aborted) return stepFailureWithCategory('Cancelled', 'CANCELLED');
        lastResult = await this.next.execute(context);
        if (lastResult.kind === 'failure') return lastResult;
      }
    }

    const maxIterations = 'count' in directive ? directive.count : 1000;
    const untilCondition = 'until' in directive ? directive.until : null;

    let lastResult: Result = stepSuccess({});
    for (let i = 0; i < maxIterations; i++) {
      if (context.signal?.aborted) return stepFailureWithCategory('Cancelled', 'CANCELLED');
      lastResult = await this.next.execute(context);
      if (lastResult.kind === 'failure') return lastResult;

      if (untilCondition != null) {
        const resolved = context.resolver.resolveString(untilCondition, 'loop-until');
        if (isTruthy(resolved)) return lastResult;
      }
    }
    return lastResult;
  }
}

class RetryDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly raw: unknown,
  ) {}
  async execute(context: Context): Promise<Result> {
    const directive = parseRetryDirective(this.raw);
    const speed = context.scope.speedMultiplier().currentSpeed();
    let lastResult: Result = stepFailure('no attempts');
    for (let attempt = 0; attempt < directive.max; attempt++) {
      if (attempt > 0) {
        const backoff = 'backoff' in directive ? directive.backoff : undefined;
        const delayMs = 'delayMs' in directive ? directive.delayMs : undefined;
        if (backoff && delayMs && delayMs > 0) {
          const delay = computeDelay(delayMs, backoff, attempt - 1);
          const adjustedMs = Math.max(1, Math.round(delay / speed));
          await sleep(adjustedMs);
        }
      }
      lastResult = await this.next.execute(context);
      if (lastResult.kind === 'success') return lastResult;
      if (lastResult.kind === 'failure') {
        const category = lastResult.failureCategory ?? 'UNKNOWN';
        if (category === 'CANCELLED') break;
        if (directive.type === 'conditional') {
          if (directive.on && !directive.on.includes(category)) break;
          if (directive.except && directive.except.includes(category)) break;
        }
      }
    }
    return lastResult;
  }
}

function computeDelay(baseMs: number, backoff: string, attempt: number): number {
  switch (backoff) {
    case 'exponential':
      return baseMs * (1 << attempt);
    case 'exponential-with-jitter': {
      const exp = baseMs * (1 << attempt);
      return exp + Math.random() * exp;
    }
    default:
      return baseMs;
  }
}

class TimeoutDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly raw: unknown,
  ) {}
  async execute(context: Context): Promise<Result> {
    if (context.signal?.aborted) return stepFailureWithCategory('Cancelled', 'CANCELLED');
    const ms = typeof this.raw === 'number' ? this.raw : parseDuration(String(this.raw));
    const speed = context.scope.speedMultiplier().currentSpeed();
    const adjustedMs = Math.max(1, Math.round(ms / speed));
    const deadlineScope = context.scope.withDeadline(adjustedMs);
    const deadlineCtx: Context = { ...context, scope: deadlineScope };
    const timeoutPromise = new Promise<Result>((resolve) =>
      setTimeout(() => resolve(stepFailureWithCategory(`Step '${context.stepName}' exceeded timeout of ${ms}ms`, 'TIMEOUT')), adjustedMs),
    );
    return Promise.race([this.next.execute(deadlineCtx), timeoutPromise]);
  }
}

class WaitDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly signalName: string,
  ) {}
  async execute(context: Context): Promise<Result> {
    if (context.signal?.aborted) return stepFailureWithCategory('Cancelled', 'CANCELLED');
    const orcSignal = context.scope.signal(this.signalName);
    const remaining = context.scope.remainingTime();
    try {
      if (context.signal) {
        await orcSignal.await(context.signal);
      } else if (remaining != null) {
        const acquired = await orcSignal.await(remaining);
        if (!acquired) {
          return stepFailureWithCategory(`Wait for signal '${this.signalName}' exceeded deadline`, 'TIMEOUT');
        }
      } else {
        await orcSignal.await();
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return stepFailureWithCategory('Cancelled', 'CANCELLED');
      throw e;
    }
    const payload = orcSignal.payload();
    if (payload != null && typeof payload === 'object') {
      const scoped = context.resolver.withScope('signal', (key) => {
        const val = (payload as Record<string, unknown>)[key];
        return val !== undefined ? String(val) : undefined;
      });
      return this.next.execute(withResolver(context, scoped));
    }
    return this.next.execute(context);
  }
}

class OnErrorDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly fallbackStep: string,
  ) {}
  async execute(context: Context): Promise<Result> {
    let result: Result;
    try {
      result = await this.next.execute(context);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return stepSuccess({
        'on-error.caught': message,
        'on-error.fallback': this.fallbackStep,
      });
    }
    if (result.kind === 'failure') {
      return stepSuccess({
        'on-error.caught': result.message,
        'on-error.fallback': this.fallbackStep,
      });
    }
    return result;
  }
}

class DelayDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly raw: unknown,
  ) {}
  async execute(context: Context): Promise<Result> {
    if (context.signal?.aborted) return stepFailureWithCategory('Cancelled', 'CANCELLED');
    const ms = typeof this.raw === 'number' ? this.raw : parseDuration(String(this.raw));
    const speed = context.scope.speedMultiplier().currentSpeed();
    const adjustedMs = Math.max(1, Math.round(ms / speed));
    await sleep(adjustedMs);
    return this.next.execute(context);
  }
}

class SemaphoreDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly name: string,
    private readonly permits: number,
  ) {}
  async execute(context: Context): Promise<Result> {
    if (context.signal?.aborted) return stepFailureWithCategory('Cancelled', 'CANCELLED');
    const sem = context.scope.semaphore(this.name, this.permits);
    const remaining = context.scope.remainingTime();
    try {
      if (context.signal) {
        await sem.acquire(context.signal);
      } else if (remaining != null) {
        const acquired = await sem.tryAcquire(remaining);
        if (!acquired) {
          return stepFailureWithCategory(`Semaphore '${this.name}' acquire exceeded deadline`, 'TIMEOUT');
        }
      } else {
        await sem.acquire();
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return stepFailureWithCategory('Cancelled', 'CANCELLED');
      throw e;
    }
    try {
      return await this.next.execute(context);
    } catch (e) {
      return stepFailure(e instanceof Error ? e.message : String(e));
    } finally {
      sem.release();
    }
  }
}

class PostSignalDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly signalName: string | null,
    private readonly publishSpec: Record<string, unknown> | null,
  ) {}
  async execute(context: Context): Promise<Result> {
    const result = await this.next.execute(context);
    if (result.kind !== 'success') return result;

    if (this.signalName != null) {
      context.scope.signal(this.signalName).signal(result.output);
    }
    if (this.publishSpec != null) {
      const channelName = String(this.publishSpec['channel']);
      const channel = context.scope.channel<unknown>(channelName);
      const data = this.publishSpec['data'] != null
        ? context.resolver.resolve(this.publishSpec['data'])
        : result.output;
      await channel.send(data);
    }
    return result;
  }
}

class TransitionDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly raw: unknown,
  ) {}
  async execute(context: Context): Promise<Result> {
    const result = await this.next.execute(context);
    if (result.kind !== 'success') return result;
    if (typeof this.raw !== 'object' || this.raw === null) {
      return stepFailure("'transition' must be a map with 'machine' and 'event' or 'from'/'to' keys");
    }
    const spec = this.raw as Record<string, unknown>;
    const machineName = spec['machine'] as string | undefined;
    const from = spec['from'] as string | undefined;
    const to = spec['to'] as string | undefined;

    if (!machineName) return stepFailure("'transition' requires 'machine'");

    if (from && to) {
      const sm = context.scope.stateMachine(machineName, [from, to], from);
      sm.transition(from, to);
    }
    return result;
  }
}

class TransformDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly raw: unknown,
  ) {}
  async execute(context: Context): Promise<Result> {
    const result = await this.next.execute(context);
    if (result.kind === 'success' && typeof this.raw === 'object' && this.raw !== null) {
      const additions = this.raw as Record<string, unknown>;
      return stepSuccess({ ...result.output, ...additions });
    }
    return result;
  }
}

class OnSuccessDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly handler: string,
  ) {}
  async execute(context: Context): Promise<Result> {
    const result = await this.next.execute(context);
    if (result.kind === 'success') {
      return {
        ...result,
        executionMetadata: { ...result.executionMetadata, 'on-success': this.handler },
      };
    }
    return result;
  }
}

class OnFailureDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly handler: string,
  ) {}
  async execute(context: Context): Promise<Result> {
    const result = await this.next.execute(context);
    if (result.kind === 'failure') {
      return stepSuccess({
        '__failure': result.message,
        '__on-failure': this.handler,
      });
    }
    return result;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AtDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly raw: unknown,
  ) {}
  async execute(context: Context): Promise<Result> {
    if (typeof this.raw === 'object' && this.raw !== null && !Array.isArray(this.raw)) {
      const map = this.raw as Record<string, unknown>;
      if (map['mode'] === 'guard') {
        return this.executeGuard(map, context);
      }
    }
    const conditions = this.parseConditions();
    await this.waitForConditions(conditions, context);
    return this.next.execute(context);
  }

  private async executeGuard(map: Record<string, unknown>, context: Context): Promise<Result> {
    const condStr = String(map['metric']);
    const cond = ThresholdCondition.parse(condStr);
    const prim = context.scope.numericPrimitive(cond.metricName);
    if (!cond.test(prim.doubleValue())) {
      return stepSuccess({});
    }
    return this.next.execute(context);
  }

  private parseConditions(): ThresholdCondition[] {
    if (typeof this.raw === 'string') return [ThresholdCondition.parse(this.raw)];
    if (Array.isArray(this.raw)) return this.raw.map(s => ThresholdCondition.parse(String(s)));
    if (typeof this.raw === 'object' && this.raw !== null) {
      const map = this.raw as Record<string, unknown>;
      const metric = map['metric'];
      if (typeof metric === 'string') return [ThresholdCondition.parse(metric)];
    }
    throw new Error(`Invalid at: specification: ${JSON.stringify(this.raw)}`);
  }

  private waitForConditions(conditions: ThresholdCondition[], context: Context): Promise<void> {
    const met = new Set<number>();
    for (let i = 0; i < conditions.length; i++) {
      const prim = context.scope.numericPrimitive(conditions[i]!.metricName);
      if (conditions[i]!.test(prim.doubleValue())) met.add(i);
    }
    if (met.size === conditions.length) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const listeners: Array<{ prim: OrcNumericPrimitive; listener: (v: number) => void }> = [];
      const cleanup = () => { for (const { prim, listener } of listeners) prim.removeThresholdListener(listener); };

      for (let i = 0; i < conditions.length; i++) {
        if (met.has(i)) continue;
        const cond = conditions[i]!;
        const prim = context.scope.numericPrimitive(cond.metricName);
        const listener = (value: number) => {
          if (cond.test(value)) {
            met.add(i);
            if (met.size === conditions.length) { cleanup(); resolve(); }
          }
        };
        listeners.push({ prim, listener });
        prim.onThresholdChange(listener);
      }
    });
  }
}

class PrioritySemaphoreDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly name: string,
    private readonly priority: Priority,
  ) {}
  async execute(context: Context): Promise<Result> {
    const sem = context.scope.prioritySemaphore(this.name, 1);
    const remaining = context.scope.remainingTime();
    if (remaining != null) {
      const acquired = await sem.tryAcquire(this.priority, remaining);
      if (!acquired) {
        return stepFailure(`Resource '${this.name}' acquire exceeded deadline`);
      }
    } else {
      await sem.acquire(this.priority);
    }
    try {
      return await this.next.execute(context);
    } catch (e) {
      return stepFailure(e instanceof Error ? e.message : String(e));
    } finally {
      sem.release();
    }
  }
}

class SimulationDecorator implements DecoratedExecution {
  constructor(
    private readonly next: DecoratedExecution,
    private readonly raw: unknown,
  ) {}
  async execute(context: Context): Promise<Result> {
    let runtime: SimulationRuntime;
    try {
      runtime = context.services.lookup<SimulationRuntime>({ name: 'SimulationRuntime' });
    } catch {
      return this.next.execute(context);
    }

    const block = this.raw as Record<string, unknown>;
    const corpus: CorpusEntry[] = (Array.isArray(block['corpus']) ? block['corpus'] : []).map(
      (entry: unknown) => typeof entry === 'string' ? { file: entry } : entry as CorpusEntry,
    );
    const config: SimulationConfig = {
      strategies: (block['strategies'] as Record<string, string>) ?? {},
      corpus,
      capture: (block['capture'] as string[]) ?? [],
    };
    runtime.pushOverlay(config);
    return this.next.execute(context);
  }
}

function parseSemaphoreSpec(raw: unknown): { name: string; permits: number } {
  if (typeof raw === 'string') return { name: raw, permits: 1 };
  if (typeof raw === 'object' && raw !== null) {
    const map = raw as Record<string, unknown>;
    return {
      name: String(map['name']),
      permits: typeof map['permits'] === 'number' ? map['permits'] : 1,
    };
  }
  return { name: String(raw), permits: 1 };
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Preserve the published static facade.
export class DecoratorChain {
  static build(
    decorators: Record<string, unknown>,
    action: Action,
  ): DecoratedExecution {
    let execution: DecoratedExecution = new CoreExecution(action);

    if (decorators['on-success'] != null) {
      execution = new OnSuccessDecorator(execution, String(decorators['on-success']));
    }
    if (decorators['on-failure'] != null) {
      execution = new OnFailureDecorator(execution, String(decorators['on-failure']));
    }
    if (decorators['transform'] != null) {
      execution = new TransformDecorator(execution, decorators['transform']);
    }
    if (decorators['transition'] != null) {
      execution = new TransitionDecorator(execution, decorators['transition']);
    }
    const signalName = decorators['signal'] != null ? String(decorators['signal']) : null;
    const publishSpec = decorators['publish'] != null && typeof decorators['publish'] === 'object'
      ? decorators['publish'] as Record<string, unknown>
      : null;
    if (signalName != null || publishSpec != null) {
      execution = new PostSignalDecorator(execution, signalName, publishSpec);
    }
    if (decorators['delay'] != null) {
      execution = new DelayDecorator(execution, decorators['delay']);
    }
    const semRaw = decorators['semaphore'];
    const mutexRaw = decorators['mutex'];
    if (semRaw != null || mutexRaw != null) {
      if (mutexRaw != null) {
        execution = new SemaphoreDecorator(execution, String(mutexRaw), 1);
      } else {
        const spec = parseSemaphoreSpec(semRaw);
        execution = new SemaphoreDecorator(execution, spec.name, spec.permits);
      }
    }
    const resourceRaw = decorators['resource'];
    if (resourceRaw != null) {
      const resourceName = typeof resourceRaw === 'string' ? resourceRaw : String((resourceRaw as Record<string, unknown>)['name']);
      const priorityRaw = decorators['priority'] as string | undefined;
      const priority = priorityRaw != null ? parsePriority(priorityRaw) : Priority.NORMAL;
      execution = new PrioritySemaphoreDecorator(execution, resourceName, priority);
    }
    if (decorators['retry'] != null) {
      execution = new RetryDecorator(execution, decorators['retry']);
    }
    if (decorators['wait'] != null) {
      execution = new WaitDecorator(execution, String(decorators['wait']));
    }
    if (decorators['at'] != null) {
      execution = new AtDecorator(execution, decorators['at']);
    }
    if (decorators['timeout'] != null) {
      execution = new TimeoutDecorator(execution, decorators['timeout']);
    }
    if (decorators['from'] != null) {
      execution = new FromDecorator(execution, decorators['from']);
    }
    if (decorators['on-error'] != null) {
      execution = new OnErrorDecorator(execution, String(decorators['on-error']));
    }
    if (decorators['loop'] != null) {
      execution = new LoopDecorator(execution, decorators['loop']);
    }
    if (decorators['cancel'] != null) {
      execution = new CancelDecorator(execution, String(decorators['cancel']));
    }
    if (decorators['background'] === true) {
      execution = new BackgroundDecorator(execution);
    }
    if (decorators['forEach'] != null) {
      execution = new ForEachDecorator(execution, decorators['forEach']);
    }
    if (decorators['simulation'] != null) {
      execution = new SimulationDecorator(execution, decorators['simulation']);
    }
    if (decorators['if'] != null) {
      execution = new WhenDecorator(execution, String(decorators['if']));
    }

    return execution;
  }
}
