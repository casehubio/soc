import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ColumnRenderer, FilterDescriptor } from '../types.js';
import { workerType } from '../presets.js';
import '../entity-list.js';

@customElement('agency-worker-list')
export class WorkerList extends LitElement {
  @property({ type: String }) endpoint = '';
  @property({ attribute: false }) columnRenderers?: Record<string, ColumnRenderer>;
  @property({ attribute: false }) filters?: readonly FilterDescriptor[];
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = 'worker';
  @property({ attribute: false }) fetchFn: typeof fetch = fetch;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Workers');
  }

  override render(): TemplateResult {
    const reg = { ...workerType({ listEndpoint: this.endpoint }), columnRenderers: this.columnRenderers, filters: this.filters };
    return html`<agency-entity-list .registration=${reg} selection-topic=${this.selectionTopic} .fetchFn=${this.fetchFn}></agency-entity-list>`;
  }
}
