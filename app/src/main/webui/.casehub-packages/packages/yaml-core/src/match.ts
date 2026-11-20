export type MatchPattern = ValuePattern | StructuralPattern | AnyOfPattern | DefaultPattern;

export interface ValuePattern {
  type: 'value';
  value: unknown;
}

export interface StructuralPattern {
  type: 'structural';
  fields: Record<string, unknown>;
}

export interface AnyOfPattern {
  type: 'any-of';
  values: unknown[];
}

export interface DefaultPattern {
  type: 'default';
}

export interface MatchCase {
  pattern: MatchPattern;
  guard: string | null;
  steps: Record<string, unknown>[];
}

export function matches(pattern: MatchPattern, scrutinee: unknown): boolean {
  switch (pattern.type) {
    case 'value':
      return Object.is(pattern.value, scrutinee)
        || (pattern.value !== null && pattern.value !== undefined
            && scrutinee !== null && scrutinee !== undefined
            && pattern.value === scrutinee);
    case 'structural': {
      if (typeof scrutinee !== 'object' || scrutinee === null || Array.isArray(scrutinee)) {
        return false;
      }
      const map = scrutinee as Record<string, unknown>;
      for (const [key, val] of Object.entries(pattern.fields)) {
        if (!Object.is(map[key], val)) return false;
      }
      return true;
    }
    case 'any-of':
      return pattern.values.some(v => Object.is(v, scrutinee)
        || (v !== null && v !== undefined
            && scrutinee !== null && scrutinee !== undefined
            && v === scrutinee));
    case 'default':
      return true;
  }
}

export function valuePattern(value: unknown): ValuePattern {
  return { type: 'value', value };
}

export function structuralPattern(fields: Record<string, unknown>): StructuralPattern {
  return { type: 'structural', fields: { ...fields } };
}

export function anyOfPattern(values: unknown[]): AnyOfPattern {
  return { type: 'any-of', values: [...values] };
}

export function defaultPattern(): DefaultPattern {
  return { type: 'default' };
}
