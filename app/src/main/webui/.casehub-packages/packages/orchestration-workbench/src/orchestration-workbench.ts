import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import { onPagesEvent } from '@casehubio/pages-data';
import { orchestrationEventsStrategy } from '@casehubio/mosaic-agency-timeline';
import type { ExecutionSnapshot, OrchestrationAuditEvent } from '@casehubio/mosaic-core';
import '@casehubio/pages-ui-components/split-workbench';
import '@casehubio/mosaic-execution-monitor';
import '@casehubio/mosaic-agency-timeline';

export interface OrchestrationWorkbenchData {
  readonly snapshot: ExecutionSnapshot;
  readonly events: OrchestrationAuditEvent[];
}

export interface OrchestrationWorkbenchProps {
  endpoint: string;
  executionId?: string;
  selectionTopic: string;
}

@customElement('agency-orchestration-workbench')
export class OrchestrationWorkbench extends LiveRegionMixin(LitElement) {
  @property({ type: String }) endpoint = '';
  @property({ type: String, attribute: 'execution-id' }) executionId?: string;
  @property({ attribute: false }) data?: OrchestrationWorkbenchData;
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = 'orchestration';

  private _unsubs: Array<() => void> = [];

  static override styles = css`
    :host { display: block; height: 100%; font-family: var(--pages-font-family, system-ui); }
    pages-split-workbench { height: 100%; }
    .monitor-panel { height: 100%; overflow-y: auto; padding: var(--pages-space-3, 12px); }
    .timeline-panel { height: 100%; overflow-y: auto; }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Orchestration workbench');
    this._unsubs.push(
      onPagesEvent(document, 'execution.agent-selected', (payload: { agentRef: { id: string } }) => {
        this.announce(`Agent selected: ${payload.agentRef.id}`);
      }),
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubs.forEach(u => u());
    this._unsubs = [];
  }

  configure(props: Partial<OrchestrationWorkbenchProps>): void {
    if (props.endpoint !== undefined) this.endpoint = props.endpoint;
    if (props.executionId !== undefined) this.executionId = props.executionId;
  }

  override render(): TemplateResult {
    const monitorEndpoint = this.data ? undefined : this.endpoint || undefined;
    const timelineEndpoint = this.data ? undefined : (this.endpoint && this.executionId ? `${this.endpoint}/${this.executionId}/audit-events` : undefined);

    return html`
      <pages-split-workbench selection-topic=${this.selectionTopic}>
        <div slot="list" class="monitor-panel">
          <agency-execution-monitor
            .endpoint=${monitorEndpoint}
            execution-id=${this.executionId ?? ''}
            .data=${this.data?.snapshot}
            selection-topic=${this.selectionTopic}
          ></agency-execution-monitor>
        </div>
        <div slot="detail" class="timeline-panel">
          <agency-timeline
            .strategy=${orchestrationEventsStrategy}
            .endpoint=${timelineEndpoint}
            .data=${this.data?.events}
            layout="vertical"
          ></agency-timeline>
        </div>
      </pages-split-workbench>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-orchestration-workbench': OrchestrationWorkbench;
  }
}
