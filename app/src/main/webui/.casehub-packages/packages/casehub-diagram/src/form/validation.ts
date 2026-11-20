export interface FieldSchema {
  readonly type?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly enum?: readonly string[];
  readonly description?: string;
  readonly [k: string]: unknown;
}

export function validateField(
  schema: FieldSchema,
  value: unknown,
  required: boolean,
): string | null {
  const str = typeof value === 'string' ? value : '';
  const isEmpty = str === '' && typeof value !== 'number' && typeof value !== 'boolean';

  if (required && isEmpty) return 'Required';
  if (isEmpty) return null;

  if ((schema.type === 'integer' || schema.type === 'number') && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      return `Must be at least ${schema.minimum}`;
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      return `Must be at most ${schema.maximum}`;
    }
  }

  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      return `Must be at least ${schema.minLength} characters`;
    }
    if (schema.pattern !== undefined) {
      const re = new RegExp(schema.pattern);
      if (!re.test(value)) return 'Invalid format';
    }
  }

  return null;
}
