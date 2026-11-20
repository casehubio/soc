import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PersonalityProfile, FullAgentDescriptor } from '@casehubio/mosaic-core';
import { listCollections } from '../../../packages/agent-avatar-2d/src/collections/registry.js';
import { getRolesForArchetype } from '../../avatar-step/src/data/compatibility-matrix.js';
import '../../agent-catalog/src/agent-catalog.js';
import '../../avatar-step/src/avatar-step.js';
import '../../agent-profile-panel/src/agent-profile-panel.js';

export interface AgentPersonalityWorkbenchProps {
  initialDescriptor?: FullAgentDescriptor | null;
}

@customElement('agent-personality-workbench')
export class AgentPersonalityWorkbench extends LitElement {
  @property({ attribute: false }) initialDescriptor: FullAgentDescriptor | null = null;

  @state() _activeView: 'role' | 'character' = 'role';
  @state() _groupBy: 'role' | 'family' = 'role';
  @state() _collection = 'mythic';
  @state() _collectionDropdownOpen = false;
  @state() _profile: PersonalityProfile | null = null;
  @state() _archetype: { family: string; subArchetype: string } | null = null;
  @state() _selectedTemplateId: string | null = null;
  @state() _templateName = '';
  @state() _templateDesc = '';
  @state() _templateAlias = '';
  @state() _locked: Set<string> = new Set();

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Agent personality workbench');
  }

  static override styles = css`
    :host { display: block; height: 100%; font-family: var(--pages-font-family, system-ui); }
    .workbench-grid {
      display: grid;
      grid-template-columns: 1fr minmax(280px, 380px);
      height: 100%;
      gap: 16px;
    }
    @media (max-width: 768px) {
      .workbench-grid { grid-template-columns: 1fr; }
    }
    .main-column { display: flex; flex-direction: column; overflow: hidden; }
    .profile-column { overflow-y: auto; border-left: 1px solid var(--pages-neutral-4, #333); padding-left: 16px; }
    @media (max-width: 768px) {
      .profile-column { border-left: none; border-top: 1px solid var(--pages-neutral-4, #333); padding-left: 0; padding-top: 16px; }
    }

    /* Navigation bar — single row */
    .nav-bar {
      display: flex; align-items: center; gap: 4px;
      margin-bottom: 12px; flex-shrink: 0;
    }
    .nav-tabs { display: flex; gap: 4px; }
    .nav-spacer { flex: 1; }
    .nav-btn {
      padding: 6px 16px; border: 1px solid var(--pages-neutral-5, #4a4a62);
      border-radius: 6px; background: var(--pages-neutral-2, #252538);
      color: var(--pages-neutral-11, #ccc); cursor: pointer; font-size: 13px;
    }
    .nav-btn[aria-selected="true"], .nav-btn[aria-checked="true"] {
      background: var(--pages-neutral-3, #2e2e44);
      color: var(--pages-neutral-12, #eee);
      border-color: var(--pages-accent-7, #3b82f6);
    }



    /* Collection dropdown */
    .collection-dropdown { position: relative; }
    .collection-trigger {
      padding: 4px 10px; border: 1px solid var(--pages-neutral-5, #4a4a62);
      border-radius: 6px; background: var(--pages-neutral-2, #252538);
      color: var(--pages-neutral-11, #ccc); cursor: pointer; font-size: 12px;
      display: flex; align-items: center; gap: 6px;
    }
    .collection-menu {
      position: absolute; top: 100%; right: 0; margin-top: 4px;
      background: var(--pages-neutral-2, #252538); border: 1px solid var(--pages-neutral-5, #4a4a62);
      border-radius: 6px; padding: 4px; z-index: 10; min-width: 140px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .collection-option {
      display: flex; align-items: center; gap: 8px; width: 100%;
      padding: 6px 12px; border: none;
      background: transparent; color: var(--pages-neutral-11, #ccc);
      cursor: pointer; font-size: 12px; text-align: left; border-radius: 4px;
    }
    .collection-option:hover { background: var(--pages-neutral-3, #2e2e44); }
    .collection-option[aria-selected="true"] {
      color: var(--pages-accent-11, #93c5fd); font-weight: 600;
    }
    .collection-option agent-avatar, .collection-trigger agent-avatar {
      flex-shrink: 0;
    }

    .view-panel { flex: 1; overflow-y: auto; }
    .view-panel[hidden] { display: none; }
  `;

  protected override render() {
    return html`
      <div class="workbench-grid">
        <div class="main-column">
          ${this._renderNavBar()}
          <div class="view-panel"
            ?hidden=${this._activeView !== 'role'}
            @catalog:template:selected=${this._onTemplateSelected}
            @catalog:template:deselected=${this._onTemplateDeselected}>
            <agent-catalog
              .suppressDetail=${true}
              .selectedTemplateId=${this._selectedTemplateId}
              .collection=${this._collection}>
            </agent-catalog>
          </div>
          <div class="view-panel"
            ?hidden=${this._activeView !== 'character'}
            @avatar:archetype:selected=${this._onArchetypeSelected}
            @avatar:personality:changed=${this._onPersonalityChanged}>
            <avatar-step
              .hideProfile=${true}
              .externalProfile=${this._profile}
              .externalArchetype=${this._archetype}
              .collection=${this._collection}>
            </avatar-step>
          </div>
        </div>
        <div class="profile-column"
          @profile:value:changed=${this._onProfileValueChanged}
          @profile:lock:changed=${this._onProfileLockChanged}
          @profile:reset=${this._onProfileReset}
          @personality:confirmed=${this._onConfirm}>
          <agent-profile-panel
            .profile=${this._profile}
            .archetype=${this._archetype}
            .locked=${this._locked}
            .archetypeRoles=${this._archetypeRoles}
            .templateName=${this._templateName}
            .templateDesc=${this._templateDesc}
            .templateAlias=${this._templateAlias}
            .collection=${this._collection}>
          </agent-profile-panel>
        </div>
      </div>
    `;
  }

  private _renderNavBar() {
    const collections: ReadonlyArray<{ id: string; label: string }> = listCollections();
    const currentCollection = collections.find(c => c.id === this._collection);
    return html`
      <div class="nav-bar">
        <div class="nav-tabs" role="tablist" aria-label="Browse mode">
          <button class="nav-btn" role="tab"
            aria-selected=${String(this._activeView === 'role')}
            @click=${() => { this._activeView = 'role'; }}>Browse</button>
          <button class="nav-btn" role="tab"
            aria-selected=${String(this._activeView === 'character')}
            @click=${() => { this._activeView = 'character'; }}>Custom</button>
        </div>
        <div class="nav-spacer"></div>
        ${collections.length > 1 ? html`
          <div class="collection-dropdown">
            <button class="collection-trigger"
              @click=${() => { this._collectionDropdownOpen = !this._collectionDropdownOpen; }}>
              <agent-avatar .archetype=${{ family: 'Sage', subArchetype: 'Detective' }} collection=${this._collection} size="xs"></agent-avatar>
              ${currentCollection?.label ?? 'Mythic'} ▾
            </button>
            ${this._collectionDropdownOpen ? html`
              <div class="collection-menu">
                ${collections.map(c => html`
                  <button class="collection-option"
                    aria-selected=${String(this._collection === c.id)}
                    @click=${() => { this._collection = c.id; this._collectionDropdownOpen = false; }}>
                    <agent-avatar .archetype=${{ family: 'Sage', subArchetype: 'Detective' }} collection=${c.id} size="xs"></agent-avatar>
                    ${c.label}
                  </button>
                `)}
              </div>
            ` : nothing}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private get _archetypeRoles(): Array<{ profession: string; role: string }> {
    if (!this._archetype) return [];
    return getRolesForArchetype(`${this._archetype.family}/${this._archetype.subArchetype}`);
  }

  private _onTemplateSelected(e: CustomEvent) {
    const descriptor = e.detail.template as FullAgentDescriptor;
    this._profile = descriptor.personality
      ? { ...descriptor.personality, profession: descriptor.profession, role: descriptor.role }
      : null;
    this._archetype = descriptor.archetypeFamily && descriptor.subArchetype
      ? { family: descriptor.archetypeFamily, subArchetype: descriptor.subArchetype }
      : null;
    this._selectedTemplateId = (e.detail.templateId as string) || null;
    this._templateName = descriptor.name || '';
    this._templateDesc = descriptor.description || '';
    this._templateAlias = descriptor.preferredAlias || '';
  }

  private _onTemplateDeselected() {
    this._profile = null;
    this._archetype = null;
    this._selectedTemplateId = null;
    this._templateName = '';
    this._templateDesc = '';
    this._templateAlias = '';
  }

  private _onArchetypeSelected(e: CustomEvent) {
    const { archetype, personality } = e.detail;
    this._profile = personality ? { ...personality } : null;
    this._archetype = archetype ? { family: archetype.family, subArchetype: archetype.subArchetype } : null;
  }

  private _onPersonalityChanged(e: CustomEvent) {
    this._profile = e.detail.personality ? { ...e.detail.personality } : null;
  }

  private _onProfileValueChanged(e: CustomEvent) {
    e.stopPropagation();
    if (!this._profile) return;
    const { field, value } = e.detail;
    if (field === 'profession') {
      this._profile = { ...this._profile, profession: this._profile.profession === value ? undefined : value, role: undefined };
    } else if (field === 'role') {
      this._profile = { ...this._profile, role: this._profile.role === value ? undefined : value };
    } else if (field === 'belbin') {
      const belbin = this._profile.belbin;
      if (!belbin) {
        this._profile = { ...this._profile, belbin: { primary: value, secondaries: [] } };
      } else if (belbin.primary === value) {
        this._profile = { ...this._profile, belbin: undefined };
      } else if (belbin.secondaries.includes(value)) {
        this._profile = { ...this._profile, belbin: { ...belbin, secondaries: belbin.secondaries.filter((s: string) => s !== value) } };
      } else if (belbin.secondaries.length < 2) {
        this._profile = { ...this._profile, belbin: { ...belbin, secondaries: [...belbin.secondaries, value] } };
      } else {
        this._profile = { ...this._profile, belbin: { ...belbin, secondaries: [belbin.secondaries[1]!, value] } };
      }
    } else if (field === 'bigFive') {
      const { dim, pole } = value;
      const bf = { ...(this._profile.bigFive || {}) } as Record<string, string>;
      if (bf[dim] === pole) { delete bf[dim]; } else { bf[dim] = pole; }
      this._profile = { ...this._profile, bigFive: bf as PersonalityProfile['bigFive'] };
    } else {
      const current = (this._profile as Record<string, unknown>)[field];
      this._profile = { ...this._profile, [field]: current === value ? undefined : value };
    }
  }

  private _onProfileLockChanged(e: CustomEvent) {
    e.stopPropagation();
    const { field, locked } = e.detail;
    const next = new Set(this._locked);
    if (locked) next.add(field); else next.delete(field);
    this._locked = next;
  }

  private _onProfileReset(e: CustomEvent) {
    e.stopPropagation();
    this._profile = null;
    this._archetype = null;
    this._selectedTemplateId = null;
    this._templateName = '';
    this._templateDesc = '';
    this._templateAlias = '';
    this._locked = new Set();
  }

  private _onConfirm(e: CustomEvent) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('personality:confirmed', {
      detail: { profile: this._profile, archetype: this._archetype },
      bubbles: true, composed: true,
    }));
  }
}
