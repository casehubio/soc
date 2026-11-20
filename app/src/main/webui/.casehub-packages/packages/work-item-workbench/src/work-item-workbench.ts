import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { WorkIdentity, UserSearchProvider } from '@casehubio/mosaic-core';
import { KeyboardShortcutMixin } from '@casehubio/pages-primitives/a11y';
import '@casehubio/pages-ui-components/split-workbench';
import '@casehubio/mosaic-work-item-inbox';
import '@casehubio/mosaic-work-item-detail';

export interface WorkItemWorkbenchProps {
  identity: WorkIdentity;
  endpoint: string;
}

@customElement('agency-work-item-workbench')
export class WorkItemWorkbench extends KeyboardShortcutMixin(LitElement) {
  @property({ type: Object }) identity!: WorkIdentity;
  @property({ type: String }) endpoint = '';
  @property({ type: Object }) userSearchProvider: UserSearchProvider | null = null;

  @state() private _showShortcutOverlay = false;

  static override styles = css`
    :host {
      display: block;
      height: 100%;
      width: 100%;
      font-family: var(--pages-font-family, system-ui);
      overflow: hidden;
      container-type: inline-size;
    }

    split-workbench {
      height: 100%;
    }

    .keyboard-hints {
      display: flex;
      gap: var(--pages-space-4, 16px);
      padding: var(--pages-space-2, 8px) var(--pages-space-4, 16px);
      background: var(--pages-neutral-2, #f5f5f5);
      border-top: 1px solid var(--pages-neutral-4, #d4d4d4);
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-neutral-7, #525252);
      overflow-x: auto;
    }

    .hint {
      display: flex;
      align-items: center;
      gap: var(--pages-space-1, 4px);
      white-space: nowrap;
    }

    .key {
      display: inline-block;
      padding: 2px 6px;
      background: var(--pages-neutral-3, #e5e5e5);
      border: 1px solid var(--pages-neutral-5, #a3a3a3);
      border-radius: 3px;
      font-family: monospace;
      font-size: 11px;
      font-weight: 600;
    }

    .shortcut-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .shortcut-panel {
      background: var(--pages-neutral-1, #fafafa);
      border: 1px solid var(--pages-neutral-4, #d4d4d4);
      border-radius: 8px;
      padding: var(--pages-space-4, 16px);
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .shortcut-title {
      font-size: var(--pages-font-size-lg, 16px);
      font-weight: 600;
      margin-bottom: var(--pages-space-3, 12px);
      color: var(--pages-neutral-11, #0a0a0a);
    }

    .shortcut-list {
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-2, 8px);
    }

    .shortcut-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--pages-space-2, 8px);
      background: var(--pages-neutral-2, #f5f5f5);
      border-radius: 4px;
    }

    .shortcut-desc {
      color: var(--pages-neutral-9, #262626);
    }

    @container (max-width: 1024px) {
      .keyboard-hints { display: none; }
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Work item workbench');
    this._registerKeyboardShortcuts();
  }

  configure(props: {
    endpoint?: string;
    identity?: WorkIdentity;
    userSearchProvider?: UserSearchProvider;
  }): void {
    if (props.endpoint !== undefined) this.endpoint = props.endpoint;
    if (props.identity !== undefined) this.identity = props.identity;
    if (props.userSearchProvider !== undefined) this.userSearchProvider = props.userSearchProvider;
    this.requestUpdate();
  }

  private _registerKeyboardShortcuts(): void {
    this.registerShortcut('?', () => { this._showShortcutOverlay = !this._showShortcutOverlay; }, {
      description: 'Show keyboard shortcuts',
    });
    this.registerShortcut('Escape', () => {
      if (this._showShortcutOverlay) this._showShortcutOverlay = false;
    }, { description: 'Close overlay' });
  }

  override render(): TemplateResult {
    return html`
      <pages-split-workbench selection-topic="work-item">
        <agency-work-item-inbox slot="list"
          .endpoint=${this.endpoint}
          .identity=${this.identity}
        ></agency-work-item-inbox>
        <agency-work-item-detail slot="detail"
          .endpoint=${this.endpoint}
          .identity=${this.identity}
          .userSearchProvider=${this.userSearchProvider}
        ></agency-work-item-detail>
      </pages-split-workbench>

      ${this._renderKeyboardHints()}
      ${this._showShortcutOverlay ? this._renderShortcutOverlay() : ''}
    `;
  }

  private _renderKeyboardHints(): TemplateResult {
    return html`
      <div class="keyboard-hints">
        <div class="hint"><span class="key">↑</span><span class="key">↓</span> Navigate</div>
        <div class="hint"><span class="key">Enter</span> Select</div>
        <div class="hint"><span class="key">Esc</span> Back</div>
        <div class="hint"><span class="key">C</span> Claim</div>
        <div class="hint"><span class="key">S</span> Start</div>
        <div class="hint"><span class="key">E</span> Complete</div>
        <div class="hint"><span class="key">?</span> Shortcuts</div>
      </div>
    `;
  }

  private _renderShortcutOverlay(): TemplateResult {
    const shortcuts = [
      { key: '↑ / ↓', desc: 'Navigate inbox items' },
      { key: 'Enter', desc: 'Open selected item' },
      { key: 'Escape', desc: 'Return to inbox' },
      { key: 'C', desc: 'Claim focused item' },
      { key: 'S', desc: 'Start work on item' },
      { key: 'E', desc: 'Complete item' },
      { key: 'R', desc: 'Reject item' },
      { key: 'Tab', desc: 'Switch between panels' },
      { key: '?', desc: 'Toggle this overlay' },
    ];
    return html`
      <div class="shortcut-overlay" @click=${() => { this._showShortcutOverlay = false; }}>
        <div class="shortcut-panel" @click=${(e: Event) => e.stopPropagation()}>
          <div class="shortcut-title">Keyboard Shortcuts</div>
          <div class="shortcut-list">
            ${shortcuts.map(s => html`
              <div class="shortcut-item">
                <span class="shortcut-desc">${s.desc}</span>
                <span class="key">${s.key}</span>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-work-item-workbench': WorkItemWorkbench;
  }
}
