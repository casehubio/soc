import { html, css, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { LitElement } from "lit";
import type { FieldSchema } from "@casehubio/pages-component";
import { isFormValueProvider, readFieldValue, setFieldError, validateField, FormValueMixin } from "@casehubio/pages-component";
import { mapFieldToComponentType } from "./schema-types.js";

import "@casehubio/pages-ui-components/input";
import "@casehubio/pages-ui-components/select";
import "@casehubio/pages-ui-components/checkbox";
import "@casehubio/pages-ui-components/textarea";
import "@casehubio/pages-ui-components/number-input";
import "@casehubio/pages-ui-components/date-input";
import "@casehubio/pages-ui-components/datetime-input";

const COMPOSITE_TYPES = new Set(["object-group", "array-group", "variant-group"]);

export class PagesObjectGroup extends FormValueMixin(LitElement) {
  @property({ attribute: false }) schema!: FieldSchema;
  @property({ attribute: false }) label = "";
  @property({ attribute: false }) fieldName = "";
  @property({ type: Boolean }) editable = false;
  @property({ type: Boolean }) required = false;
  @property({ type: Boolean }) collapsible = false;
  @property({ type: Boolean }) validateOnBlur = false;
  @state() private _collapsed = false;

  private _children = new Map<string, HTMLElement>();
  private _childTypes = new Map<string, string>();
  private _valuePending = false;

  static override styles = css`
    :host { display: block; }
    fieldset {
      border: 1px solid var(--pages-border-color, #e0e0e0);
      border-radius: var(--pages-radius-sm, 4px);
      padding: var(--pages-space-3, 12px);
      margin: var(--pages-space-2, 8px) 0;
    }
    legend {
      font-weight: 600;
      font-size: var(--pages-font-size-sm, 13px);
      color: var(--pages-text-secondary, #666);
      padding: 0 var(--pages-space-1, 4px);
    }
    .object-fields { display: flex; flex-direction: column; gap: var(--pages-space-2, 8px); }
    .collapsed .object-fields { display: none; }
    .collapse-btn { cursor: pointer; background: none; border: none; padding: 0; font: inherit; color: inherit; }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.renderRoot.addEventListener("pages-field-change", this._onChildFieldChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.renderRoot.removeEventListener("pages-field-change", this._onChildFieldChange);
  }

  protected collectValue(): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    for (const [field, child] of this._children) {
      record[field] = isFormValueProvider(child)
        ? child.currentValue
        : readFieldValue(child, this._childTypes.get(field) ?? "input");
    }
    return record;
  }

  protected propagateValue(_v: unknown): void {
    this._valuePending = true;
    this.requestUpdate();
  }

  protected validateSelf(): boolean {
    if (!this.schema.required) return true;
    const requiredSet = new Set(this.schema.required);
    const value = this.collectValue();
    let allValid = true;
    for (const field of requiredSet) {
      if (value[field] === null || value[field] === undefined || value[field] === "") {
        const child = this._children.get(field);
        if (child) setFieldError(child, this._childTypes.get(field) ?? "input", "Required");
        allValid = false;
      }
    }
    if (allValid) this.error = undefined;
    return allValid;
  }

  protected validateChildren(): boolean {
    let allValid = true;
    for (const [field, child] of this._children) {
      if (isFormValueProvider(child)) {
        if (!child.validate()) allValid = false;
      } else {
        const fieldSchema = this.schema.properties?.[field];
        if (fieldSchema) {
          const ct = this._childTypes.get(field) ?? "input";
          const val = readFieldValue(child, ct);
          const requiredSet = new Set(this.schema.required ?? []);
          const err = validateField(fieldSchema, val, requiredSet.has(field));
          setFieldError(child, ct, err ?? undefined);
          if (err) allValid = false;
        }
      }
    }
    return allValid;
  }

  private _onChildFieldChange = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    e.stopPropagation();
    if (!detail.committed) return;

    if (this.validateOnBlur) {
      const childField = detail.field as string;
      const child = this._children.get(childField);
      if (child) {
        if (isFormValueProvider(child)) {
          child.validate();
        } else {
          const fieldSchema = this.schema.properties?.[childField];
          if (fieldSchema) {
            const requiredSet = new Set(this.schema.required ?? []);
            const error = validateField(fieldSchema, detail.value, requiredSet.has(childField));
            setFieldError(child, this._childTypes.get(childField) ?? "input", error ?? undefined);
          }
        }
      }
    }

    this.dispatchEvent(new CustomEvent("pages-field-change", {
      bubbles: true, composed: true,
      detail: { field: this.fieldName, value: this.currentValue, committed: true },
    }));
  };

  private _deriveLabel(field: string, fieldSchema: FieldSchema): string {
    return fieldSchema.title ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
  }

  override render(): TemplateResult {
    if (!this.schema) return html``;
    const schemaProps = this.schema.properties ?? {};
    const fields = Object.keys(schemaProps);
    const staleKeys = new Set(this._children.keys());

    for (const field of fields) {
      staleKeys.delete(field);
      const fieldSchema = schemaProps[field]!;
      const componentType = mapFieldToComponentType(fieldSchema);
      const tagName = `pages-${componentType}`;
      const label = this._deriveLabel(field, fieldSchema);

      let child = this._children.get(field);
      if (!child || child.tagName.toLowerCase() !== tagName) {
        child = document.createElement(tagName);
        this._children.set(field, child);
      }
      this._childTypes.set(field, componentType);

      if (COMPOSITE_TYPES.has(componentType)) {
        (child as any).schema = fieldSchema;
        (child as any).label = label;
        (child as any).fieldName = field;
        (child as any).editable = this.editable;
        (child as any).validateOnBlur = this.validateOnBlur;
        const requiredSet = new Set(this.schema.required ?? []);
        (child as any).required = requiredSet.has(field);
      } else {
        (child as any).label = label;
        (child as any).disabled = !this.editable;
        const requiredSet = new Set(this.schema.required ?? []);
        (child as any).required = requiredSet.has(field);
        if (componentType === "select" && fieldSchema.enum) {
          (child as any).options = fieldSchema.enum.map((v: string) => ({ value: v, label: v }));
        }
        if (componentType === "number-input") {
          if (fieldSchema.minimum !== undefined) (child as any).min = fieldSchema.minimum;
          if (fieldSchema.maximum !== undefined) (child as any).max = fieldSchema.maximum;
          if (fieldSchema.type === "integer") (child as any).step = 1;
        }
      }
    }

    for (const key of staleKeys) {
      this._children.get(key)?.remove();
      this._children.delete(key);
      this._childTypes.delete(key);
    }

    if (this._valuePending && this.value && typeof this.value === "object") {
      this._valuePending = false;
      const obj = this.value as Record<string, unknown>;
      for (const [field, child] of this._children) {
        const fieldValue = obj[field];
        if (fieldValue === undefined) continue;
        if (isFormValueProvider(child)) {
          child.value = fieldValue;
        } else {
          const ct = this._childTypes.get(field) ?? "input";
          if (ct === "checkbox") {
            (child as any).checked = Boolean(fieldValue);
          } else {
            (child as any).value = fieldValue;
          }
        }
      }
    }

    const legendId = `legend-${this.fieldName}`;
    return html`
      <fieldset class="${this._collapsed ? "collapsed" : ""}" role="group" aria-labelledby="${legendId}">
        ${this.collapsible
          ? html`<legend id="${legendId}"><button class="collapse-btn" @click=${() => { this._collapsed = !this._collapsed; }} aria-expanded="${!this._collapsed}">${this.label}</button></legend>`
          : html`<legend id="${legendId}">${this.label}</legend>`
        }
        <div class="object-fields">
          ${fields.map((field) => this._children.get(field)!)}
        </div>
      </fieldset>
    `;
  }
}

if (!customElements.get("pages-object-group")) {
  customElements.define("pages-object-group", PagesObjectGroup);
}
