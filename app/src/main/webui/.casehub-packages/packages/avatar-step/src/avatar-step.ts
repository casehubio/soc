import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ARCHETYPE_CONFIGS, ARCHETYPE_FAMILIES, listCollections } from '@casehubio/mosaic-agent-avatar-2d';

import { getCompatibleArchetypes, getValidFrameworkValues, getValidBigFivePoles } from './filter.js';
import type { MatchTier } from './filter.js';
import { ALL_FRAMEWORK_VALUES, getFrameworkProfile, getRolesForArchetype, getRoleFrameworkValues } from './data/compatibility-matrix.js';
import type { PersonalityFramework, BigFiveDimension, BigFivePole } from './data/compatibility-matrix.js';
import { PROFESSION_PRESETS, PROFESSION_LIST } from './data/profession-presets.js';
import type { RoleVariant } from './data/profession-presets.js';
import { buildSummaryText, BIG_FIVE_DIMS, BIG_FIVE_LABELS, FRAMEWORK_LABELS } from './data/framework-descriptors.js';
import { deriveDispositions, deriveTendencies, DISPOSITION_TIPS } from './data/disposition-mapping.js';
import { FRAMEWORK_TOOLTIPS } from './data/framework-tooltips.js';
import { initProfile } from './data/profile-derivation.js';
import type { PersonalityProfile } from '@casehubio/mosaic-core';

const FAMILIES = ARCHETYPE_FAMILIES as readonly string[];
const SINGLE_FRAMEWORKS: PersonalityFramework[] = ['mbti', 'enneagram', 'disc', 'belbin', 'sdi'];
const MAPPED_ARCHETYPES = new Set(Object.values(PROFESSION_PRESETS).flatMap(roles => roles.flatMap(r => r.variants.map(v => v.archetype))));

function familySubs(family: string): string[] {
  return Object.keys(ARCHETYPE_CONFIGS)
    .filter(k => k.startsWith(family + '/'))
    .map(k => k.split('/')[1]!);
}

