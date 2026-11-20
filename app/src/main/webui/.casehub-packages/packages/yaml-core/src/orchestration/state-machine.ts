import type { OrcStateMachine } from './types.js';
import type { StateHandler, TransitionHandler } from './callbacks.js';
import { IllegalTransitionError } from './errors.js';

export class DefaultOrcStateMachine<S extends string> implements OrcStateMachine<S> {
  private _state: S;
  private readonly _name: string;
  private readonly _transitions: Map<S, Set<S>>;
  private readonly _guards: Map<string, (payload: unknown) => boolean>;
  private readonly _terminalStates: Set<S>;
  private readonly _enterHandlers = new Map<S, StateHandler[]>();
  private readonly _exitHandlers = new Map<S, StateHandler[]>();
  private readonly _transitionHandlers = new Map<string, TransitionHandler[]>();

  constructor(
    name: string,
    initial: S,
    transitions: Map<S, Set<S>>,
    guards: Map<string, (payload: unknown) => boolean>,
    terminalStates: Set<S>,
  ) {
    this._name = name;
    this._state = initial;
    this._transitions = transitions;
    this._guards = guards;
    this._terminalStates = terminalStates;
  }

  currentState(): S {
    return this._state;
  }

  transition(from: S, to: S, payload?: unknown): boolean {
    if (this._state !== from) return false;
    if (this._terminalStates.has(from)) {
      throw new IllegalTransitionError(this._name, from, to);
    }
    const targets = this._transitions.get(from);
    if (!targets || !targets.has(to)) {
      throw new IllegalTransitionError(this._name, from, to);
    }
    const guardKey = `${from}->${to}`;
    const guard = this._guards.get(guardKey);
    if (guard && !guard(payload)) return false;
    const exitHandlers = this._exitHandlers.get(from) ?? [];
    for (const h of exitHandlers) h();
    this._state = to;
    const transHandlers = this._transitionHandlers.get(guardKey) ?? [];
    for (const h of transHandlers) h(payload);
    const enterHandlers = this._enterHandlers.get(to) ?? [];
    for (const h of enterHandlers) h();
    return true;
  }

  onTransition(from: S, to: S, handler: TransitionHandler): void {
    const key = `${from}->${to}`;
    const list = this._transitionHandlers.get(key) ?? [];
    list.push(handler);
    this._transitionHandlers.set(key, list);
  }

  onEnter(state: S, handler: StateHandler): void {
    const list = this._enterHandlers.get(state) ?? [];
    list.push(handler);
    this._enterHandlers.set(state, list);
  }

  onExit(state: S, handler: StateHandler): void {
    const list = this._exitHandlers.get(state) ?? [];
    list.push(handler);
    this._exitHandlers.set(state, list);
  }
}

export class StateMachineBuilder<S extends string> {
  private readonly _name: string;
  private readonly _initial: S;
  private readonly _transitions = new Map<S, Set<S>>();
  private readonly _guards = new Map<string, (payload: unknown) => boolean>();
  private readonly _terminalStates = new Set<S>();

  constructor(name: string, initial: S) {
    this._name = name;
    this._initial = initial;
  }

  transition(from: S, to: S): this {
    let targets = this._transitions.get(from);
    if (!targets) {
      targets = new Set();
      this._transitions.set(from, targets);
    }
    targets.add(to);
    return this;
  }

  guard(from: S, to: S, predicate: (payload: unknown) => boolean): this {
    this._guards.set(`${from}->${to}`, predicate);
    return this;
  }

  terminal(...states: S[]): this {
    for (const s of states) this._terminalStates.add(s);
    return this;
  }

  build(): DefaultOrcStateMachine<S> {
    return new DefaultOrcStateMachine(
      this._name, this._initial, this._transitions, this._guards, this._terminalStates,
    );
  }
}
