import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { onPagesEvent } from '@casehubio/pages-data';
import type {
  PipelineProgressPayload,
  PipelineDimension,
  PipelineDecisionPayload,
  PipelineDecisionData,
} from './types.js';

@customElement('review-pipeline')
export class ReviewPipeline extends LitElement {
  @state() private _pipeline: PipelineProgressPayload | null = null;
  @state() private _decisions: PipelineDecisionData[] = [];

  private _cleanups: (() => void)[] = [];

  configure(_props: Record<string, unknown>): void {}

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Review pipeline progress');
    this._cleanups.push(
      onPagesEvent<PipelineProgressPayload>(document, 'pipeline-progress', (p) => {
        this._pipeline = p;
      }),
      onPagesEvent<PipelineDecisionPayload>(document, 'pipeline-decisions', (p) => {
        this._decisions = p.decisions;
      }),
      onPagesEvent(document, 'reconnected', () => {}),
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cleanups.forEach(fn => fn());
    this._cleanups = [];
  }

  private _statusBadge(status: string) {
    const map: Record<string, { cls: string; label: string }> = {
      PENDING: { cls: 'pending', label: 'pending' },
      RUNNING: { cls: 'running', label: 'running' },
      DONE: { cls: 'done', label: 'done' },
      KILLED: { cls: 'killed', label: 'refused' },
      FAILED: { cls: 'failed', label: 'failed' },
    };
    const s = map[status] ?? { cls: 'pending', label: status.toLowerCase() };
    return html`<span class="badge ${s.cls}">${s.label}</span>`;
  }

  private _decisionBadge(status: string) {
    const cls = status === 'confirmed' ? 'confirmed'
      : status === 'challenged' ? 'challenged'
      : status === 'rejected' ? 'rejected'
      : status === 'revised' ? 'revised'
      : 'captured';
    return html`<span class="dbadge ${cls}">${status}</span>`;
  }

  private _phaseClass(phase: string, current: string) {
    const phases = ['ROUND_1', 'HIL_CHECKPOINT_1', 'REMAINING_ROUNDS', 'HIL_CHECKPOINT_2', 'CROSS_CUTTING', 'COMPLETE'];
    const ci = phases.indexOf(current);
    const pi = phases.indexOf(phase);
    if (pi < ci) return 'phase-done';
    if (pi === ci) return 'phase-active';
    return 'phase-pending';
  }

  private _phaseLabel(phase: string) {
    const labels: Record<string, string> = {
      ROUND_1: 'Round 1',
      HIL_CHECKPOINT_1: 'HIL',
      REMAINING_ROUNDS: 'Rounds 2+',
      HIL_CHECKPOINT_2: 'HIL',
      CROSS_CUTTING: 'Cross-cutting',
      COMPLETE: 'Complete',
    };
    return labels[phase] ?? phase;
  }

  private _formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  private _renderDecisions() {
    if (this._decisions.length === 0) return nothing;
    const allTerminal = this._decisions.every(d =>
      d.status === 'confirmed' || d.status === 'rejected');
    return html`
      <details ?open=${!allTerminal}>
        <summary class="section-header">Decisions (${this._decisions.length})</summary>
        <div class="decisions-list">
          ${this._decisions.map(d => html`
            <details class="decision-card">
              <summary>${d.id}: ${d.title} ${this._decisionBadge(d.status)}</summary>
              <div class="decision-detail">
                <div><strong>Choice:</strong> ${d.choice}</div>
                ${d.alternatives.length > 0 ? html`
                  <div><strong>Alternatives:</strong>
                    <ul>${d.alternatives.map(a => html`<li>${a}</li>`)}</ul>
                  </div>` : nothing}
                ${d.rationale ? html`<div><strong>Rationale:</strong> ${d.rationale}</div>` : nothing}
                ${d.tradeoffs ? html`<div><strong>Trade-offs:</strong> ${d.tradeoffs}</div>` : nothing}
              </div>
            </details>
          `)}
        </div>
      </details>
    `;
  }

  private _renderPhaseHeader() {
    if (!this._pipeline) return nothing;
    const phases = ['ROUND_1', 'HIL_CHECKPOINT_1', 'REMAINING_ROUNDS', 'HIL_CHECKPOINT_2', 'CROSS_CUTTING'];
    return html`
      <div class="phase-header">
        ${phases.map((p, i) => html`
          ${i > 0 ? html`<span class="phase-arrow">→</span>` : nothing}
          <span class="phase-segment ${this._phaseClass(p, this._pipeline!.phase)}">
            ${this._phaseLabel(p)}
            ${(p === 'HIL_CHECKPOINT_1' || p === 'HIL_CHECKPOINT_2')
              && this._pipeline!.checkpointStatus === 'PENDING'
              && this._pipeline!.phase === p
              ? html`<span class="checkpoint-badge">⚠</span>` : nothing}
          </span>
        `)}
      </div>
    `;
  }

  private _renderDimensionCards() {
    if (!this._pipeline) return nothing;
    return html`
      <div class="dimension-cards">
        ${this._pipeline.dimensions.map(dim => html`
          <div class="dim-card ${dim.status.toLowerCase()}">
            <div class="dim-header">
              ${this._statusBadge(dim.status)}
              <span class="dim-name">${dim.name}</span>
            </div>
            ${dim.status === 'RUNNING' || dim.status === 'DONE' ? html`
              <div class="dim-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${dim.totalRounds > 0
                    ? (dim.currentRound / dim.totalRounds * 100) : 0}%"></div>
                </div>
                <span class="round-label">round ${dim.currentRound}${dim.totalRounds > 0
                  ? `/${dim.totalRounds}` : ''}</span>
              </div>
              <div class="dim-stats">
                ${this._renderIssuePills(dim)}
                <span class="cost">$${dim.cost.toFixed(2)}</span>
                ${dim.status === 'RUNNING' ? html`<span class="elapsed">${this._formatElapsed(dim.elapsed)}</span>` : nothing}
              </div>
            ` : nothing}
            ${dim.status === 'KILLED' ? html`<span class="dim-note">refused at checkpoint</span>` : nothing}
            ${dim.status === 'FAILED' ? html`<span class="dim-note">review failed</span>` : nothing}
          </div>
        `)}
      </div>
    `;
  }

