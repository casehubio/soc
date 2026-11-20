import { describe, it, expect } from "vitest";
import { FormScopeState } from "./form-scope.js";

describe("FormScopeState", () => {
  it("registers a field", () => {
    const state = new FormScopeState(undefined, false);
    const el = document.createElement("input");
    state.registerField("name", el, "input");
    expect(state.hasField("name")).toBe(true);
  });

  it("collects values from registered fields", () => {
    const state = new FormScopeState(undefined, false);
    const el = document.createElement("input");
    document.body.appendChild(el);
    el.value = "Alice";
    state.registerField("name", el, "input");
    const values = state.collectValues();
    expect(values).toEqual({ name: "Alice" });
    el.remove();
  });

  it("prunes disconnected fields on collectValues", () => {
    const state = new FormScopeState(undefined, false);
    const el = document.createElement("input");
    state.registerField("name", el, "input");
    expect(state.hasField("name")).toBe(true);

    const values = state.collectValues();
    expect(values).toEqual({});
    expect(state.hasField("name")).toBe(false);
  });

  it("validates all fields against schema", () => {
    const schema = {
      properties: { name: { type: "string" as const, minLength: 1 } },
      required: ["name"],
    };
    const state = new FormScopeState(schema, false);
    const el = document.createElement("input");
    document.body.appendChild(el);
    el.value = "";
    state.registerField("name", el, "input");
    const errors = state.validateAll();
    expect(errors).toEqual({ name: "Required" });
    el.remove();
  });

  it("returns empty errors when no schema", () => {
    const state = new FormScopeState(undefined, false);
    const el = document.createElement("input");
    document.body.appendChild(el);
    el.value = "";
    state.registerField("name", el, "input");
    const errors = state.validateAll();
    expect(errors).toEqual({});
    el.remove();
  });

  it("validates single field on blur", () => {
    const schema = {
      properties: { name: { type: "string" as const, minLength: 3 } },
      required: ["name"],
    };
    const state = new FormScopeState(schema, true);
    const el = { value: "ab", error: undefined } as any;
    (el).isConnected = true;
    state.registerField("name", el as HTMLElement, "input");
    state.validateField("name", "ab");
    expect(el.error).toBe("Must be at least 3 characters");
  });

  it("clears error on valid field", () => {
    const schema = {
      properties: { name: { type: "string" as const, minLength: 3 } },
    };
    const state = new FormScopeState(schema, true);
    const el = { value: "abc", error: "old error" } as any;
    (el).isConnected = true;
    state.registerField("name", el as HTMLElement, "input");
    state.validateField("name", "abc");
    expect(el.error).toBeUndefined();
  });
});

describe("FormScopeState — composite validation", () => {
  it("calls validate() on FormValueProvider-conformant elements", () => {
    const schema = {
      properties: {
        address: {
          type: "object" as const,
          properties: { street: { type: "string" as const } },
          required: ["street"] as readonly string[],
        },
      },
    };
    const state = new FormScopeState(schema, false);

    let validateCalled = false;
    const mockComposite = {
      currentValue: { street: "" },
      value: {},
      error: "Required" as string | undefined,
      validate: () => { validateCalled = true; return false; },
      isConnected: true,
    } as unknown as HTMLElement;

    state.registerField("address", mockComposite, "object-group");
    const errors = state.validateAll();

    expect(validateCalled).toBe(true);
    expect(errors.address).toBeDefined();
  });

  it("uses validateField for non-FormValueProvider elements", () => {
    const schema = {
      properties: { name: { type: "string" as const } },
      required: ["name"] as readonly string[],
    };
    const state = new FormScopeState(schema, false);

    const mockInput = {
      value: "",
      isConnected: true,
    } as unknown as HTMLElement;

    state.registerField("name", mockInput, "input");
    const errors = state.validateAll();

    expect(errors.name).toBeDefined();
  });
});
