import { type LitElement } from 'lit';
import { state } from 'lit/decorators.js';

type Constructor<T = LitElement> = new (...args: any[]) => T;

export type RovingDirection = 'horizontal' | 'vertical' | 'both';

export function RovingTabindexMixin<T extends Constructor>(Base: T) {
  abstract class RovingTabindexHost extends Base {
    abstract rovingSelector: string;
    abstract rovingDirection: RovingDirection;

    @state() rovingIndex = -1;

    private get _rovingItems(): HTMLElement[] {
      return Array.from(
        this.shadowRoot?.querySelectorAll(this.rovingSelector) ?? []
      );
    }

    override connectedCallback(): void {
      super.connectedCallback();
      this.addEventListener('keydown', this._handleRovingKeydown);
      this.addEventListener('focusin', this._handleRovingFocusin);
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback();
      this.removeEventListener('keydown', this._handleRovingKeydown);
      this.removeEventListener('focusin', this._handleRovingFocusin);
    }

    navigateRoving(direction: 'next' | 'prev' | 'first' | 'last'): void {
      const items = this._rovingItems;
      if (items.length === 0) return;

      switch (direction) {
        case 'next':
          this.rovingIndex = (this.rovingIndex + 1) % items.length;
          break;
        case 'prev':
          this.rovingIndex = (this.rovingIndex - 1 + items.length) % items.length;
          break;
        case 'first':
          this.rovingIndex = 0;
          break;
        case 'last':
          this.rovingIndex = items.length - 1;
          break;
      }

      this._updateTabindices();
      items[this.rovingIndex]?.focus();
    }

    private _updateTabindices(): void {
      for (const [i, item] of this._rovingItems.entries()) {
        item.setAttribute('tabindex', i === this.rovingIndex ? '0' : '-1');
      }
    }

    private _handleRovingKeydown = (e: KeyboardEvent): void => {
      const dir = this.rovingDirection;

      switch (e.key) {
        case 'ArrowDown':
          if (dir === 'vertical' || dir === 'both') {
            e.preventDefault();
            this.navigateRoving('next');
          }
          break;
        case 'ArrowUp':
          if (dir === 'vertical' || dir === 'both') {
            e.preventDefault();
            this.navigateRoving('prev');
          }
          break;
        case 'ArrowRight':
          if (dir === 'horizontal' || dir === 'both') {
            e.preventDefault();
            this.navigateRoving('next');
          }
          break;
        case 'ArrowLeft':
          if (dir === 'horizontal' || dir === 'both') {
            e.preventDefault();
            this.navigateRoving('prev');
          }
          break;
        case 'Home':
          e.preventDefault();
          this.navigateRoving('first');
          break;
        case 'End':
          e.preventDefault();
          this.navigateRoving('last');
          break;
      }
    };

    private _handleRovingFocusin = (): void => {
      if (this.rovingIndex === -1) {
        this.rovingIndex = 0;
        this._updateTabindices();
      }
    };
  }

  return RovingTabindexHost as unknown as Constructor<{
    rovingSelector: string;
    rovingDirection: RovingDirection;
    rovingIndex: number;
    navigateRoving(direction: 'next' | 'prev' | 'first' | 'last'): void;
  }> & T;
}
