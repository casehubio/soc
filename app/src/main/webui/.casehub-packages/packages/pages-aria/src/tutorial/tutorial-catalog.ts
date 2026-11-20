import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { TutorialDescriptor, LearningPath } from './types.js';

interface AreaSummary {
  area: string;
  count: number;
  labels: string[];
}

export class PagesTutorialCatalog extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, system-ui, sans-serif);
      font-size: var(--pages-font-size-base, 14px);
      color: var(--pages-neutral-12, #1a1a1a);
    }
    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px);
      border-bottom: 1px solid var(--pages-neutral-4, #e5e5e5);
    }
    .header h2 { margin: 0; font-size: 1.25em; font-weight: 600; }
    .breadcrumb {
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-neutral-8, #999);
      padding: var(--pages-space-2, 8px) var(--pages-space-4, 16px);
    }
    .breadcrumb a {
      color: var(--pages-accent-9, #2563eb); cursor: pointer; text-decoration: none;
    }
    .breadcrumb a:hover { text-decoration: underline; }
    .mode-toggle {
      display: flex; border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-sm, 4px); overflow: hidden;
    }
    .mode-toggle button {
      background: none; border: none; padding: 4px 10px;
      font-size: var(--pages-font-size-sm, 12px); cursor: pointer;
      color: var(--pages-neutral-9, #737373);
    }
    .mode-toggle button.active {
      background: var(--pages-accent-3, #e8eaf6);
      color: var(--pages-accent-9, #2563eb); font-weight: 600;
    }
    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--pages-space-4, 16px); padding: var(--pages-space-4, 16px);
    }
    .area-card, .tutorial-card {
      background: var(--pages-neutral-2, #fafafa);
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-lg, 8px);
      padding: var(--pages-space-4, 16px); cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .area-card:hover, .tutorial-card:hover {
      border-color: var(--pages-accent-6, #818cf8);
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .area-card .area-name {
      font-size: 1.1em; font-weight: 600; margin-bottom: 4px;
    }
    .area-card .area-count {
      font-size: var(--pages-font-size-sm, 12px); color: var(--pages-neutral-8, #999);
    }
    .tutorial-card .hero-icon {
      font-size: 24px; margin-bottom: 8px;
    }
    .tutorial-card .title {
      font-weight: 600; margin-bottom: 4px;
    }
    .tutorial-card .description {
      font-size: var(--pages-font-size-sm, 12px); color: var(--pages-neutral-9, #737373);
      margin-bottom: 8px;
    }
    .chips { display: flex; flex-wrap: wrap; gap: 4px; }
    .chip {
      font-size: 10px; padding: 2px 8px;
      border-radius: 10px; white-space: nowrap;
      background: var(--pages-neutral-3, #f5f5f5);
      color: var(--pages-neutral-9, #737373);
    }
    .chip.difficulty-beginner { background: rgba(34,197,94,0.15); color: #16a34a; }
    .chip.difficulty-intermediate { background: rgba(245,158,11,0.15); color: #d97706; }
    .chip.difficulty-advanced { background: rgba(239,68,68,0.15); color: #dc2626; }
    .chip.content-type { background: rgba(59,130,246,0.15); color: #2563eb; }
    .estimated {
      font-size: 10px; color: var(--pages-neutral-8, #999); margin-top: 8px;
    }
    .list { padding: var(--pages-space-4, 16px); }
    .filter-bar {
      display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
      padding: var(--pages-space-2, 8px) var(--pages-space-4, 16px);
      border-bottom: 1px solid var(--pages-neutral-4, #e5e5e5);
    }
    .filter-bar input {
      flex: 1; min-width: 120px; padding: 4px 8px;
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #1a1a1a);
      font-size: var(--pages-font-size-sm, 12px);
    }
    .filter-chip {
      font-size: 10px; padding: 2px 8px; border-radius: 10px; cursor: pointer;
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      background: none; color: var(--pages-neutral-9, #737373);
    }
    .filter-chip.active {
      background: var(--pages-accent-3, #e8eaf6);
      border-color: var(--pages-accent-6, #818cf8);
      color: var(--pages-accent-9, #2563eb);
    }
    .tutorial-row {
      display: flex; align-items: center; gap: var(--pages-space-3, 12px);
      padding: var(--pages-space-2, 8px) 0;
      border-bottom: 1px solid var(--pages-neutral-3, #f5f5f5);
      cursor: pointer;
    }
    .tutorial-row:hover { background: var(--pages-neutral-2, #fafafa); }
    .tutorial-row .title { font-weight: 500; flex: 1; }
    .tutorial-row .area-badge {
      font-size: 10px; padding: 2px 8px; border-radius: 10px;
      background: var(--pages-neutral-3, #f5f5f5);
      color: var(--pages-neutral-8, #999);
    }
    .empty {
      padding: var(--pages-space-8, 32px);
      text-align: center; color: var(--pages-neutral-8, #999);
      font-style: italic;
    }
  `;

  @property({ attribute: false }) registry: TutorialDescriptor[] = [];
  @property({ attribute: false }) paths: LearningPath[] = [];
  @property({ type: String }) mode: 'tiles' | 'list' = 'tiles';
  @property({ type: String }) area: string | null = null;
  @property({ attribute: false }) labels: string[] = [];
  @property({ type: String }) activeTutorial: string | null = null;

  @state() private _searchText = '';

  override connectedCallback(): void {
    super.connectedCallback();
    try {
      const stored = localStorage.getItem('tutorial:catalog-mode');
      if (stored === 'tiles' || stored === 'list') this.mode = stored;
    } catch { /* graceful degradation */ }
    const hash = globalThis.location?.hash;
    if (hash?.includes('mode=list')) this.mode = 'list';
    else if (hash?.includes('mode=tiles')) this.mode = 'tiles';
  }

  private _setMode(m: 'tiles' | 'list'): void {
    this.mode = m;
    try { localStorage.setItem('tutorial:catalog-mode', m); } catch { /* ignore */ }
  }

  private _getAreas(): AreaSummary[] {
    const map = new Map<string, { count: number; labels: Set<string> }>();
    for (const t of this._filteredRegistry()) {
      const entry = map.get(t.area) ?? { count: 0, labels: new Set<string>() };
      entry.count++;
      for (const l of t.labels) entry.labels.add(l);
      map.set(t.area, entry);
    }
    return Array.from(map.entries()).map(([area, v]) => ({
      area, count: v.count, labels: Array.from(v.labels),
    }));
  }

  private _filteredRegistry(): TutorialDescriptor[] {
    let result = this.registry;
    if (this.area) result = result.filter(t => t.area === this.area);
    if (this.labels.length > 0) {
      result = result.filter(t => this.labels.every(l => t.labels.includes(l)));
    }
    if (this._searchText) {
      const q = this._searchText.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q)),
      );
    }
    return result;
  }

  private _allLabels(): string[] {
    const set = new Set<string>();
    for (const t of this.registry) for (const l of t.labels) set.add(l);
    return Array.from(set).sort();
  }

  private _getDifficultyClass(labels: string[]): string {
    const d = labels.find(l => l.startsWith('difficulty:'));
    if (!d) return '';
    return `difficulty-${d.split(':')[1]}`;
  }

  private _getDifficultyLabel(labels: string[]): string | null {
    const d = labels.find(l => l.startsWith('difficulty:'));
    return d ? d.split(':')[1] : null;
  }

  private _fireSelect(scenario: string): void {
    this.dispatchEvent(new CustomEvent('tutorial-select', {
      detail: { scenario }, bubbles: true, composed: true,
    }));
  }

  private _fireAreaSelect(area: string): void {
    this.area = area;
    this.dispatchEvent(new CustomEvent('area-select', {
      detail: { area }, bubbles: true, composed: true,
    }));
  }

  private _toggleLabel(label: string): void {
    if (this.labels.includes(label)) {
      this.labels = this.labels.filter(l => l !== label);
    } else {
      this.labels = [...this.labels, label];
    }
    this.requestUpdate();
  }

  override render(): TemplateResult {
    return html`
      <div class="header">
        <h2>Tutorials</h2>
        <div class="mode-toggle">
          <button class=${this.mode === 'tiles' ? 'active' : ''}
                  @click=${() => { this._setMode('tiles'); }}
                  aria-label="Tile view">▦</button>
          <button class=${this.mode === 'list' ? 'active' : ''}
                  @click=${() => { this._setMode('list'); }}
                  aria-label="List view">☰</button>
        </div>
      </div>
      ${this.area ? html`
        <div class="breadcrumb">
          <a @click=${() => { this.area = null; }}>All Tutorials</a> › ${this.area}
        </div>
      ` : nothing}
      ${this.mode === 'list' ? this._renderFilterBar() : nothing}
      ${this.mode === 'tiles' ? this._renderTiles() : this._renderList()}
    `;
  }

  private _renderFilterBar(): TemplateResult {
    const allLabels = this._allLabels();
    return html`
      <div class="filter-bar">
        <input type="text" placeholder="Search tutorials..."
               .value=${this._searchText}
               @input=${(e: Event) => { this._searchText = (e.target as HTMLInputElement).value; }}
               aria-label="Search tutorials" />
        ${allLabels.map(l => html`
          <button class="filter-chip ${this.labels.includes(l) ? 'active' : ''}"
                  @click=${() => { this._toggleLabel(l); }}>${l}</button>
        `)}
      </div>
    `;
  }

  private _renderTiles(): TemplateResult {
    if (!this.area) {
      const areas = this._getAreas();
      if (areas.length === 0) return html`<div class="empty">No tutorials available</div>`;
      return html`<div class="grid">${areas.map(a => this._renderAreaCard(a))}</div>`;
    }
    const tutorials = this._filteredRegistry();
    if (tutorials.length === 0) return html`<div class="empty">No tutorials in this area</div>`;
    return html`<div class="grid">${tutorials.map(t => this._renderTutorialCard(t))}</div>`;
  }

  private _renderAreaCard(area: AreaSummary): TemplateResult {
    return html`
      <div class="area-card" @click=${() => { this._fireAreaSelect(area.area); }}
           role="button" tabindex="0" aria-label="${area.area}">
        <div class="area-name">${area.area}</div>
        <div class="area-count">${area.count} tutorial${area.count !== 1 ? 's' : ''}</div>
        <div class="chips" style="margin-top: 8px">
          ${area.labels.slice(0, 4).map(l => html`<span class="chip">${l}</span>`)}
        </div>
      </div>
    `;
  }

  private _renderTutorialCard(t: TutorialDescriptor): TemplateResult {
    const difficulty = this._getDifficultyLabel(t.labels);
    return html`
      <div class="tutorial-card" @click=${() => { this._fireSelect(t.scenario); }}
           role="button" tabindex="0" aria-label="${t.title}">
        ${t.hero?.icon ? html`<div class="hero-icon">${t.hero.icon}</div>` : nothing}
        <div class="title">${t.hero?.title ?? t.title}</div>
        <div class="description">${t.hero?.subtitle ?? t.description}</div>
        <div class="chips">
          ${difficulty ? html`<span class="chip ${this._getDifficultyClass(t.labels)}">${difficulty}</span>` : nothing}
          <span class="chip content-type">${t.contentType}</span>
          ${t.labels.filter(l => l.startsWith('concept:')).map(l =>
            html`<span class="chip">${l.split(':')[1]}</span>`
          )}
        </div>
        ${t.estimated ? html`<div class="estimated">${t.estimated}</div>` : nothing}
      </div>
    `;
  }

  private _renderList(): TemplateResult {
    const tutorials = this._filteredRegistry();
    if (tutorials.length === 0) return html`<div class="empty">No tutorials match your filters</div>`;
    return html`
      <div class="list">
        ${tutorials.map(t => this._renderTutorialRow(t))}
      </div>
    `;
  }

  private _renderTutorialRow(t: TutorialDescriptor): TemplateResult {
    const difficulty = this._getDifficultyLabel(t.labels);
    return html`
      <div class="tutorial-row" @click=${() => { this._fireSelect(t.scenario); }}
           role="button" tabindex="0" aria-label="${t.title}">
        <span class="title">${t.title}</span>
        <span class="area-badge">${t.area}</span>
        ${difficulty ? html`<span class="chip ${this._getDifficultyClass(t.labels)}">${difficulty}</span>` : nothing}
        ${t.estimated ? html`<span class="chip">${t.estimated}</span>` : nothing}
      </div>
    `;
  }
}

if (!customElements.get('pages-tutorial-catalog')) {
  customElements.define('pages-tutorial-catalog', PagesTutorialCatalog);
}
