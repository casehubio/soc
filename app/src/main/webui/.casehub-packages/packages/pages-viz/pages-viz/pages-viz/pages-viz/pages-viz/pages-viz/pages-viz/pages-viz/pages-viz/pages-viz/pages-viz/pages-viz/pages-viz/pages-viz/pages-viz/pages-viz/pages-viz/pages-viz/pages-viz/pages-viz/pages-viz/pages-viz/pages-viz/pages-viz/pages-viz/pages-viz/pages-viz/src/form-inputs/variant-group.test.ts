import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { PagesVariantGroup } from "./PagesVariantGroup.js";
import "./PagesVariantGroup.js";

describe("PagesVariantGroup", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  const contactSchema = {
    oneOf: [
      {
        properties: {
          method: { const: "email" },
          address: { type: "string" as const },
        },
        required: ["method", "address"] as readonly string[],
      },
      {
        properties: {
          method: { const: "phone" },
          number: { type: "string" as const },
        },
        required: ["method", "number"] as readonly string[],
      },
    ],
  };

  it("auto-detects discriminator from const values", async () => {
    const el = document.createElement("pages-variant-group") as PagesVariantGroup;
    el.schema = contactSchema;
    el.label = "Contact";
    el.fieldName = "contact";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector("pages-select");
    expect(select).not.toBeNull();
  });

  it("renders active variant fields (excluding discriminator)", async () => {
    const el = document.createElement("pages-variant-group") as PagesVariantGroup;
    el.schema = contactSchema;
    el.label = "Contact";
    el.fieldName = "contact";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    const inputs = el.shadowRoot!.querySelectorAll("pages-input");
    expect(inputs.length).toBe(1);
  });

  it("currentValue includes discriminator value", async () => {
    const el = document.createElement("pages-variant-group") as PagesVariantGroup;
    el.schema = contactSchema;
    el.label = "Contact";
    el.fieldName = "contact";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector("pages-input") as any;
    input.value = "jane@example.com";

    const value = el.currentValue as Record<string, unknown>;
    expect(value.method).toBe("email");
    expect(value.address).toBe("jane@example.com");
  });

  it("validates only active variant", async () => {
    const el = document.createElement("pages-variant-group") as PagesVariantGroup;
    el.schema = contactSchema;
    el.label = "Contact";
    el.fieldName = "contact";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    expect(el.validate()).toBe(false);
  });

  it("logs error for undiscriminated oneOf", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const el = document.createElement("pages-variant-group") as PagesVariantGroup;
    el.schema = {
      oneOf: [
        { properties: { a: { type: "string" } } },
        { properties: { b: { type: "number" } } },
      ],
    };
    el.label = "Thing";
    el.fieldName = "thing";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("no discriminator"));
    consoleSpy.mockRestore();
  });
});
