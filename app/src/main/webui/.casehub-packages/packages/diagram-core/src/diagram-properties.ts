import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property as litProp } from 'lit/decorators.js';
import { renderPropertyForm, emitPropertyChange } from './form/property-form.js';

export { renderPropertyForm, emitPropertyChange };

@customElement('diagram-properties')
export class DiagramProperties extends LitElement {
  @litProp({ attribute: false }) schema: Record<string, unknown> = {};
  @litProp({ attribute: false }) data: Record<string, unknown> = {};
  @litProp({ type: Boolean }) readonly = false;

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui, sans-serif); }
    .panel { padding: 12px; overflow-y: auto; height: 100%; box-sizing: border-box; }
    .panel-header { font-size: 14px; font-weight: 700; margin-bottom: 12px; color: var(--pages-text-color, #333); }
  `;

  override render() {
    const nodeName = String(this.data['name'] ?? this.data['type'] ?? 'Properties');

    return html`
      <div class="panel">
        <div class="panel-header">${nodeName}</div>
        ${renderPropertyForm(this.schema, this.data, this.readonly, (field, value) => {
          this.dispatchEvent(emitPropertyChange(field, value));
        })}
      </div>
    `;
  }
}
