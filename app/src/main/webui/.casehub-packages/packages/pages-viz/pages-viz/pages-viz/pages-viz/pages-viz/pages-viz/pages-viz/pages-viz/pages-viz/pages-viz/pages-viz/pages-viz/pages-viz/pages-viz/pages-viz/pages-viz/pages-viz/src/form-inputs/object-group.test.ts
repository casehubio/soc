import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { PagesObjectGroup } from "./PagesObjectGroup.js";
import "./PagesObjectGroup.js";

describe("PagesObjectGroup", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("renders fieldset with legend from label", async () => {
    const el = document.createElement("pages-object-group") as PagesObjectGroup;
    el.schema = { type: "object", properties: { name: { type: "string" } } };
    el.label = "Address";
    el.fieldName = "address";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    const fieldset = el.shadowRoot!.querySelector("fieldset");
    expect(fieldset).not.toBeNull();
    const legend = el.shadowRoot!.querySelector("legend");
    expect(legend!.textContent).toContain("Address");
  });

  it("creates leaf inputs for flat properties", async () => {
    const el = document.createElement("pages-object-group") as PagesObjectGroup;
    el.schema = {
      type: "object",
      properties: {
        street: { type: "string" },
        zip: { type: "string" },
      },
    };
    el.label = "Address";
    el.fieldName = "address";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    const inputs = el.shadowRoot!.querySelectorAll("pages-input");
    expect(inputs.length).toBe(2);
  });

  it("currentValue returns nested record", async () => {
    const el = document.createElement("pages-object-group") as PagesObjectGroup;
    el.schema = {
      type: "object",
      properties: {
        street: { type: "string" },
        city: { type: "string" },
      },
    };
    el.label = "Address";
    el.fieldName = "address";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    const inputs = el.shadowRoot!.querySelectorAll("pages-input");
    (inputs[0] as any).value = "123 Main";
    (inputs[1] as any).value = "NYC";

    const value = el.currentValue as Record<string, unknown>;
    expect(value.street).toBe("123 Main");
    expect(value.city).toBe("NYC");
  });

  it("propagateValue distributes to children", async () => {
    const el = document.createElement("pages-object-group") as PagesObjectGroup;
    el.schema = {
      type: "object",
      properties: {
        street: { type: "string" },
        city: { type: "string" },
      },
    };
    el.label = "Address";
    el.fieldName = "address";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    el.value = { street: "456 Oak", city: "LA" };
    await el.updateComplete;

    const inputs = el.shadowRoot!.querySelectorAll("pages-input");
    expect((inputs[0] as any).value).toBe("456 Oak");
    expect((inputs[1] as any).value).toBe("LA");
  });

  it("validate checks required sub-properties", async () => {
    const el = document.createElement("pages-object-group") as PagesObjectGroup;
    el.schema = {
      type: "object",
      properties: {
        street: { type: "string" },
        city: { type: "string" },
      },
      required: ["street", "city"],
    };
    el.label = "Address";
    el.fieldName = "address";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    expect(el.validate()).toBe(false);
  });

  it("re-emits committed pages-field-change with composite field name", async () => {
    const el = document.createElement("pages-object-group") as PagesObjectGroup;
    el.schema = {
      type: "object",
      properties: { name: { type: "string" } },
    };
    el.label = "Person";
    el.fieldName = "person";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener("pages-field-change", (e) => events.push(e as CustomEvent));

    const input = el.shadowRoot!.querySelector("pages-input")!;
    (input as any).value = "Jane";
    input.dispatchEvent(new CustomEvent("pages-field-change", {
      bubbles: true, composed: true,
      detail: { field: "name", value: "Jane", committed: true },
    }));

    expect(events.length).toBe(1);
    expect(events[0]!.detail.field).toBe("person");
    expect(events[0]!.detail.committed).toBe(true);
    expect(events[0]!.detail.value).toEqual({ name: "Jane" });
  });

  it("does not re-emit uncommitted events", async () => {
    const el = document.createElement("pages-object-group") as PagesObjectGroup;
    el.schema = {
      type: "object",
      properties: { name: { type: "string" } },
    };
    el.label = "Person";
    el.fieldName = "person";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener("pages-field-change", (e) => events.push(e as CustomEvent));

    const input = el.shadowRoot!.querySelector("pages-input")!;
    input.dispatchEvent(new CustomEvent("pages-field-change", {
      bubbles: true, composed: true,
      detail: { field: "name", value: "J", committed: false },
    }));

    expect(events.length).toBe(0);
  });

  it("recursively renders nested object-groups", async () => {
    const el = document.createElement("pages-object-group") as PagesObjectGroup;
    el.schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        coordinates: {
          type: "object",
          properties: {
            lat: { type: "number" },
            lng: { type: "number" },
          },
        },
      },
    };
    el.label = "Location";
    el.fieldName = "location";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;

    const nestedGroup = el.shadowRoot!.querySelector("pages-object-group");
    expect(nestedGroup).not.toBeNull();
    expect((nestedGroup as any).label).toBe("Coordinates");
  });
});
