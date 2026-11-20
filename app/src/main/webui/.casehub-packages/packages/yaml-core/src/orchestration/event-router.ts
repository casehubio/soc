import type { MatchPattern } from '../match.js';
import { matches } from '../match.js';
import type { OrcStateMachine } from './types.js';

export interface EventMapping<S extends string> {
  fromPattern: MatchPattern;
  to: S;
  onPattern: MatchPattern;
  guard?: (context: unknown) => boolean;
}

export class EventRouter<S extends string> {
  constructor(
    private target: OrcStateMachine<S>,
    private readonly mappings: EventMapping<S>[],
  ) {}

  fire(event: unknown, context?: unknown): boolean {
    const eventStr = typeof event === 'string' ? event : String(event);
    const currentState = this.target.currentState();
    for (const mapping of this.mappings) {
      if (matches(mapping.onPattern, eventStr)
          && matches(mapping.fromPattern, currentState)
          && (!mapping.guard || mapping.guard(context))) {
        return this.target.transition(currentState, mapping.to, context);
      }
    }
    return false;
  }

  targeting(newTarget: OrcStateMachine<S>): EventRouter<S> {
    return new EventRouter(newTarget, this.mappings);
  }
}
