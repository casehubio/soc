import { css, html, type CSSResult, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { LitElement } from 'lit';
import type { PatternCategory } from '@casehubio/mosaic-core';

type Constructor<T = {}> = new (...args: any[]) => T;

export type { PatternView };

declare abstract class PatternView extends LitElement {
  spec: PatternCategory;
  _activeTab: 'execution' | 'reports';
  protected setLoading(loading: boolean): void;
  protected renderEmptyState(message?: string): TemplateResult;
  protected renderTabBar(): TemplateResult;
  protected renderTabPanel(): TemplateResult;
  protected renderExecution(): TemplateResult;
  protected renderReports(): TemplateResult;
}

export const patternViewStyles: CSSResult = css`
  :host {
    display: block;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    overflow: hidden;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #cdd6f4;
  }

  .empty-state {
    padding: 32px;
    text-align: center;
    color: #7f849c;
    font-size: 13px;
  }

  .header {
    padding: 10px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .header-label {
    font-size: 12px;
    font-weight: 600;
    color: #7f849c;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .header-name {
    font-size: 13px;
    font-weight: 500;
    color: #f0f4ff;
  }
  .type-badge {
    padding: 1px 7px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    background: var(--pattern-badge-color, rgba(137, 180, 250, 0.2));
    color: var(--pattern-badge-text, #89b4fa);
  }
  .header-desc {
    margin-left: auto;
    font-size: 11px;
    color: #7f849c;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0 16px;
  }
  .tab-button {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 500;
    color: #7f849c;
    cursor: pointer;
    font-family: inherit;
    transition: color 0.15s, border-color 0.15s;
  }
  .tab-button:hover { color: #cdd6f4; }
  .tab-button[aria-selected="true"] {
    color: #cdd6f4;
    border-bottom-color: #89b4fa;
  }
  .tab-button:focus-visible {
    outline: 2px solid #89b4fa;
    outline-offset: -2px;
    border-radius: 2px;
  }
`;

export const PatternViewMixin = <T extends Constructor<LitElement>>(Base: T) => {
  class PatternViewHost extends Base {
    @property({ attribute: false }) spec!: PatternCategory;
    @state() _activeTab: 'execution' | 'reports' = 'execution';

    override connectedCallback() {
      super.connectedCallback();
      this.setAttribute('role', 'region');
      this.setAttribute('aria-label', `${this.spec?.category ?? 'pattern'} view`);
    }

    protected setLoading(loading: boolean) {
      this.setAttribute('aria-busy', String(loading));
    }

    protected renderEmptyState(message = 'No pattern data'): TemplateResult {
      return html`<div class="empty-state">${message}</div>`;
    }

    protected renderTabBar(): TemplateResult {
      const tabs: Array<{ id: 'execution' | 'reports'; label: string }> = [
        { id: 'execution', label: 'Execution' },
        { id: 'reports', label: 'Reports' },
      ];
      return html`
        <div class="tab-bar" role="tablist">
          ${tabs.map(t => html`
            <button
              role="tab"
              id="tab-${t.id}"
              aria-selected="${String(this._activeTab === t.id)}"
              aria-controls="panel-${t.id}"
              tabindex="${this._activeTab === t.id ? 0 : -1}"
              @click=${() => this._switchTab(t.id)}
              @keydown=${this._onTabKeydown}
              class="tab-button"
            >${t.label}</button>
          `)}
        </div>
      `;
    }

    protected renderTabPanel(): TemplateResult {
      return html`
        <div
          role="tabpanel"
          id="panel-${this._activeTab}"
          aria-labelledby="tab-${this._activeTab}"
        >
          ${this._activeTab === 'execution'
            ? this.renderExecution()
            : this.renderReports()}
        </div>
      `;
    }

    protected renderExecution(): TemplateResult {
      return this.renderEmptyState('No execution data');
    }

    protected renderReports(): TemplateResult {
      return this.renderEmptyState('No report data available');
    }

    private _switchTab(tab: 'execution' | 'reports') {
      this._activeTab = tab;
    }

    private _onTabKeydown = (e: KeyboardEvent) => {
      const order: Array<'execution' | 'reports'> = ['execution', 'reports'];
      const idx = order.indexOf(this._activeTab);
      let next = idx;
      if (e.key === 'ArrowRight') next = (idx + 1) % order.length;
      else if (e.key === 'ArrowLeft') next = (idx - 1 + order.length) % order.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = order.length - 1;
      else return;
      e.preventDefault();
      this._activeTab = order[next]!;
      this.updateComplete.then(() => {
        const btn = this.shadowRoot?.querySelector(`#tab-${order[next]}`) as HTMLElement;
        btn?.focus();
      });
    };
  }
  return PatternViewHost as unknown as Constructor<PatternView> & T;
};
