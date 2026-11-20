import type { OrcStateMachine } from './types.js';
import type { StateHandler, TransitionHandler } from './callbacks.js';

export interface BlockingOrcStateMachine<S extends string> extends OrcStateMachine<S> {
  awaitState(target: S): Promise<void>;
  awaitStateWithTimeout(target: S, timeoutMs: number): Promise<boolean>;
  awaitTransition(from: S, to: S): Promise<void>;
  awaitAnyState(targets: Set<S>): Promise<S>;
  awaitAnyStateWithTimeout(targets: Set<S>, timeoutMs: number): Promise<S | undefined>;
}

export class DefaultBlockingOrcStateMachine<S extends string> implements BlockingOrcStateMachine<S> {
  private state: S;
  private readonly transitionHandlers: Array<{ from: S; to: S; handler: TransitionHandler }> = [];
  private readonly enterHandlers: Array<{ state: S; handler: StateHandler }> = [];
  private readonly exitHandlers: Array<{ state: S; handler: StateHandler }> = [];
  private readonly waiters: Array<{ check: () => boolean; resolve: () => void }> = [];

  constructor(private readonly smName: string, initial: S) {
    this.state = initial;
  }

  currentState(): S { return this.state; }

  transition(from: S, to: S, payload?: unknown): boolean {
    if (this.state !== from) return false;
    for (const h of this.exitHandlers) {
      if (h.state === from) h.handler();
    }
    this.state = to;
    for (const h of this.transitionHandlers) {
      if (h.from === from && h.to === to) h.handler(payload);
    }
    for (const h of this.enterHandlers) {
      if (h.state === to) h.handler();
    }
    const resolved: number[] = [];
    for (let i = 0; i < this.waiters.length; i++) {
      if (this.waiters[i]!.check()) {
        this.waiters[i]!.resolve();
        resolved.push(i);
      }
    }
    for (let i = resolved.length - 1; i >= 0; i--) {
      this.waiters.splice(resolved[i]!, 1);
    }
    return true;
  }

  onTransition(from: S, to: S, handler: TransitionHandler): void {
    this.transitionHandlers.push({ from, to, handler });
  }

  onEnter(state: S, handler: StateHandler): void {
    this.enterHandlers.push({ state, handler });
  }

  onExit(state: S, handler: StateHandler): void {
    this.exitHandlers.push({ state, handler });
  }

  awaitState(target: S): Promise<void> {
    if (this.state === target) return Promise.resolve();
    return new Promise(resolve => {
      this.waiters.push({ check: () => this.state === target, resolve });
    });
  }

  awaitStateWithTimeout(target: S, timeoutMs: number): Promise<boolean> {
    if (this.state === target) return Promise.resolve(true);
    return new Promise(resolve => {
      const waiter = {
        check: () => this.state === target,
        resolve: () => { clearTimeout(timer); resolve(true); },
      };
      const timer = setTimeout(() => {
        const idx = this.waiters.indexOf(waiter);
        if (idx >= 0) this.waiters.splice(idx, 1);
        resolve(false);
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  awaitTransition(from: S, to: S): Promise<void> {
    return new Promise(resolve => {
      this.onTransition(from, to, () => { resolve(); });
    });
  }

  awaitAnyState(targets: Set<S>): Promise<S> {
    if (targets.has(this.state)) return Promise.resolve(this.state);
    return new Promise(resolve => {
      this.waiters.push({
        check: () => targets.has(this.state),
        resolve: () => { resolve(this.state); },
      });
    });
  }

  awaitAnyStateWithTimeout(targets: Set<S>, timeoutMs: number): Promise<S | undefined> {
    if (targets.has(this.state)) return Promise.resolve(this.state);
    return new Promise(resolve => {
      const waiter = {
        check: () => targets.has(this.state),
        resolve: () => { clearTimeout(timer); resolve(this.state); },
      };
      const timer = setTimeout(() => {
        const idx = this.waiters.indexOf(waiter);
        if (idx >= 0) this.waiters.splice(idx, 1);
        resolve(undefined);
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }
}