  private _renderIssuePills(dim: PipelineDimension) {
    const priorities = ['HIGH', 'MEDIUM', 'LOW'];
    return html`
      <span class="issue-pills">
        ${priorities.map(p => {
          const count = dim.issuesByPriority[p] ?? 0;
          return count > 0 ? html`<span class="pill ${p.toLowerCase()}">${count} ${p[0]}</span>` : nothing;
        })}
      </span>
    `;
  }

  static override styles = css`
    :host { display: block; padding: 8px 12px; font-size: 12px; color: var(--pages-neutral-12, #e5e7eb); overflow-y: auto; }
    .empty { color: var(--pages-neutral-8, #9ca3af); font-style: italic; padding: 24px; text-align: center; }
    .section-header { cursor: pointer; font-weight: 600; font-size: 13px; margin-bottom: 6px; }
    .decisions-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .decision-card { border: 1px solid var(--pages-neutral-6, #4b5563); border-radius: 4px; padding: 4px 8px; }
    .decision-card summary { cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .decision-detail { padding: 6px 0 2px; font-size: 11px; line-height: 1.5; }
    .decision-detail ul { margin: 2px 0; padding-left: 16px; }
    .dbadge { font-size: 10px; padding: 1px 5px; border-radius: 3px; font-weight: 500; }
    .dbadge.captured { background: var(--pages-neutral-6); color: var(--pages-neutral-11); }
    .dbadge.confirmed { background: var(--pages-success-3, #064e3b); color: var(--pages-success-11, #6ee7b7); }
    .dbadge.challenged { background: var(--pages-warning-3, #78350f); color: var(--pages-warning-11, #fcd34d); }
    .dbadge.rejected { background: var(--pages-error-3, #7f1d1d); color: var(--pages-error-11, #fca5a5); }
    .dbadge.revised { background: var(--pages-accent-3, #312e81); color: var(--pages-accent-11, #a5b4fc); }
    .phase-header { display: flex; align-items: center; gap: 4px; margin: 8px 0; flex-wrap: wrap; }
    .phase-segment { padding: 2px 8px; border-radius: 3px; font-size: 11px; }
    .phase-arrow { color: var(--pages-neutral-7); font-size: 10px; }
    .phase-done { background: var(--pages-success-3); color: var(--pages-success-11); }
    .phase-active { background: var(--pages-accent-3); color: var(--pages-accent-11); font-weight: 600; }
    .phase-pending { background: var(--pages-neutral-3, #1f2937); color: var(--pages-neutral-8); }
    .checkpoint-badge { color: var(--pages-warning-9, #f59e0b); margin-left: 3px; }
    .dimension-cards { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
    .dim-card { border: 1px solid var(--pages-neutral-6); border-radius: 4px; padding: 6px 8px; }
    .dim-card.killed { opacity: 0.6; }
    .dim-card.failed { border-color: var(--pages-error-7, #b91c1c); }
    .dim-header { display: flex; align-items: center; gap: 6px; }
    .dim-name { font-weight: 500; text-transform: capitalize; }
    .badge { font-size: 10px; padding: 1px 5px; border-radius: 3px; }
    .badge.pending { background: var(--pages-neutral-4); color: var(--pages-neutral-9); }
    .badge.running { background: var(--pages-accent-3); color: var(--pages-accent-11); }
    .badge.done { background: var(--pages-success-3); color: var(--pages-success-11); }
    .badge.killed { background: var(--pages-error-3); color: var(--pages-error-11); text-decoration: line-through; }
    .badge.failed { background: var(--pages-error-3); color: var(--pages-error-11); }
    .dim-progress { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .progress-bar { flex: 1; height: 3px; background: var(--pages-neutral-4); border-radius: 2px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--pages-accent-9, #6366f1); transition: width 0.3s; }
    .round-label { font-size: 10px; color: var(--pages-neutral-8); white-space: nowrap; }
    .dim-stats { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 11px; }
    .issue-pills { display: flex; gap: 3px; }
    .pill { font-size: 10px; padding: 0 4px; border-radius: 2px; }
    .pill.high { background: var(--pages-error-3); color: var(--pages-error-11); }
    .pill.medium { background: var(--pages-warning-3); color: var(--pages-warning-11); }
    .pill.low { background: var(--pages-neutral-4); color: var(--pages-neutral-9); }
    .cost { color: var(--pages-neutral-8); }
    .elapsed { color: var(--pages-neutral-8); font-variant-numeric: tabular-nums; }
    .dim-note { font-size: 10px; color: var(--pages-neutral-8); font-style: italic; margin-top: 2px; }
  `;

  override render() {
    if (!this._pipeline && this._decisions.length === 0) {
      return html`<div class="empty">No active review pipeline</div>`;
    }
    return html`
      ${this._renderDecisions()}
      ${this._renderPhaseHeader()}
      ${this._renderDimensionCards()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'review-pipeline': ReviewPipeline;
  }
}
