import { parseDuration } from './duration-parser.js';

export interface StepError {
  readonly message: string;
  readonly exceptionClass: string;
  readonly stackTrace: string;
}

export type LoopDirective =
  | { type: 'count'; count: number }
  | { type: 'count-until'; count: number; until: string }
  | { type: 'until'; until: string }
  | { type: 'continuous' };

export function parseLoopDirective(raw: unknown): LoopDirective {
  if (raw == null) throw new Error('LoopDirective cannot be null');
  if (raw === 'continuous') return { type: 'continuous' };
  if (typeof raw === 'number') return { type: 'count', count: raw };
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const map = raw as Record<string, unknown>;
    if ('type' in map) return map as LoopDirective;
    const count = map['count'] as number | undefined;
    const until = map['until'] as string | undefined;
    if (count != null && until != null) return { type: 'count-until', count, until };
    if (until != null) return { type: 'until', until };
    if (count != null) return { type: 'count', count };
  }
  throw new Error(`Invalid LoopDirective: expected number or {count?, until?}, got ${typeof raw}`);
}

export type RetryDirective =
  | { type: 'simple'; max: number }
  | { type: 'full'; max: number; backoff: string; delayMs: number }
  | { type: 'conditional'; max: number; on?: string[]; except?: string[]; backoff?: string; delayMs?: number };

export function parseRetryDirective(raw: unknown): RetryDirective {
  if (raw == null) throw new Error('RetryDirective cannot be null');
  if (typeof raw === 'number') return { type: 'simple', max: raw };
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const map = raw as Record<string, unknown>;
    if ('type' in map) return map as RetryDirective;
    const max = map['max'] as number | undefined;
    if (max == null) throw new Error('RetryDirective requires max');
    const on = map['on'] as string[] | undefined;
    const except = map['except'] as string[] | undefined;
    const backoff = map['backoff'] as string | undefined;
    const delay = map['delay'] as string | undefined;
    if (on || except) {
      const delayMs = delay ? parseDuration(delay) : undefined;
      return { type: 'conditional', max, ...(on ? { on } : {}), ...(except ? { except } : {}), ...(backoff ? { backoff } : {}), ...(delayMs !== undefined ? { delayMs } : {}) };
    }
    if (backoff && delay) return { type: 'full', max, backoff, delayMs: parseDuration(delay) };
    return { type: 'simple', max };
  }
  throw new Error(`Invalid RetryDirective: expected number or {max, backoff?, delay?}, got ${typeof raw}`);
}

export interface ComputeBlock {
  readonly engine: string;
  readonly expression: string;
}

export function parseComputeBlock(map: Record<string, unknown>, defaultEngine: string): ComputeBlock {
  const expression = map['expression'] as string | undefined;
  if (!expression) throw new Error('ComputeBlock requires an expression');
  const engine = (map['engine'] as string | undefined) ?? defaultEngine;
  return { engine, expression };
}
