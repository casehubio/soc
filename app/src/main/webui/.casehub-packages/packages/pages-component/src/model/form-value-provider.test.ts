import { describe, it, expect } from "vitest";
import { isFormValueProvider } from "./form-value-provider.js";

describe("isFormValueProvider", () => {
  it("returns true for object with currentValue and validate()", () => {
    const obj = {
      currentValue: "hello",
      value: "hello",
      error: undefined,
      validate: () => true,
    };
    expect(isFormValueProvider(obj)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isFormValueProvider(null)).toBe(false);
  });

  it("returns false for plain object without protocol methods", () => {
    const obj = { tagName: "DIV", innerHTML: "" };
    expect(isFormValueProvider(obj)).toBe(false);
  });

  it("returns false for object with currentValue but no validate", () => {
    const obj = { currentValue: "hello", value: "hello", error: undefined };
    expect(isFormValueProvider(obj)).toBe(false);
  });

  it("returns false for object where validate is not a function", () => {
    const obj = { currentValue: "hello", validate: "not-a-function" };
    expect(isFormValueProvider(obj)).toBe(false);
  });
});
