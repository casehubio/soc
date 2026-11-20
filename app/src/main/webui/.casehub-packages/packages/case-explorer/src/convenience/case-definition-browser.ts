import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ColumnRenderer, FilterDescriptor } from '../types.js';
import { caseDefinitionType } from '../presets.js';
import '../entity-list.js';
import '../entity-detail.js';

@customElement('agency-case-definition-browser')
export class CaseDefinitionBrowser extends LitElement {
  @property({ type: String }) endpoint = '';
  @property({ attribute: false }) columnRenderers?: Record<string, ColumnRenderer>;
  @property({ attribute: false }) filters?: readonly FilterDescriptor[];
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = 'definition';
  @property({ attribute: false }) fetchFn: typeof fetch = fetch;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Case definitions');
  }

  override render(): TemplateResult {
    const reg = { ...caseDefinitionType({ listEndpoint: this.endpoint }), columnRenderers: this.columnRenderers, filters: this.filters };
    return html`
      <agency-entity-list .registration=${reg} selection-topic=${this.selectionTopic} .fetchFn=${this.fetchFn}></agency-entity-list>
      <agency-entity-detail .registration=${reg} selection-topic=${this.selectionTopic} .fetchFn=${this.fetchFn}></agency-entity-detail>
    `;
  }
}
