import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { computeCoordinationDiff } from './coordination-diff-model.js';
import { assignTiers } from './coordination-graph-model.js';
import type { GraphTier, GraphConnector, GraphNode } from './coordination-graph-model.js';
import type { CoordinationPipeline, CoordinationStep } from './coordination-types.js';
import type { DiffResult, DiffAnnotation, FieldChange } from './coordination-diff-types.js';

const ACTION_ICONS: Record<string, { icon: string; cssClass: string }> = {
  'agent-delegate': { icon: '⬡', cssClass: 'agent' },
  'rest': { icon: 'R', cssClass: 'rest' },
  'graphql': { icon: 'G', cssClass: 'graphql' },
  'mcp-call': { icon: 'M', cssClass: 'mcp' },
};

@customElement('coordination-diff-view')
export class CoordinationDiffView extends LitElement {
  @property({ attribute: false }) oldPipeline!: CoordinationPipeline;
  @property({ attribute: false }) newPipeline!: CoordinationPipeline;

  private _diffResult?: DiffResult;

  static override styles = css`
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      color: #cdd6f4;
      background: #282a3a;
      border: 1px solid #3b3d52;
      border-radius: 8px;
      overflow: hidden;
    }

    .diff-summary {
      padding: 12px 16px;
      border-bottom: 1px solid #3b3d52;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .diff-summary .title {
      font-weight: 600;
      color: #f0f4ff;
      font-size: 13px;
    }
    .diff-stat {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #cdd6f4;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dot.green { background: #a6e3a1; }
    .dot.red { background: #f38ba8; }
    .dot.amber { background: #f9e2af; }

    .graph-header {
      padding: 10px 16px;
      border-bottom: 1px solid #3b3d52;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .graph-header .label {
      font-size: 12px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .diff-marker {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .diff-marker.added {
      background: rgba(166, 227, 161, 0.2);
      color: #a6e3a1;
    }
    .diff-marker.removed {
      background: rgba(243, 139, 168, 0.2);
      color: #f38ba8;
    }
    .diff-marker.modified {
      background: rgba(249, 226, 175, 0.2);
      color: #f9e2af;
    }

    .graph-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      padding: 24px 32px;
    }
    .graph-tier {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 8px 0;
      flex-wrap: wrap;
    }
    .graph-connector {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4px 0;
      gap: 4px;
    }
    .connector-chevron {
      font-size: 10px;
      color: #585b70;
    }
    .fan-out-labels {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .edge-label {
      font-size: 10px;
      color: #7f849c;
      padding: 2px 8px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 3px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    .step-card {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
    }
    .step-icon {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
      font-weight: 600;
    }
    .step-icon.agent   { background: rgba(250, 179, 135, 0.15); color: #fab387; }
    .step-icon.rest    { background: rgba(137, 180, 250, 0.15); color: #89b4fa; }
    .step-icon.graphql { background: rgba(245, 194, 231, 0.15); color: #f5c2e7; }
    .step-icon.mcp     { background: rgba(203, 166, 247, 0.15); color: #cba6f7; }
    .step-action { font-weight: 500; color: #cdd6f4; }
    .step-target { color: #7f849c; font-size: 12px; }
    .step-badges {
      margin-left: auto;
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .badge-model {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(137, 180, 250, 0.2);
      color: #89b4fa;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    .diff-unchanged { opacity: 0.5; }
    .diff-added .step-card {
      background: rgba(166, 227, 161, 0.08);
      border: 1px solid #a6e3a1;
    }
    .diff-removed .step-card {
      background: rgba(243, 139, 168, 0.08);
      border: 1px solid #f38ba8;
    }
    .diff-removed .step-action {
      text-decoration: line-through;
      color: #7f849c;
    }
    .diff-modified .step-card {
      border: 2px solid #f9e2af;
    }

    .graph-quorum {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: rgba(137, 180, 250, 0.06);
      border: 1px dashed #89b4fa;
      border-radius: 4px;
    }
    .graph-quorum.diff-modified {
      background: rgba(249, 226, 175, 0.06);
      border-color: #f9e2af;
    }
    .quorum-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .graph-quorum:not(.diff-modified) .quorum-label { color: #89b4fa; }
    .graph-quorum.diff-modified .quorum-label { color: #f9e2af; }
    .quorum-detail {
      font-size: 11px;
      color: #585b70;
    }
    .old-value {
      text-decoration: line-through;
      color: #7f849c;
      margin-right: 4px;
    }
    .new-value {
      color: #f9e2af;
      font-weight: 500;
    }

    .graph-signal {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
    }
    .signal-label {
      font-size: 11px;
      font-weight: 600;
      color: #cba6f7;
    }
    .signal-desc {
      font-size: 11px;
      color: #585b70;
    }

    .param-changes {
      font-size: 11px;
      color: #7f849c;
      text-align: center;
      padding-top: 4px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .param-added { color: #a6e3a1; }
    .param-removed { color: #f38ba8; text-decoration: line-through; }
    .param-changed .expr { color: #fab387; }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'img');
  }

  override willUpdate() {
    if (this.oldPipeline && this.newPipeline) {
      this._diffResult = computeCoordinationDiff(this.oldPipeline, this.newPipeline);
      const s = this._diffResult.summary;
      this.setAttribute('aria-label',
        `Diff view: ${this._diffResult.name} — ${s.added} added, ${s.removed} removed, ${s.modified} modified`);
    }
  }

  override render() {
    if (!this._diffResult) return nothing;
    const diff = this._diffResult;
    const mergedPhases = diff.phases
      .filter(a => a.diff.status !== 'removed')
      .map(a => a.phase);
    const elements = assignTiers(mergedPhases);
    const annotationMap = this._buildAnnotationMap(diff);

    return html`
      ${this._renderDiffSummary(diff)}
      ${this._renderGraphHeader()}
      <div class="graph-view">
        ${elements.map(el => el.kind === 'tier'
          ? this._renderTier(el, annotationMap)
          : this._renderConnector(el, annotationMap)
        )}
      </div>
    `;
  }

  private _buildAnnotationMap(diff: DiffResult): Map<string, DiffAnnotation> {
    const map = new Map<string, DiffAnnotation>();
    for (const { phase, diff: annotation } of diff.phases) {
      if (phase.type === 'parallel' && annotation.status === 'modified' && annotation.changes) {
        for (const change of annotation.changes) {
          if (change.field.startsWith('lane.')) {
            const laneName = change.field.slice(5);
            const lanes = (phase as Extract<typeof phase, { type: 'parallel' }>).lanes;
            const steps = lanes[laneName];
            if (steps) {
              const status = change.oldValue === undefined ? 'added' : 'removed';
              for (const step of steps) {
                map.set(`${step.action}:${step.target ?? ''}`, { status });
              }
            }
          }
        }
        for (const [laneName, steps] of Object.entries((phase as Extract<typeof phase, { type: 'parallel' }>).lanes)) {
          for (const step of steps) {
            const key = `${step.action}:${step.target ?? ''}`;
            if (!map.has(key)) {
              map.set(key, { status: 'unchanged' });
            }
          }
        }
      } else {
        map.set(this._phaseNodeKey(phase), annotation);
      }
    }
    return map;
  }

  private _phaseNodeKey(phase: { type: string; action?: string; target?: string; name?: string; lanes?: Record<string, unknown> }): string {
    switch (phase.type) {
      case 'step': return `${(phase as { action: string }).action}:${(phase as { target?: string }).target ?? ''}`;
      case 'quorum': return `quorum:${(phase as { name: string }).name}`;
      case 'signal': return `signal:${(phase as { name: string }).name}`;
      default: return 'parallel';
    }
  }

  private _renderDiffSummary(diff: DiffResult): TemplateResult {
    return html`
      <div class="diff-summary">
        <span class="title">${diff.name}</span>
        ${diff.summary.details.map(detail => {
          const dotClass = detail.includes('added') ? 'green'
            : detail.includes('removed') ? 'red' : 'amber';
          return html`<div class="diff-stat"><div class="dot ${dotClass}"></div> ${detail}</div>`;
        })}
      </div>
    `;
  }

  private _renderGraphHeader(): TemplateResult {
    return html`
      <div class="graph-header">
        <span class="label">Pipeline Graph — Diff View</span>
        <span class="diff-marker modified" style="margin-left: auto;">MODIFIED</span>
      </div>
    `;
  }

  private _renderTier(tier: GraphTier, annotations: Map<string, DiffAnnotation>): TemplateResult {
    return html`
      <div class="graph-tier">
        ${tier.nodes.map(node => this._renderNode(node, annotations))}
      </div>
    `;
  }

  private _renderNode(node: GraphNode, annotations: Map<string, DiffAnnotation>): TemplateResult {
    const key = `${node.step.action}:${node.step.target ?? ''}`;
    const annotation = annotations.get(key) ?? { status: 'unchanged' as const };
    const diffClass = `diff-${annotation.status}`;
    const badge = annotation.status !== 'unchanged'
      ? html`<span class="diff-marker ${annotation.status}">${annotation.status === 'added' ? '+ NEW' : annotation.status.toUpperCase()}</span>`
      : nothing;

    return html`
      <div class="graph-node-wrapper ${diffClass}">
        ${this._renderStepCard(node.step, badge)}
        ${annotation.status === 'modified' && annotation.changes
          ? this._renderParamChanges(annotation.changes)
          : nothing}
      </div>
    `;
  }

  private _renderStepCard(step: CoordinationStep, extraBadge: TemplateResult | typeof nothing = nothing): TemplateResult {
    const actionDef = ACTION_ICONS[step.action] ?? { icon: '•', cssClass: 'default' };
    return html`
      <div class="step-card">
        <div class="step-icon ${actionDef.cssClass}">${actionDef.icon}</div>
        <span class="step-action">${step.target ?? step.action}</span>
        <span class="step-badges">
          ${step.model ? html`<span class="badge-model">${step.model}</span>` : nothing}
          ${extraBadge}
        </span>
      </div>
    `;
  }

  private _renderParamChanges(changes: FieldChange[]): TemplateResult {
    const paramChanges = changes.filter(c => c.field.startsWith('params.'));
    if (paramChanges.length === 0) return html``;
    return html`
      <div class="param-changes">
        ${paramChanges.map(c => {
          const field = c.field.replace('params.', '');
          if (c.oldValue === undefined) {
            return html`<div class="param-added">+ ${field}: <span class="expr">${c.newValue}</span></div>`;
          }
          if (c.newValue === undefined) {
            return html`<div class="param-removed">- ${field}: ${c.oldValue}</div>`;
          }
          return html`<div class="param-changed">${field}: <span class="old-value">${c.oldValue}</span> → <span class="expr">${c.newValue}</span></div>`;
        })}
      </div>
    `;
  }

  private _renderConnector(connector: GraphConnector, annotations: Map<string, DiffAnnotation>): TemplateResult {
    if (connector.type === 'flow' && connector.barrier) {
      return html`
        <div class="graph-connector">
          ${this._renderBarrier(connector.barrier, annotations)}
        </div>
      `;
    }
    if (connector.type === 'fan-out') {
      return html`
        <div class="graph-connector">
          <span class="connector-chevron">▼</span>
          ${connector.barrier ? this._renderBarrier(connector.barrier, annotations) : nothing}
          ${connector.labels
            ? html`<div class="fan-out-labels">${connector.labels.map(l => html`<span class="edge-label">${l}</span>`)}</div>`
            : nothing}
        </div>
      `;
    }
    if (connector.type === 'fan-in' && connector.barrier) {
      return html`
        <div class="graph-connector">
          ${this._renderBarrier(connector.barrier, annotations)}
          <span class="connector-chevron">▼</span>
        </div>
      `;
    }
    return html`<div class="graph-connector"><span class="connector-chevron">▼</span></div>`;
  }

  private _renderBarrier(
    barrier: NonNullable<GraphConnector['barrier']>,
    annotations: Map<string, DiffAnnotation>,
  ): TemplateResult {
    const key = `${barrier.type}:${barrier.name}`;
    const annotation = annotations.get(key);
    const isModified = annotation?.status === 'modified';

    if (barrier.type === 'quorum') {
      if (isModified && annotation?.changes) {
        const reqChange = annotation.changes.find(c => c.field === 'required');
        const ofChange = annotation.changes.find(c => c.field === 'of');
        return html`
          <div class="graph-quorum diff-modified diff-quorum-change">
            <span class="quorum-label">QUORUM</span>
            <span class="quorum-detail">
              required: <span class="old-value">${reqChange?.oldValue ?? barrier.required} of ${ofChange?.oldValue ?? barrier.of}</span>
              <span class="new-value">${barrier.required} of ${barrier.of}</span>
            </span>
            <span class="diff-marker modified">MODIFIED</span>
          </div>
        `;
      }
      return html`
        <div class="graph-quorum">
          <span class="quorum-label">QUORUM</span>
          <span class="quorum-detail">${barrier.required} of ${barrier.of} required</span>
        </div>
      `;
    }
    return html`
      <div class="graph-signal">
        <span class="signal-label">◇ ${barrier.name}</span>
        ${barrier.description ? html`<span class="signal-desc">${barrier.description}</span>` : nothing}
      </div>
    `;
  }
}
