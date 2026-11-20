import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DataSourceMixin } from '@casehubio/pages-component';
import { createTypedFetchSource } from '@casehubio/pages-data';
import type { SourceFactory } from '@casehubio/pages-data';
import type { SignalDigest, StepDecisionSummary, NarrativeState } from './types.js';

const SIGNAL_ICONS: Record<string, string> = {
  ROUTING: '→',
  CBR: '\u{1F50D}',
  TRUST: '⚖',
  DELIBERATION: '\u{1F4AC}',
  STEP_OUTCOME: '●',
};

const SIGNAL_COLORS: Record<string, string> = {
  ROUTING: 'var(--pages-accent-9, #3b82f6)',
  CBR: 'var(--pages-orange-9, #ea580c)',
  TRUST: 'var(--pages-success-9, #16a34a)',
  DELIBERATION: 'var(--pages-violet-9, #7c3aed)',
  STEP_OUTCOME: 'var(--pages-neutral-9, #737373)',
};

@customElement('agency-narrative-timeline')
export class NarrativeTimeline extends DataSourceMixin(LitElement) {
  @property({ type: String, reflect: true, attribute: 'aria-label' })
  override ariaLabel: string | null = 'Decision narrative';

  @property({ type: String, attribute: 'empty-message' })
  emptyMessage = 'No decision narrative available';

  @state() private _steps: StepDecisionSummary[] = [];
  @state() private _explanation = '';

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }

    .empty {
      color: var(--pages-neutral-9, #888);
      font-style: italic;
      padding: var(--pages-space-4, 1rem);
    }

    .narrative-explanation {
      padding: var(--pages-space-3, 0.75rem) var(--pages-space-4, 1rem);
      background: var(--pages-accent-2, #eff6ff);
      border-left: 3px solid var(--pages-accent-9, #3b82f6);
      margin-bottom: var(--pages-space-4, 1rem);
      font-size: 14px;
      line-height: 1.5;
      color: var(--pages-neutral-12, #171717);
    }

    .timeline {
      position: relative;
      padding-left: var(--pages-space-5, 1.25rem);
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--pages-neutral-4, #e5e5e5);
    }

    .step-card {
      position: relative;
      margin-bottom: var(--pages-space-4, 1rem);
      padding: var(--pages-space-3, 0.75rem);
      background: var(--pages-neutral-1, #fff);
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-3, 8px);
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      margin-bottom: var(--pages-space-2, 0.5rem);
    }

    .step-name {
      font-weight: 600;
      font-size: 14px;
      color: var(--pages-neutral-12, #171717);
    }

    .step-time {
      font-size: 12px;
      color: var(--pages-neutral-9, #888);
      margin-left: auto;
    }

    .signal {
      display: flex;
      align-items: flex-start;
      gap: var(--pages-space-2, 0.5rem);
      padding: var(--pages-space-2, 0.5rem) 0;
      border-top: 1px solid var(--pages-neutral-3, #f0f0f0);
    }

    .signal:first-child { border-top: none; }

    .signal-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: white;
    }

    .signal-body { flex: 1; min-width: 0; }

    .signal-type {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }

    .signal-summary {
      font-size: 13px;
      color: var(--pages-neutral-11, #404040);
      line-height: 1.4;
    }

    .key-facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--pages-space-1, 0.25rem);
      margin-top: var(--pages-space-1, 0.25rem);
    }

    .fact-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: var(--pages-radius-2, 4px);
      font-size: 11px;
      font-weight: 500;
      background: var(--pages-neutral-3, #f0f0f0);
      color: var(--pages-neutral-11, #404040);
    }

    .fact-label { opacity: 0.7; }
    .fact-value { font-weight: 600; }

    .confidence-bar {
      height: 4px;
      border-radius: 2px;
      background: var(--pages-neutral-4, #e5e5e5);
      overflow: hidden;
      margin-top: 4px;
      max-width: 60px;
    }

    .confidence-fill { height: 100%; border-radius: 2px; }
  `;

  override resolveEndpoint(): string | undefined {
    return this.endpoint;
  }

  override createSourceFactory(): SourceFactory {
    return (url) => createTypedFetchSource<NarrativeState>(url, (data, sink) => {
      this._steps = [...(data.steps ?? [])];
      this._explanation = data.narrative?.explanation ?? '';
      sink.apply({ type: 'snapshot', dataset: { columns: [], rows: [] } });
    });
  }

  private _renderSignal(signal: SignalDigest): TemplateResult {
    const color = SIGNAL_COLORS[signal.signalType] ?? SIGNAL_COLORS.STEP_OUTCOME;
    const icon = SIGNAL_ICONS[signal.signalType] ?? '●';
    const facts = Object.entries(signal.keyFacts);

    return html`
      <div class="signal">
        <div class="signal-icon" style="background: ${color}">${icon}</div>
        <div class="signal-body">
          <div class="signal-type" style="color: ${color}">${signal.signalType.replace('_', ' ')}</div>
          <div class="signal-summary">${signal.summary}</div>
          ${facts.length > 0 ? html`
            <div class="key-facts">
              ${facts.map(([k, v]) => html`
                <span class="fact-pill">
                  <span class="fact-label">${k}:</span>
                  <span class="fact-value">${v}</span>
                </span>
              `)}
            </div>
          ` : nothing}
          ${signal.confidence > 0 ? html`
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${signal.confidence * 100}%; background: ${color}"></div>
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _renderStep(step: StepDecisionSummary): TemplateResult {
    const time = new Date(step.from).toLocaleTimeString();
    return html`
      <div class="step-card">
        <div class="step-header">
          <span class="step-name">${step.stepName}</span>
          <span class="step-time">${time}</span>
        </div>
        ${step.signals.map(s => this._renderSignal(s))}
      </div>
    `;
  }

  override render() {
    if (this.loading) return html`<div class="empty">Loading narrative...</div>`;
    if (this.error) return html`<div class="empty">Narrative data unavailable</div>`;
    if (this._steps.length === 0 && !this._explanation) {
      return html`<div class="empty">${this.emptyMessage}</div>`;
    }

    return html`
      ${this._explanation ? html`
        <div class="narrative-explanation">${this._explanation}</div>
      ` : nothing}
      <div class="timeline">
        ${this._steps.map(s => this._renderStep(s))}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-narrative-timeline': NarrativeTimeline;
  }
}
