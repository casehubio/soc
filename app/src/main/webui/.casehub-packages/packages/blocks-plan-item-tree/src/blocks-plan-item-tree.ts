import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TemplateResult } from 'lit';
import type {
  PlanItemDefinition, PrimitivePlanItem, CompoundPlanItem,
  CompletionSemantics,
} from '@casehubio/mosaic-graph-stencil-htn';

function completionLabel(cs: CompletionSemantics): string {
  switch (cs.kind) {
    case 'All': return 'All';
    case 'MOfN': return `${cs.m}-of-N`;
    case 'FirstWins': return 'First Wins';
  }
}

const COMPLETION_COLORS: Record<string, string> = {
  'All': '#3b82f6',
  'MOfN': '#f59e0b',
  'FirstWins': '#a855f7',
};

export interface PlanItemTreeProps {
  definition: PlanItemDefinition | null;
}

@customElement('blocks-plan-item-tree')
export class BlocksPlanItemTree extends LitElement {
  @property({ type: Object }) definition: PlanItemDefinition | null = null;
  @property({ type: Object }) renderPrimitive?: (item: PrimitivePlanItem) => TemplateResult;
  @property({ type: Object }) renderCompound?: (item: CompoundPlanItem) => TemplateResult;

  @state() private _expanded = new Set<string>();

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, sans-serif); font-size: 13px; }
    .empty { color: var(--pages-text-tertiary, #999); font-style: italic; padding: 12px; }
    ul { list-style: none; padding-left: 20px; margin: 0; }
    ul[role="tree"] { padding-left: 0; }
    li { padding: 2px 0; }
    .node { display: flex; align-items: center; gap: 6px; padding: 4px 8px;
      border-radius: 4px; cursor: pointer; }
    .node:hover { background: var(--pages-hover-color, #f3f4f6); }
    .node:focus { outline: 2px solid var(--pages-accent-color, #1a73e8); outline-offset: -2px; }
    .compound-name { font-weight: 600; color: var(--pages-text-color, #333); }
    .toggle { width: 16px; text-align: center; font-size: 11px; color: var(--pages-text-secondary, #666); }
    .badge { padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #fff; }
    .dispatch-pill { background: var(--pages-accent-subtle, #e8f0fe); color: var(--pages-accent-color, #1a73e8);
      padding: 1px 6px; border-radius: 4px; font-size: 11px; }
    .executor-pill { background: var(--pages-accent-subtle, #e8f0fe); color: var(--pages-accent-color, #1a73e8);
      padding: 1px 6px; border-radius: 4px; font-size: 11px; }
    .leaf-marker { color: var(--pages-accent-color, #1a73e8); }
    .condition { font-style: italic; color: var(--pages-text-tertiary, #999); font-size: 12px;
      max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .child-count { font-size: 11px; color: var(--pages-text-tertiary, #999); }
    .repeatable { font-size: 11px; color: var(--pages-text-secondary, #666); }
  `;

  private _toggle(id: string): void {
    const next = new Set(this._expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    this._expanded = next;
  }

  private _renderItem(item: PlanItemDefinition): TemplateResult {
    if (item.kind === 'primitive') return this._renderPrimitive(item);
    return this._renderCompound(item);
  }

  private _renderPrimitive(item: PrimitivePlanItem): TemplateResult {
    if (this.renderPrimitive) return html`<li role="treeitem">${this.renderPrimitive(item)}</li>`;
    return html`
      <li role="treeitem">
        <div class="node" tabindex="-1">
          <span class="leaf-marker">●</span>
          <span>${item.name}</span>
          <span class="executor-pill">${item.executor.name}</span>
          ${item.entryCondition ? html`<span class="condition" title=${item.entryCondition}>when: ${item.entryCondition}</span>` : nothing}
        </div>
      </li>
    `;
  }

  private _renderCompound(item: CompoundPlanItem): TemplateResult {
    if (this.renderCompound) return html`<li role="treeitem">${this.renderCompound(item)}</li>`;
    const expanded = this._expanded.has(item.id);
    const completionColor = COMPLETION_COLORS[item.completion.kind] ?? '#9ca3af';

    return html`
      <li role="treeitem" aria-expanded=${expanded}>
        <div class="node" tabindex="-1"
          @click=${() => this._toggle(item.id)}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === 'ArrowRight') { if (!expanded) this._toggle(item.id); }
            if (e.key === 'ArrowLeft') { if (expanded) this._toggle(item.id); }
          }}>
          <span class="toggle">${expanded ? '▼' : '▶'}</span>
          <span class="compound-name">${item.name}</span>
          <span class="badge" style="background: ${completionColor};">${completionLabel(item.completion)}</span>
          <span class="dispatch-pill">${item.dispatchMode}</span>
          ${item.repeatable ? html`<span class="repeatable">↻</span>` : nothing}
          <span class="child-count">(${item.children.length})</span>
        </div>
        ${expanded ? html`
          <ul role="group">
            ${item.children.map(child => this._renderItem(child))}
          </ul>
        ` : nothing}
        ${item.entryCondition ? html`<div style="padding-left: 28px;"><span class="condition" title=${item.entryCondition}>entry: ${item.entryCondition}</span></div>` : nothing}
      </li>
    `;
  }

  override render() {
    if (this.definition == null) {
      return html`<div class="empty">No plan item definition loaded</div>`;
    }
    return html`
      <ul role="tree" aria-label="Plan item tree">
        ${this._renderItem(this.definition)}
      </ul>
    `;
  }
}

export { completionLabel, COMPLETION_COLORS };
