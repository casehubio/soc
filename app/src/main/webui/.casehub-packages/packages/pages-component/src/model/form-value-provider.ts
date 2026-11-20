export interface FormValueProvider {
  readonly currentValue: unknown;
  value: unknown;
  error: string | undefined;
  validate(): boolean;
}

export function isFormValueProvider(el: unknown): el is FormValueProvider {
  return el != null
    && typeof el === "object"
    && "currentValue" in el
    && "validate" in el
    && typeof (el as any).validate === "function";
}
