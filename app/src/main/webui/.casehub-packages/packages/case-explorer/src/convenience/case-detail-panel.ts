import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DetailRenderer } from '../types.js';
import { caseInstanceType } from '../presets.js';
import '../entity-detail.js';

@customElement('agency-case-detail-panel')
export class CaseDetailPanel extends LitElement {
  @property({ type: String }) endpoint = '';
  @property({ attribute: false }) detailRenderer?: DetailRenderer;
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = 'case';
  @property({ attribute: false }) fetchFn: typeof fetch = fetch;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Case details');
  }

  override render(): TemplateResult {
    const reg = { ...caseInstanceType({ listEndpoint: this.endpoint }), detailRenderer: this.detailRenderer };
    return html`<agency-entity-detail .registration=${reg} selection-topic=${this.selectionTopic} .fetchFn=${this.fetchFn}></agency-entity-detail>`;
  }
}