@customElement('avatar-step')
export class AvatarStep extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }

    .collection-bar { display: flex; gap: 6px; margin-bottom: 12px; }
    .collection-btn {
      padding: 6px 14px; border-radius: 6px; border: 2px solid var(--pages-neutral-4, #3a3a52);
      background: var(--pages-neutral-2, #252538); cursor: pointer; font-size: 13px; font-weight: 500;
      color: var(--pages-neutral-11, #ccc); transition: all 0.15s;
    }
    .collection-btn[aria-checked="true"] {
      border-color: var(--pages-accent-9, #2563eb); background: var(--pages-accent-3, #1e3a5f);
      color: var(--pages-accent-11, #93c5fd);
    }

    .main-panel { display: grid; grid-template-columns: 1fr 280px; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 767px) { .main-panel { grid-template-columns: 1fr; } }

    .panel { border: 1px solid var(--pages-neutral-4, #3a3a52); border-radius: 8px; padding: 12px; background: var(--pages-neutral-1, #1e1e2e); }
    .personality-side .panel { font-size: 11px; padding: 10px; }
    .personality-side .framework-row { margin-bottom: 5px; }
    .personality-side .framework-label { min-width: 70px; font-size: 11px; }
    .personality-side .pill { padding: 3px 7px; font-size: 10px; }
    .personality-side .big5-toggle { padding: 2px 6px; font-size: 10px; }
    .personality-side .big5-label { font-size: 10px; min-width: 16px; }
    .personality-side .reset-btn { font-size: 11px; padding: 3px 10px; }
    .personality-side .pill.avatar-match { background: var(--pages-accent-9, #2563eb); color: #fff; border-color: var(--pages-accent-9, #2563eb); }
    .personality-side .pill.role-scope { border-color: var(--pages-accent-7, #3b82f6); background: var(--pages-accent-2, #1a2744); }



    .framework-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
    .framework-label { font-size: 12px; font-weight: 600; min-width: 90px; color: var(--pages-neutral-10, #aaa); }
    .pill {
      padding: 4px 10px; border-radius: 12px; border: 1px solid var(--pages-neutral-5, #4a4a62);
      background: var(--pages-neutral-2, #252538); cursor: pointer; font-size: 12px;
      color: var(--pages-neutral-11, #ccc); transition: all 0.15s;
    }
    .pill[aria-selected="true"], .pill[aria-pressed="true"] {
      background: var(--pages-accent-9, #0066cc); color: #fff; border-color: var(--pages-accent-9, #0066cc);
    }
    .pill[data-dimmed] { opacity: 0.3; }
    .pill[data-dimmed]:hover { opacity: 0.6; }
    .pill:hover:not([aria-selected="true"]) { background: var(--pages-neutral-3, #2d2d44); }

    .big5-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .big5-label { font-size: 11px; min-width: 30px; text-align: center; color: var(--pages-neutral-10, #aaa); }
    .big5-toggle {
      padding: 3px 8px; border-radius: 4px; border: 1px solid var(--pages-neutral-5, #4a4a62);
      background: var(--pages-neutral-2, #252538); color: var(--pages-neutral-11, #ccc); cursor: pointer; font-size: 11px;
    }
    .big5-toggle[aria-checked="true"] {
      background: var(--pages-accent-9, #0066cc); color: #fff; border-color: var(--pages-accent-9, #0066cc);
    }
    .big5-toggle[data-dimmed] { opacity: 0.3; }
    .big5-toggle[data-dimmed]:hover { opacity: 0.6; }

    .reset-btn {
      padding: 4px 12px; border-radius: 4px; border: 1px solid var(--pages-neutral-5, #4a4a62);
      background: var(--pages-neutral-2, #252538); color: var(--pages-neutral-11, #ccc); cursor: pointer; font-size: 12px; margin-top: 4px;
    }
    .profile-section { margin-bottom: 12px; border: 1px solid var(--pages-accent-7, #3b82f6); border-radius: 8px; padding: 10px; background: var(--pages-neutral-2, #252538); }
    .profile-header { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--pages-accent-11, #93c5fd); margin-bottom: 8px; }
    .profile-group { position: relative; }
    .profile-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; }
    .profile-label { min-width: 70px; font-weight: 600; color: var(--pages-neutral-10, #aaa); font-size: 11px; }
    .profile-value { color: var(--pages-neutral-11, #ccc); font-size: 12px; flex: 1; }
    .profile-lock { font-size: 10px; color: var(--pages-neutral-9, #999); cursor: pointer; padding: 2px 6px; border: 1px solid var(--pages-neutral-5, #4a4a62); border-radius: 4px; background: transparent; opacity: 0; transition: opacity 0.15s; }
    .profile-group:hover .profile-lock { opacity: 1; }
    .profile-lock.locked { opacity: 1; color: var(--pages-accent-11, #93c5fd); border-color: var(--pages-accent-7, #3b82f6); }
    .profile-picker { display: none; flex-wrap: wrap; gap: 4px; margin: 4px 0 4px 78px; }
    .profile-group:hover:not(.locked) .profile-picker { display: flex; }
    .profile-default { border-color: var(--pages-accent-7, #3b82f6); color: var(--pages-accent-11, #93c5fd); }
    .pill.sdi-blue, .pill.avatar-match.sdi-blue, .pill.role-scope.sdi-blue { border-color: #3b82f6; color: #93c5fd; background: transparent; }
    .pill.sdi-blue[aria-selected="true"], .pill.sdi-blue[aria-pressed="true"] { background: #2563eb; border-color: #2563eb; color: #fff; }
    .pill.sdi-red, .pill.avatar-match.sdi-red, .pill.role-scope.sdi-red { border-color: #ef4444; color: #fca5a5; background: transparent; }
    .pill.sdi-red[aria-selected="true"], .pill.sdi-red[aria-pressed="true"] { background: #dc2626; border-color: #dc2626; color: #fff; }
    .pill.sdi-green, .pill.avatar-match.sdi-green, .pill.role-scope.sdi-green { border-color: #22c55e; color: #86efac; background: transparent; }
    .pill.sdi-green[aria-selected="true"], .pill.sdi-green[aria-pressed="true"] { background: #16a34a; border-color: #16a34a; color: #fff; }
    .pill.sdi-hub, .pill.avatar-match.sdi-hub, .pill.role-scope.sdi-hub { border-color: #a78bfa; color: #c4b5fd; background: transparent; }
    .pill.sdi-hub[aria-selected="true"], .pill.sdi-hub[aria-pressed="true"] { background: #7c3aed; border-color: #7c3aed; color: #fff; }
    .sdi-text-blue { color: #93c5fd; }
    .sdi-text-red { color: #fca5a5; }
    .sdi-text-green { color: #86efac; }
    .sdi-text-hub { color: #c4b5fd; }
    .profile-belbin-sec { background: transparent; color: var(--pages-accent-9, #2563eb); border: 2px solid var(--pages-accent-9, #2563eb); }
    .dynamic-summary {
      font-size: 10px; color: var(--pages-accent-11, #93c5fd); font-style: italic;
      margin-top: 8px; line-height: 1.3; padding-top: 6px; border-top: 1px solid var(--pages-neutral-4, #3a3a52);
    }
    .disposition-section { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--pages-neutral-4, #3a3a52); }
    .disposition-header { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--pages-neutral-10, #aaa); margin-bottom: 6px; }
    .disposition-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 10px; }
    .disposition-label-low { min-width: 80px; text-align: right; color: var(--pages-neutral-9, #999); }
    .disposition-label-high { min-width: 80px; color: var(--pages-neutral-9, #999); }
    .disposition-bar { flex: 1; height: 6px; background: var(--pages-neutral-4, #3a3a52); border-radius: 3px; position: relative; min-width: 80px; }
    .disposition-marker { position: absolute; top: -3px; width: 12px; height: 12px; border-radius: 50%; background: var(--pages-accent-9, #2563eb); border: 2px solid var(--pages-accent-11, #93c5fd); transform: translateX(-50%); transition: left 0.3s ease; }
    .disposition-neutral { background: var(--pages-neutral-5, #4a4a62); }
    .tendencies-section { margin-top: 8px; padding-top: 6px; border-top: 1px solid var(--pages-neutral-4, #3a3a52); }
    .tendencies-header { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--pages-neutral-10, #aaa); margin-bottom: 6px; }
    .tendency-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .tendency-chip { padding: 3px 8px; border-radius: 10px; font-size: 10px; border: 1px solid; cursor: default; }
    .tendency-chip.strong { background: var(--pages-accent-3, #1e3a5f); border-color: var(--pages-accent-9, #2563eb); color: var(--pages-accent-11, #93c5fd); }
    .tendency-chip.moderate { background: var(--pages-neutral-3, #2d2d44); border-color: var(--pages-accent-7, #3b82f6); color: var(--pages-neutral-11, #ccc); }
    .tendency-chip.mild { background: transparent; border-color: var(--pages-neutral-5, #4a4a62); color: var(--pages-neutral-10, #aaa); }
    .tendency-strength { font-size: 8px; opacity: 0.7; margin-left: 2px; }

    .profession-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .role-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .pill.role-match { border-color: var(--pages-accent-7, #3b82f6); background: var(--pages-accent-3, #1e3a5f); color: var(--pages-accent-11, #93c5fd); }
    .pill.has-compatible { border-color: var(--pages-accent-6, #60a5fa); color: var(--pages-accent-11, #93c5fd); }
    .variant-card { display: grid; grid-template-columns: auto 1fr 1fr; gap: 8px; align-items: center; width: 100%; padding: 8px 12px; margin-bottom: 4px; border: 2px solid var(--pages-neutral-4, #3a3a52); border-radius: 8px; background: var(--pages-neutral-2, #252538); cursor: pointer; text-align: left; color: var(--pages-neutral-11, #ccc); font-size: 13px; }
    .variant-card.selected { border-color: var(--pages-accent-9, #2563eb); }
    .variant-card:hover { border-color: var(--pages-accent-7, #93c5fd); }
    .variant-label { font-weight: 600; margin-bottom: 2px; }
    .variant-desc { font-size: 11px; color: var(--pages-neutral-9, #999); }
    .variant-roles { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
    .role-badge { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: var(--pages-accent-2, #1a2744); color: var(--pages-accent-11, #93c5fd); border: 1px solid var(--pages-accent-7, #3b82f6); cursor: pointer; }
    .role-badge:hover { background: var(--pages-accent-3, #1e3a5f); }
    .variant-profile { font-size: 10px; color: var(--pages-neutral-9, #999); margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0 4px; }
    .variant-profile dt { font-weight: 600; color: var(--pages-neutral-10, #aaa); margin-top: 3px; }
    .variant-profile dd { margin: 0; margin-bottom: 2px; }

    .grid { display: grid; grid-template-columns: auto repeat(4, 1fr); gap: 4px; margin-bottom: 12px; }
    .family-label { font-size: 11px; font-weight: 600; color: var(--pages-neutral-10, #666); padding: 4px 8px 4px 0; display: flex; align-items: center; }
    .avatar-cell {
      display: flex; flex-direction: column; align-items: center; padding: 4px;
      border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.15s;
    }
    .avatar-cell.strong { opacity: 1; }
    .avatar-cell.strong:hover { border-color: var(--pages-accent-7, #93c5fd); }
    .avatar-cell.weak { opacity: 0.6; }
    .avatar-cell.weak:hover { border-color: var(--pages-accent-7, #93c5fd); }
    .avatar-cell.incompatible { opacity: 0.25; transform: scale(0.9); cursor: pointer; }
    .avatar-cell.incompatible:hover { opacity: 0.5; border-color: var(--pages-neutral-5, #4a4a62); }
    .avatar-cell.unmapped .sub-label::after { content: ' *'; color: var(--pages-neutral-9, #999); font-size: 8px; }
    .avatar-cell.profession-ghosted { opacity: 0.2; transform: scale(0.9); }
    .avatar-cell.profession-ghosted:hover { opacity: 0.5; transform: scale(1); }
    .avatar-cell.role-match { border-color: var(--pages-accent-7, #3b82f6); opacity: 1; transform: none; }
    .avatar-cell.role-match .sub-label { color: var(--pages-accent-11, #93c5fd); font-weight: 600; }
    .avatar-cell.selected { border-color: var(--pages-accent-9, #0066cc); background: var(--pages-accent-2, #eff6ff); opacity: 1; transform: none; }
    .avatar-cell .sub-label { font-size: 10px; color: var(--pages-neutral-9, #737373); text-align: center; margin-top: 2px; }

    .preview { display: flex; align-items: center; gap: 16px; padding: 12px; border: 1px solid var(--pages-neutral-4, #e5e5e5); border-radius: 8px; min-height: 80px; }
    .preview-info { font-size: 14px; }
    .preview-family { font-weight: 600; color: var(--pages-accent-11, #1e3a5f); }
    .preview-sub { color: var(--pages-neutral-10, #666); }

    .has-tip { position: relative; }
    .pill { overflow: visible; }
    .framework-row { overflow: visible; }
    .profile-row { overflow: visible; }
    .panel { overflow: visible; }
    .has-tip .tip-content {
      display: none; position: absolute; z-index: 10;
      bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%);
      background: var(--pages-neutral-3, #2d2d44); border: 1px solid var(--pages-neutral-5, #4a4a62);
      border-radius: 6px; padding: 6px 10px; font-size: 11px; color: var(--pages-neutral-12, #eee);
      white-space: normal; width: max-content; max-width: 280px; line-height: 1.4;
      pointer-events: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .has-tip .tip-content::after {
      content: ''; position: absolute; top: 100%; left: 0; right: 0; height: 8px;
    }
    .has-tip:hover .tip-content { display: block; }
    .tip-more {
      display: inline-block; margin-top: 4px; font-size: 10px;
      color: var(--pages-accent-11, #93c5fd); cursor: pointer;
      background: none; border: none; padding: 0; text-decoration: underline;
    }
    .tip-dialog-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6); z-index: 100; display: flex;
      align-items: center; justify-content: center;
    }
    .tip-dialog {
      background: var(--pages-neutral-2, #252538); border: 1px solid var(--pages-neutral-5, #4a4a62);
      border-radius: 10px; padding: 20px; max-width: 480px; width: 90%;
      color: var(--pages-neutral-12, #eee); font-size: 13px; line-height: 1.5;
    }
    .tip-dialog h3 { margin: 0 0 8px; color: var(--pages-accent-11, #93c5fd); font-size: 15px; }
    .tip-dialog-close {
      float: right; background: none; border: none; color: var(--pages-neutral-10, #aaa);
      cursor: pointer; font-size: 16px; padding: 0;
    }

    @media (max-width: 767px) {
      .grid { grid-template-columns: auto repeat(2, 1fr); }
    }
  `;

  @property({ type: Boolean, attribute: 'hide-profile' }) hideProfile = false;
  @property({ type: Boolean, attribute: 'hide-personality' }) hidePersonality = false;
  @property({ attribute: false }) externalProfile: PersonalityProfile | null = null;
  @property({ attribute: false }) externalArchetype: { family: string; subArchetype: string } | null = null;
  @property({ type: String }) collection = '';

  @state() private _collection = 'mythic';
  @state() private _selectedArchetype: string | null = null;
  @state() private _profession: string | null = null;
  @state() private _selectedRole: string | null = null;
  @state() private _frameworks: Partial<Record<PersonalityFramework, string>> = {};
  @state() private _bigFive: Partial<Record<BigFiveDimension, BigFivePole>> = {};
  @state() private _professionAutoSelected = false;
  private _suppressExternalReset = false;
  @state() private _profile: PersonalityProfile = {};
  @state() private _profileProfession: string | null = null;
  @state() private _profileRole: string | null = null;
  @state() private _profileLocked = new Set<string>();
  @state() private _tipDialog: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Avatar selection');
  }

  protected override willUpdate(changed: PropertyValues) {
    if (changed.has('collection') && this.collection) {
      this._collection = this.collection;
    }
    if (changed.has('externalProfile') || changed.has('externalArchetype')) {
      this._syncFromExternalProfile();
    }
  }

  private _syncFromExternalProfile() {
    const ext = this.externalProfile;
    if (ext === null) {
      if (!this._suppressExternalReset) {
        this._reset();
        this._profile = {} as PersonalityProfile;
        this._profileProfession = null;
        this._profileRole = null;
        this._profileLocked = new Set();
      }
      this._suppressExternalReset = false;
      return;
    }
    const profileChanged = JSON.stringify(ext) !== JSON.stringify(this._buildPersonalityProfile());
    const extKey = this.externalArchetype ? `${this.externalArchetype.family}/${this.externalArchetype.subArchetype}` : null;
    const archetypeChanged = extKey !== this._selectedArchetype;
    if (!profileChanged && !archetypeChanged) return;
    if (profileChanged) {
      this._profile = { ...ext };
      const fwUpdate: Partial<Record<PersonalityFramework, string>> = {};
      if (ext.mbti) fwUpdate.mbti = ext.mbti;
      if (ext.enneagram) fwUpdate.enneagram = ext.enneagram;
      if (ext.disc) fwUpdate.disc = ext.disc;
      if (ext.belbin) fwUpdate.belbin = ext.belbin.primary;
      if (ext.sdi) fwUpdate.sdi = ext.sdi;
      this._frameworks = fwUpdate;
      this._bigFive = ext.bigFive ? { ...ext.bigFive } : {};
      this._profileProfession = ext.profession ?? null;
      this._profileRole = ext.role ?? null;
    }
    if (extKey) {
      this._selectedArchetype = extKey;
      const extProf = this.externalProfile?.profession;
      const extRole = this.externalProfile?.role;
      if (extProf) {
        this._profession = extProf;
        this._selectedRole = extRole ?? null;
        this._professionAutoSelected = false;
      } else if (!this._profession) {
        const matched = getRolesForArchetype(extKey);
        if (matched.length > 0) {
          this._profession = matched[0]!.profession;
          this._selectedRole = matched[0]!.role;
        }
      }
    } else {
      this._selectedArchetype = null;
    }
  }

  private _tiers(): Map<string, MatchTier> {
    return getCompatibleArchetypes(this._frameworks, this._bigFive);
  }

  private _tip(key: string, content: unknown) {
    const entry = FRAMEWORK_TOOLTIPS[key];
    if (!entry) return content;
    return html`<span class="has-tip">${content}<span class="tip-content">${entry.tip} <button class="tip-more" @click=${(e: Event) => { e.stopPropagation(); this._tipDialog = key; }}>more</button></span></span>`;
  }

  private _renderTipDialog() {
    if (!this._tipDialog) return nothing;
    const entry = FRAMEWORK_TOOLTIPS[this._tipDialog];
    if (!entry) return nothing;
    const title = this._tipDialog.includes(':') ? this._tipDialog.split(':')[1] : this._tipDialog;
    return html`
      <div class="tip-dialog-overlay" @click=${() => { this._tipDialog = null; }}>
        <div class="tip-dialog" @click=${(e: Event) => e.stopPropagation()}>
          <button class="tip-dialog-close" @click=${() => { this._tipDialog = null; }}>X</button>
          <h3>${title}</h3>
          <p>${entry.detail}</p>
        </div>
      </div>
    `;
  }

  private _buildPersonalityProfile(): PersonalityProfile {
    const profile = { ...this._profile };
    if (this._profileProfession) profile.profession = this._profileProfession;
    if (this._profileRole) profile.role = this._profileRole;
    return profile;
  }

  private _emitPersonalityChanged() {
    this.dispatchEvent(new CustomEvent('avatar:personality:changed', {
      detail: { personality: this._buildPersonalityProfile() },
      bubbles: true, composed: true,
    }));
  }

  private _initProfile(archetypeKey: string): PersonalityProfile {
    return initProfile(archetypeKey);
  }

  private _sdiColor(value: string) {
    const cls = `sdi-text-${value.toLowerCase()}`;
    return html`<span class=${cls}>${value}</span>`;
  }

  private _toggleLock(fw: string) {
    const next = new Set(this._profileLocked);
    if (next.has(fw)) next.delete(fw); else next.add(fw);
    this._profileLocked = next;
  }

  private _updateProfileValue(fw: string, value: string) {
    if (fw === 'belbin') { this._updateProfileBelbin(value); return; }
    const current = (this._profile as Record<string, unknown>)[fw];
    if (current === value) {
      const copy = { ...this._profile };
      delete (copy as Record<string, unknown>)[fw];
      this._profile = copy;
    } else {
      this._profile = { ...this._profile, [fw]: value };
    }
    this._emitPersonalityChanged();
  }

  private _updateProfileBelbin(value: string) {
    const belbin = this._profile.belbin;
    if (!belbin) {
      this._profile = { ...this._profile, belbin: { primary: value, secondaries: [] } };
    } else if (belbin.primary === value) {
      const { belbin: _, ...rest } = this._profile;
      this._profile = rest as PersonalityProfile;
    } else if (belbin.secondaries.includes(value)) {
      this._profile = { ...this._profile, belbin: { ...belbin, secondaries: belbin.secondaries.filter(s => s !== value) } };
    } else if (belbin.secondaries.length < 2) {
      this._profile = { ...this._profile, belbin: { ...belbin, secondaries: [...belbin.secondaries, value] } };
    } else {
      this._profile = { ...this._profile, belbin: { ...belbin, secondaries: [belbin.secondaries[1]!, value] } };
    }
    this._emitPersonalityChanged();
  }

  private _updateProfileBigFive(dim: BigFiveDimension, pole: BigFivePole) {
    const bf = { ...(this._profile.bigFive || {}) };
    if (bf[dim] === pole) { delete bf[dim]; } else { bf[dim] = pole; }
    this._profile = { ...this._profile, bigFive: bf };
    this._emitPersonalityChanged();
  }

  // ── Centralised filter pipeline ──
  // ALL state mutations flow through these methods. No inline state changes.

  private _applyFilters(frameworks: Partial<Record<PersonalityFramework, string>>, bigFive: Partial<Record<BigFiveDimension, BigFivePole>>) {
    this._frameworks = frameworks;
    this._bigFive = bigFive;
    const tiers = this._tiers();
    if (this._selectedArchetype) {
      const tier = tiers.get(this._selectedArchetype);
      if (tier !== 'strong') {
        const oldProfile = this._initProfile(this._selectedArchetype);
        this._selectedArchetype = null;
        this._profession = null;
        this._selectedRole = null;
        this._profile = {};
        this._profileProfession = null;
        this._profileRole = null;
        const userFrameworks: Partial<Record<PersonalityFramework, string>> = {};
        for (const [fw, val] of Object.entries(this._frameworks)) {
          const profileVal = (oldProfile as Record<string, unknown>)[fw];
          const belbinVal = fw === 'belbin' ? oldProfile.belbin?.primary : profileVal;
          if (val !== belbinVal && val !== profileVal) {
            (userFrameworks as Record<string, string>)[fw] = val as string;
          }
        }
        this._frameworks = userFrameworks;
        this._bigFive = {};
        this._suppressExternalReset = true;
        this.dispatchEvent(new CustomEvent('avatar:archetype:selected', {
          detail: { archetype: null, collection: this._collection, personality: null },
          bubbles: true, composed: true,
        }));
      }
    }
    if (this._professionAutoSelected) {
      this._profession = null;
      this._selectedRole = null;
      this._professionAutoSelected = false;
    }
    const currentTiers = this._tiers();
    const hasFilters = Object.keys(this._frameworks).length > 0 || Object.keys(this._bigFive).length > 0;
    if (hasFilters && !this._profession) {
      this._autoSelectBestProfession(currentTiers);
    }
  }

  private _autoSelectBestProfession(tiers: Map<string, MatchTier>) {
    let bestProf: string | null = null;
    let bestRole: string | null = null;
    let bestScore = -1;
    for (const [prof, roles] of Object.entries(PROFESSION_PRESETS)) {
      for (const { role, variants } of roles) {
        let score = 0;
        for (const v of variants) {
          const t = tiers.get(v.archetype);
          if (t === 'strong') score += 2;
          else if (t === 'weak') score += 1;
        }
        if (score > bestScore) { bestScore = score; bestProf = prof; bestRole = role; }
      }
    }
    if (bestScore > 0) {
      this._profession = bestProf;
      this._selectedRole = bestRole;
      this._professionAutoSelected = true;
    }
  }

  private _compatibleProfessions(): Set<string> {
    const tiers = this._tiers();
    const hasFilters = Object.keys(this._frameworks).length > 0 || Object.keys(this._bigFive).length > 0;
    if (!hasFilters) return new Set();
    const compatible = new Set<string>();
    for (const [prof, roles] of Object.entries(PROFESSION_PRESETS)) {
      outer: for (const { variants } of roles) {
        for (const v of variants) {
          const t = tiers.get(v.archetype);
          if (t === 'strong' || t === 'weak') { compatible.add(prof); break outer; }
        }
      }
    }
    return compatible;
  }

  // ── Entry points (all delegate to pipeline) ──

  private _selectFramework(fw: PersonalityFramework, value: string) {
    const next = { ...this._frameworks };
    if (next[fw] === value) { delete next[fw]; } else { next[fw] = value; }
    this._applyFilters(next, this._bigFive);
  }

  private _toggleBigFive(dim: BigFiveDimension, pole: BigFivePole) {
    const next = { ...this._bigFive };
    if (next[dim] === pole) { delete next[dim]; } else { next[dim] = pole; }
    this._applyFilters(this._frameworks, next);
  }

  private _selectArchetype(key: string) {
    const hasActiveFilters = Object.keys(this._frameworks).length > 0 || Object.keys(this._bigFive).length > 0;
    if (hasActiveFilters) {
      this._selectArchetypeWithinContext(key);
    } else {
      this._selectArchetypeFresh(key);
    }
  }

  private _selectArchetypeWithinContext(key: string) {
    this._selectedArchetype = key;
    const [family, sub] = key.split('/');
    const matched = getRolesForArchetype(key);
    const currentMatch = matched.find(m => m.profession === this._profession);
    if (currentMatch) {
      this._selectedRole = currentMatch.role;
    } else if (matched.length > 0) {
      this._profession = matched[0]!.profession;
      this._selectedRole = matched[0]!.role;
    } else {
      this._selectedRole = null;
    }
    this._profile = this._initProfile(key);
    this._profileProfession = this._profession;
    this._profileRole = this._selectedRole;
    this.dispatchEvent(new CustomEvent('avatar:archetype:selected', {
      detail: { archetype: { family, subArchetype: sub }, collection: this._collection, personality: this._buildPersonalityProfile() },
      bubbles: true, composed: true,
    }));
  }

  private _selectArchetypeFresh(key: string) {
    this._selectedArchetype = key;
    const [family, sub] = key.split('/');
    const matched = getRolesForArchetype(key);
    const currentMatch = matched.find(m => m.profession === this._profession);
    if (currentMatch) {
      this._selectedRole = currentMatch.role;
    } else if (matched.length > 0) {
      this._profession = matched[0]!.profession;
      this._selectedRole = matched[0]!.role;
    } else {
      this._selectedRole = null;
    }
    this._profile = this._initProfile(key);
    const fwUpdate = { ...this._frameworks };
    if (this._profile.mbti) fwUpdate.mbti = this._profile.mbti;
    if (this._profile.enneagram) fwUpdate.enneagram = this._profile.enneagram;
    if (this._profile.disc) fwUpdate.disc = this._profile.disc;
    if (this._profile.belbin) fwUpdate.belbin = this._profile.belbin.primary;
    if (this._profile.sdi) fwUpdate.sdi = this._profile.sdi;
    this._frameworks = fwUpdate;
    if (this._profile.bigFive) this._bigFive = { ...this._bigFive, ...this._profile.bigFive };
    this._profileProfession = this._profession;
    this._profileRole = this._selectedRole;
    this.dispatchEvent(new CustomEvent('avatar:archetype:selected', {
      detail: { archetype: { family, subArchetype: sub }, collection: this._collection, personality: this._buildPersonalityProfile() },
      bubbles: true, composed: true,
    }));
  }

  private _selectIncompatibleArchetype(key: string) {
    this._applyFilters({}, {});
    this._selectArchetype(key);
  }

  private _reset() {
    this._applyFilters({}, {});
    this._selectedArchetype = null;
  }

  private _navigateToRole(profession: string, role: string, e: Event) {
    e.stopPropagation();
    this._profession = profession;
    this._selectedRole = role;
  }

  protected override render() {
    return html`
      ${this._renderCollectionBar()}
      <div class="main-panel">
        <div class="profession-side">
          ${this.hideProfile ? nothing : this._renderProfileSection()}
          ${this._renderProfessionPanel()}
        </div>
        ${this.hidePersonality ? nothing : html`<div class="personality-side">${this._renderPersonalityPanel()}</div>`}
      </div>
      ${this._renderGrid()}
      ${this._renderTipDialog()}
    `;
  }

  private _renderCollectionBar() {
    if (this.collection) return nothing;
    const collections = listCollections();
    if (collections.length <= 1) return nothing;
    return html`
      <div class="collection-bar" role="radiogroup" aria-label="Avatar collection">
        ${collections.map(c => html`
          <button class="collection-btn" role="radio"
            aria-checked=${String(this._collection === c.id)}
            @click=${() => { this._collection = c.id; }}>
            ${c.label}
          </button>
        `)}
      </div>
    `;
  }

  private _renderProfessionPanel() {
    const roles = this._profession ? PROFESSION_PRESETS[this._profession] : undefined;
    const activeRole = roles?.find(r => r.role === this._selectedRole);
    const matchedRoles = this._selectedArchetype ? getRolesForArchetype(this._selectedArchetype) : [];
    const matchedProfessions = new Set(matchedRoles.map(m => m.profession));
    return html`
      <div class="panel" role="tabpanel">
        <div class="profession-pills" role="listbox" aria-label="Professions">
          ${PROFESSION_LIST.map(p => {
            const isProfMatch = matchedProfessions.has(p) && this._profession !== p;
            const isCompatible = this._compatibleProfessions().has(p) && this._profession !== p;
            return html`
              <button class=${classMap({ pill: true, 'role-match': isProfMatch, 'has-compatible': isCompatible && !isProfMatch })}
                role="option"
                aria-selected=${String(this._profession === p)}
                @click=${() => {
                if (this._profession === p) {
                  this._profession = null;
                  this._selectedRole = null;
                  this._professionAutoSelected = false;
                } else {
                  this._profession = p;
                  this._professionAutoSelected = false;
                  if (this._selectedArchetype) {
                    const match = matchedRoles.find(m => m.profession === p);
                    this._selectedRole = match ? match.role : null;
                  } else {
                    this._selectedRole = null;
                  }
                }
              }}>
                ${p}
              </button>
            `;
          })}
        </div>
        ${this._selectedArchetype && matchedRoles.length === 0 ? html`
          <div style="font-size:12px;color:var(--pages-neutral-9,#999);margin-top:8px;padding:6px 10px;border:1px dashed var(--pages-neutral-5,#4a4a62);border-radius:6px">
            ${this._selectedArchetype.split('/')[0]} / ${this._selectedArchetype.split('/')[1]} — not mapped to any profession role. Use "By Personality" to explore this archetype.
          </div>
        ` : nothing}
        ${!this._profession && !this._selectedArchetype && Object.keys(this._frameworks).length === 0 && Object.keys(this._bigFive).length === 0 ? html`
          <div style="margin-top:24px;padding:20px;text-align:center;color:var(--pages-neutral-9,#888);font-size:13px;line-height:1.6;border:1px dashed var(--pages-neutral-5,#4a4a62);border-radius:8px">
            <div style="font-size:15px;margin-bottom:8px;color:var(--pages-neutral-11,#ccc)">Choose your starting point</div>
            <div>Select a <strong style="color:var(--pages-neutral-11,#ccc)">personality type</strong> on the right to find matching roles,</div>
            <div>or pick a <strong style="color:var(--pages-neutral-11,#ccc)">profession</strong> above to browse archetypes by role.</div>
            <div style="margin-top:12px;font-size:12px;color:var(--pages-neutral-8,#666)">You can also click any avatar in the grid below to start from a character.</div>
          </div>
        ` : nothing}
        ${roles ? html`
          <div class="role-pills" role="listbox" aria-label="Roles">
            ${roles.map(({ role }) => {
              const isMatch = matchedRoles.some(m => m.profession === this._profession && m.role === role);
              return html`
                <button class=${classMap({ pill: true, 'role-match': isMatch && this._selectedRole !== role })}
                  role="option"
                  aria-selected=${String(this._selectedRole === role)}
                  @click=${() => { this._selectedRole = this._selectedRole === role ? null : role; }}>
                  ${role}
                </button>
              `;
            })}
          </div>
          ${activeRole ? html`
            <div style="margin-top:10px">
              <div style="font-size:12px;color:var(--pages-neutral-10,#aaa);margin-bottom:6px">What type of ${activeRole.role}?</div>
              ${activeRole.variants.map(v => {
                const profile = getFrameworkProfile(v.archetype);
                const variantRoles = getRolesForArchetype(v.archetype);
                return html`
                  <button class=${classMap({ 'variant-card': true, selected: this._selectedArchetype === v.archetype })}
                    @click=${() => this._selectArchetype(v.archetype)}>
                    <agent-avatar .archetype=${{ family: v.archetype.split('/')[0], subArchetype: v.archetype.split('/')[1] }}
                      collection=${this._collection} size="sm"></agent-avatar>
                    <div>
                      <div class="variant-label">${v.label}</div>
                      <div class="variant-desc">${v.description}</div>
                      <div style="font-size:10px;color:var(--pages-accent-11,#93c5fd);margin-top:2px">${v.archetype.split('/')[0]} / ${v.archetype.split('/')[1]}</div>
                      ${variantRoles.length > 0 ? html`
                        <div class="variant-roles">
                          ${variantRoles.map(m => html`
                            <span class="role-badge"
                              @click=${(e: Event) => this._navigateToRole(m.profession, m.role, e)}>
                              ${m.profession} &rsaquo; ${m.role}
                            </span>
                          `)}
                        </div>
                      ` : nothing}
                    </div>
                    <dl class="variant-profile">
                      ${Object.entries(profile).map(([fw, vals]) => html`
                        <dt>${this._tip(fw, fw)}</dt><dd>${vals.map((val: string) => this._tip(`${fw}:${val}`, fw === 'SDI' ? this._sdiColor(val) : val)).reduce((a: unknown, b: unknown) => html`${a}, ${b}`)}</dd>
                      `)}
                    </dl>
                  </button>
                `;
              })}
            </div>
          ` : nothing}
        ` : nothing}
      </div>
    `;
  }

  private _renderProfileSection() {
    const p = this._profile;
    const affinityProfile = this._selectedArchetype ? getFrameworkProfile(this._selectedArchetype) : {};
    const affinityVals = new Set<string>();
    for (const [fw, fvs] of Object.entries(affinityProfile)) {
      for (const fv of fvs) affinityVals.add(`${fw}:${fv}`);
    }
    const fwKeyMap: Record<string, string> = { mbti: 'MBTI', enneagram: 'Enneagram', disc: 'DISC', sdi: 'SDI' };

    const summaryText = buildSummaryText(p.mbti, p.enneagram, p.disc, this._selectedArchetype?.split('/')[1] ?? 'agent');

    return html`
      <div class="profile-section" role="region" aria-label="Personality profile">
        <div class="profile-header">Personality Profile</div>
        <div class=${classMap({ 'profile-group': true, locked: this._profileLocked.has('profession') })}>
          <div class="profile-row">
            <span class="profile-label">Profession</span>
            <span class="profile-value">${this._profileProfession || '—'}</span>
            <button class=${classMap({ 'profile-lock': true, locked: this._profileLocked.has('profession') })}
              @click=${() => this._toggleLock('profession')}>
              ${this._profileLocked.has('profession') ? 'unlock' : 'lock'}
            </button>
          </div>
          <div class="profile-picker" role="listbox" aria-label="Profession selection">
            ${PROFESSION_LIST.map(prof => html`
              <button class=${classMap({ pill: true })}
                role="option" aria-selected=${String(this._profileProfession === prof)}
                @click=${() => { this._profileProfession = this._profileProfession === prof ? null : prof; this._profileRole = null; this._emitPersonalityChanged(); }}>
                ${prof}
              </button>
            `)}
          </div>
        </div>
        ${this._profileProfession ? html`
          <div class=${classMap({ 'profile-group': true, locked: this._profileLocked.has('role') })}>
            <div class="profile-row">
              <span class="profile-label">Role</span>
              <span class="profile-value">${this._profileRole || '—'}</span>
              <button class=${classMap({ 'profile-lock': true, locked: this._profileLocked.has('role') })}
                @click=${() => this._toggleLock('role')}>
                ${this._profileLocked.has('role') ? 'unlock' : 'lock'}
              </button>
            </div>
            <div class="profile-picker" role="listbox" aria-label="Role selection">
              ${(PROFESSION_PRESETS[this._profileProfession] ?? []).map(({ role }) => html`
                <button class=${classMap({ pill: true })}
                  role="option" aria-selected=${String(this._profileRole === role)}
                  @click=${() => { this._profileRole = this._profileRole === role ? null : role; this._emitPersonalityChanged(); }}>
                  ${role}
                </button>
              `)}
            </div>
          </div>
        ` : nothing}
        ${(['mbti', 'enneagram', 'disc', 'sdi'] as const).map(fw => {
          const label = fwKeyMap[fw]!;
          const val = p[fw];
          const isLocked = this._profileLocked.has(fw);
          return html`
            <div class=${classMap({ 'profile-group': true, locked: isLocked })}>
              <div class="profile-row">
                <span class="profile-label">${this._tip(label, label)}</span>
                <span class="profile-value">${val ? this._tip(`${label}:${val}`, fw === 'sdi' ? this._sdiColor(val) : val) : '—'}</span>
                <button class=${classMap({ 'profile-lock': true, locked: isLocked })}
                  @click=${() => this._toggleLock(fw)}>
                  ${isLocked ? 'unlock' : 'lock'}
                </button>
              </div>
              <div class="profile-picker" role="listbox" aria-label="${label} selection">
                ${(ALL_FRAMEWORK_VALUES[fw] as readonly string[]).map(v => {
                  const isDefault = affinityVals.has(`${label}:${v}`);
                  const classes: Record<string, boolean> = { pill: true, 'profile-default': isDefault && p[fw] !== v };
                  if (fw === 'sdi') classes[`sdi-${v.toLowerCase()}`] = true;
                  return html`
                    <button class=${classMap(classes)}
                      role="option" aria-selected=${String(p[fw] === v)}
                      @click=${() => this._updateProfileValue(fw, v)}>
                      ${this._tip(`${label}:${v}`, v)}
                    </button>
                  `;
                })}
              </div>
            </div>
          `;
        })}
        <div class=${classMap({ 'profile-group': true, locked: this._profileLocked.has('belbin') })}>
          <div class="profile-row">
            <span class="profile-label">${this._tip('Belbin', 'Belbin')}</span>
            <span class="profile-value">${p.belbin ? html`${this._tip('Belbin:' + p.belbin.primary, p.belbin.primary)}${p.belbin.secondaries.length ? html` + ${p.belbin.secondaries.map(s => this._tip('Belbin:' + s, s)).reduce((a: unknown, b: unknown) => html`${a}, ${b}`)}` : nothing}` : '—'}</span>
            <button class=${classMap({ 'profile-lock': true, locked: this._profileLocked.has('belbin') })}
              @click=${() => this._toggleLock('belbin')}>
              ${this._profileLocked.has('belbin') ? 'unlock' : 'lock'}
            </button>
          </div>
          <div class="profile-picker" role="group" aria-label="Belbin team roles">
            ${(ALL_FRAMEWORK_VALUES.belbin as readonly string[]).map(v => {
              const isPrimary = p.belbin?.primary === v;
              const isSecondary = p.belbin?.secondaries.includes(v) ?? false;
              const isDefault = affinityVals.has(`Belbin:${v}`);
              return html`
                <button class=${classMap({ pill: true, 'profile-belbin-sec': isSecondary && !isPrimary, 'profile-default': isDefault && !isPrimary && !isSecondary })}
                  role="button"
                  aria-pressed=${String(isPrimary || isSecondary)}
                  aria-description=${isPrimary ? 'primary' : isSecondary ? 'secondary' : nothing}
                  @click=${() => this._updateProfileBelbin(v)}>
                  ${this._tip('Belbin:' + v, v)}
                </button>
              `;
            })}
          </div>
        </div>
        <div class=${classMap({ 'profile-group': true, locked: this._profileLocked.has('bigFive') })}>
          <div class="profile-row">
            <span class="profile-label">${this._tip('Big Five', 'Big Five')}</span>
            <span class="profile-value">${(() => { const dims = BIG_FIVE_DIMS.filter(d => p.bigFive?.[d]); return dims.length > 0 ? dims.map(d => this._tip(`Big Five:${p.bigFive![d] === 'high' ? 'High' : 'Low'} ${d}`, html`${d}${p.bigFive![d] === 'high' ? '↑' : '↓'}`)) : '—'; })()}</span>
            <button class=${classMap({ 'profile-lock': true, locked: this._profileLocked.has('bigFive') })}
              @click=${() => this._toggleLock('bigFive')}>
              ${this._profileLocked.has('bigFive') ? 'unlock' : 'lock'}
            </button>
          </div>
          <div class="profile-picker" style="flex-direction:column;margin-left:78px">
            ${BIG_FIVE_DIMS.map(dim => html`
              <div class="big5-row" role="radiogroup" aria-label=${BIG_FIVE_LABELS[dim]}>
                <span class="big5-label">${this._tip('Big Five', `${dim} — ${BIG_FIVE_LABELS[dim]}`)}</span>
                ${(['high', 'low'] as const).map(pole => html`
                  <button class="big5-toggle" role="radio"
                    aria-checked=${String(p.bigFive?.[dim] === pole)}
                    @click=${() => this._updateProfileBigFive(dim, pole)}>
                    ${this._tip(`Big Five:${pole === 'high' ? 'High' : 'Low'} ${dim}`, pole === 'high' ? 'High' : 'Low')}
                  </button>
                `)}
              </div>
            `)}
          </div>
        </div>
        ${summaryText ? html`<div class="dynamic-summary">${summaryText}</div>` : nothing}
        ${this._renderDispositions()}
      </div>
    `;
  }

  private _renderDispositions() {
    const hasAnyProfile = this._profile.mbti || this._profile.enneagram || this._profile.disc || this._profile.sdi || this._profile.belbin || (this._profile.bigFive && Object.keys(this._profile.bigFive).length > 0);
    if (!hasAnyProfile) return nothing;
    const scores = deriveDispositions(this._profile);
    return html`
      <div class="disposition-section">
        <div class="disposition-header" title="Five behavioral axes derived from the personality profile — these inform how the agent's system prompt is generated">Canonical Dispositions</div>
        ${scores.map(s => {
          const pct = ((s.score + 1) / 2) * 100;
          const isNeutral = Math.abs(s.score) < 0.1;
          const strength = Math.abs(s.score) > 0.5 ? 'Strongly' : Math.abs(s.score) > 0.2 ? 'Moderately' : 'Slightly';
          const direction = isNeutral ? 'Balanced' : s.score > 0 ? `${strength} ${s.lowLabel} → ${s.highLabel}` : `${strength} ${s.highLabel} → ${s.lowLabel}`;
          const markerTip = `${direction} (${(s.score * 100).toFixed(0)}%) — from: ${s.contributors.join(', ')}`;
          return html`
            <div class="disposition-row">
              <span class="disposition-label-low" title="${DISPOSITION_TIPS[s.axis]?.low ?? ''}">${s.lowLabel}</span>
              <div class="disposition-bar" title="${markerTip}">
                <div class=${classMap({ 'disposition-marker': true, 'disposition-neutral': isNeutral })} style="left: ${pct}%"></div>
              </div>
              <span class="disposition-label-high" title="${DISPOSITION_TIPS[s.axis]?.high ?? ''}">${s.highLabel}</span>
            </div>
          `;
        })}
      </div>
      ${this._renderTendencies(scores)}
    `;
  }

  private _renderTendencies(scores: ReturnType<typeof deriveDispositions>) {
    const tendencies = deriveTendencies(scores);
    if (tendencies.length === 0) return nothing;
    return html`
      <div class="tendencies-section">
        <div class="tendencies-header">Behavioral Tendencies</div>
        <div class="tendency-list">
          ${tendencies.map(t => html`
            <span class=${classMap({ 'tendency-chip': true, [t.strength]: true })} title="${t.description} — inferred from: ${t.inferredFrom.join(', ')}">
              ${t.name}<span class="tendency-strength">${t.strength === 'strong' ? '+++' : t.strength === 'moderate' ? '++' : '+'}</span>
            </span>
          `)}
        </div>
      </div>
    `;
  }

  private _renderPersonalityPanel() {
    const avatarProfile = this._selectedArchetype ? getFrameworkProfile(this._selectedArchetype) : {};
    const avatarVals = new Set<string>();
    for (const [fw, fvs] of Object.entries(avatarProfile)) {
      for (const fv of fvs) avatarVals.add(`${fw}:${fv}`);
    }
    const roleVals = (this._profession && this._selectedRole)
      ? getRoleFrameworkValues(this._profession, this._selectedRole) : new Set<string>();
    const fwKeyMap: Record<string, string> = { mbti: 'MBTI', enneagram: 'Enneagram', disc: 'DISC', belbin: 'Belbin', sdi: 'SDI' };
    return html`
      <div class="panel" role="tabpanel">
        ${SINGLE_FRAMEWORKS.map(fw => {
          const valid = new Set(getValidFrameworkValues(fw, this._frameworks, this._bigFive));
          const fwLabel = fwKeyMap[fw] ?? fw;
          return html`
            <div class="framework-row">
              <span class="framework-label">${this._tip(FRAMEWORK_LABELS[fw], FRAMEWORK_LABELS[fw])}</span>
              <div role="listbox" aria-label=${FRAMEWORK_LABELS[fw]} style="display:flex;gap:4px;flex-wrap:wrap">
                ${(ALL_FRAMEWORK_VALUES[fw] as readonly string[]).map(v => {
                  const isAvatarMatch = avatarVals.has(`${fwLabel}:${v}`);
                  const isRoleScope = roleVals.has(`${fwLabel}:${v}`);
                  const isSelected = this._frameworks[fw] === v;
                  const isDisabled = !valid.has(v) && !isSelected;
                  const isDimmedSdi = fw === 'sdi' && this._selectedArchetype !== null && !isAvatarMatch && !isSelected;
                  const classes: Record<string, boolean> = { pill: true, 'avatar-match': isAvatarMatch && !isSelected, 'role-scope': isRoleScope && !isAvatarMatch && !isSelected };
                  if (fw === 'sdi') classes[`sdi-${v.toLowerCase()}`] = true;
                  return html`
                    <button class=${classMap(classes)}
                      role="option"
                      data-framework=${fw} data-value=${v}
                      aria-selected=${String(isSelected)}
                      ?data-dimmed=${isDisabled || isDimmedSdi}
                      @click=${() => this._selectFramework(fw, v)}>
                      ${this._tip(`${fwLabel}:${v}`, v)}
                    </button>
                  `;
                })}
              </div>
            </div>
          `;
        })}
        <div class="framework-row">
          <span class="framework-label">${this._tip('Big Five', 'Big Five')}</span>
          <div style="display:flex;flex-direction:column;gap:2px">
            ${BIG_FIVE_DIMS.map(dim => {
              const validPoles = getValidBigFivePoles(dim, this._bigFive, this._frameworks);
              return html`
                <div class="big5-row" role="radiogroup" aria-label=${BIG_FIVE_LABELS[dim]}>
                  <span class="big5-label">${this._tip('Big Five', `${dim} — ${BIG_FIVE_LABELS[dim]}`)}</span>
                  ${(['high', 'low'] as const).map(pole => html`
                    <button class="big5-toggle" role="radio"
                      aria-checked=${String(this._bigFive[dim] === pole)}
                      ?data-dimmed=${!validPoles.has(pole) && this._bigFive[dim] !== pole}
                      @click=${() => this._toggleBigFive(dim, pole)}>
                      ${this._tip(`Big Five:${pole === 'high' ? 'High' : 'Low'} ${dim}`, pole === 'high' ? 'High' : 'Low')}
                    </button>
                  `)}
                </div>
              `;
            })}
          </div>
        </div>
        <button class="reset-btn" @click=${() => this._reset()}>Reset all</button>
      </div>
    `;
  }

  private _professionArchetypes(): Set<string> {
    if (!this._profession) return new Set();
    const presets = PROFESSION_PRESETS[this._profession];
    if (!presets) return new Set();
    const set = new Set<string>();
    for (const { variants } of presets) {
      for (const v of variants) set.add(v.archetype);
    }
    return set;
  }

  private _roleArchetypes(): Set<string> {
    if (!this._profession || !this._selectedRole) return new Set();
    const presets = PROFESSION_PRESETS[this._profession];
    if (!presets) return new Set();
    const role = presets.find(r => r.role === this._selectedRole);
    if (!role) return new Set();
    return new Set(role.variants.map(v => v.archetype));
  }

  private _renderGrid() {
    const tiers = this._tiers();
    const profArchetypes = this._professionArchetypes();
    const hasProfFilter = profArchetypes.size > 0;
    const roleArchetypes = this._roleArchetypes();
    return html`
      <div class="grid" role="radiogroup" aria-label="Select archetype avatar">
        ${FAMILIES.map(family => {
          const subs = familySubs(family);
          return html`
            <div class="family-label" role="group" aria-label="${family} family">${family}</div>
            ${subs.map(sub => {
              const key = `${family}/${sub}`;
              const tier = tiers.get(key) ?? 'strong';
              const selected = this._selectedArchetype === key;
              const incompatible = tier === 'incompatible';
              const profGhosted = hasProfFilter && !profArchetypes.has(key) && !selected;
              const roleMatch = !selected && roleArchetypes.has(key);
              return html`
                <div class=${classMap({ 'avatar-cell': true, [tier]: true, selected, unmapped: !MAPPED_ARCHETYPES.has(key), 'profession-ghosted': profGhosted, 'role-match': roleMatch })}
                  role="radio" aria-checked=${String(selected)}
                  aria-label="${family} ${sub} avatar"
                  @click=${() => incompatible ? this._selectIncompatibleArchetype(key) : this._selectArchetype(key)}>
                  <agent-avatar
                    .archetype=${{ family, subArchetype: sub }}
                    collection=${this._collection}
                    size="sm">
                  </agent-avatar>
                  <span class="sub-label">${sub}</span>
                </div>
              `;
            })}
          `;
        })}
      </div>
    `;
  }

}
