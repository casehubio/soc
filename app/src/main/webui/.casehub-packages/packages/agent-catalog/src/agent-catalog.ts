import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import '@casehubio/mosaic-agent-avatar-2d';
import { PROFESSION_LIST, buildSummaryText } from '@casehubio/mosaic-avatar-step';
import { CATALOG_TEMPLATES, FEATURED_TEMPLATES, buildDescriptor } from './data/catalog-templates.js';
import type { CatalogTemplate } from './data/catalog-templates.js';

interface RoleGroup {
  profession: string;
  role: string;
  templates: CatalogTemplate[];
}

interface FamilyGroup {
  family: string;
  templates: CatalogTemplate[];
}

function groupByRole(templates: readonly CatalogTemplate[]): RoleGroup[] {
  const map = new Map<string, RoleGroup>();
  for (const t of templates) {
    const key = `${t.profession}::${t.role}`;
    let group = map.get(key);
    if (!group) { group = { profession: t.profession, role: t.role, templates: [] }; map.set(key, group); }
    group.templates.push(t);
  }
  return [...map.values()];
}

function groupByFamily(templates: readonly CatalogTemplate[]): FamilyGroup[] {
  const map = new Map<string, FamilyGroup>();
  for (const t of templates) {
    const family = t.variant.archetype.split('/')[0]!;
    let group = map.get(family);
    if (!group) { group = { family, templates: [] }; map.set(family, group); }
    group.templates.push(t);
  }
  return [...map.values()];
}

