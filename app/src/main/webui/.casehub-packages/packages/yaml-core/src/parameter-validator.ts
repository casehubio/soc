import type { ParameterType, YamlModuleParameter } from './types.js';
import { isTruthy } from './truthiness.js';

export interface ParameterViolation {
  parameterName: string;
  constraint: string;
  message: string;
  actualValue: unknown;
  technicalDetail: string;
}

export class ParameterValidationError extends Error {
  constructor(public readonly violations: ParameterViolation[]) {
    super(
      `Parameter validation failed with ${violations.length} violation(s): ` +
      violations.map((v) => `${v.parameterName} (${v.constraint})`).join(', '),
    );
    this.name = 'ParameterValidationError';
  }
}

interface ParsedValue {
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array';
  raw: unknown;
}

function parseValue(type: ParameterType, value: string): ParsedValue {
  switch (type) {
    case 'STRING':
      return { type: 'string', raw: value };
    case 'ARRAY':
      return {
        type: 'array',
        raw: value.split(',').map((s) => s.trim()),
      };
    case 'INTEGER': {
      const n = parseInt(value, 10);
      if (isNaN(n) || String(n) !== value.trim()) {
        throw new Error(`Expected INTEGER, got '${value}'`);
      }
      return { type: 'integer', raw: n };
    }
    case 'NUMBER': {
      const n = parseFloat(value);
      if (isNaN(n)) {
        throw new Error(`Expected NUMBER, got '${value}'`);
      }
      return { type: 'number', raw: n };
    }
    case 'BOOLEAN': {
      return { type: 'boolean', raw: isTruthy(value) };
    }
    case 'OBJECT':
      throw new Error(`Cannot parse OBJECT from a raw string value '${value}'`);
  }
}

function numericValue(parsed: ParsedValue): number {
  if (parsed.type === 'integer' || parsed.type === 'number') {
    return parsed.raw as number;
  }
  return NaN;
}

function lengthOf(param: YamlModuleParameter, rawValue: string, parsed: ParsedValue): number {
  if (parsed.type === 'array') return (parsed.raw as string[]).length;
  return rawValue.length;
}

function createViolation(
  name: string, constraint: string, technicalMessage: string,
  actualValue: unknown, constraintDescription: string | undefined,
): ParameterViolation {
  if (constraintDescription) {
    return {
      parameterName: name, constraint,
      message: constraintDescription,
      actualValue, technicalDetail: technicalMessage,
    };
  }
  return {
    parameterName: name, constraint,
    message: technicalMessage,
    actualValue, technicalDetail: technicalMessage,
  };
}

function validateConstraints(
  name: string, param: YamlModuleParameter, rawValue: string,
  parsed: ParsedValue, violations: ParameterViolation[],
): void {
  if (param.minLength !== undefined) {
    const length = lengthOf(param, rawValue, parsed);
    if (length < param.minLength) {
      violations.push(createViolation(name, 'minLength',
        `Parameter '${name}': length ${length} is less than minimum ${param.minLength}.`,
        rawValue, param.constraintDescription));
    }
  }

  if (param.maxLength !== undefined) {
    const length = lengthOf(param, rawValue, parsed);
    if (length > param.maxLength) {
      violations.push(createViolation(name, 'maxLength',
        `Parameter '${name}': length ${length} exceeds maximum ${param.maxLength}.`,
        rawValue, param.constraintDescription));
    }
  }

  if (param.pattern !== undefined) {
    if (parsed.type === 'array') {
      for (const item of parsed.raw as string[]) {
        if (!new RegExp(param.pattern).test(item)) {
          violations.push(createViolation(name, 'pattern',
            `Parameter '${name}': element '${item}' does not match pattern '${param.pattern}'.`,
            rawValue, param.constraintDescription));
        }
      }
    } else {
      if (!new RegExp(param.pattern).test(rawValue)) {
        violations.push(createViolation(name, 'pattern',
          `Parameter '${name}': value '${rawValue}' does not match pattern '${param.pattern}'.`,
          rawValue, param.constraintDescription));
      }
    }
  }

  if (param.minimum !== undefined) {
    const num = numericValue(parsed);
    if (!isNaN(num) && num < param.minimum) {
      violations.push(createViolation(name, 'minimum',
        `Parameter '${name}': value ${rawValue} is less than minimum ${param.minimum}.`,
        rawValue, param.constraintDescription));
    }
  }

  if (param.maximum !== undefined) {
    const num = numericValue(parsed);
    if (!isNaN(num) && num > param.maximum) {
      violations.push(createViolation(name, 'maximum',
        `Parameter '${name}': value ${rawValue} exceeds maximum ${param.maximum}.`,
        rawValue, param.constraintDescription));
    }
  }

  if (param.allowedValues && param.allowedValues.length > 0) {
    let matches = param.allowedValues.includes(rawValue);
    if (!matches) {
      let canonical: string | undefined;
      if (parsed.type === 'integer') canonical = String(parsed.raw);
      else if (parsed.type === 'number') canonical = String(parsed.raw);
      else if (parsed.type === 'boolean') canonical = String(parsed.raw);
      if (canonical !== undefined) {
        matches = param.allowedValues.includes(canonical);
      }
    }
    if (!matches) {
      violations.push(createViolation(name, 'allowedValues',
        `Parameter '${name}': value '${rawValue}' is not one of ${JSON.stringify(param.allowedValues)}.`,
        rawValue, param.constraintDescription));
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Preserve the published static facade.
export class ParameterValidator {
  static validate(
    declared: Record<string, YamlModuleParameter>,
    provided: Record<string, string>,
  ): ParameterViolation[] {
    const violations: ParameterViolation[] = [];

    for (const key of Object.keys(provided)) {
      if (!(key in declared)) {
        violations.push(createViolation(key, 'unknown',
          `Parameter '${key}' is not declared. Available: ${Object.keys(declared).join(', ')}`,
          provided[key], undefined));
      }
    }

    for (const [name, param] of Object.entries(declared)) {
      const value = provided[name];

      if (value === undefined) {
        if (param.required && param.defaultValue === undefined) {
          violations.push(createViolation(name, 'required',
            `Required parameter '${name}' is missing.`, null,
            param.constraintDescription));
        }
        continue;
      }

      let parsed: ParsedValue;
      try {
        parsed = parseValue(param.type, value);
      } catch {
        violations.push(createViolation(name, 'type',
          `Parameter '${name}': expected ${param.type}, got '${value}'.`,
          value, param.constraintDescription));
        continue;
      }

      validateConstraints(name, param, value, parsed, violations);
    }

    return violations;
  }

  static validateOrThrow(
    declared: Record<string, YamlModuleParameter>,
    provided: Record<string, string>,
  ): void {
    const violations = ParameterValidator.validate(declared, provided);
    if (violations.length > 0) {
      throw new ParameterValidationError(violations);
    }
  }
}
