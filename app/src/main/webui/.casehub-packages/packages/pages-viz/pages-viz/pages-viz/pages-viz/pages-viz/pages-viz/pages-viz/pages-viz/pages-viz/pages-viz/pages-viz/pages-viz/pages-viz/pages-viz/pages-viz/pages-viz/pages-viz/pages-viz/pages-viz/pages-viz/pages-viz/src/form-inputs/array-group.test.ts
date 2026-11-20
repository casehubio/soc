import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { PagesArrayGroup } from "./PagesArrayGroup.js";
import "./PagesArrayGroup.js";
import "./PagesObjectGroup.js";

describe("PagesArrayGroup", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("renders items from value array (primitives)", async () => {
    const el = document.createElement("pages-array-group") as PagesArrayGroup;
    el.schema = { type: "array", items: { type: "string" } };
    el.label = "Tags";
    el.fieldName = "tags";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;
    el.value = ["alpha", "beta"];
    await el.updateComplete;

    const inputs = el.shadowRoot!.querySelectorAll("pages-input");
    expect(inputs.length).toBe(2);
    expect((inputs[0] as any).value).toBe("alpha");
    expect((inputs[1] as any).value).toBe("beta");
  });

  it("add button creates new item", async () => {
    const el = document.createElement("pages-array-group") as PagesArrayGroup;
    el.schema = { type: "array", items: { type: "string" } };
    el.label = "Tags";
    el.fieldName = "tags";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;
    el.value = ["alpha"];
    await el.updateComplete;

    const addBtn = el.shadowRoot!.querySelector(".array-add") as HTMLButtonElement;
    addBtn.click();
    await el.updateComplete;

    const inputs = el.shadowRoot!.querySelectorAll("pages-input");
    expect(inputs.length).toBe(2);
  });

  it("remove button deletes item", async () => {
    const el = document.createElement("pages-array-group") as PagesArrayGroup;
    el.schema = { type: "array", items: { type: "string" } };
    el.label = "Tags";
    el.fieldName = "tags";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;
    el.value = ["alpha", "beta"];
    await el.updateComplete;

    const removeBtns = el.shadowRoot!.querySelectorAll("[aria-label='Remove item']") as NodeListOf<HTMLButtonElement>;
    removeBtns[0]!.click();
    await el.updateComplete;

    const inputs = el.shadowRoot!.querySelectorAll("pages-input");
    expect(inputs.length).toBe(1);
    expect((inputs[0] as any).value).toBe("beta");
  });

  it("currentValue returns items in display order", async () => {
    const el = document.createElement("pages-array-group") as PagesArrayGroup;
    el.schema = { type: "array", items: { type: "string" } };
    el.label = "Tags";
    el.fieldName = "tags";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;
    el.value = ["alpha", "beta", "gamma"];
    await el.updateComplete;

    expect(el.currentValue).toEqual(["alpha", "beta", "gamma"]);
  });

  it("validates minItems", async () => {
    const el = document.createElement("pages-array-group") as PagesArrayGroup;
    el.schema = { type: "array", items: { type: "string" }, minItems: 2 };
    el.label = "Tags";
    el.fieldName = "tags";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;
    el.value = ["alpha"];
    await el.updateComplete;

    expect(el.validate()).toBe(false);
    expect(el.error).toContain("2");
  });

  it("validates maxItems", async () => {
    const el = document.createElement("pages-array-group") as PagesArrayGroup;
    el.schema = { type: "array", items: { type: "string" }, maxItems: 2 };
    el.label = "Tags";
    el.fieldName = "tags";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;
    el.value = ["a", "b", "c"];
    await el.updateComplete;

    expect(el.validate()).toBe(false);
    expect(el.error).toContain("2");
  });

  it("add disabled at maxItems", async () => {
    const el = document.createElement("pages-array-group") as PagesArrayGroup;
    el.schema = { type: "array", items: { type: "string" }, maxItems: 2 };
    el.label = "Tags";
    el.fieldName = "tags";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;
    el.value = ["a", "b"];
    await el.updateComplete;

    const addBtn = el.shadowRoot!.querySelector(".array-add") as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);
  });

  it("remove disabled at minItems", async () => {
    const el = document.createElement("pages-array-group") as PagesArrayGroup;
    el.schema = { type: "array", items: { type: "string" }, minItems: 1 };
    el.label = "Tags";
    el.fieldName = "tags";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;
    el.value = ["alpha"];
    await el.updateComplete;

    const removeBtns = el.shadowRoot!.querySelectorAll("[aria-label='Remove item']") as NodeListOf<HTMLButtonElement>;
    expect(removeBtns[0]!.disabled).toBe(true);
  });

  it("renders array of objects with pages-object-group per item", async () => {
    const el = document.createElement("pages-array-group") as PagesArrayGroup;
    el.schema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          street: { type: "string" },
          city: { type: "string" },
        },
      },
    };
    el.label = "Addresses";
    el.fieldName = "addresses";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;
    el.value = [{ street: "123 Main", city: "NYC" }];
    await el.updateComplete;

    const objectGroups = el.shadowRoot!.querySelectorAll("pages-object-group");
    expect(objectGroups.length).toBe(1);
  });

  it("reorder moves item up", async () => {
    const el = document.createElement("pages-array-group") as PagesArrayGroup;
    el.schema = { type: "array", items: { type: "string" } };
    el.label = "Tags";
    el.fieldName = "tags";
    el.editable = true;
    container.appendChild(el);
    await el.updateComplete;
    el.value = ["alpha", "beta", "gamma"];
    await el.updateComplete;

    const upBtns = el.shadowRoot!.querySelectorAll("[aria-label='Move up']") as NodeListOf<HTMLButtonElement>;
    upBtns[1]!.click(); // move "beta" up
    await el.updateComplete;

    expect(el.currentValue).toEqual(["beta", "alpha", "gamma"]);
  });
});
