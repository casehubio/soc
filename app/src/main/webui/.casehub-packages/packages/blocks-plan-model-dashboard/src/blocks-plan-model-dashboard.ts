import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@casehubio/pages-ui-components';
import type {
  CasePlanModelSnapshot, AgendaItem, SubCaseSnapshot, CompoundStatusSnapshot,
} from '@casehubio/mosaic-graph-stencil-htn';

export interface PlanModelDashboardProps {
  planModel: CasePlanModelSnapshot | null;
}

@customElement('blocks-plan-model-dashboard')
export class BlocksPlanModelDashboard extends LitElement {
  @property({ type: Object }) planModel: CasePlanModelSnapshot | null = null;

  static override styles = css`
    :host { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px;
      font-family: var(--pages-font-family, sans-serif); font-size: 13px;
      color: var(--pages-neutral-11, #e2e8f0); }
    .empty { grid-column: 1 / -1; color: var(--pages-neutral-9, #64748b); font-style: italic; }
    .card { border: 1px solid var(--pages-neutral-5, #334155); border-radius: 8px;
      padding: 12px 16px; background: var(--pages-neutral-2, #1e293b); }
    .card-title { font-weight: 600; font-size: 14px; color: var(--pages-neutral-12, #f1f5f9);
      margin-bottom: 8px; }
    .agenda-full { grid-column: 1 / -1; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; color: var(--pages-neutral-9, #64748b);
      border-bottom: 1px solid var(--pages-neutral-5, #334155); padding: 4px 8px;
      text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 6px 8px; border-bottom: 1px solid var(--pages-neutral-4, #1e293b);
      color: var(--pages-neutral-11, #cbd5e1); }
    .status-pill { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px;
      font-weight: 600; }
    .focus-text { color: var(--pages-neutral-12, #f1f5f9); }
    .focus-rationale { color: var(--pages-neutral-9, #94a3b8); font-style: italic; margin-top: 4px; }
    .budget-key { color: var(--pages-neutral-9, #94a3b8); }
    .budget-value { font-weight: 600; color: var(--pages-neutral-12, #f1f5f9); }
    .progress-bar { display: flex; align-items: center; gap: 6px; }
    .bar-track { flex: 1; height: 6px; background: var(--pages-neutral-5, #334155);
      border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--pages-accent-9, #3b82f6);
      border-radius: 3px; transition: width 0.3s; }
    .bar-label { font-size: 11px; color: var(--pages-neutral-9, #94a3b8); white-space: nowrap; }
  `;

  private _renderAgenda(agenda: readonly AgendaItem[]) {
    if (agenda.length === 0) return html`<div style="color: var(--pages-text-tertiary, #999);">No items in agenda</div>`;
    return html`
      <table>
        <thead><tr><th>Binding</th><th>Status</th><th>Description</th></tr></thead>
        <tbody>
          ${agenda.map(item => html`
            <tr>
              <td>${item.bindingName}</td>
              <td><pages-status-badge domain="task" .state=${item.status}></pages-status-badge></td>
              <td>${item.description ?? ''}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  private _renderFocus(focus?: string, rationale?: string) {
    if (focus == null) return html`<div style="color: var(--pages-text-tertiary, #999);">No focus set</div>`;
    return html`
      <div class="focus-text">${focus}</div>
      ${rationale != null ? html`<div class="focus-rationale">${rationale}</div>` : nothing}
    `;
  }

  private _renderBudget(budget: Readonly<Record<string, unknown>>) {
    const entries = Object.entries(budget);
    if (entries.length === 0) return html`<div style="color: var(--pages-text-tertiary, #999);">No budget set</div>`;
    return html`
      ${entries.map(([key, value]) => html`
        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
          <span class="budget-key">${key}</span>
          <span class="budget-value">${String(value)}</span>
        </div>
      `)}
    `;
  }

  private _renderSubCases(subCases: readonly SubCaseSnapshot[]) {
    if (subCases.length === 0) return html`<div style="color: var(--pages-text-tertiary, #999);">No sub-cases</div>`;
    return html`
      ${subCases.map(sc => html`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
          <span>${sc.namespace}/${sc.caseDefinition}</span>
          ${sc.status != null ? html`<pages-status-badge domain="case" .state=${sc.status}></pages-status-badge>` : nothing}
        </div>
      `)}
    `;
  }

  private _renderCompounds(compounds: readonly CompoundStatusSnapshot[]) {
    if (compounds.length === 0) return nothing;
    return html`
      <div class="card agenda-full">
        <div class="card-title">Compound Definitions</div>
        ${compounds.map(c => html`
          <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
            <span style="font-weight: 500;">${c.name}</span>
            <pages-status-badge domain="task" .state=${c.status}></pages-status-badge>
            <div class="progress-bar" style="flex: 1; max-width: 200px;"
              role="progressbar"
              aria-valuenow="${c.completedCount}"
              aria-valuemin="0"
              aria-valuemax="${c.childCount}"
              aria-label="${c.name} progress">
              <div class="bar-track">
                <div class="bar-fill" style="width: ${c.childCount > 0 ? (c.completedCount / c.childCount) * 100 : 0}%;"></div>
              </div>
              <span class="bar-label">${c.completedCount}/${c.childCount}</span>
            </div>
          </div>
        `)}
      </div>
    `;
  }

  override render() {
    if (this.planModel == null) {
      return html`<div class="empty">No plan model loaded</div>`;
    }
    const m = this.planModel;
    return html`
      <div class="card agenda-full" role="region" aria-label="Agenda">
        <div class="card-title">Agenda</div>
        ${this._renderAgenda(m.agenda)}
      </div>
      <div class="card" role="region" aria-label="Focus">
        <div class="card-title">Focus</div>
        ${this._renderFocus(m.focus, m.focusRationale)}
      </div>
      <div class="card" role="region" aria-label="Resource Budget">
        <div class="card-title">Resource Budget</div>
        ${this._renderBudget(m.resourceBudget)}
      </div>
      <div class="card" role="region" aria-label="Sub-Cases">
        <div class="card-title">Sub-Cases</div>
        ${this._renderSubCases(m.subCases)}
      </div>
      ${this._renderCompounds(m.compounds)}
    `;
  }
}
