import type { DrillDownState } from './drill-down-state.js';

export class DrillDownBars {
  private _nav: HTMLElement | null = null;
  private _container: HTMLElement | null = null;

  render(container: HTMLElement, state: DrillDownState): void {
    this._container = container;
    this._cleanup();

    if (state.depth === 0) return;

    const nav = document.createElement('nav');
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Drill-down breadcrumb');
    nav.style.display = 'flex';
    nav.style.flexShrink = '0';

    for (let i = 0; i < state.depth; i++) {
      const level = state.levels[i]!;
      const bar = document.createElement('div');
      bar.setAttribute('role', 'button');
      bar.setAttribute('tabindex', '0');
      bar.setAttribute('aria-label', `Navigate to ${level.name}`);
      bar.style.width = '32px';
      bar.style.height = '100%';
      bar.style.cursor = 'pointer';
      bar.style.display = 'flex';
      bar.style.alignItems = 'center';
      bar.style.justifyContent = 'center';
      bar.style.writingMode = 'vertical-rl';
      bar.style.textOrientation = 'mixed';
      bar.style.fontSize = '11px';
      bar.style.borderRight = '1px solid var(--pages-gray-6, #dadce0)';
      bar.style.background = 'var(--pages-gray-2, #f8f9fa)';
      bar.style.userSelect = 'none';
      bar.textContent = level.name;

      const depth = i;
      bar.addEventListener('click', () => {
        container.dispatchEvent(new CustomEvent('drill-down-navigate', {
          detail: { depth },
          bubbles: true,
          composed: true,
        }));
      });

      bar.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          bar.click();
        }
      });

      nav.appendChild(bar);
    }

    container.insertBefore(nav, container.firstChild);
    this._nav = nav;
  }

  dispose(): void {
    this._cleanup();
    this._container = null;
  }

  private _cleanup(): void {
    if (this._nav) {
      this._nav.remove();
      this._nav = null;
    }
  }
}
