import type { Parameter } from './types.js';
import { validateParamValue, isScalarParam } from '../types.js';

export interface Violation {
  parameterName: string;
  constraint: string;
  message: string;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Validator {
  static validateInputs(
    actionName: string,
    params: Record<string, unknown>,
    definition: { inputs: Record<string, Parameter> },
  ): Violation[] {
    return Validator.validateParams(actionName, params, definition.inputs, 'input');
  }

  static validateOutputs(
    outputs: Record<string, unknown>,
    definition: { outputs: Record<string, Parameter> },
  ): Violation[] {
    return Validator.validateParams('output', outputs, definition.outputs, 'output');
  }

  private static validateParams(
    context: string,
    values: Record<string, unknown>,
    declarations: Record<string, Parameter>,
    direction: string,
  ): Violation[] {
    const violations: Violation[] = [];

    for (const [name, param] of Object.entries(declarations)) {
      const value = values[name];
      if (value === undefined || value === null) {
        if (param.required && param.defaultValue === undefined) {
          violations.push({ parameterName: name, constraint: 'required', message: `Required ${direction} '${name}' is missing` });
        }
        continue;
      }
      if (!validateParamValue(param.type, value)) {
        violations.push({ parameterName: name, constraint: 'type', message: `${direction} '${name}' expected ${param.type} but got ${typeof value}` });
      }
      if (param.allowedValues && param.allowedValues.length > 0) {
        const canonical = isScalarParam(param.type) ? String(value) : value;
        if (!param.allowedValues.some(a => a === canonical || a === String(canonical))) {
          violations.push({ parameterName: name, constraint: 'allowedValues', message: `${direction} '${name}' value '${value}' not in allowed values: ${param.allowedValues.join(', ')}` });
        }
      }
      if (param.format && typeof value === 'string') {
        if (!Validator.validateFormat(value, param.format)) {
          violations.push({ parameterName: name, constraint: 'format', message: `${direction} '${name}' does not match format '${param.format}'` });
        }
      }
    }
    return violations;
  }

  private static validateFormat(value: string, format: string): boolean {
    switch (format) {
      case 'date': return /^\d{4}-\d{2}-\d{2}$/.test(value);
      case 'date-time': return !isNaN(Date.parse(value));
      case 'uri': { try { new URL(value); return true; } catch { return false; } }
      default: return true;
    }
  }
}
