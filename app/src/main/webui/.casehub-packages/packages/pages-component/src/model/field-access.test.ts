import { describe, it, expect } from "vitest";
import { readFieldValue, setFieldError, STANDALONE_TYPES } from "./field-access.js";

describe("STANDALONE_TYPES", () => {
  it("contains all standalone component types", () => {
    expect(STANDALONE_TYPES.has("input")).toBe(true);
    expect(STANDALONE_TYPES.has("select")).toBe(true);
    expect(STANDALONE_TYPES.has("textarea")).toBe(true);
    expect(STANDALONE_TYPES.has("checkbox")).toBe(true);
    expect(STANDALONE_TYPES.has("number-input")).toBe(true);
    expect(STANDALONE_TYPES.has("date-input")).toBe(true);
    expect(STANDALONE_TYPES.has("datetime-input")).toBe(true);
    expect(STANDALONE_TYPES.size).toBe(7);
  });
});

describe("readFieldValue", () => {
  it("reads .checked for checkbox type", () => {
    const el = { checked: true } as unknown as HTMLElement;
    expect(readFieldValue(el, "checkbox")).toBe(true);
  });

  it("reads .value for standalone input types", () => {
    const el = { value: "hello" } as unknown as HTMLElement;
    expect(readFieldValue(el, "input")).toBe("hello");
  });

  it("reads .value for standalone select types", () => {
    const el = { value: "opt1" } as unknown as HTMLElement;
    expect(readFieldValue(el, "select")).toBe("opt1");
  });

  it("reads .value for standalone number-input", () => {
    const el = { value: 42 } as unknown as HTMLElement;
    expect(readFieldValue(el, "number-input")).toBe(42);
  });

  it("reads .currentValue for non-standalone types", () => {
    const el = { currentValue: 42 } as unknown as HTMLElement;
    expect(readFieldValue(el, "custom-widget")).toBe(42);
  });

  it("falls back to .value when .currentValue absent", () => {
    const el = { value: "fallback" } as unknown as HTMLElement;
    expect(readFieldValue(el, "custom-widget")).toBe("fallback");
  });
});

describe("setFieldError", () => {
  it("sets .error for standalone types", () => {
    const el = {} as any;
    setFieldError(el, "input", "Required");
    expect(el.error).toBe("Required");
  });

  it("sets .error for standalone number-input", () => {
    const el = {} as any;
    setFieldError(el, "number-input", "Too low");
    expect(el.error).toBe("Too low");
  });

  it("sets .errorMessage for non-standalone types with errorMessage", () => {
    const el = { errorMessage: "" } as any;
    setFieldError(el, "custom-widget", "Too low");
    expect(el.errorMessage).toBe("Too low");
  });

  it("falls back to .error for non-standalone types without errorMessage", () => {
    const el = {} as any;
    setFieldError(el, "custom-widget", "Bad value");
    expect(el.error).toBe("Bad value");
  });

  it("clears error with undefined", () => {
    const el = { error: "old" } as any;
    setFieldError(el, "input", undefined);
    expect(el.error).toBeUndefined();
  });
});
