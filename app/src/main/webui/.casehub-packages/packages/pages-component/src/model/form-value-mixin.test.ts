import { describe, it, expect } from "vitest";
import { LitElement } from "lit";
import { FormValueMixin } from "./form-value-mixin.js";
import { isFormValueProvider } from "./form-value-provider.js";

class TestComposite extends FormValueMixin(LitElement) {
  private _collected: unknown = "test-value";
  private _propagated: unknown = undefined;
  private _selfValid = true;
  private _childrenValid = true;

  setCollected(v: unknown) { this._collected = v; }
  setSelfValid(v: boolean) { this._selfValid = v; }
  setChildrenValid(v: boolean) { this._childrenValid = v; }
  getPropagated(): unknown { return this._propagated; }

  protected collectValue(): unknown { return this._collected; }
  protected propagateValue(v: unknown): void { this._propagated = v; }
  protected validateSelf(): boolean {
    if (!this._selfValid) { this.error = "Self invalid"; }
    return this._selfValid;
  }
  protected validateChildren(): boolean { return this._childrenValid; }
}
customElements.define("test-composite", TestComposite);

describe("FormValueMixin", () => {
  it("satisfies isFormValueProvider", () => {
    const el = new TestComposite();
    expect(isFormValueProvider(el)).toBe(true);
  });

  it("currentValue delegates to collectValue", () => {
    const el = new TestComposite();
    el.setCollected({ name: "Jane" });
    expect(el.currentValue).toEqual({ name: "Jane" });
  });

  it("setting value delegates to propagateValue", () => {
    const el = new TestComposite();
    el.value = { name: "Jane" };
    expect(el.getPropagated()).toEqual({ name: "Jane" });
    expect(el.value).toEqual({ name: "Jane" });
  });

  it("validate returns true when both self and children valid", () => {
    const el = new TestComposite();
    expect(el.validate()).toBe(true);
    expect(el.error).toBeUndefined();
  });

  it("validate returns false when self invalid", () => {
    const el = new TestComposite();
    el.setSelfValid(false);
    expect(el.validate()).toBe(false);
    expect(el.error).toBe("Self invalid");
  });

  it("validate returns false when children invalid", () => {
    const el = new TestComposite();
    el.setChildrenValid(false);
    expect(el.validate()).toBe(false);
  });

  it("error getter/setter works", () => {
    const el = new TestComposite();
    expect(el.error).toBeUndefined();
    el.error = "Something wrong";
    expect(el.error).toBe("Something wrong");
    el.error = undefined;
    expect(el.error).toBeUndefined();
  });
});
