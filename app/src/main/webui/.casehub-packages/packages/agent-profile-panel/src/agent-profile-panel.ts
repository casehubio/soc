import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import type { PersonalityProfile } from '@casehubio/mosaic-core';
import { buildSummaryText, BIG_FIVE_DIMS, BIG_FIVE_LABELS } from '../../avatar-step/src/data/framework-descriptors.js';
import { deriveDispositions, deriveTendencies, DISPOSITION_TIPS } from '../../avatar-step/src/data/disposition-mapping.js';
import { ALL_FRAMEWORK_VALUES, getFrameworkProfile } from '../../avatar-step/src/data/compatibility-matrix.js';
import type { PersonalityFramework, BigFiveDimension, BigFivePole } from '../../avatar-step/src/data/compatibility-matrix.js';
import { FRAMEWORK_TOOLTIPS } from '../../avatar-step/src/data/framework-tooltips.js';
import { PROFESSION_LIST, PROFESSION_PRESETS } from '../../avatar-step/src/data/profession-presets.js';
import '@casehubio/mosaic-agent-avatar-2d';

export interface AgentProfilePanelProps {
  profile: PersonalityProfile | null;
  archetype: { family: string; subArchetype: string } | null;
  locked: Set<string>;
  showConfirmButton: boolean;
  archetypeRoles: Array<{ profession: string; role: string }>;
  templateName: string;
  templateDesc: string;
  templateAlias: string;
  collection: string;
}

@customElement('agent-profile-panel')
export class AgentProfilePanel extends LitElement {
  @property({ attribute: false }) profile: PersonalityProfile | null = null;
  @property({ attribute: false }) archetype: { family: string; subArchetype: string } | null = null;
  @property({ attribute: false }) locked: Set<string> = new Set();
  @property({ type: Boolean, attribute: 'show-confirm-button' }) showConfirmButton = true;
  @property({ attribute: false }) archetypeRoles: Array<{ profession: string; role: string }> = [];
  @property({ type: String }) templateName = '';
  @property({ type: String }) templateDesc = '';
  @property({ type: String }) templateAlias = '';
  @property({ type: String }) collection = '';

