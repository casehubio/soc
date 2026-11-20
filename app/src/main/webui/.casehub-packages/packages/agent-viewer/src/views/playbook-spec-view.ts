import { LitElement, html, css, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PatternViewMixin, patternViewStyles } from '../shared-styles.js';

@customElement('agency-playbook-spec-view')
export class PlaybookSpecView extends PatternViewMixin(LitElement) {
  static override styles = [patternViewStyles, css`
    .header {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .category-badge {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(203, 166, 247, 0.15);
      color: #cba6f7;
    }
    .type-badge {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(166, 227, 161, 0.15);
      color: #a6e3a1;
    }
    .header-name {
      font-size: 14px;
      font-weight: 600;
      color: #f0f4ff;
      margin-left: auto;
    }
    .description {
      padding: 12px 16px;
      font-size: 13px;
      color: #a6adc8;
    }
    .note {
      padding: 12px 16px;
      font-size: 12px;
      color: #7f849c;
      font-style: italic;
    }
  `];

  override render() {
    if (!this.spec) return this.renderEmptyState();
    return html`
      <div class="header">
        <span class="category-badge">playbook</span>
        <span class="type-badge">${this.spec.type}</span>
        ${this.spec.name ? html`<span class="header-name">${this.spec.name}</span>` : nothing}
      </div>
      ${this.spec.description ? html`<div class="description">${this.spec.description}</div>` : nothing}
      <div class="note">Playbook step orchestration — see Steps tab for runtime pipeline view</div>
    `;
  }
}
