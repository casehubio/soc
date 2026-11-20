import { parse as parseYaml } from 'yaml';
import { expand } from '@casehubio/yaml-core/expand';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ValidateOptions {
  expectedKeys?: string[];
  expectedStructure?: Record<string, unknown>;
}

export function validateYamlStep(yaml: string, options: ValidateOptions): ValidationResult {
  const errors: string[] = [];

  let parsed: Record<string, unknown>;
  try {
    const result = parseYaml(yaml);
    if (!result || typeof result !== 'object') {
      return { valid: false, errors: ['YAML must produce an object'] };
    }
    parsed = result as Record<string, unknown>;
  } catch (e) {
    return { valid: false, errors: [e instanceof Error ? e.message : 'Invalid YAML syntax'] };
  }

  if (options.expectedKeys) {
    for (const key of options.expectedKeys) {
      if (!(key in parsed)) {
        errors.push(`Missing expected key: ${key}`);
      }
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  const expandResult = expand(parsed, { strict: false });
  if (expandResult.diagnostics.length > 0) {
    for (const d of expandResult.diagnostics) {
      errors.push(d.message);
    }
  }

  if (options.expectedStructure && errors.length === 0) {
    if (!deepSubsetMatch(expandResult.map, options.expectedStructure)) {
      errors.push('Expanded result does not match expected structure');
    }
  }

  return { valid: errors.length === 0, errors };
}

function deepSubsetMatch(actual: unknown, pattern: unknown): boolean {
  if (pattern === null || pattern === undefined) return true;

  if (typeof pattern !== 'object') {
    return actual === pattern;
  }

  if (Array.isArray(pattern)) {
    if (!Array.isArray(actual)) return false;
    const available = [...actual];
    for (const patternItem of pattern) {
      const idx = available.findIndex(a => deepSubsetMatch(a, patternItem));
      if (idx < 0) return false;
      available.splice(idx, 1);
    }
    return true;
  }

  if (typeof actual !== 'object' || actual === null || Array.isArray(actual)) return false;
  const actualObj = actual as Record<string, unknown>;
  const patternObj = pattern as Record<string, unknown>;
  for (const [key, value] of Object.entries(patternObj)) {
    if (!(key in actualObj)) return false;
    if (!deepSubsetMatch(actualObj[key], value)) return false;
  }
  return true;
}
