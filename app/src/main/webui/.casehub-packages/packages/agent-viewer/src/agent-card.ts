import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AgentRef } from '@casehubio/mosaic-core';

@customElement('agent-card')
export class AgentCard extends LitElement {
  @property({ attribute: false }) agent!: AgentRef;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px 16px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      color: #cdd6f4;
      min-width: 200px;
      box-sizing: border-box;
      cursor: pointer;
      transition: background 0.15s;
    }
    :host(:hover) {
      background: rgba(255, 255, 255, 0.07);
    }
    .icon {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: rgba(250, 179, 135, 0.15);
      color: #fab387;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
    }
    .info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .name {
      font-size: 12px;
      font-weight: 500;
      color: #cdd6f4;
    }
    .description {
      font-size: 10px;
      color: #7f849c;
      line-height: 1.4;
    }
    .badges {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .type-badge {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .type-badge.worker   { background: rgba(250, 179, 135, 0.15); color: #fab387; }
    .type-badge.human    { background: rgba(148, 226, 213, 0.15); color: #94e2d5; }
    .type-badge.external { background: rgba(137, 180, 250, 0.15); color: #89b4fa; }
    .type-badge.composed { background: rgba(203, 166, 247, 0.15); color: #cba6f7; }
    .model-badge {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(127, 132, 156, 0.15);
      color: #bac2de;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      flex-shrink: 0;
    }
  `;

  private static readonly ICONS: Record<string, string> = {
    worker: '⬡', human: '👤', external: '⇄', composed: '◫', channel: '◇',
  };

  override render() {
    if (!this.agent) return nothing;
    const a = this.agent;
    const icon = AgentCard.ICONS[a.type] ?? '⬡';
    return html`
      <div class="icon">${icon}</div>
      <span class="name">${a.name}</span>
      ${a.description ? html`<span class="description">${a.description}</span>` : nothing}
      <div class="badges">
        ${a.model ? html`<span class="model-badge">${a.model}</span>` : nothing}
        <span class="type-badge ${a.type}">${a.type}</span>
      </div>
    `;
  }
}
