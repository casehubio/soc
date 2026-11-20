import { LitElement, html, css, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PatternViewMixin, patternViewStyles } from '../shared-styles.js';
import '../agent-card.js';

@customElement('agency-base-pattern-view')
export class BasePatternView extends PatternViewMixin(LitElement) {
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
      background: rgba(137, 180, 250, 0.15);
      color: #89b4fa;
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
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .agents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      padding: 12px 16px;
    }
  `];

  override render() {
    if (!this.spec) return this.renderEmptyState();
    const agents = 'agents' in this.spec ? this.spec.agents : undefined;
    return html`
      <div class="header">
        <span class="category-badge">${this.spec.category}</span>
        <span class="type-badge">${this.spec.type}</span>
        ${this.spec.name ? html`<span class="header-name">${this.spec.name}</span>` : nothing}
      </div>
      ${this.spec.description ? html`<div class="description">${this.spec.description}</div>` : nothing}
      ${agents?.length ? html`
        <div class="agents-grid">
          ${agents.map(a => html`<agent-card .agent=${a}></agent-card>`)}
        </div>
      ` : nothing}
    `;
  }
}
