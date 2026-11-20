import { isTruthy } from '../truthiness.js';

export class ConditionEvaluator {
  private readonly _delegate: (expr: string) => boolean;

  constructor(expressionDelegate: (expr: string) => boolean) {
    this._delegate = expressionDelegate;
  }

  evaluate(resolved: string): boolean {
    try {
      return isTruthy(resolved);
    } catch {
      return this._delegate(resolved);
    }
  }
}
