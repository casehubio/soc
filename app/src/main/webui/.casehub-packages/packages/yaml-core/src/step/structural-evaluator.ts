import type {
  ResolvedStep, Result, PluginStep, BlockStep, ParallelStep,
  IfElseStep, MatchStep, TryCatchFinallyStep, SelectStep,
  BarrierStep, QuorumStep, InvokeStep, DelayStep, RaceStep,
  EmitEventStep,
} from './walker.js';
import { stepSuccess, stepFailure } from './walker.js';
import { mergeAbortSignals } from './abort-utils.js';
import { ParallelCompletionTracker } from './parallel-completion-tracker.js';
import type { Context } from './decorator-chain.js';
import { DecoratorChain } from './decorator-chain.js';
import { isTruthy } from '../truthiness.js';
import { matches } from '../match.js';
import type { InvokeHandler } from './invoke/invoke-handler.js';
import type { EventEmitter } from './emit-event-emitter.js';
import { DefinitionParser } from './definition-parser.js';

export class StructuralEvaluator {
  private readonly invokeHandlers: InvokeHandler[];

  constructor(invokeHandlers: InvokeHandler[] = []) {
    this.invokeHandlers = invokeHandlers;
  }
  async evaluate(step: ResolvedStep, context: Context): Promise<Result> {
    const result = await this.dispatch(step, context);
    if (step.name && result.kind === 'success') {
      context.scope.resultStore().recordSuccess(step.name, result.output);
    } else if (step.name && result.kind === 'failure') {
      context.scope.resultStore().recordFailure(step.name, {
        message: result.message,
        exceptionClass: 'StepFailure',
        stackTrace: '',
      });
    }
    return result;
  }

  private async dispatch(step: ResolvedStep, context: Context): Promise<Result> {
    switch (step.kind) {
      case 'plugin': return this.evaluatePlugin(step, context);
      case 'invoke': return this.evaluateInvoke(step, context);
      case 'block': return this.evaluateBlock(step, context);
      case 'parallel': return this.evaluateParallel(step, context);
      case 'if-else': return this.evaluateIfElse(step, context);
      case 'match': return this.evaluateMatch(step, context);
      case 'try-catch-finally': return this.evaluateTryCatchFinally(step, context);
      case 'select': return this.evaluateSelect(step, context);
      case 'barrier': return this.evaluateBarrier(step, context);
      case 'quorum': return this.evaluateQuorum(step, context);
      case 'delay': return this.evaluateDelay(step);
      case 'race': return this.evaluateRace(step, context);
      case 'emit-event': return this.evaluateEmitEvent(step, context);
    }
  }

  private async evaluatePlugin(step: PluginStep, context: Context): Promise<Result> {
    const chain = DecoratorChain.build(step.decorators, step.entry.action);
    return chain.execute({ ...context, params: step.params, stepName: step.name ?? 'anonymous' });
  }

  private async evaluateInvoke(step: InvokeStep, context: Context): Promise<Result> {
    let binding;
    try {
      binding = DefinitionParser.parseInvoke(step.invokeSpec);
    } catch {
      return stepFailure(`Invoke step '${step.name ?? 'anonymous'}': invalid binding spec`);
    }

    const handler = this.invokeHandlers.find(h => h.supports(binding));
    if (!handler) {
      return stepFailure(`Invoke step '${step.name ?? 'anonymous'}' requires a runtime invoke handler for '${binding.kind}'`);
    }

    const definition = { name: step.name ?? 'anonymous', inputs: {}, outputs: {} };
    const action = handler.create(definition, binding);
    return action.execute({}, context.services);
  }

  private async evaluateBlock(step: BlockStep, context: Context): Promise<Result> {
    let lastResult: Result = stepSuccess({});
    for (const child of step.steps) {
      lastResult = await this.evaluate(child, context);
      if (lastResult.kind === 'failure') return lastResult;
    }
    return lastResult;
  }

