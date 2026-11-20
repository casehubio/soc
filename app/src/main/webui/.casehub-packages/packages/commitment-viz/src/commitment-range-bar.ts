import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { CommitmentState } from '@casehubio/mosaic-core';
import { commitmentStateCategory, isTerminalCommitmentState } from '@casehubio/mosaic-core';
import { pulseAnimation } from '@casehubio/pages-ui-tokens';
import { stateCategoryStyles } from '@casehubio/pages-ui-components';

interface Milestone {
  label: string;
  timestamp: string;
  status: 'completed' | 'active' | 'pending';
}

export interface CommitmentRangeBarProps {
  state?: CommitmentState;
  createdAt?: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  deadline?: string;
  mode: 'compact' | 'detailed';
}

@customElement('commitment-range-bar')
export class CommitmentRangeBar extends LitElement {
  @property({ type: String }) state?: CommitmentState;
  @property({ type: String }) createdAt?: string;
  @property({ type: String }) resolvedAt?: string;
  @property({ type: String }) acknowledgedAt?: string;
  @property({ type: String }) deadline?: string;
  @property({ type: String }) mode: 'compact' | 'detailed' = 'compact';

  static override styles = [
    pulseAnimation,
    css`
      :host { display: block; }
      .compact-container { position: relative; width: 100%; }
      .bar {
        height: 4px;
        border-radius: 2px;
        width: 100%;
        position: relative;
      }
      .pulse { animation: pulse 2s infinite; }
      .deadline-tick {
        position: absolute;
        top: -2px;
        width: 2px;
        height: 8px;
        background: var(--pages-danger-9, #dc2626);
        border-radius: 1px;
      }
      .detailed-container {
        display: flex;
        align-items: flex-start;
        gap: 0;
        position: relative;
        padding: 8px 0;
      }
      .segment {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
      }
      .milestone {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        z-index: 1;
      }
      .milestone-completed { background: var(--pages-success-9, #16a34a); }
      .milestone-active { background: var(--pages-accent-9, #2563eb); animation: pulse 2s infinite; }
      .milestone-pending { background: var(--pages-neutral-6, #d1d5db); }
      .connector {
        position: absolute;
        top: 13px;
        left: 50%;
        right: -50%;
        height: 2px;
        z-index: 0;
      }
      .connector-completed { background: var(--pages-success-9, #16a34a); }
      .connector-pending { background: var(--pages-neutral-6, #d1d5db); }
      .milestone-label {
        font-size: 11px;
        color: var(--pages-neutral-11, #374151);
        margin-top: 6px;
        text-align: center;
      }
      .milestone-time {
        font-size: 10px;
        color: var(--pages-neutral-8, #9ca3af);
        margin-top: 2px;
        text-align: center;
      }
      @media (prefers-reduced-motion: reduce) {
        .pulse { animation: none; }
        .milestone-active { animation: none; }
      }
    `,
  ];

  private _formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  private _buildMilestones(): Milestone[] {
    const milestones: Milestone[] = [];
    const isTerminal = this.state ? isTerminalCommitmentState(this.state) : false;

    milestones.push({
      label: 'Created',
      timestamp: this.createdAt!,
      status: 'completed',
    });

    if (this.acknowledgedAt) {
      milestones.push({
        label: 'Acknowledged',
        timestamp: this.acknowledgedAt,
        status: isTerminal || this.state === 'ACKNOWLEDGED' ? 'completed' : 'active',
      });
    }

    if (this.resolvedAt && this.state) {
      const label = this.state.charAt(0) + this.state.slice(1).toLowerCase();
      milestones.push({
        label,
        timestamp: this.resolvedAt,
        status: 'completed',
      });
    } else if (this.state && !isTerminal) {
      milestones.push({
        label: 'In progress',
        timestamp: '',
        status: 'active',
      });
    }

    return milestones;
  }

  private _renderCompact() {
    if (!this.state || !this.createdAt) return nothing;
    const category = commitmentStateCategory(this.state);
    const colors = stateCategoryStyles(category);
    const isOpen = !isTerminalCommitmentState(this.state);
    const isOverdue = isOpen && this.deadline != null && new Date(this.deadline) < new Date();
    const bg = isOverdue ? 'var(--pages-danger-9, #dc2626)' : colors.background;

    let deadlinePosition: number | undefined;
    if (this.deadline != null && this.createdAt) {
      const start = new Date(this.createdAt).getTime();
      const end = this.resolvedAt ? new Date(this.resolvedAt).getTime() : Date.now();
      const dl = new Date(this.deadline).getTime();
      const range = end - start;
      if (range > 0) {
        deadlinePosition = Math.min(100, Math.max(0, ((dl - start) / range) * 100));
      }
    }

    return html`
      <div class="compact-container">
        <div
          class="bar ${isOpen ? 'pulse' : ''}"
          style=${styleMap({ background: bg })}
          title="Commitment state: ${this.state}"
          role="img"
          aria-label="Commitment range: ${this.state}"
        >
          ${deadlinePosition !== undefined ? html`
            <div class="deadline-tick" style="left: ${deadlinePosition}%"></div>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _renderDetailed() {
    if (!this.state || !this.createdAt) return nothing;
    const milestones = this._buildMilestones();

    return html`
      <div class="detailed-container" role="img" aria-label="Commitment timeline: ${this.state}">
        ${milestones.map((ms, i) => html`
          <div class="segment">
            <div class="milestone milestone-${ms.status}"></div>
            ${i < milestones.length - 1 ? html`
              <div class="connector ${ms.status === 'completed' ? 'connector-completed' : 'connector-pending'}"></div>
            ` : nothing}
            <div class="milestone-label">${ms.label}</div>
            ${ms.timestamp ? html`<div class="milestone-time">${this._formatTime(ms.timestamp)}</div>` : nothing}
          </div>
        `)}
      </div>
    `;
  }

  override render() {
    return this.mode === 'compact' ? this._renderCompact() : this._renderDetailed();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'commitment-range-bar': CommitmentRangeBar;
  }
}
