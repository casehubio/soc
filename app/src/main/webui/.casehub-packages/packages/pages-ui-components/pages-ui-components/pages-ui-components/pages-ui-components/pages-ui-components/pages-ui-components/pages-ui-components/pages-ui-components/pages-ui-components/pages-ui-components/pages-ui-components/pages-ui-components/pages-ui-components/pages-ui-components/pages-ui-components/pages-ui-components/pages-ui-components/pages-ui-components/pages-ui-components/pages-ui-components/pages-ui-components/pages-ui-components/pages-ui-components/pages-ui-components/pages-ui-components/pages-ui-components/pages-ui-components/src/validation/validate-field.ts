import type { FieldSchema } from '@casehubio/pages-component';

export function validateField(
  schema: FieldSchema,
  value: unknown,
  required: boolean,
): string | null {
  const isEmpty =
    value === null || value === undefined || value === '';

  if (required && isEmpty) return 'Required';
  if (isEmpty) return null;

  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) {
      return `Must be at least ${schema.minLength} characters`;
    }
    if (schema.maxLength != null && value.length > schema.maxLength) {
      return `Must be at most ${schema.maxLength} characters`;
    }
    if (schema.pattern != null) {
      const re = new RegExp(schema.pattern);
      if (!re.test(value)) return 'Invalid format';
    }
    if (schema.enum != null && !schema.enum.includes(value)) {
      return `Must be one of: ${schema.enum.join(', ')}`;
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) {
      return `Must be at least ${schema.minimum}`;
    }
    if (schema.maximum != null && value > schema.maximum) {
      return `Must be at most ${schema.maximum}`;
    }
    if (schema.exclusiveMinimum != null && value <= schema.exclusiveMinimum) {
      return `Must be greater than ${schema.exclusiveMinimum}`;
    }
    if (schema.exclusiveMaximum != null && value >= schema.exclusiveMaximum) {
      return `Must be less than ${schema.exclusiveMaximum}`;
    }
    if (schema.multipleOf != null && Math.abs(Math.round(value / schema.multipleOf) - value / schema.multipleOf) > 1e-9) {
      return `Must be a multiple of ${schema.multipleOf}`;
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) {
      return `Must have at least ${schema.minItems} items`;
    }
    if (schema.maxItems != null && value.length > schema.maxItems) {
      return `Must have at most ${schema.maxItems} items`;
    }
  }

  return null;
}
