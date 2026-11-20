import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type ElementType = 'binding' | 'worker' | 'milestone' | 'goal';

const ITEMS: { type: ElementType; label: string; icon: string; color: string }[] = [
  { type: 'binding', label: 'Binding', icon: '🔗', color: '#3b82f6' },
  { type: 'worker', label: 'Worker', icon: '⚙️', color: '#6b7280' },
  { type: 'milestone', label: 'Milestone', icon: '🚩', color: '#d97706' },
  { type: 'goal', label: 'Goal', icon: '🎯', color: '#16a34a' },
];

@customElement('casehub-diagram-palette')
export class CasehubDiagramPalette extends LitElement {
  @property({ type: Boolean }) disabled = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'toolbar');
    this.setAttribute('aria-label', 'Diagram palette');
    this.setAttribute('aria-orientation', 'vertical');
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('disabled')) {
      this.setAttribute('aria-disabled', String(this.disabled));
    }
  }

  static override styles = css`
    :host { display: flex; flex-direction: column; gap: 6px; padding: 8px; width: 64px; box-sizing: border-box; }
    button {
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      border: 1px solid var(--pages-neutral-5, #444); border-radius: 8px;
      background: var(--pages-neutral-3, #2a2a2a); cursor: pointer;
      padding: 8px 4px; font-size: 10px; font-weight: 500;
      color: var(--pages-neutral-11, #ccc);
      font-family: var(--pages-font-family, system-ui, sans-serif);
    }
    button:hover:not(:disabled) { background: var(--pages-neutral-4, #3a3a3a); border-color: var(--pages-neutral-7, #666); }
    button:disabled { opacity: 0.3; cursor: default; }
    .icon { font-size: 18px; line-height: 1; }
  `;

  override render() {
    return html`${ITEMS.map(item => html`
      <button ?disabled=${this.disabled} @click=${() => this._emit(item.type)} style="border-color: ${item.color}44;">
        <span class="icon">${item.icon}</span>
        <span style="color: ${item.color};">${item.label}</span>
      </button>
    `)}`;
  }

  private _emit(elementType: ElementType): void {
    this.dispatchEvent(new CustomEvent('palette-add', {
      bubbles: true, composed: true, detail: { elementType },
    }));
  }
}
