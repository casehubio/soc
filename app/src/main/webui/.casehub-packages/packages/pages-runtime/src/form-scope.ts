import { validateField, readFieldValue, setFieldError, isFormValueProvider } from "@casehubio/pages-component";
import type { FieldSchema } from "@casehubio/pages-component";

interface RegisteredField {
  element: HTMLElement;
  field: string;
  componentType: string;
}

export class FormScopeState {
  readonly fields = new Map<string, RegisteredField>();

  constructor(
    readonly schema: FieldSchema | undefined,
    readonly validateOnBlur: boolean,
  ) {}

  registerField(field: string, element: HTMLElement, componentType: string): void {
    this.fields.set(field, { element, field, componentType });
  }

  hasField(field: string): boolean {
    return this.fields.has(field);
  }

  private pruneDisconnected(): void {
    for (const [key, entry] of this.fields) {
      if (!entry.element.isConnected) {
        this.fields.delete(key);
      }
    }
  }

  collectValues(): Record<string, unknown> {
    this.pruneDisconnected();
    const values: Record<string, unknown> = {};
    for (const [field, entry] of this.fields) {
      values[field] = readFieldValue(entry.element, entry.componentType);
    }
    return values;
  }

  validateAll(): Record<string, string> {
    this.pruneDisconnected();
    const requiredSet = new Set(this.schema?.required ?? []);
    const errors: Record<string, string> = {};

    for (const [field, entry] of this.fields) {
      if (isFormValueProvider(entry.element)) {
        if (!entry.element.validate()) {
          errors[field] = entry.element.error ?? "Validation failed";
        }
      } else {
        if (!this.schema?.properties) continue;
        const fieldSchema = this.schema.properties[field];
        if (!fieldSchema) continue;
        const value = readFieldValue(entry.element, entry.componentType);
        const error = validateField(fieldSchema, value, requiredSet.has(field));
        if (error) {
          errors[field] = error;
          setFieldError(entry.element, entry.componentType, error);
        } else {
          setFieldError(entry.element, entry.componentType, undefined);
        }
      }
    }
    return errors;
  }

  validateField(field: string, value: unknown): void {
    if (!this.schema?.properties) return;
    const fieldSchema = this.schema.properties[field];
    if (!fieldSchema) return;
    const entry = this.fields.get(field);
    if (!entry) return;
    const requiredSet = new Set(this.schema.required ?? []);
    const error = validateField(fieldSchema, value, requiredSet.has(field));
    setFieldError(entry.element, entry.componentType, error ?? undefined);
  }
}

export const FormScopeRegistry = new WeakMap<HTMLElement, FormScopeState>();
