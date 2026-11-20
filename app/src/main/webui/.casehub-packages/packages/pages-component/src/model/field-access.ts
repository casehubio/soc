export const STANDALONE_TYPES = new Set(["input", "select", "textarea", "checkbox", "number-input", "date-input", "datetime-input"]);

export function readFieldValue(element: HTMLElement, componentType: string): unknown {
  if (componentType === "checkbox") return (element as any).checked;
  if (STANDALONE_TYPES.has(componentType)) return (element as any).value;
  return "currentValue" in element ? (element as any).currentValue : (element as any).value;
}

export function setFieldError(element: HTMLElement, componentType: string, error: string | undefined): void {
  if (STANDALONE_TYPES.has(componentType)) {
    (element as any).error = error;
  } else if ("errorMessage" in element) {
    (element as any).errorMessage = error;
  } else {
    (element as any).error = error;
  }
}
