import { html, css, type TemplateResult, type CSSResult } from "lit";

export function renderPropertyTree(value: unknown, depth = 0): TemplateResult {
  if (value === null || value === undefined) {
    return html`<span class="pt-null">—</span>`;
  }

  if (typeof value === "boolean") {
    return html`<span class="pt-bool">${value ? "Yes" : "No"}</span>`;
  }

  if (typeof value === "number") {
    return html`<span class="pt-number">${value}</span>`;
  }

  if (typeof value === "string") {
    if (value === "") return html`<span class="pt-null">—</span>`;
    return html`<span class="pt-string">${value}</span>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return html`<span class="pt-null">—</span>`;
    if (value.every(v => typeof v !== "object" || v === null)) {
      return html`<span class="pt-list">${value.map((v, i) =>
        html`${i > 0 ? ", " : ""}${v === null ? "—" : String(v)}`
      )}</span>`;
    }
    return html`<div class="pt-array">${value.map((item, i) =>
      html`<div class="pt-array-item">
        <span class="pt-index">${i + 1}.</span>
        ${renderPropertyTree(item, depth + 1)}
      </div>`
    )}</div>`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return html`<span class="pt-null">—</span>`;
    return html`<dl class="pt-object">${entries.map(([key, val]) => {
      const isNested = val !== null && typeof val === "object" && !Array.isArray(val) && Object.keys(val).length > 0;
      const isObjectArray = Array.isArray(val) && val.length > 0 && val.some(v => typeof v === "object" && v !== null);
      return html`
        <dt class="pt-key">${key}</dt>
        <dd class="pt-value${isNested || isObjectArray ? " pt-nested" : ""}">${renderPropertyTree(val, depth + 1)}</dd>
      `;
    })}</dl>`;
  }

  return html`<span class="pt-string">${String(value)}</span>`;
}

export const propertyTreeStyles = css`
  .pt-object {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 12px;
    align-items: baseline;
  }

  .pt-key {
    font-weight: 500;
    font-size: 13px;
    color: var(--pages-neutral-11, #374151);
    white-space: nowrap;
  }

  .pt-value {
    font-size: 13px;
    color: var(--pages-neutral-12, #111827);
    word-break: break-word;
  }

  .pt-value.pt-nested {
    grid-column: 1 / -1;
    padding-left: 16px;
    border-left: 2px solid var(--pages-neutral-4, #e5e7eb);
    margin: 2px 0 4px 0;
  }

  .pt-null {
    color: var(--pages-neutral-8, #9ca3af);
    font-style: italic;
  }

  .pt-bool {
    font-weight: 500;
  }

  .pt-number {
    font-family: var(--pages-font-mono, monospace);
    font-size: 13px;
  }

  .pt-string {
    font-size: 13px;
  }

  .pt-list {
    font-size: 13px;
  }

  .pt-array {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pt-array-item {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }

  .pt-index {
    color: var(--pages-neutral-8, #9ca3af);
    font-size: 12px;
    font-weight: 500;
    flex-shrink: 0;
  }
` as CSSResult;