  private async evaluateParallel(step: ParallelStep, context: Context): Promise<Result> {
    if (step.advanceAfter) {
      return this.evaluateParallelDiscriminator(step, context);
    }
    const results = await Promise.allSettled(
      step.steps.map((child) => this.evaluate(child, context)),
    );

    const outputs: Record<string, unknown> = {};
    for (const result of results) {
      if (result.status === 'rejected') {
        return stepFailure(result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
      if (result.value.kind === 'failure') {
        return result.value;
      }
      Object.assign(outputs, result.value.output);
    }
    return stepSuccess(outputs);
  }

  private async evaluateParallelDiscriminator(step: ParallelStep, context: Context): Promise<Result> {
    const branchSteps = step.branches
      ? step.branches.map(b => ({ name: b.name, steps: b.steps }))
      : step.steps.map((s, i) => ({ name: s.name ?? `branch-${i}`, steps: [s] }));

    const tracker = new ParallelCompletionTracker(
      branchSteps.length,
      step.advanceAfter!,
      step.cancelRemaining ?? false,
    );

    const outputs: Record<string, unknown> = {};
    const promises = branchSteps.map(async (branch, i) => {
      const branchCtx: Context = {
        ...context,
        signal: mergeAbortSignals(context.signal, tracker.signalFor(i)),
      };
      for (const child of branch.steps) {
        const result = await this.evaluate(child, branchCtx);
        if (result.kind === 'success') {
          Object.assign(outputs, result.output);
        }
      }
      tracker.branchDone(i);
    });

    void Promise.allSettled(promises);
    await tracker.awaitAdvancement();

    if (step.collectionTimeout) {
      await new Promise(resolve => setTimeout(resolve, step.collectionTimeout));
    }

    return stepSuccess(outputs);
  }

  private async evaluateIfElse(step: IfElseStep, context: Context): Promise<Result> {
    const branch = isTruthy(step.condition) ? step.thenSteps : step.elseSteps;
    let lastResult: Result = stepSuccess({});
    for (const child of branch) {
      lastResult = await this.evaluate(child, context);
      if (lastResult.kind === 'failure') return lastResult;
    }
    return lastResult;
  }

  private async evaluateMatch(step: MatchStep, context: Context): Promise<Result> {
    for (const matchCase of step.cases) {
      if (matches(matchCase.pattern, step.scrutinee)) {
        if (matchCase.guard !== null && !isTruthy(matchCase.guard)) continue;
        let lastResult: Result = stepSuccess({});
        for (const child of matchCase.steps) {
          lastResult = await this.evaluate(child, context);
          if (lastResult.kind === 'failure') return lastResult;
        }
        return lastResult;
      }
    }
    return stepSuccess({});
  }

  private async evaluateTryCatchFinally(step: TryCatchFinallyStep, context: Context): Promise<Result> {
    let tryResult: Result = stepSuccess({});

    for (const child of step.trySteps) {
      tryResult = await this.evaluate(child, context);
      if (tryResult.kind === 'failure') break;
    }

    if (tryResult.kind === 'failure' && step.catchSteps.length > 0) {
      let catchResult: Result = stepSuccess({});
      for (const child of step.catchSteps) {
        catchResult = await this.evaluate(child, context);
        if (catchResult.kind === 'failure') break;
      }
      tryResult = catchResult;
    }

    for (const child of step.finallySteps) {
      await this.evaluate(child, context);
    }

    return tryResult;
  }

  private async evaluateSelect(step: SelectStep, context: Context): Promise<Result> {
    const promises = step.branches.map(async (branch) => {
      if (branch.type === 'wait') {
        const sig = context.scope.signal(branch.name);
        await sig.await();
      }
      let lastResult: Result = stepSuccess({});
      for (const child of branch.steps) {
        lastResult = await this.evaluate(child, context);
        if (lastResult.kind === 'failure') return lastResult;
      }
      return lastResult;
    });

    return Promise.race(promises);
  }

  private async evaluateBarrier(step: BarrierStep, _context: Context): Promise<Result> {
    const store = _context.scope.resultStore();
    const allCompleted = step.awaitSteps.every((name) => store.hasCompleted(name));
    if (allCompleted) return stepSuccess({});
    const missing = step.awaitSteps.filter((name) => !store.hasCompleted(name));
    return stepFailure(`Barrier: waiting on steps [${missing.join(', ')}]`);
  }

  private async evaluateQuorum(step: QuorumStep, context: Context): Promise<Result> {
    const store = context.scope.resultStore();
    const completed = step.ofSteps.filter((name) => store.hasCompleted(name));
    if (completed.length >= step.required) return stepSuccess({});
    return stepFailure(`Quorum: ${completed.length}/${step.required} of [${step.ofSteps.join(', ')}] completed`);
  }

  private async evaluateDelay(step: DelayStep): Promise<Result> {
    await new Promise(resolve => setTimeout(resolve, step.duration));
    return stepSuccess({});
  }

  private async evaluateEmitEvent(step: EmitEventStep, context: Context): Promise<Result> {
    let emitter: EventEmitter;
    try {
      emitter = context.services.lookup({ name: 'EventEmitter' });
    } catch {
      return stepFailure(`emit-event '${step.name ?? 'anonymous'}': EventEmitter service not registered`);
    }

    const resolved = step.events.map(e => emitter.emit(e));

    if (step.emitTo === 'scope' || step.emitTo === 'both') {
      try {
        const routers = context.services.lookup<Array<{ fire(event: unknown, context?: unknown): boolean }>>({ name: 'EventRouterRegistry' });
        for (const event of resolved) {
          for (const router of routers) {
            router.fire(event.type, event);
          }
        }
      } catch {
        // No EventRouterRegistry — emit to log only
      }
    }

    if (step.emitTo === 'pages-event' || step.emitTo === 'both') {
      try {
        const dispatch = context.services.lookup<(topic: string, payload: unknown) => void>({ name: 'PagesEventDispatch' });
        for (const event of resolved) {
          const topic = event.type.replace(/\./g, ':');
          dispatch(topic, event);
        }
      } catch {
        if (step.emitTo === 'pages-event') {
          return stepFailure(`emit-event '${step.name ?? 'anonymous'}': pages-event dispatch not available (no DOM host)`);
        }
      }
    }

    return stepSuccess({
      emittedCount: resolved.length,
      emittedIds: resolved.map(e => e.id),
      emittedTypes: resolved.map(e => e.type),
    });
  }

  private async evaluateRace(step: RaceStep, context: Context): Promise<Result> {
    const controllers = step.steps.map(() => new AbortController());
    const promises = step.steps.map((child, i) => {
      const branchCtx: Context = {
        ...context,
        signal: mergeAbortSignals(context.signal, controllers[i]!.signal),
      };
      return this.evaluate(child, branchCtx)
        .then(result => ({ index: i, result }))
        .catch(err => ({
          index: i,
          result: stepFailure(err instanceof Error ? err.message : String(err)),
        }));
    });

    const winner = await Promise.race(promises);
    for (let i = 0; i < controllers.length; i++) {
      if (i !== winner.index) controllers[i]!.abort();
    }
    return winner.result;
  }
}
