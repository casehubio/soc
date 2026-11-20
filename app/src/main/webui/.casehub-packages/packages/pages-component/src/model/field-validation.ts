import type { FieldSchema } from "./form-input-types.js";

export function validateField(
  schema: FieldSchema,
  value: unknown,
  required: boolean,
): string | null {
  if (required && (value === null || value === undefined || value === "")) {
    return "Required";
  }
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    if (schema.pattern != null) {
      const re = new RegExp(schema.pattern);
      if (!re.test(value)) return "Invalid format";
    }
    if (schema.minLength != null && value.length < schema.minLength) {
      return `Must be at least ${schema.minLength} characters`;
    }
    if (schema.maxLength != null && value.length > schema.maxLength) {
      return `Must be at most ${schema.maxLength} characters`;
    }
  }
  if (typeof value === "number") {
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
  }
  return null;
}