@customElement('agent-catalog')
export class AgentCatalog extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }

    .featured-section { margin-bottom: 16px; }
    .featured-header { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--pages-neutral-10, #aaa); margin-bottom: 8px; }
    .featured-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
    .featured-card {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      border: 1px solid var(--pages-neutral-5, #4a4a62); border-radius: 8px;
      background: var(--pages-neutral-2, #252538); cursor: pointer;
      color: var(--pages-neutral-11, #ccc); transition: all 0.15s;
    }
    .featured-card:hover { border-color: var(--pages-accent-9, #2563eb); background: var(--pages-accent-3, #1e3a5f); }
    .featured-info { flex: 1; min-width: 0; }
    .featured-label { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .featured-role { font-size: 11px; color: var(--pages-neutral-9, #999); }

    .search-bar { margin-bottom: 10px; }
    .search-input {
      width: 100%; box-sizing: border-box; padding: 8px 12px; border-radius: 6px;
      border: 1px solid var(--pages-neutral-5, #4a4a62); background: var(--pages-neutral-2, #252538);
      color: var(--pages-neutral-12, #eee); font-size: 13px;
    }
    .search-input::placeholder { color: var(--pages-neutral-8, #888); }

    .filter-bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .filter-pill {
      padding: 4px 12px; border-radius: 12px; border: 1px solid var(--pages-neutral-5, #4a4a62);
      background: var(--pages-neutral-2, #252538); cursor: pointer; font-size: 12px;
      color: var(--pages-neutral-11, #ccc); transition: all 0.15s;
    }
    .filter-pill[aria-selected="true"] {
      background: var(--pages-accent-9, #2563eb); color: #fff; border-color: var(--pages-accent-9, #2563eb);
    }
    .filter-pill:hover:not([aria-selected="true"]) { background: var(--pages-neutral-3, #2d2d44); }

    .role-group { margin-bottom: 12px; }
    .role-header {
      font-size: 12px; font-weight: 600; color: var(--pages-neutral-10, #aaa);
      margin-bottom: 6px; padding-left: 2px;
    }
    .profession-label { color: var(--pages-accent-11, #93c5fd); }
    .variant-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .template-card {
      display: flex; align-items: center; gap: 10px; padding: 8px 14px;
      border: 2px solid var(--pages-neutral-4, #3a3a52); border-radius: 8px;
      background: var(--pages-neutral-2, #252538); cursor: pointer;
      color: var(--pages-neutral-11, #ccc); transition: all 0.15s;
      flex: 1 1 0; min-width: 180px; max-width: 320px;
    }
    .template-card:hover { border-color: var(--pages-accent-7, #93c5fd); }
    .template-card.expanded { border-color: var(--pages-accent-9, #2563eb); background: var(--pages-accent-2, #1a2744); }
    .template-card.selected { border-color: var(--pages-accent-8, #60a5fa); background: var(--pages-accent-2, #1a2744); }
    .card-info { flex: 1; min-width: 0; }
    .card-label { font-size: 12px; font-weight: 600; }
    .card-desc { font-size: 10px; color: var(--pages-neutral-9, #999); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-family { font-size: 9px; color: var(--pages-accent-11, #93c5fd); margin-top: 2px; }

    .detail-expansion {
      margin-top: 6px; padding: 14px;
      border: 1px solid var(--pages-accent-7, #3b82f6); border-radius: 8px;
      background: var(--pages-neutral-1, #1e1e2e);
    }
    .detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .detail-name { font-size: 16px; font-weight: 600; }
    .detail-desc { font-size: 12px; color: var(--pages-neutral-10, #aaa); }
    .detail-profile { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
    .detail-badge {
      padding: 3px 8px; border-radius: 10px; font-size: 10px;
      border: 1px solid var(--pages-neutral-5, #4a4a62);
      background: var(--pages-neutral-3, #2d2d44); color: var(--pages-neutral-11, #ccc);
    }
    .detail-alias { font-size: 11px; color: var(--pages-accent-11, #93c5fd); margin-bottom: 10px; }
    .detail-summary { font-size: 11px; color: var(--pages-neutral-10, #aaa); font-style: italic; margin-bottom: 10px; line-height: 1.4; }
    .detail-actions { display: flex; gap: 8px; }
    .select-btn {
      padding: 6px 16px; border-radius: 6px; border: none; cursor: pointer;
      background: var(--pages-accent-9, #2563eb); color: #fff; font-size: 13px; font-weight: 500;
    }
    .select-btn:hover { background: var(--pages-accent-10, #1d4ed8); }

    .empty-state { text-align: center; padding: 24px; color: var(--pages-neutral-9, #999); font-size: 13px; }
  `;

  @property({ type: Boolean, attribute: 'suppress-detail' }) suppressDetail = false;
  @property({ type: String, attribute: 'selected-template-id' }) selectedTemplateId: string | null = null;
  @property({ type: String }) collection = 'mythic';
  @property({ type: String, attribute: 'group-by' }) groupBy: 'role' | 'family' = 'role';

  @state() private _search = '';
  @state() private _profession: string | null = null;
  @state() private _expandedId: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Agent template catalog');
  }

  private _filtered(): readonly CatalogTemplate[] {
    let result = CATALOG_TEMPLATES;
    if (this._profession) {
      result = result.filter(t => t.profession === this._profession);
    }
    if (this._search) {
      const q = this._search.toLowerCase();
      result = result.filter(t =>
        t.variant.label.toLowerCase().includes(q) ||
        t.variant.description.toLowerCase().includes(q) ||
        t.variant.archetype.toLowerCase().includes(q) ||
        t.profession.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q)
      );
    }
    return result;
  }

  private _select(template: CatalogTemplate) {
    this.dispatchEvent(new CustomEvent('catalog:template:selected', {
      detail: { template: buildDescriptor(template), templateId: template.id },
      bubbles: true, composed: true,
    }));
  }

  private _onCardClick(t: CatalogTemplate) {
    if (this.suppressDetail) {
      if (this.selectedTemplateId === t.id) {
        this.dispatchEvent(new CustomEvent('catalog:template:deselected', { bubbles: true, composed: true }));
      } else {
        this._select(t);
      }
    } else {
      this._expandedId = this._expandedId === t.id ? null : t.id;
    }
  }

  protected override render() {
    const filtered = this._filtered();
    const showFeatured = !this._profession && !this._search;
    return html`
      ${showFeatured ? this._renderFeatured() : nothing}
      ${this._renderSearch()}
      ${this._renderProfessionPills()}
      ${this.groupBy === 'family' ? this._renderFamilyGroups(filtered) : this._renderRoleGroups(filtered)}
    `;
  }

  private _renderRoleGroups(filtered: CatalogTemplate[]) {
    const groups = groupByRole(filtered);
    return groups.length > 0 ? groups.map(g => this._renderRoleGroup(g)) : html`<div class="empty-state">No templates match your search.</div>`;
  }

  private _renderFamilyGroups(filtered: CatalogTemplate[]) {
    const groups = groupByFamily(filtered);
    return groups.length > 0 ? groups.map(g => this._renderFamilyGroup(g)) : html`<div class="empty-state">No templates match your search.</div>`;
  }

  private _renderFamilyGroup(group: FamilyGroup) {
    const expandedTemplate = group.templates.find(t => t.id === this._expandedId);
    return html`
      <div class="family-group" role="group" aria-label="${group.family}">
        <div class="role-header">${group.family}</div>
        <div class="variant-row">
          ${group.templates.map(t => {
            const isExpanded = this._expandedId === t.id;
            return html`
              <div class=${classMap({ 'template-card': true, expanded: isExpanded, selected: this.selectedTemplateId === t.id })}
                data-template-id=${t.id}
                @click=${() => { this._onCardClick(t); }}>
                <agent-avatar .archetype=${{ family: t.variant.archetype.split('/')[0], subArchetype: t.variant.archetype.split('/')[1] }} collection=${this.collection} size="sm"></agent-avatar>
                <div class="card-info">
                  <div class="card-label">${t.variant.label}</div>
                  <div class="card-desc">${t.variant.description}</div>
                  <div class="card-family">${t.variant.archetype}</div>
                </div>
              </div>
            `;
          })}
        </div>
        ${!this.suppressDetail && expandedTemplate ? this._renderDetail(expandedTemplate) : nothing}
      </div>
    `;
  }

  private _renderFeatured() {
    return html`
      <div class="featured-section">
        <div class="featured-header">Recommended</div>
        <div class="featured-grid">
          ${FEATURED_TEMPLATES.map(t => html`
            <div class="featured-card" @click=${() => { this._profession = t.profession; this._onCardClick(t); }}>
              <agent-avatar .archetype=${{ family: t.variant.archetype.split('/')[0], subArchetype: t.variant.archetype.split('/')[1] }} collection=${this.collection} size="sm"></agent-avatar>
              <div class="featured-info">
                <div class="featured-label">${t.variant.label}</div>
                <div class="featured-role">${t.profession} &rsaquo; ${t.role}</div>
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private _renderSearch() {
    return html`
      <div class="search-bar">
        <input class="search-input" type="text" role="searchbox"
          aria-label="Search templates"
          placeholder="Search templates..."
          .value=${this._search}
          @input=${(e: Event) => { this._search = (e.target as HTMLInputElement).value; }}>
      </div>
    `;
  }

  private _renderProfessionPills() {
    return html`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div class="filter-bar" role="listbox" aria-label="Filter by profession" style="flex:1;margin-bottom:0">
          ${PROFESSION_LIST.map(p => html`
            <button class="filter-pill" role="option"
              data-filter="profession" data-value=${p}
              aria-selected=${String(this._profession === p)}
              @click=${() => { this._profession = this._profession === p ? null : p; }}>
              ${p}
            </button>
          `)}
        </div>
        <div style="display:flex;gap:0;border:1px solid var(--pages-neutral-5,#4a4a62);border-radius:6px;overflow:hidden;flex-shrink:0">
          <button style="padding:4px 10px;border:none;font-size:11px;cursor:pointer;background:${this.groupBy === 'role' ? 'var(--pages-accent-9,#2563eb)' : 'var(--pages-neutral-2,#252538)'};color:${this.groupBy === 'role' ? '#fff' : 'var(--pages-neutral-11,#ccc)'}"
            @click=${() => { this.groupBy = 'role'; }}>By Role</button>
          <button style="padding:4px 10px;border:none;border-left:1px solid var(--pages-neutral-5,#4a4a62);font-size:11px;cursor:pointer;background:${this.groupBy === 'family' ? 'var(--pages-accent-9,#2563eb)' : 'var(--pages-neutral-2,#252538)'};color:${this.groupBy === 'family' ? '#fff' : 'var(--pages-neutral-11,#ccc)'}"
            @click=${() => { this.groupBy = 'family'; }}>By Family</button>
        </div>
      </div>
    `;
  }

  private _renderRoleGroup(group: RoleGroup) {
    const expandedTemplate = group.templates.find(t => t.id === this._expandedId);
    const showProfession = !this._profession;
    return html`
      <div class="role-group" role="group" aria-label="${group.profession} ${group.role}">
        <div class="role-header">
          ${showProfession ? html`<span class="profession-label">${group.profession}</span> &rsaquo; ` : nothing}${group.role}
        </div>
        <div class="variant-row">
          ${group.templates.map(t => {
            const isExpanded = this._expandedId === t.id;
            return html`
              <div class=${classMap({ 'template-card': true, expanded: isExpanded, selected: this.selectedTemplateId === t.id })}
                data-template-id=${t.id}
                @click=${() => { this._onCardClick(t); }}>
                <agent-avatar .archetype=${{ family: t.variant.archetype.split('/')[0], subArchetype: t.variant.archetype.split('/')[1] }} collection=${this.collection} size="sm"></agent-avatar>
                <div class="card-info">
                  <div class="card-label">${t.variant.label}</div>
                  <div class="card-desc">${t.variant.description}</div>
                  <div class="card-family">${t.variant.archetype}</div>
                </div>
              </div>
            `;
          })}
        </div>
        ${!this.suppressDetail && expandedTemplate ? this._renderDetail(expandedTemplate) : nothing}
      </div>
    `;
  }

  private _renderDetail(t: CatalogTemplate) {
    const [family, sub] = t.variant.archetype.split('/');
    const descriptor = buildDescriptor(t);
    const p = descriptor.personality;
    const summary = buildSummaryText(p?.mbti, p?.enneagram, p?.disc, sub ?? 'agent');
    const badges: string[] = [];
    if (p?.mbti) badges.push(p.mbti);
    if (p?.enneagram) badges.push(p.enneagram);
    if (p?.disc) badges.push(`DISC: ${p.disc}`);
    if (p?.sdi) badges.push(`SDI: ${p.sdi}`);
    if (p?.belbin) badges.push(`Belbin: ${p.belbin.primary}`);

    return html`
      <div class="detail-expansion" role="region" aria-label="Template details"
        data-template-id=${t.id}>
        <div class="detail-header">
          <agent-avatar .archetype=${{ family, subArchetype: sub }} collection=${this.collection} size="md"></agent-avatar>
          <div>
            <div class="detail-name">${t.variant.label}</div>
            <div class="detail-desc">${t.variant.description}</div>
          </div>
        </div>
        <div class="detail-profile">
          ${badges.map(b => html`<span class="detail-badge">${b}</span>`)}
        </div>
        <div class="detail-alias">Preferred: ${t.preferredAlias}</div>
        ${summary ? html`<div class="detail-summary">${summary}</div>` : nothing}
        <div class="detail-actions">
          <button class="select-btn" @click=${(e: Event) => { e.stopPropagation(); this._select(t); }}>Select this template</button>
        </div>
      </div>
    `;
  }

}
