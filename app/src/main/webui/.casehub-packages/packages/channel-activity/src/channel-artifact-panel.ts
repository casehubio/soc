import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ArtefactRef, ResolvedArtifact } from './types.js';
import '@casehubio/pages-ui-components';

@customElement('agency-channel-artifact-panel')
export class ChannelArtifactPanelElement extends LitElement {
  @property({ type: Object }) selectedArtefactRef?: ArtefactRef;
  @property({ attribute: false }) resolveArtifact?: (ref: ArtefactRef) => Promise<ResolvedArtifact>;

  @state() private _history: ArtefactRef[] = [];
  @state() private _historyIndex = -1;
  @state() private _content?: string | undefined;
  @state() private _language?: string | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Artifact viewer');
  }

  static override readonly styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: var(--pages-font-family);
    }
    .panel-title {
      font-size: var(--pages-font-size-sm);
      font-weight: var(--pages-font-weight-semibold);
      padding: var(--pages-space-3) var(--pages-space-4);
      border-bottom: 1px solid var(--pages-neutral-4);
      color: var(--pages-neutral-12);
    }
    .header-bar {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2);
      padding: var(--pages-space-2) var(--pages-space-4);
      border-bottom: 1px solid var(--pages-neutral-4);
      flex-shrink: 0;
    }
    .artifact-label {
      font-size: var(--pages-font-size-sm);
      font-weight: var(--pages-font-weight-semibold);
      color: var(--pages-neutral-12);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    .type-badge {
      font-size: 10px;
      font-weight: var(--pages-font-weight-medium);
      padding: 1px 6px;
      border-radius: var(--pages-radius-sm);
      background: var(--pages-neutral-3);
      color: var(--pages-neutral-9);
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .artifact-uri {
      font-size: var(--pages-font-size-xs);
      color: var(--pages-neutral-8);
      padding: 0 var(--pages-space-4);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .nav-buttons {
      display: flex;
      gap: var(--pages-space-1);
      flex-shrink: 0;
    }
    .nav-back, .nav-forward, .copy-btn {
      width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      background: none; border: 1px solid var(--pages-neutral-4);
      border-radius: var(--pages-radius-sm);
      cursor: pointer; font-size: 12px;
      color: var(--pages-neutral-9);
    }
    .nav-back:hover, .nav-forward:hover, .copy-btn:hover {
      background: var(--pages-neutral-3);
      color: var(--pages-neutral-11);
    }
    .nav-back:disabled, .nav-forward:disabled {
      opacity: 0.3; cursor: default;
    }
    .content-area {
      flex: 1;
      overflow-y: auto;
      padding: var(--pages-space-3) var(--pages-space-4);
    }
    .content-text {
      font-size: var(--pages-font-size-sm);
      line-height: var(--pages-line-height-base);
      color: var(--pages-neutral-11);
      white-space: pre-wrap;
      word-break: break-word;
    }
    .artifact-card {
      display: flex;
      align-items: center;
      gap: var(--pages-space-3);
      padding: var(--pages-space-3);
      border: 1px solid var(--pages-neutral-4);
      border-radius: var(--pages-radius-sm);
    }
    .card-icon { font-size: 24px; }
    .card-info { flex: 1; }
    .card-label {
      font-size: var(--pages-font-size-sm);
      font-weight: var(--pages-font-weight-semibold);
      color: var(--pages-neutral-12);
    }
    .card-uri {
      font-size: var(--pages-font-size-xs);
      color: var(--pages-accent-9);
    }
    .scope-highlight {
      background: var(--pages-warning-3);
      padding: var(--pages-space-2);
      border-radius: var(--pages-radius-sm);
      margin-bottom: var(--pages-space-2);
      font-size: var(--pages-font-size-xs);
      color: var(--pages-warning-11);
    }
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--pages-neutral-8);
      font-size: var(--pages-font-size-sm);
    }
  `;

  private _typeIcon(type: string): string {
    switch (type) {
      case 'DOCUMENT': return '\u{1F4C4}';
      case 'CODE': return '\u{1F4BB}';
      case 'CASE': return '\u{1F4C1}';
      case 'WORK_ITEM': return '\u{1F4CB}';
      case 'CHANNEL': return '\u{1F4AC}';
      case 'MESSAGE': return '\u{2709}\u{FE0F}';
      case 'DEBATE': return '\u{2696}\u{FE0F}';
      case 'EXTERNAL': return '\u{1F517}';
      default: return '\u{1F4CE}';
    }
  }

  override willUpdate(changed: Map<string, unknown>) {
    if (changed.has('selectedArtefactRef') && this.selectedArtefactRef) {
      const ref = this.selectedArtefactRef;
      const lastInHistory = this._history[this._historyIndex];
      if (!lastInHistory || lastInHistory.uri !== ref.uri) {
        this._history = [...this._history.slice(0, this._historyIndex + 1), ref];
        this._historyIndex = this._history.length - 1;
      }
      this._loadContent(ref);
    }
  }

  private async _loadContent(ref: ArtefactRef) {
    if (this.resolveArtifact) {
      const result = await this.resolveArtifact(ref);
      this._content = result.content;
      this._language = result.language;
    } else {
      this._content = ref.label;
      this._language = undefined;
    }
  }

  private _navigateBack() {
    if (this._historyIndex > 0) {
      this._historyIndex--;
      const ref = this._history[this._historyIndex]!;
      this.selectedArtefactRef = ref;
    }
  }

  private _navigateForward() {
    if (this._historyIndex < this._history.length - 1) {
      this._historyIndex++;
      const ref = this._history[this._historyIndex]!;
      this.selectedArtefactRef = ref;
    }
  }

  private _copyUri() {
    if (this.selectedArtefactRef) {
      navigator.clipboard?.writeText(this.selectedArtefactRef.uri);
    }
  }

  override render() {
    if (!this.selectedArtefactRef) {
      return html`
        <div class="panel-title">Artifacts</div>
        <div class="empty">Select a message with attachments</div>
      `;
    }

    const ref = this.selectedArtefactRef;
    return html`
      <div class="panel-title">Artifacts</div>
      <div class="header-bar">
        <div class="nav-buttons">
          <pages-button class="nav-back" variant="ghost" size="sm" ?disabled=${this._historyIndex <= 0}
            @click=${this._navigateBack}>\u{2190}</pages-button>
          <pages-button class="nav-forward" variant="ghost" size="sm" ?disabled=${this._historyIndex >= this._history.length - 1}
            @click=${this._navigateForward}>\u{2192}</pages-button>
        </div>
        <span class="artifact-label">${ref.label}</span>
        <span class="type-badge">${ref.type}</span>
        <pages-button class="copy-btn" variant="ghost" size="sm" title="Copy URI" @click=${this._copyUri}>\u{1F4CB}</pages-button>
      </div>
      <div class="artifact-uri">${ref.uri}</div>
      <div class="content-area">
        ${this._renderContent(ref)}
      </div>
    `;
  }

  private _renderContent(ref: ArtefactRef) {
    if (ref.scope?.selectedText) {
      return html`
        <div class="scope-highlight">
          ${ref.scope.startLine != null ? html`Lines ${ref.scope.startLine}\u{2013}${ref.scope.endLine ?? ref.scope.startLine}: ` : nothing}
          ${ref.scope.selectedText}
        </div>
        <div class="content-text">${this._content ?? ref.label}</div>
      `;
    }

    switch (ref.type) {
      case 'CASE':
      case 'WORK_ITEM':
      case 'CHANNEL':
      case 'MESSAGE':
      case 'EXTERNAL':
        return html`
          <div class="artifact-card">
            <span class="card-icon">${this._typeIcon(ref.type)}</span>
            <div class="card-info">
              <div class="card-label">${ref.label}</div>
              <div class="card-uri">${ref.uri}</div>
            </div>
          </div>
        `;
      default:
        return html`<div class="content-text">${this._content ?? ref.label}</div>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-channel-artifact-panel': ChannelArtifactPanelElement;
  }
}
