import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { FullAgentDescriptor, PersonalityProfile } from '@casehubio/mosaic-core';
import { deriveDispositions, type AxisScore } from '@casehubio/mosaic-avatar-step';
import '@casehubio/mosaic-agent-avatar-2d';

function radarPoint(cx: number, cy: number, r: number, index: number, total: number): [number, number] {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

@customElement('agent-profile')
export class AgentProfile extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .profile-header {
      display: flex; align-items: center; gap: var(--pages-space-4, 1rem);
      margin-bottom: var(--pages-space-4, 1rem); padding-bottom: var(--pages-space-4, 1rem);
      border-bottom: 1px solid var(--pages-neutral-4, #e5e5e5);
    }
    .header-info { flex: 1; }
    .profile-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .badge-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
    .badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: var(--pages-neutral-3, #f0f0f0); color: var(--pages-neutral-11, #262626); font-weight: 500; }
    .badge-archetype { background: var(--pages-accent-3, #dbeafe); color: var(--pages-accent-11, #1e40af); }
    .badge-profession { background: var(--pages-purple-3, #ede9fe); color: var(--pages-purple-11, #5b21b6); }
    .section { margin-bottom: var(--pages-space-4, 1rem); }
    .section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--pages-neutral-9, #737373); margin-bottom: var(--pages-space-2, 0.5rem); letter-spacing: 0.05em; }
    .disposition-container { display: grid; grid-template-columns: auto 1fr; gap: var(--pages-space-4, 1rem); align-items: start; }
    .radar-chart { width: 160px; height: 160px; }
    .axis-rows { display: flex; flex-direction: column; gap: 4px; }
    .axis-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .axis-name { width: 80px; font-weight: 600; color: var(--pages-neutral-11, #262626); }
    .axis-score { width: 40px; text-align: right; font-variant-numeric: tabular-nums; }
    .axis-bar { flex: 1; height: 6px; background: var(--pages-neutral-3, #f0f0f0); border-radius: 3px; overflow: hidden; }
    .axis-fill { height: 100%; background: var(--pages-accent-9, #0066cc); border-radius: 3px; transition: width 0.3s; }
    .axis-contributors { font-size: 11px; color: var(--pages-neutral-9, #737373); }
    .framework-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .framework-pill { font-size: 12px; padding: 3px 10px; border-radius: 12px; background: var(--pages-neutral-3, #f0f0f0); color: var(--pages-neutral-11, #262626); }
    .description-text { font-size: 14px; line-height: 1.5; color: var(--pages-neutral-12, #111); }
    .edit-toggle { padding: 6px 12px; border: 1px solid var(--pages-neutral-4, #e5e5e5); border-radius: var(--pages-radius-2, 4px); font-size: 13px; background: var(--pages-neutral-1, #fff); color: var(--pages-neutral-12, #111); cursor: pointer; }
    .edit-mode textarea { width: 100%; padding: 8px; border: 1px solid var(--pages-neutral-4, #e5e5e5); border-radius: var(--pages-radius-2, 4px); font-size: 14px; font-family: inherit; box-sizing: border-box; resize: vertical; min-height: 80px; background: var(--pages-neutral-1, #fff); color: var(--pages-neutral-12, #111); }
    .edit-mode input[type="text"] { width: 100%; padding: 8px; border: 1px solid var(--pages-neutral-4, #e5e5e5); border-radius: var(--pages-radius-2, 4px); font-size: 14px; font-family: inherit; box-sizing: border-box; background: var(--pages-neutral-1, #fff); color: var(--pages-neutral-12, #111); }
    .edit-buttons { display: flex; gap: 8px; margin-top: var(--pages-space-3, 0.75rem); justify-content: flex-end; }
    .btn-save { padding: 8px 16px; border: none; border-radius: var(--pages-radius-2, 4px); font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; background: var(--pages-accent-9, #0066cc); color: var(--pages-accent-contrast, #fff); }
    .btn-cancel { padding: 8px 16px; border: 1px solid var(--pages-neutral-4, #e5e5e5); border-radius: var(--pages-radius-2, 4px); font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; background: var(--pages-neutral-1, #fff); }
    .empty-state { padding: var(--pages-space-4, 1rem); text-align: center; color: var(--pages-neutral-9, #737373); font-size: 14px; }
  `;

  @property({ attribute: false }) descriptor?: FullAgentDescriptor;
  @state() private _editing = false;
  @state() private _editName = '';
  @state() private _editDescription = '';

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this._updateAriaLabel();
  }

  override updated() { this._updateAriaLabel(); }

  private _updateAriaLabel() {
    const name = this.descriptor?.name;
    this.setAttribute('aria-label', name ? `Agent profile for ${name}` : 'Agent profile');
  }

  private _startEdit() {
    this._editing = true;
    this._editName = this.descriptor?.name ?? '';
    this._editDescription = this.descriptor?.description ?? '';
  }

  private _cancelEdit() { this._editing = false; }

  private _save() {
    if (!this.descriptor) return;
    const updated: FullAgentDescriptor = { ...this.descriptor, name: this._editName, description: this._editDescription };
    this.dispatchEvent(new CustomEvent('pages-event', { bubbles: true, composed: true, detail: { topic: 'agent:updated', payload: updated } }));
    this._editing = false;
  }

  private _getScores(): AxisScore[] {
    const p = this.descriptor?.personality;
    if (!p) return [];
    return deriveDispositions(p);
  }

  private _renderRadar() {
    const scores = this._getScores();
    if (!scores.length) return nothing;
    const cx = 80, cy = 80, maxR = 65, total = scores.length;
    const gridLevels = [0.25, 0.5, 0.75, 1.0];
    const gridPolygons = gridLevels.map(level => {
      const points = scores.map((_, i) => radarPoint(cx, cy, maxR * level, i, total));
      return points.map(p => `${p[0]},${p[1]}`).join(' ');
    });
    const axisLines = scores.map((_, i) => { const [x, y] = radarPoint(cx, cy, maxR, i, total); return { x, y }; });
    const normalised = scores.map(s => (s.score + 1) / 2);
    const shapePoints = normalised.map((v, i) => radarPoint(cx, cy, maxR * v, i, total));
    const shapePath = shapePoints.map(p => `${p[0]},${p[1]}`).join(' ');
    return html`
      <div class="radar-chart">
        <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
          ${gridPolygons.map(pts => html`<polygon points="${pts}" fill="none" stroke="var(--pages-neutral-4, #e5e5e5)" stroke-width="0.5" />`)}
          ${axisLines.map(p => html`<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="var(--pages-neutral-4, #e5e5e5)" stroke-width="0.5" />`)}
          <polygon class="radar-shape" points="${shapePath}" fill="var(--pages-accent-5, #93c5fd)" fill-opacity="0.4" stroke="var(--pages-accent-9, #0066cc)" stroke-width="1.5" />
          ${shapePoints.map(p => html`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--pages-accent-9, #0066cc)" />`)}
        </svg>
      </div>
    `;
  }

  private _renderAxisRows() {
    const scores = this._getScores();
    if (!scores.length) return nothing;
    return html`
      <div class="axis-rows">
        ${scores.map(s => {
          const pct = ((s.score + 1) / 2) * 100;
          return html`
            <div class="axis-row">
              <span class="axis-name">${s.label}</span>
              <span class="axis-score">${s.score > 0 ? '+' : ''}${s.score.toFixed(1)}</span>
              <div class="axis-bar"><div class="axis-fill" style="width:${pct}%"></div></div>
              <span class="axis-contributors">${s.contributors.join(', ')}</span>
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderFrameworks(p: PersonalityProfile) {
    const pills: Array<{ label: string; value: string }> = [];
    if (p.mbti) pills.push({ label: 'MBTI', value: p.mbti });
    if (p.enneagram) pills.push({ label: 'Enneagram', value: p.enneagram });
    if (p.disc) pills.push({ label: 'DISC', value: p.disc });
    if (p.belbin) pills.push({ label: 'Belbin', value: p.belbin.primary });
    if (p.sdi) pills.push({ label: 'SDI', value: p.sdi });
    if (p.bigFive) {
      const poles = Object.entries(p.bigFive).map(([k, v]) => `${k}:${v}`).join(' ');
      pills.push({ label: 'Big Five', value: poles });
    }
    if (!pills.length) return nothing;
    return html`
      <div class="section">
        <div class="section-title">Personality Frameworks</div>
        <div class="framework-row">
          ${pills.map(p => html`<span class="framework-pill">${p.label}: ${p.value}</span>`)}
        </div>
      </div>
    `;
  }

  override render() {
    const desc = this.descriptor;
    if (!desc) return html`<div class="empty-state">No agent descriptor provided.</div>`;
    if (this._editing) return this._renderEditMode(desc);
    const archetype = desc.archetypeFamily && desc.subArchetype ? `${desc.archetypeFamily}/${desc.subArchetype}` : desc.archetypeFamily;
    return html`
      <div class="profile-header">
        <agent-avatar .archetype=${{ family: desc.archetypeFamily ?? 'Everyman', subArchetype: desc.subArchetype ?? 'Citizen' }} size="lg"></agent-avatar>
        <div class="header-info">
          <div class="profile-name">${desc.name}</div>
          <div class="badge-row">
            ${archetype ? html`<span class="badge badge-archetype">${archetype}</span>` : nothing}
            ${desc.profession ? html`<span class="badge badge-profession">${desc.profession}</span>` : nothing}
            ${desc.role ? html`<span class="badge">${desc.role}</span>` : nothing}
            ${desc.preferredAlias ? html`<span class="badge">${desc.preferredAlias}</span>` : nothing}
          </div>
        </div>
        <button class="edit-toggle" @click=${() => this._startEdit()}>Edit</button>
      </div>
      ${desc.description ? html`
        <div class="section">
          <div class="section-title">Description</div>
          <div class="description-text">${desc.description}</div>
        </div>
      ` : nothing}
      ${desc.personality ? this._renderFrameworks(desc.personality) : nothing}
      ${desc.personality ? html`
        <div class="section">
          <div class="section-title">Disposition</div>
          <div class="disposition-container">
            ${this._renderRadar()}
            ${this._renderAxisRows()}
          </div>
        </div>
      ` : nothing}
    `;
  }

  private _renderEditMode(desc: FullAgentDescriptor) {
    return html`
      <div class="edit-mode">
        <div class="section">
          <div class="section-title">Name</div>
          <input type="text" .value=${this._editName} @input=${(e: Event) => { this._editName = (e.target as HTMLInputElement).value; }}>
        </div>
        <div class="section">
          <div class="section-title">Description</div>
          <textarea .value=${this._editDescription} @input=${(e: Event) => { this._editDescription = (e.target as HTMLTextAreaElement).value; }}></textarea>
        </div>
        <div class="edit-buttons">
          <button class="btn-cancel" @click=${() => this._cancelEdit()}>Cancel</button>
          <button class="btn-save" @click=${() => this._save()}>Save</button>
        </div>
      </div>
    `;
  }
}
