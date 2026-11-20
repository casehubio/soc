import { html, css, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { LitElement } from "lit";
import type { FieldSchema } from "@casehubio/pages-component";
import { isFormValueProvider, readFieldValue, setFieldError, validateField, FormValueMixin } from "@casehubio/pages-component";
import { mapFieldToComponentType } from "./schema-types.js";

import "@casehubio/pages-ui-components/input";
import "@casehubio/pages-ui-components/select";
import "@casehubio/pages-ui-components/checkbox";
import "@casehubio/pages-ui-components/number-input";
import "@casehubio/pages-ui-components/date-input";
import "@casehubio/pages-ui-components/datetime-input";
import "@casehubio/pages-ui-components/textarea";
import "./PagesObjectGroup.js";

const COMPOSITE_TYPES = new Set(["object-group", "array-group", "variant-group"]);

interface ArrayItem {
  key: number;
  element: HTMLElement;
  componentType: string;
}

export class PagesArrayGroup extends FormValueMixin(LitElement) {
  @property({ attribute: false }) schema!: FieldSchema;
  @property({ attribute: false }) label = "";
  @property({ attribute: false }) fieldName = "";
  @property({ type: Boolean }) editable = false;
  @property({ type: Boolean }) required = false;
  @property({ type: Boolean }) validateOnBlur = false;
  @state() private _items: ArrayItem[] = [];
  private _nextKey = 0;

  static override styles = css`
    :host { display: block; }
    .array-group { display: flex; flex-direction: column; gap: var(--pages-space-2, 8px); }
    .array-header { display: flex; align-items: center; gap: var(--pages-space-2, 8px); font-weight: 600; font-size: var(--pages-font-size-sm, 13px); color: var(--pages-text-secondary, #666); }
    .array-count { font-weight: 400; color: var(--pages-text-tertiary, #999); }
    .array-item { display: flex; align-items: flex-start; gap: var(--pages-space-2, 8px); padding: var(--pages-space-2, 8px); border: 1px solid var(--pages-border-color, #e0e0e0); border-radius: var(--pages-radius-sm, 4px); }
    .array-item > :first-child { flex: 1; }
    .array-item-controls { display: flex; flex-direction: column; gap: 2px; }
    .array-item-controls button { padding: 2px 6px; border: 1px solid var(--pages-border-color, #e0e0e0); border-radius: 3px; background: var(--pages-surface-1, #fff); cursor: pointer; font-size: 12px; line-height: 1; }
    .array-item-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
    .array-add { align-self: flex-start; padding: 4px 12px; border: 1px dashed var(--pages-border-color, #e0e0e0); border-radius: var(--pages-radius-sm, 4px); background: none; cursor: pointer; color: var(--pages-accent-9, #5470c6); font-size: var(--pages-font-size-sm, 13px); }
    .array-add:disabled { opacity: 0.3; cursor: not-allowed; }
    .error-msg { color: var(--pages-error, #e53e3e); font-size: var(--pages-font-size-xs, 12px); }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.renderRoot.addEventListener("pages-field-change", this._onChildFieldChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.renderRoot.removeEventListener("pages-field-change", this._onChildFieldChange);
  }

  private _createItem(itemValue?: unknown): ArrayItem {
    const itemSchema = this.schema.items ?? { type: "string" };
    const componentType = mapFieldToComponentType(itemSchema);
    const tagName = `pages-${componentType}`;
    const element = document.createElement(tagName);
    const key = this._nextKey++;

    if (COMPOSITE_TYPES.has(componentType)) {
      (element as any).schema = itemSchema;
      (element as any).label = `${this.label} ${key + 1}`;
      (element as any).fieldName = String(key);
      (element as any).editable = this.editable;
      (element as any).validateOnBlur = this.validateOnBlur;
      if (itemValue !== undefined) (element as any).value = itemValue;
    } else {
      (element as any).label = "";
      (element as any).disabled = !this.editable;
      if (itemValue !== undefined) {
        if (componentType === "checkbox") {
          (element as any).checked = Boolean(itemValue);
        } else {
          (element as any).value = itemValue;
        }
      }
    }

    return { key, element, componentType };
  }

  private _getDefaultValue(): unknown {
    const itemSchema = this.schema.items ?? { type: "string" };
    const ct = mapFieldToComponentType(itemSchema);
    if (ct === "checkbox") return false;
    if (ct === "number-input") return 0;
    if (ct === "object-group") return {};
    if (ct === "array-group") return [];
    return "";
  }

  protected collectValue(): unknown[] {
    return this._items.map(item =>
      isFormValueProvider(item.element)
        ? item.element.currentValue
        : readFieldValue(item.element, item.componentType),
    );
  }

  protected propagateValue(v: unknown): void {
    if (!Array.isArray(v)) { this._items = []; return; }
    this._items = v.map(itemValue => this._createItem(itemValue));
    this.requestUpdate();
  }

  protected validateSelf(): boolean {
    const count = this._items.length;
    if (this.schema.minItems != null && count < this.schema.minItems) {
      this.error = `At least ${this.schema.minItems} items required`;
      return false;
    }
    if (this.schema.maxItems != null && count > this.schema.maxItems) {
      this.error = `At most ${this.schema.maxItems} items allowed`;
      return false;
    }
    if (this.schema.uniqueItems) {
      const values = this.collectValue();
      const serialized = values.map(v => JSON.stringify(v));
      if (new Set(serialized).size !== serialized.length) {
        this.error = "Items must be unique";
        return false;
      }
    }
    this.error = undefined;
    return true;
  }

  protected validateChildren(): boolean {
    let allValid = true;
    const itemSchema = this.schema.items ?? { type: "string" };
    for (const item of this._items) {
      if (isFormValueProvider(item.element)) {
        if (!item.element.validate()) allValid = false;
      } else {
        const val = readFieldValue(item.element, item.componentType);
        const err = validateField(itemSchema, val, false);
        setFieldError(item.element, item.componentType, err ?? undefined);
        if (err) allValid = false;
      }
    }
    return allValid;
  }

  private _onChildFieldChange = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    e.stopPropagation();
    if (!detail.committed) return;

    this.dispatchEvent(new CustomEvent("pages-field-change", {
      bubbles: true, composed: true,
      detail: { field: this.fieldName, value: this.currentValue, committed: true },
    }));
  };

  private _addItem(): void {
    if (this.schema.maxItems != null && this._items.length >= this.schema.maxItems) return;
    const item = this._createItem(this._getDefaultValue());
    this._items = [...this._items, item];
  }

  private _removeItem(key: number): void {
    if (this.schema.minItems != null && this._items.length <= this.schema.minItems) return;
    this._items = this._items.filter(i => i.key !== key);
  }

  private _moveUp(key: number): void {
    const idx = this._items.findIndex(i => i.key === key);
    if (idx <= 0) return;
    const newItems = [...this._items];
    [newItems[idx - 1], newItems[idx]] = [newItems[idx]!, newItems[idx - 1]!];
    this._items = newItems;
  }

  private _moveDown(key: number): void {
    const idx = this._items.findIndex(i => i.key === key);
    if (idx < 0 || idx >= this._items.length - 1) return;
    const newItems = [...this._items];
    [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1]!, newItems[idx]!];
    this._items = newItems;
  }

  override render(): TemplateResult {
    if (!this.schema) return html``;
    const atMaxItems = this.schema.maxItems != null && this._items.length >= this.schema.maxItems;
    const atMinItems = this.schema.minItems != null && this._items.length <= this.schema.minItems;

    return html`
      <div class="array-group" role="list" aria-label="${this.label}">
        <div class="array-header">
          <span class="array-label">${this.label}</span>
          <span class="array-count">${this._items.length} item${this._items.length !== 1 ? "s" : ""}</span>
        </div>
        ${this.error ? html`<div class="error-msg">${this.error}</div>` : ""}
        ${repeat(this._items, item => item.key, (item, index) => html`
          <div class="array-item" role="listitem">
            ${item.element}
            ${this.editable ? html`
              <div class="array-item-controls">
                <button @click=${() => this._moveUp(item.key)} ?disabled=${index === 0}
                  aria-label="Move up">↑</button>
                <button @click=${() => this._moveDown(item.key)} ?disabled=${index === this._items.length - 1}
                  aria-label="Move down">↓</button>
                <button @click=${() => this._removeItem(item.key)}
                  ?disabled=${atMinItems} aria-label="Remove item">×</button>
              </div>
            ` : ""}
          </div>
        `)}
        ${this.editable ? html`
          <button class="array-add" @click=${this._addItem}
            ?disabled=${atMaxItems} aria-label="Add ${this.label}">
            + Add
          </button>
        ` : ""}
      </div>
    `;
  }
}

if (!customElements.get("pages-array-group")) {
  customElements.define("pages-array-group", PagesArrayGroup);
}
