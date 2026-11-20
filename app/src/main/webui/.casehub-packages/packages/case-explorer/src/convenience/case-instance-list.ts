import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ColumnRenderer, FilterDescriptor } from '../types.js';
import { caseInstanceType } from '../presets.js';
import '../entity-list.js';

@customElement('agency-case-instance-list')
export class CaseInstanceList extends LitElement {
  @property({ type: String }) endpoint = '';
  @property({ attribute: false }) columnRenderers?: Record<string, ColumnRenderer>;
  @property({ attribute: false }) filters?: readonly FilterDescriptor[];
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = 'case';
  @property({ attribute: false }) fetchFn: typeof fetch = fetch;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Case instances');
  }

  override render(): TemplateResult {
    const reg = { ...caseInstanceType({ listEndpoint: this.endpoint }), columnRenderers: this.columnRenderers, filters: this.filters };
    return html`<agency-entity-list .registration=${reg} selection-topic=${this.selectionTopic} .fetchFn=${this.fetchFn}></agency-entity-list>`;
  }
}
