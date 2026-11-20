import type { LitElement } from 'lit';

type Constructor<T = LitElement> = new (...args: any[]) => T;

export function LiveRegionMixin<T extends Constructor>(Base: T) {
  class LiveRegionHost extends Base {
    private _liveRegion: HTMLElement | null = null;

    announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
      if (!this._liveRegion) {
        this._liveRegion = document.createElement('div');
        this._liveRegion.setAttribute('aria-live', priority);
        this._liveRegion.setAttribute('aria-atomic', 'true');
        this._liveRegion.setAttribute('role', 'status');
        Object.assign(this._liveRegion.style, {
          position: 'absolute', width: '1px', height: '1px',
          overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap',
        });
        document.body.appendChild(this._liveRegion);
      }

      this._liveRegion.setAttribute('aria-live', priority);
      this._liveRegion.textContent = '';
      // Force reflow so screen readers pick up the change
      void this._liveRegion.offsetHeight;
      this._liveRegion.textContent = message;
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback();
      this._liveRegion?.remove();
      this._liveRegion = null;
    }
  }

  return LiveRegionHost as unknown as Constructor<{
    announce(message: string, priority?: 'polite' | 'assertive'): void;
  }> & T;
}
