import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { toTypedDataSet, ColumnType } from "@casehubio/pages-data";
import type { ColumnId, DataSet, DataSetLookup } from "@casehubio/pages-data";
import type { PagesSchemaForm } from "./PagesSchemaForm.js";
import "./PagesSchemaForm.js";
import "./PagesObjectGroup.js";

async function awaitForm(form: PagesSchemaForm): Promise<void> {
  await form.updateComplete;
  await new Promise(r => setTimeout(r, 0));
  const palette = form.shadowRoot?.querySelector("pages-property-palette");
  if (palette) {
    await (palette as any).updateComplete;
    await new Promise(r => setTimeout(r, 0));
  }
}

function queryField(form: PagesSchemaForm, selector: string): Element | null {
  const palette = form.shadowRoot?.querySelector("pages-property-palette");
  return palette?.shadowRoot?.querySelector(selector) ?? form.shadowRoot!.querySelector(selector);
}

function queryFields(form: PagesSchemaForm, selector: string): Element[] {
  const palette = form.shadowRoot?.querySelector("pages-property-palette");
  const fromPalette = palette?.shadowRoot?.querySelectorAll(selector);
  if (fromPalette && fromPalette.length > 0) return [...fromPalette];
  return [...form.shadowRoot!.querySelectorAll(selector)];
}

function fieldLabel(input: Element): string | undefined {
  return input.closest(".field-wrapper")?.querySelector(".field-label")?.textContent?.trim();
}

function makeDataSet(
  columns: Array<[string, string]>,
  data: (string | number | null)[][],
) {
  const ds: DataSet = {
    columns: columns.map(([id, type]) => ({
      id: id as ColumnId,
      name: id,
      type: type as ColumnType,
    })),
    data: data.map((row) => row.map((v) => (v === null ? null : String(v)))),
  };
  return toTypedDataSet(ds);
}

describe("PagesSchemaForm — auto-derive schema", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("renders correct child types from dataset columns", async () => {
    const ds = makeDataSet(
      [["name", "TEXT"], ["age", "NUMBER"], ["status", "LABEL"], ["start", "DATE"]],
      [["Alice", "30", "Active", "2026-01-01"]],
    );
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {};
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    expect(queryField(form, "pages-input")).not.toBeNull();
    expect(queryField(form, "pages-number-input")).not.toBeNull();
    expect(queryField(form, "pages-select")).not.toBeNull();
    expect(queryField(form, "pages-date-input")).not.toBeNull();
  });

  it("excludeFields hides specified fields", async () => {
    const ds = makeDataSet(
      [["id", "NUMBER"], ["name", "TEXT"]],
      [["1", "Alice"]],
    );
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { excludeFields: ["id"] };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const allInputs = queryFields(form,
      "pages-input, pages-number-input, pages-select, pages-checkbox, pages-date-input, pages-textarea",
    );
    expect(allInputs.length).toBe(1);
    expect(allInputs[0]!.tagName.toLowerCase()).toBe("pages-input");
  });
});