  @state() private _tipDialog: string | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Personality profile');
  }

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .empty-state { text-align: center; padding: 32px 16px; color: var(--pages-neutral-9, #999); font-size: 13px; }
    .empty-state p { margin: 8px 0 0; font-size: 11px; color: var(--pages-neutral-8, #888); }
    .profile-section { border: 1px solid var(--pages-accent-7, #3b82f6); border-radius: 8px; padding: 10px; background: var(--pages-neutral-2, #252538); }
    .profile-header { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--pages-accent-11, #93c5fd); margin-bottom: 8px; }
    .profile-group { position: relative; }
    .profile-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; overflow: visible; }
    .profile-label { min-width: 70px; font-weight: 600; color: var(--pages-neutral-10, #aaa); font-size: 11px; }
    .profile-value { color: var(--pages-neutral-11, #ccc); font-size: 12px; flex: 1; }
    .profile-lock { font-size: 10px; color: var(--pages-neutral-9, #999); cursor: pointer; padding: 2px 6px; border: 1px solid var(--pages-neutral-5, #4a4a62); border-radius: 4px; background: transparent; opacity: 0; transition: opacity 0.15s; }
    .profile-group:hover .profile-lock { opacity: 1; }
    .profile-lock.locked { opacity: 1; color: var(--pages-accent-11, #93c5fd); border-color: var(--pages-accent-7, #3b82f6); }
    .profile-picker { display: none; flex-wrap: wrap; gap: 4px; margin: 4px 0 4px 78px; }
    .profile-group:hover:not(.locked) .profile-picker { display: flex; }
    .profile-default { border-color: var(--pages-accent-7, #3b82f6); color: var(--pages-accent-11, #93c5fd); }
    .pill {
      padding: 4px 10px; border-radius: 12px; border: 1px solid var(--pages-neutral-5, #4a4a62);
      background: var(--pages-neutral-2, #252538); cursor: pointer; font-size: 11px;
      color: var(--pages-neutral-11, #ccc); transition: all 0.15s; overflow: visible;
    }
    .pill[aria-selected="true"], .pill[aria-pressed="true"] { background: var(--pages-accent-9, #2563eb); border-color: var(--pages-accent-9, #2563eb); color: #fff; }
    .pill.sdi-blue { border-color: #3b82f6; color: #93c5fd; background: transparent; }
    .pill.sdi-blue[aria-selected="true"] { background: #2563eb; border-color: #2563eb; color: #fff; }
    .pill.sdi-red { border-color: #ef4444; color: #fca5a5; background: transparent; }
    .pill.sdi-red[aria-selected="true"] { background: #dc2626; border-color: #dc2626; color: #fff; }
    .pill.sdi-green { border-color: #22c55e; color: #86efac; background: transparent; }
    .pill.sdi-green[aria-selected="true"] { background: #16a34a; border-color: #16a34a; color: #fff; }
    .pill.sdi-hub { border-color: #a78bfa; color: #c4b5fd; background: transparent; }
    .pill.sdi-hub[aria-selected="true"] { background: #7c3aed; border-color: #7c3aed; color: #fff; }
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
    .big5-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .big5-label { font-size: 11px; min-width: 30px; text-align: center; color: var(--pages-neutral-10, #aaa); }
    .big5-toggle {
      padding: 3px 8px; border-radius: 4px; border: 1px solid var(--pages-neutral-5, #4a4a62);
      background: var(--pages-neutral-2, #252538); cursor: pointer; font-size: 11px; color: var(--pages-neutral-11, #ccc);
    }
    .big5-toggle[aria-checked="true"] {
      background: var(--pages-accent-9, #2563eb); border-color: var(--pages-accent-9, #2563eb); color: #fff;
    }
    .actions { display: flex; gap: 8px; margin-top: 12px; }
    .reset-btn {
      padding: 6px 16px; border-radius: 6px; border: 1px solid var(--pages-neutral-5, #4a4a62);
      background: var(--pages-neutral-2, #252538); color: var(--pages-neutral-11, #ccc); cursor: pointer; font-size: 12px;
    }
    .select-btn {
      padding: 6px 16px; border-radius: 6px; border: none; cursor: pointer;
      background: var(--pages-accent-9, #2563eb); color: #fff; font-size: 13px; font-weight: 500;
    }
    .select-btn:hover { background: var(--pages-accent-10, #1d4ed8); }
    .has-tip { position: relative; }
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
    .detail-header { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--pages-neutral-4, #3a3a52); }
    .detail-avatar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .detail-info { flex: 1; min-width: 0; }
    .detail-name { font-size: 16px; font-weight: 600; color: var(--pages-neutral-12, #eee); }
    .detail-archetype { font-size: 11px; color: var(--pages-accent-11, #93c5fd); margin-top: 2px; }
    .detail-desc { font-size: 12px; color: var(--pages-neutral-10, #aaa); margin-top: 4px; }
    .detail-alias { font-size: 11px; color: var(--pages-accent-11, #93c5fd); margin-bottom: 6px; }
    .detail-summary { font-size: 11px; color: var(--pages-neutral-10, #aaa); font-style: italic; line-height: 1.4; }
    .archetype-roles { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 8px; }
    .role-badge {
      padding: 2px 8px; border-radius: 10px; font-size: 10px;
      background: var(--pages-neutral-3, #2d2d44);
      color: var(--pages-neutral-10, #aaa);
      border: 1px solid var(--pages-neutral-5, #4a4a62);
    }
  `;

  protected override render() {
    if (!this.profile) {
      return html`
        <div class="empty-state" role="status" aria-live="polite">
          Select a template or build from scratch.
          <p>Choose from the Templates tab or switch to Advanced for full customisation.</p>
        </div>
      `;
    }
    return html`
      ${this.templateName ? this._renderDetailHeader() : nothing}
      ${this._renderProfileSection()}
      ${this._renderActions()}
      ${this._renderTipDialog()}
    `;
  }

  private _renderDetailHeader() {
    const archetypeKey = this.archetype ? `${this.archetype.family}/${this.archetype.subArchetype}` : null;
    const summary = buildSummaryText(this.profile?.mbti, this.profile?.enneagram, this.profile?.disc, this.archetype?.subArchetype ?? 'agent');
    return html`
      <div class="detail-header">
        <div class="detail-avatar-row">
          <agent-avatar .archetype=${this.archetype}
            collection=${this.collection || 'mythic'} size="md"></agent-avatar>
          <div class="detail-info">
            <div class="detail-name">${this.templateName}</div>
            <div class="detail-archetype">${archetypeKey}</div>
            <div class="detail-desc">${this.templateDesc}</div>
          </div>
        </div>
        <div class="detail-alias">Preferred: ${this.templateAlias}</div>
        ${summary ? html`<div class="detail-summary">${summary}</div>` : nothing}
      </div>
    `;
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

  private _sdiColor(value: string) {
    const cls = `sdi-text-${value.toLowerCase()}`;
    return html`<span class=${cls}>${value}</span>`;
  }

  private _emitValueChanged(field: string, value: unknown) {
    this.dispatchEvent(new CustomEvent('profile:value:changed', {
      detail: { field, value },
      bubbles: true, composed: true,
    }));
  }

  private _emitLockChanged(field: string) {
    this.dispatchEvent(new CustomEvent('profile:lock:changed', {
      detail: { field, locked: !this.locked.has(field) },
      bubbles: true, composed: true,
    }));
  }

  private _renderProfileSection() {
    const p = this.profile!;
    const archetypeKey = this.archetype ? `${this.archetype.family}/${this.archetype.subArchetype}` : null;
    const affinityProfile = archetypeKey ? getFrameworkProfile(archetypeKey) : {};
    const affinityVals = new Set<string>();
    for (const [fw, fvs] of Object.entries(affinityProfile)) {
      for (const fv of fvs) affinityVals.add(`${fw}:${fv}`);
    }
    const fwKeyMap: Record<string, string> = { mbti: 'MBTI', enneagram: 'Enneagram', disc: 'DISC', sdi: 'SDI' };
    const summaryText = buildSummaryText(p.mbti, p.enneagram, p.disc, archetypeKey?.split('/')[1] ?? 'agent');

    return html`
      <div class="profile-section" role="region" aria-label="Personality profile">
        <div class="profile-header">Personality Profile</div>
        ${this.archetypeRoles.length > 0 ? html`
          <div class="archetype-roles" role="list" aria-label="Archetype roles">
            ${this.archetypeRoles.map(r => html`
              <span class="role-badge" role="listitem">${r.profession} › ${r.role}</span>
            `)}
          </div>
        ` : nothing}
        <div class=${classMap({ 'profile-group': true, locked: this.locked.has('profession') })}>
          <div class="profile-row">
            <span class="profile-label">Profession</span>
            <span class="profile-value">${p.profession || '—'}</span>
            <button class=${classMap({ 'profile-lock': true, locked: this.locked.has('profession') })}
              @click=${() => this._emitLockChanged('profession')}>
              ${this.locked.has('profession') ? 'unlock' : 'lock'}
            </button>
          </div>
          <div class="profile-picker" role="listbox" aria-label="Profession selection">
            ${PROFESSION_LIST.map(prof => html`
              <button class=${classMap({ pill: true })}
                role="option" aria-selected=${String(p.profession === prof)}
                @click=${() => this._emitValueChanged('profession', prof)}>
                ${prof}
              </button>
            `)}
          </div>
        </div>
        ${p.profession ? html`
          <div class=${classMap({ 'profile-group': true, locked: this.locked.has('role') })}>
            <div class="profile-row">
              <span class="profile-label">Role</span>
              <span class="profile-value">${p.role || '—'}</span>
              <button class=${classMap({ 'profile-lock': true, locked: this.locked.has('role') })}
                @click=${() => this._emitLockChanged('role')}>
                ${this.locked.has('role') ? 'unlock' : 'lock'}
              </button>
            </div>
            <div class="profile-picker" role="listbox" aria-label="Role selection">
              ${(PROFESSION_PRESETS[p.profession] ?? []).map(({ role }) => html`
                <button class=${classMap({ pill: true })}
                  role="option" aria-selected=${String(p.role === role)}
                  @click=${() => this._emitValueChanged('role', role)}>
                  ${role}
                </button>
              `)}
            </div>
          </div>
        ` : nothing}
        ${(['mbti', 'enneagram', 'disc', 'sdi'] as const).map(fw => {
          const label = fwKeyMap[fw]!;
          const val = p[fw];
          const isLocked = this.locked.has(fw);
          return html`
            <div class=${classMap({ 'profile-group': true, locked: isLocked })}>
              <div class="profile-row">
                <span class="profile-label">${this._tip(label, label)}</span>
                <span class="profile-value">${val ? this._tip(`${label}:${val}`, fw === 'sdi' ? this._sdiColor(val) : val) : '—'}</span>
                <button class=${classMap({ 'profile-lock': true, locked: isLocked })}
                  @click=${() => this._emitLockChanged(fw)}>
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
                      @click=${() => this._emitValueChanged(fw, v)}>
                      ${this._tip(`${label}:${v}`, v)}
                    </button>
                  `;
                })}
              </div>
            </div>
          `;
        })}
        <div class=${classMap({ 'profile-group': true, locked: this.locked.has('belbin') })}>
          <div class="profile-row">
            <span class="profile-label">${this._tip('Belbin', 'Belbin')}</span>
            <span class="profile-value">${p.belbin ? html`${this._tip('Belbin:' + p.belbin.primary, p.belbin.primary)}${p.belbin.secondaries.length ? html` + ${p.belbin.secondaries.map(s => this._tip('Belbin:' + s, s)).reduce((a: unknown, b: unknown) => html`${a}, ${b}`)}` : nothing}` : '—'}</span>
            <button class=${classMap({ 'profile-lock': true, locked: this.locked.has('belbin') })}
              @click=${() => this._emitLockChanged('belbin')}>
              ${this.locked.has('belbin') ? 'unlock' : 'lock'}
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
                  @click=${() => this._emitValueChanged('belbin', v)}>
                  ${this._tip('Belbin:' + v, v)}
                </button>
              `;
            })}
          </div>
        </div>
        <div class=${classMap({ 'profile-group': true, locked: this.locked.has('bigFive') })}>
          <div class="profile-row">
            <span class="profile-label">${this._tip('Big Five', 'Big Five')}</span>
            <span class="profile-value">${(() => { const dims = BIG_FIVE_DIMS.filter(d => p.bigFive?.[d]); return dims.length > 0 ? dims.map(d => this._tip(`Big Five:${p.bigFive![d] === 'high' ? 'High' : 'Low'} ${d}`, html`${d}${p.bigFive![d] === 'high' ? '↑' : '↓'}`)) : '—'; })()}</span>
            <button class=${classMap({ 'profile-lock': true, locked: this.locked.has('bigFive') })}
              @click=${() => this._emitLockChanged('bigFive')}>
              ${this.locked.has('bigFive') ? 'unlock' : 'lock'}
            </button>
          </div>
          <div class="profile-picker" style="flex-direction:column;margin-left:78px">
            ${BIG_FIVE_DIMS.map(dim => html`
              <div class="big5-row" role="radiogroup" aria-label=${BIG_FIVE_LABELS[dim]}>
                <span class="big5-label">${this._tip('Big Five', `${dim} — ${BIG_FIVE_LABELS[dim]}`)}</span>
                ${(['high', 'low'] as const).map(pole => html`
                  <button class="big5-toggle" role="radio"
                    aria-checked=${String(p.bigFive?.[dim] === pole)}
                    @click=${() => this._emitValueChanged('bigFive', { dim, pole })}>
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
    const p = this.profile!;
    const hasAnyProfile = p.mbti || p.enneagram || p.disc || p.sdi || p.belbin || (p.bigFive && Object.keys(p.bigFive).length > 0);
    if (!hasAnyProfile) return nothing;
    const scores = deriveDispositions(p);
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

  private _renderActions() {
    return html`
      <div class="actions">
        <button class="reset-btn" role="button" aria-label="Reset personality profile"
          @click=${() => this.dispatchEvent(new CustomEvent('profile:reset', { bubbles: true, composed: true }))}>
          Reset
        </button>
        ${this.showConfirmButton ? html`
          <button class="select-btn" role="button" aria-label="Confirm personality selection"
            @click=${() => this.dispatchEvent(new CustomEvent('personality:confirmed', { bubbles: true, composed: true }))}>
            Select
          </button>
        ` : nothing}
      </div>
    `;
  }
}
