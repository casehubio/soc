import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { lookupStatus, stateCategoryStyles } from '@casehubio/pages-ui-components/status-badge';
import { statusBorderColour, badgeStyles, roundDividerStyles, selectedHighlightStyles } from '@casehubio/mosaic-core';
import type { EntryCategory } from '@casehubio/mosaic-core';
import type { ConversationPoint } from './types.js';

const CATEGORY_MAP: Record<string, EntryCategory> = {
  active: 'accent', info: 'accent', success: 'success',
  danger: 'error', neutral: 'neutral', warning: 'warning', transfer: 'accent',
};

export interface PointListProps {
  points: ConversationPoint[];
  currentRound: number;
  selectionTopic: string;
}

@customElement('blocks-point-list')
export class PointList extends LitElement {
  @property({ attribute: false }) points: ConversationPoint[] = [];
  @property({ type: Number }) currentRound = 0;
  @property({ type: String }) selectionTopic = 'conversation-point';
  @property({ attribute: false }) renderPoint?: (point: ConversationPoint) => TemplateResult | undefined;

  @state() private _selectedPointId: string | null = null;

  static override styles = [badgeStyles, roundDividerStyles, selectedHighlightStyles, css`
    :host { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .list-container { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
    .point-item {
      padding: 8px 10px; border: 1px solid var(--pages-neutral-4, #e5e7eb);
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-neutral-1, #fafafa); cursor: pointer;
      transition: all 0.15s; border-left: 3px solid var(--pages-neutral-8, #9ca3af);
      display: flex; flex-direction: column; gap: 4px;
    }
    .point-item:hover:not(.selected) {
      border-color: var(--pages-accent-9, #6366f1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .point-header { display: flex; align-items: center; gap: 6px; }
    .point-icon { font-size: 14px; width: 16px; text-align: center; flex-shrink: 0; }
    .point-topic {
      flex: 1; font-size: 13px; font-weight: 600;
      color: var(--pages-neutral-12, #111); overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .point-meta {
      display: flex; gap: 6px; flex-wrap: wrap;
      font-size: 11px; color: var(--pages-neutral-8, #9ca3af);
    }
    .point-secondary { font-size: 11px; color: var(--pages-neutral-8, #9ca3af); }
    .empty { padding: 24px; text-align: center; color: var(--pages-neutral-8, #9ca3af); font-size: 12px; font-style: italic; }
  `];

  private _onPointClick(point: ConversationPoint): void {
    if (this._selectedPointId === point.id) {
      this._selectedPointId = null;
      emitPagesEvent(this, `${this.selectionTopic}:deselected`, { pointId: point.id });
    } else {
      this._selectedPointId = point.id;
      emitPagesEvent(this, `${this.selectionTopic}:selected`, {
        pointId: point.id, round: point.round,
        location: point.classification.location,
      });
    }
  }

  private _renderPointItem(point: ConversationPoint): TemplateResult {
    const custom = this.renderPoint?.(point);
    if (custom) return custom;

    const descriptor = lookupStatus('conversation', point.status);
    const borderColour = statusBorderColour(CATEGORY_MAP[descriptor.category] ?? 'neutral');
    const isSelected = this._selectedPointId === point.id;

    return html`
      <div
        class="point-item ${isSelected ? 'selected' : ''}"
        style="border-left-color: ${borderColour}"
        @click=${() => this._onPointClick(point)}
      >
        <div class="point-header">
          <span class="point-icon">${descriptor.icon}</span>
          <span class="point-topic">${point.topic}</span>
        </div>
        <div class="point-meta">
          <span class="badge badge-priority">${point.classification.priority}</span>
          <span class="badge badge-scope">${point.classification.scope}</span>
          ${point.classification.location ? html`<span class="badge badge-location">${point.classification.location}</span>` : nothing}
        </div>
        <div class="point-secondary">
          ${point.entries.length} entr${point.entries.length === 1 ? 'y' : 'ies'} · ${point.status}
        </div>
      </div>
    `;
  }

  override render() {
    if (this.points.length === 0) {
      return html`<div class="list-container"><div class="empty">No conversation points</div></div>`;
    }

    let currentRound: number | null = null;
    return html`
      <div class="list-container" role="log" aria-label="Conversation points" aria-live="polite">
        ${this.points.map(point => {
          const parts: TemplateResult[] = [];
          if (point.round !== currentRound) {
            currentRound = point.round;
            parts.push(html`<div class="round-divider">Round ${point.round}</div>`);
          }
          parts.push(this._renderPointItem(point));
          return parts;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-point-list': PointList;
  }
}