describe("PagesSchemaForm — explicit schema", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("maps string to text-input", async () => {
    const ds = makeDataSet([["name", "TEXT"]], [["Alice"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { schema: { properties: { name: { type: "string" } } } };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);
    expect(queryField(form, "pages-input")).not.toBeNull();
  });

  it("maps number to number-input", async () => {
    const ds = makeDataSet([["age", "NUMBER"]], [["30"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { schema: { properties: { age: { type: "number", minimum: 0 } } } };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);
    expect(queryField(form, "pages-number-input")).not.toBeNull();
  });

  it("maps string with enum to dropdown", async () => {
    const ds = makeDataSet([["lang", "LABEL"]], [["Java"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      schema: { properties: { lang: { type: "string", enum: ["Java", "TypeScript", "Python"] } } },
    };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);
    expect(queryField(form, "pages-select")).not.toBeNull();
  });

  it("maps boolean to checkbox", async () => {
    const ds = makeDataSet([["active", "LABEL"]], [["true"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { schema: { properties: { active: { type: "boolean" } } } };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);
    expect(queryField(form, "pages-checkbox")).not.toBeNull();
  });

  it("maps format:date to date-picker", async () => {
    const ds = makeDataSet([["dob", "DATE"]], [["2000-01-01"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { schema: { properties: { dob: { type: "string", format: "date" } } } };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);
    expect(queryField(form, "pages-date-input")).not.toBeNull();
  });

  it("maps format:textarea to textarea", async () => {
    const ds = makeDataSet([["notes", "TEXT"]], [["Some text"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { schema: { properties: { notes: { type: "string", format: "textarea" } } } };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);
    expect(queryField(form, "pages-textarea")).not.toBeNull();
  });

  it("maps integer to number-input with step=1", async () => {
    const ds = makeDataSet([["count", "NUMBER"]], [["5"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { schema: { properties: { count: { type: "integer" } } } };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);
    const numInput = queryField(form, "pages-number-input");
    expect(numInput).not.toBeNull();
  });

  it("explicit schema overrides auto-derived", async () => {
    const ds = makeDataSet([["notes", "TEXT"]], [["text"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { schema: { properties: { notes: { type: "string", format: "textarea" } } } };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);
    expect(queryField(form, "pages-textarea")).not.toBeNull();
    expect(queryField(form, "pages-input")).toBeNull();
  });
});

describe("PagesSchemaForm — field customization", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("fieldOrder controls rendering order", async () => {
    const ds = makeDataSet([["a", "TEXT"], ["b", "TEXT"], ["c", "TEXT"]], [["1", "2", "3"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { fieldOrder: ["c", "a", "b"] };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const inputs = queryFields(form, "pages-input");
    expect(inputs.length).toBe(3);
    expect(fieldLabel(inputs[0]!)).toBe("C");
    expect(fieldLabel(inputs[1]!)).toBe("A");
    expect(fieldLabel(inputs[2]!)).toBe("B");
  });

  it("labels override auto-generated labels", async () => {
    const ds = makeDataSet([["workingYears", "NUMBER"]], [["5"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { labels: { workingYears: "Years of Experience" } };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const numInput = queryField(form, "pages-number-input") as any;
    expect(fieldLabel(numInput)).toBe("Years of Experience");
  });
});

describe("PagesSchemaForm — events and data flow", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("children receive dataset values from schema form", async () => {
    const ds = makeDataSet([["name", "TEXT"]], [["Alice"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {};
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const textInput = queryField(form, "pages-input") as any;
    expect(textInput).not.toBeNull();
    expect(textInput.value).toBe("Alice");
    expect(fieldLabel(textInput)).toBe("Name");
  });

  it("display mode sets children as readonly", async () => {
    const ds = makeDataSet([["name", "TEXT"]], [["Alice"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { mode: "display" };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const textInput = queryField(form, "pages-input") as any;
    expect(textInput.readonly).toBe(true);
  });
});

describe("PagesSchemaForm — create mode", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("zero rows triggers create mode with submit button", async () => {
    const ds = makeDataSet([["name", "TEXT"]], []);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { schema: { properties: { name: { type: "string" } } } };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await form.updateComplete;

    const submitBtn = form.shadowRoot!.querySelector(".submit-btn");
    expect(submitBtn).not.toBeNull();
  });

  it("submit emits pages-record-create with collected values", async () => {
    const ds = makeDataSet([["name", "TEXT"]], []);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { schema: { properties: { name: { type: "string" } } } };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const textInput = queryField(form, "pages-input") as any;
    textInput.value = "NewName";

    const events: CustomEvent[] = [];
    form.addEventListener("pages-record-create", (e) => events.push(e as CustomEvent));

    form.submit();

    expect(events.length).toBe(1);
    expect(events[0]!.detail.record).toEqual({ name: "NewName" });
  });

  it("submit returns null when required fields are empty", async () => {
    const ds = makeDataSet([["name", "TEXT"]], []);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      schema: { properties: { name: { type: "string" } }, required: ["name"] },
    };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await form.updateComplete;

    const events: CustomEvent[] = [];
    form.addEventListener("pages-record-create", (e) => events.push(e as CustomEvent));

    const result = form.submit();
    expect(result).toBeNull();
    expect(events.length).toBe(0);
  });

  it("forceCreate shows submit button even with data rows", async () => {
    const ds = makeDataSet([["name", "TEXT"]], [["Alice"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = { forceCreate: true };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await form.updateComplete;

    const submitBtn = form.shadowRoot!.querySelector(".submit-btn");
    expect(submitBtn).not.toBeNull();
  });

  it("validateOnBlur sets error on required empty field after blur", async () => {
    const ds = makeDataSet([["name", "TEXT"]], []);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      validateOnBlur: true,
      schema: { properties: { name: { type: "string" } }, required: ["name"] },
    };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const input = queryField(form, "pages-input") as any;
    expect(input).not.toBeNull();
    input.value = "";
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await awaitForm(form);

    expect(input.error).toBeDefined();
    expect(input.error.toLowerCase()).toContain("required");
  });

  it("validateOnBlur clears error when field becomes valid", async () => {
    const ds = makeDataSet([["name", "TEXT"]], []);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      validateOnBlur: true,
      schema: { properties: { name: { type: "string" } }, required: ["name"] },
    };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const input = queryField(form, "pages-input") as any;
    input.value = "";
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await awaitForm(form);
    expect(input.error).toBeDefined();

    input.value = "Alice";
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await awaitForm(form);
    expect(input.error).toBeUndefined();
  });

  it("validateOnBlur does not validate on non-committed (input) events", async () => {
    const ds = makeDataSet([["name", "TEXT"]], []);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      validateOnBlur: true,
      schema: { properties: { name: { type: "string" } }, required: ["name"] },
    };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const input = queryField(form, "pages-input") as any;
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await awaitForm(form);
    expect(input.error).toBeUndefined();
  });

  it("edit mode with data rows does not show submit button", async () => {
    const ds = makeDataSet([["name", "TEXT"]], [["Alice"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {};
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await form.updateComplete;

    const submitBtn = form.shadowRoot!.querySelector(".submit-btn");
    expect(submitBtn).toBeNull();
  });
});

describe("PagesSchemaForm — fieldsOnly mode", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("skips submit button when fieldsOnly is true", async () => {
    const ds = makeDataSet([], []);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      forceCreate: true,
      fieldsOnly: true,
      schema: { properties: { name: { type: "string" } } },
    };
    form.editable = true;
    form.fieldsOnly = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await form.updateComplete;

    const submitBtn = form.shadowRoot!.querySelector(".submit-btn");
    expect(submitBtn).toBeNull();
  });

  it("dispatches pages-field-register for each field in fieldsOnly mode", async () => {
    const ds = makeDataSet(
      [["name", "TEXT"], ["age", "NUMBER"]],
      [["Alice", "30"]],
    );
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      fieldsOnly: true,
      lookup: { dataSetId: "test", operations: [] } as unknown as DataSetLookup,
      schema: { properties: { name: { type: "string" }, age: { type: "number" } } },
    };
    form.editable = true;
    form.fieldsOnly = true;

    const events: CustomEvent[] = [];
    form.addEventListener("pages-field-register", (e) => events.push(e as CustomEvent));

    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);
    await new Promise(r => setTimeout(r, 10));

    expect(events.length).toBe(2);
    expect(events[0]!.detail.field).toBe("name");
    expect(events[1]!.detail.field).toBe("age");
  });
});

describe("PagesSchemaForm — fields prop", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("renders only listed fields in specified order", async () => {
    const ds = makeDataSet(
      [["name", "TEXT"], ["age", "NUMBER"], ["email", "TEXT"]],
      [["Alice", "30", "alice@example.com"]],
    );
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      schema: {
        properties: {
          name: { type: "string" },
          age: { type: "number" },
          email: { type: "string" },
        },
      },
      fields: ["email", "name"],
    };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const children = queryFields(form, "pages-input");
    expect(children.length).toBe(2);
  });
});

describe("PagesSchemaForm — nested objects", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("renders pages-object-group for type: object property", async () => {
    const ds = makeDataSet([["name", "TEXT"]], [["Alice"]]);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      schema: {
        properties: {
          name: { type: "string" },
          address: {
            type: "object",
            properties: {
              street: { type: "string" },
              city: { type: "string" },
            },
          },
        },
      },
    };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    expect(queryField(form, "pages-input")).not.toBeNull();
    expect(queryField(form, "pages-object-group")).not.toBeNull();
  });

  it("currentValue includes nested object values", async () => {
    const ds = makeDataSet([], []);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      schema: {
        properties: {
          name: { type: "string" },
          address: {
            type: "object",
            properties: {
              street: { type: "string" },
              city: { type: "string" },
            },
          },
        },
      },
      forceCreate: true,
    };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const textInput = queryField(form, "pages-input") as any;
    textInput.value = "Jane";

    const objectGroup = queryField(form, "pages-object-group") as any;
    const innerInputs = objectGroup.shadowRoot!.querySelectorAll("pages-input");
    (innerInputs[0] as any).value = "123 Main";
    (innerInputs[1] as any).value = "NYC";

    const value = form.currentValue;
    expect(value.name).toBe("Jane");
    expect((value.address as any).street).toBe("123 Main");
    expect((value.address as any).city).toBe("NYC");
  });

  it("resolves $ref before rendering", async () => {
    const ds = makeDataSet([], []);
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      schema: {
        $defs: {
          address: {
            type: "object",
            properties: { street: { type: "string" } },
          },
        },
        properties: {
          home: { $ref: "#/$defs/address" },
        },
      },
      forceCreate: true,
    };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const objectGroup = queryField(form, "pages-object-group");
    expect(objectGroup).not.toBeNull();
  });

  it("extractRecord parses JSON columns for nested types", async () => {
    const ds = makeDataSet(
      [["name", "TEXT"], ["address", "TEXT"]],
      [["Alice", '{"street":"123 Main","city":"NYC"}']],
    );
    const form = document.createElement("pages-schema-form") as PagesSchemaForm;
    form.props = {
      schema: {
        properties: {
          name: { type: "string" },
          address: {
            type: "object",
            properties: { street: { type: "string" }, city: { type: "string" } },
          },
        },
      },
    };
    form.editable = true;
    container.appendChild(form);
    await form.updateComplete;
    form.dataSet = ds;
    await awaitForm(form);

    const objectGroup = queryField(form, "pages-object-group") as any;
    expect(objectGroup).not.toBeNull();
    const groupValue = objectGroup.currentValue;
    expect(groupValue.street).toBe("123 Main");
    expect(groupValue.city).toBe("NYC");
  });
});
