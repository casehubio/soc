import { html, css, nothing, type TemplateResult } from "lit";
import { PagesElement } from "../base/PagesElement.js";
import type { TypedDataSet, ColumnId } from "@casehubio/pages-data";
import type { DataSetLookup } from "@casehubio/pages-data";
import type { SchemaFormProps, FieldSchema } from "@casehubio/pages-component";
import { resolveSchemaRefs, isFormValueProvider } from "@casehubio/pages-component";
import { validateField } from "./schema-types.js";
import {
  deriveSchemaFromDataSet,
  mapFieldToComponentType,
} from "./schema-types.js";
import { cellToRaw } from "../base/cell-extract.js";
import type { PropertyPaletteSource, EditorResolver, FieldRenderContext } from "@casehubio/pages-property-palette/types";
import type { PagesPropertyPalette } from "@casehubio/pages-property-palette/palette";

import "@casehubio/pages-property-palette";
import "./PagesObjectGroup.js";
import "./PagesArrayGroup.js";
import "./PagesVariantGroup.js";

export class PagesSchemaForm extends PagesElement<SchemaFormProps & { lookup?: DataSetLookup }> {
  private _dataMirror: Record<string, unknown> = {};
  private _resolvedSchema: FieldSchema | null = null;
  private _editable = false;
  private _fieldsOnly = false;
  private _liveRegion: HTMLElement | null = null;
  private _compositeRefs: Map<string, HTMLElement> = new Map();

  static override styles = css`
      :host { display: block; font-family: var(--pages-font-family, system-ui, sans-serif); }
      .schema-form-fields { display: flex; flex-direction: column; gap: var(--pages-space-2, 8px); }
      .submit-bar { margin-top: var(--pages-space-3, 12px); }
      .submit-btn {
        padding: 8px 16px; border: 1px solid var(--pages-accent-9, #5470c6);
        border-radius: var(--pages-radius-sm, 4px); background: var(--pages-accent-9, #5470c6);
        color: white; cursor: pointer; font-size: var(--pages-font-size-base, 14px);
      }
      .submit-btn:hover { opacity: 0.9; }
  `;

  private _resolver: EditorResolver = (schema: FieldSchema) => {
    if (schema["x-renderer"]) {
      return { kind: "tag", tag: `pages-${String(schema["x-renderer"])}` };
    }
    if (schema.oneOf) {
      return { kind: "render", render: (ctx) => this._renderComposite("variant-group", ctx) };
    }
    const effectiveType = Array.isArray(schema.type)
      ? (schema.type as readonly string[]).find(t => t !== "null")
      : schema.type;
    if (effectiveType === "array" || schema.items) {
      return { kind: "render", render: (ctx) => this._renderComposite("array-group", ctx) };
    }
    if (effectiveType === "object" || (schema.properties && effectiveType !== "string")) {
      return { kind: "render", render: (ctx) => this._renderComposite("object-group", ctx) };
    }
    if (effectiveType === "string" && schema.format === "textarea") {
      return { kind: "tag", tag: "pages-textarea" };
    }
    if (effectiveType === "string" && schema.format === "datetime-local") {
      return { kind: "tag", tag: "pages-datetime-input" };
    }
    return undefined;
  };

  set editable(value: boolean) {
    this._editable = value;
  }

  get editable(): boolean {
    return this._editable;
  }

  set fieldsOnly(value: boolean) {
    this._fieldsOnly = value;
  }

  get fieldsOnly(): boolean {
    return this._fieldsOnly;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._liveRegion?.remove();
    this._liveRegion = null;
  }

  private announce(message: string, priority: "polite" | "assertive" = "polite"): void {
    if (!this._liveRegion) {
      this._liveRegion = document.createElement("div");
      this._liveRegion.setAttribute("aria-live", priority);
      this._liveRegion.setAttribute("aria-atomic", "true");
      this._liveRegion.setAttribute("role", "status");
      Object.assign(this._liveRegion.style, {
        position: "absolute", width: "1px", height: "1px",
        overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap",
      });
      document.body.appendChild(this._liveRegion);
    }
    this._liveRegion.setAttribute("aria-live", priority);
    this._liveRegion.textContent = "";
    void this._liveRegion.offsetHeight;
    this._liveRegion.textContent = message;
  }

