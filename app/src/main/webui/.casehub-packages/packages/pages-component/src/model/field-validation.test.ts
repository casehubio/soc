import { describe, it, expect } from "vitest";
import { validateField } from "./field-validation.js";
import type { FieldSchema } from "./form-input-types.js";

describe("validateField", () => {
  it("returns Required for empty required field", () => {
    const schema: FieldSchema = { type: "string" };
    expect(validateField(schema, "", true)).toBe("Required");
  });

  it("returns null for empty optional field", () => {
    const schema: FieldSchema = { type: "string" };
    expect(validateField(schema, "", false)).toBeNull();
  });

  it("validates minLength", () => {
    const schema: FieldSchema = { type: "string", minLength: 3 };
    expect(validateField(schema, "ab", false)).toBe("Must be at least 3 characters");
    expect(validateField(schema, "abc", false)).toBeNull();
  });

  it("validates maximum", () => {
    const schema: FieldSchema = { type: "number", maximum: 100 };
    expect(validateField(schema, 101, false)).toBe("Must be at most 100");
    expect(validateField(schema, 100, false)).toBeNull();
  });

  it("validates pattern", () => {
    const schema: FieldSchema = { type: "string", pattern: "^[A-Z]+$" };
    expect(validateField(schema, "abc", false)).toBe("Invalid format");
    expect(validateField(schema, "ABC", false)).toBeNull();
  });

  it("returns null for null/undefined values when not required", () => {
    const schema: FieldSchema = { type: "string" };
    expect(validateField(schema, null, false)).toBeNull();
    expect(validateField(schema, undefined, false)).toBeNull();
  });

  it("validates minimum for numbers", () => {
    const schema: FieldSchema = { type: "number", minimum: 0 };
    expect(validateField(schema, -1, false)).toBe("Must be at least 0");
    expect(validateField(schema, 0, false)).toBeNull();
  });

  it("validates maxLength", () => {
    const schema: FieldSchema = { type: "string", maxLength: 5 };
    expect(validateField(schema, "toolong", false)).toBe("Must be at most 5 characters");
    expect(validateField(schema, "ok", false)).toBeNull();
  });
});
