import { html, css, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
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
import "./PagesArrayGroup.js";

const COMPOSITE_TYPES = new Set(["object-group", "array-group", "variant-group"]);

export class PagesVariantGroup extends FormValueMixin(LitElement) {
  @property({ attribute: false }) schema!: FieldSchema;
  @property({ attribute: false }) label = "";
  @property({ attribute: false }) fieldName = "";
  @property({ type: Boolean }) editable = false;
  @state() private _activeVariantIndex = 0;
  @state() private _discriminatorField: string | null = null;

  private _activeChildren = new Map<string, HTMLElement>();
  private _activeChildTypes = new Map<string, string>();

  static override styles = css`
    :host { display: block; }
    fieldset {
      border: 1px solid var(--pages-border-color, #e0e0e0);
      border-radius: var(--pages-radius-sm, 4px);
      padding: var(--pages-space-3, 12px);
      margin: var(--pages-space-2, 8px) 0;
    }
    legend { font-weight: 600; font-size: var(--pages-font-size-sm, 13px); color: var(--pages-text-secondary, #666); padding: 0 var(--pages-space-1, 4px); }
    .variant-fields { display: flex; flex-direction: column; gap: var(--pages-space-2, 8px); margin-top: var(--pages-space-2, 8px); }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.renderRoot.addEventListener("pages-field-change", this._onChildFieldChange);
    this._detectDiscriminator();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.renderRoot.removeEventListener("pages-field-change", this._onChildFieldChange);
  }

  override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has("schema")) this._detectDiscriminator();
  }

  private _detectDiscriminator(): void {
    const variants = this.schema.oneOf;
    if (!variants || variants.length === 0) return;

    const candidateProps = new Set<string>();
    for (const variant of variants) {
      for (const prop of Object.keys(variant.properties ?? {})) {
        candidateProps.add(prop);
      }
    }

    for (const prop of candidateProps) {
      const allHaveConst = variants.every(v => v.properties?.[prop]?.const !== undefined);
      if (allHaveConst) {
        this._discriminatorField = prop;
        return;
      }
    }

    console.error(
      "pages-variant-group: oneOf schema has no discriminator property (no shared property with const values across all variants). Use x-renderer for undiscriminated oneOf.",
    );
  }

  private _getVariantOptions(): Array<{ value: string; label: string }> {
    const variants = this.schema.oneOf ?? [];
    if (!this._discriminatorField) return [];
    return variants.map((v, i) => {
      const constVal = String(v.properties?.[this._discriminatorField!]?.const ?? i);
      const label = v.title ?? constVal;
      return { value: constVal, label };
    });
  }

  private _onVariantSwitch = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    if (!detail.committed) return;
    e.stopPropagation();

    const newValue = detail.value as string;
    const variants = this.schema.oneOf ?? [];
    const newIndex = variants.findIndex(v =>
      String(v.properties?.[this._discriminatorField!]?.const) === newValue,
    );
    if (newIndex >= 0 && newIndex !== this._activeVariantIndex) {
      this._activeVariantIndex = newIndex;
      this._activeChildren.clear();
      this._activeChildTypes.clear();
    }
  };

  private _onChildFieldChange = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    e.stopPropagation();
    if (!detail.committed) return;

    this.dispatchEvent(new CustomEvent("pages-field-change", {
      bubbles: true, composed: true,
      detail: { field: this.fieldName, value: this.currentValue, committed: true },
    }));
  };

  protected collectValue(): Record<string, unknown> {
    const variants = this.schema.oneOf;
    if (!variants || variants.length === 0) return {};
    const activeVariant = variants[this._activeVariantIndex]!;
    const record: Record<string, unknown> = {};

    if (this._discriminatorField) {
      record[this._discriminatorField] = activeVariant.properties?.[this._discriminatorField]?.const;
    }

    for (const [field, child] of this._activeChildren) {
      if (field === this._discriminatorField) continue;
      record[field] = isFormValueProvider(child)
        ? child.currentValue
        : readFieldValue(child, this._activeChildTypes.get(field) ?? "input");
    }
    return record;
  }

  protected propagateValue(v: unknown): void {
    if (!v || typeof v !== "object") return;
    const obj = v as Record<string, unknown>;

    if (this._discriminatorField && obj[this._discriminatorField] !== undefined) {
      const variants = this.schema.oneOf ?? [];
      const idx = variants.findIndex(vr =>
        vr.properties?.[this._discriminatorField!]?.const === obj[this._discriminatorField!],
      );
      if (idx >= 0) this._activeVariantIndex = idx;
    }

    for (const [field, child] of this._activeChildren) {
      if (field === this._discriminatorField) continue;
      const fieldValue = obj[field];
      if (fieldValue === undefined) continue;
      if (isFormValueProvider(child)) {
        child.value = fieldValue;
      } else {
        (child as any).value = fieldValue;
      }
    }
  }

  protected validateSelf(): boolean {
    this.error = undefined;
    return true;
  }

  protected validateChildren(): boolean {
    const variants = this.schema.oneOf;
    if (!variants) return true;
    const activeVariant = variants[this._activeVariantIndex];
    if (!activeVariant) return true;

    const requiredSet = new Set(activeVariant.required ?? []);
    let allValid = true;

    for (const [field, child] of this._activeChildren) {
      if (field === this._discriminatorField) continue;
      if (isFormValueProvider(child)) {
        if (!child.validate()) allValid = false;
      } else {
        const fieldSchema = activeVariant.properties?.[field];
        if (fieldSchema) {
          const val = readFieldValue(child, this._activeChildTypes.get(field) ?? "input");
          const err = validateField(fieldSchema, val, requiredSet.has(field));
          setFieldError(child, this._activeChildTypes.get(field) ?? "input", err ?? undefined);
          if (err) allValid = false;
        }
      }
    }
    return allValid;
  }

  override render(): TemplateResult {
    if (!this.schema) return html``;
    const variants = this.schema.oneOf ?? [];
    if (variants.length === 0) return html``;

    const activeVariant = variants[this._activeVariantIndex];
    if (!activeVariant) return html``;

    const activeProps = activeVariant.properties ?? {};
    const fields = Object.keys(activeProps).filter(f => f !== this._discriminatorField);
    const staleKeys = new Set(this._activeChildren.keys());

    for (const field of fields) {
      staleKeys.delete(field);
      const fieldSchema = activeProps[field]!;
      const componentType = mapFieldToComponentType(fieldSchema);
      const tagName = `pages-${componentType}`;
      const label = fieldSchema.title ?? field.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());

      let child = this._activeChildren.get(field);
      if (!child || child.tagName.toLowerCase() !== tagName) {
        child = document.createElement(tagName);
        this._activeChildren.set(field, child);
      }
      this._activeChildTypes.set(field, componentType);

      if (COMPOSITE_TYPES.has(componentType)) {
        (child as any).schema = fieldSchema;
        (child as any).label = label;
        (child as any).fieldName = field;
        (child as any).editable = this.editable;
      } else {
        (child as any).label = label;
        (child as any).disabled = !this.editable;
        const requiredSet = new Set(activeVariant.required ?? []);
        (child as any).required = requiredSet.has(field);
        if (componentType === "select" && fieldSchema.enum) {
          (child as any).options = fieldSchema.enum.map((v: string) => ({ value: v, label: v }));
        }
      }
    }

    for (const key of staleKeys) {
      this._activeChildren.get(key)?.remove();
      this._activeChildren.delete(key);
      this._activeChildTypes.delete(key);
    }

    const legendId = `variant-legend-${this.fieldName}`;
    const variantOptions = this._getVariantOptions();
    const activeDiscriminatorValue = this._discriminatorField
      ? String(activeVariant.properties?.[this._discriminatorField]?.const ?? "")
      : "";

    return html`
      <fieldset class="variant-group" role="group" aria-labelledby="${legendId}">
        <legend id="${legendId}">${this.label}</legend>
        ${this._discriminatorField ? html`
          <pages-select
            .label=${this._discriminatorField}
            .options=${variantOptions}
            .value=${activeDiscriminatorValue}
            ?disabled=${!this.editable}
            @pages-field-change=${this._onVariantSwitch}
          ></pages-select>
        ` : ""}
        <div class="variant-fields">
          ${fields.map(field => this._activeChildren.get(field)!)}
        </div>
      </fieldset>
    `;
  }
}

if (!customElements.get("pages-variant-group")) {
  customElements.define("pages-variant-group", PagesVariantGroup);
}