  get currentValue(): Record<string, unknown> {
    const record: Record<string, unknown> = { ...this._dataMirror };
    if (this._palette) {
      for (const field of Object.keys(this._resolvedSchema?.properties ?? {})) {
        if (this._compositeRefs.has(field)) continue;
        const el = this._palette.getFieldElement(field) as (HTMLElement & { checked?: boolean; value?: unknown }) | undefined;
        if (el) {
          if (el.tagName.toLowerCase() === "pages-checkbox") {
            record[field] = el.checked;
          } else if (el.value !== undefined) {
            record[field] = el.value;
          }
        }
      }
    }
    for (const [field, child] of this._compositeRefs) {
      if (isFormValueProvider(child)) {
        record[field] = child.currentValue;
      }
    }
    return record;
  }

  private get _palette(): PagesPropertyPalette | null {
    return this.shadowRoot?.querySelector("pages-property-palette") as PagesPropertyPalette | null;
  }

  protected override renderContent(
    props: SchemaFormProps & { lookup?: DataSetLookup },
    dataset: TypedDataSet,
  ): TemplateResult {
    const schema = props.schema
      ? resolveSchemaRefs(props.schema)
      : deriveSchemaFromDataSet(dataset);
    this._resolvedSchema = schema;

    const enrichedSchema = this._enrichSchema(schema, props, dataset);
    const sourceData = this._extractData(enrichedSchema, dataset);
    this._dataMirror = { ...sourceData };

    const isCreateMode = props.forceCreate === true || dataset.rows.length === 0;
    const isDisplay = props.mode === "display" || !this._editable;

    const source: PropertyPaletteSource = {
      schema: enrichedSchema,
      data: sourceData,
      readonly: isDisplay,
      onChange: (fieldPath, value) => {
        const key = typeof fieldPath[0] === "string" ? fieldPath[0] : String(fieldPath[0]);
        this._dataMirror[key] = value;
      },
    };

    if (this._fieldsOnly) {
      const fields = Object.keys(enrichedSchema.properties ?? {});
      void this.updateComplete.then(async () => {
        const palette = this._palette;
        if (!palette) return;
        await palette.updateComplete;
        for (const field of fields) {
          const element = this._compositeRefs.get(field) ?? palette.getFieldElement(field);
          if (element) {
            this.dispatchEvent(new CustomEvent("pages-field-register", {
              bubbles: true, composed: true,
              detail: { field, element, componentType: mapFieldToComponentType(enrichedSchema.properties![field]!) },
            }));
          }
        }
      });
    }

    return html`
      <div class="schema-form-fields" role="${isDisplay ? "group" : "form"}">
        <pages-property-palette
          .source=${source}
          .resolver=${this._resolver}
        ></pages-property-palette>
        ${isCreateMode && !isDisplay && !this._fieldsOnly ? html`
          <div class="submit-bar">
            <button class="submit-btn" @click=${() => this.submit()}>Submit</button>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _enrichSchema(schema: FieldSchema, props: SchemaFormProps, _dataset: TypedDataSet): FieldSchema {
    const schemaProps = schema.properties;
    if (!schemaProps) return schema;

    const excludeSet = new Set(props.excludeFields ?? []);
    const fieldOrder = props.fieldOrder ?? Object.keys(schemaProps);
    const visibleFields = props.fields
      ? props.fields.filter((f) => f in schemaProps)
      : fieldOrder.filter((f) => !excludeSet.has(f) && f in schemaProps);

    const enriched: Record<string, FieldSchema> = {};
    let changed = false;

    for (const key of visibleFields) {
      const fieldSchema = schemaProps[key]!;

      const label = props.labels?.[key]
        ?? fieldSchema.title
        ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      if (label !== fieldSchema.title) {
        enriched[key] = { ...fieldSchema, title: label };
        changed = true;
      } else {
        enriched[key] = fieldSchema;
      }
    }

    if (changed || visibleFields.length !== Object.keys(schemaProps).length) {
      const filteredProps: Record<string, FieldSchema> = {};
      for (const key of visibleFields) {
        filteredProps[key] = enriched[key] ?? schemaProps[key]!;
      }
      return { ...schema, properties: filteredProps };
    }
    return schema;
  }

  private _extractData(schema: FieldSchema, dataset: TypedDataSet): Record<string, unknown> {
    if (dataset.rows.length === 0) return {};
    const row = dataset.rows[0]!;
    const data: Record<string, unknown> = {};
    const fields = Object.keys(schema.properties ?? {});
    for (const field of fields) {
      try {
        const cell = row.cell(field as ColumnId);
        if (cell.type !== "NULL") {
          const fieldSchema = schema.properties?.[field];
          const effectiveType = Array.isArray(fieldSchema?.type)
            ? (fieldSchema!.type as readonly string[]).find(t => t !== "null")
            : fieldSchema?.type;
          if (effectiveType === "boolean") {
            data[field] = typeof cell.value === "boolean" ? cell.value : String(cell.value).toLowerCase() === "true";
          } else if (effectiveType === "number" || effectiveType === "integer") {
            const num = typeof cell.value === "number" ? cell.value : parseFloat(String(cell.value));
            data[field] = isNaN(num) ? null : num;
          } else if (effectiveType === "object" || effectiveType === "array") {
            const raw = String(cell.value);
            try { data[field] = JSON.parse(raw); } catch { data[field] = raw; }
          } else {
            data[field] = String(cell.value);
          }
        }
      } catch { /* column not found */ }
    }
    return data;
  }

  private _extractDistinctValues(field: string, dataset: TypedDataSet): string[] {
    const seen = new Set<string>();
    for (const row of dataset.rows) {
      try {
        const cell = row.cell(field as ColumnId);
        const raw = cellToRaw(cell);
        if (raw !== null) seen.add(String(raw));
      } catch { /* skip */ }
    }
    return [...seen].sort();
  }

  private _renderComposite(componentType: string, ctx: FieldRenderContext): TemplateResult {
    const tagName = `pages-${componentType}`;
    let child = this._compositeRefs.get(ctx.key);
    if (!child || child.tagName.toLowerCase() !== tagName) {
      child = document.createElement(tagName);
      this._compositeRefs.set(ctx.key, child);
    }
    (child as any).schema = ctx.schema;
    (child as any).label = ctx.schema.title ?? ctx.key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
    (child as any).fieldName = ctx.key;
    (child as any).editable = !ctx.readonly;
    (child as any).required = ctx.required;
    if (ctx.value != null) {
      (child as any).value = ctx.value;
    }
    return html`${child}`;
  }

  validate(): boolean {
    if (!this._resolvedSchema?.properties) return true;
    const requiredSet = new Set(this._resolvedSchema.required ?? []);
    let allValid = true;
    const fieldErrors = new Map<string, string | undefined>();

    for (const [field, fieldSchema] of Object.entries(this._resolvedSchema.properties)) {
      const compositeChild = this._compositeRefs.get(field);
      if (compositeChild && isFormValueProvider(compositeChild)) {
        if (!compositeChild.validate()) allValid = false;
      } else {
        const value = this._dataMirror[field];
        const error = validateField(fieldSchema, value, requiredSet.has(field));
        if (error) {
          fieldErrors.set(field, error);
          allValid = false;
        } else {
          fieldErrors.set(field, undefined);
        }
      }
    }

    if (this._palette && fieldErrors.size > 0) {
      this._palette.setFieldErrors(fieldErrors);
    }
    return allValid;
  }

  submit(): Record<string, unknown> | null {
    if (!this._resolvedSchema?.properties) return null;

    const allValid = this.validate();
    if (!allValid) {
      this.announce(
        "Validation errors — please correct before submitting",
        "assertive",
      );
      return null;
    }

    const record = this.currentValue;
    this.dispatchEvent(
      new CustomEvent("pages-record-create", {
        bubbles: true, composed: true,
        detail: { record },
      }),
    );

    this.announce("Record submitted successfully");
    return record;
  }
}

if (!customElements.get("pages-schema-form")) {
  customElements.define("pages-schema-form", PagesSchemaForm);
}
