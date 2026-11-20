import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '..', 'package.json');

describe('package exports — sub-path configuration', () => {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  it('has exports map with root entry', () => {
    expect(pkg.exports).toBeDefined();
    expect(pkg.exports['.']).toBeDefined();
  });

  it('has exports map with a11y sub-path', () => {
    expect(pkg.exports).toBeDefined();
    expect(pkg.exports['./a11y']).toBeDefined();
  });

  it('has exports map with modal sub-path', () => {
    expect(pkg.exports).toBeDefined();
    expect(pkg.exports['./modal']).toBeDefined();
  });

  it('declares sideEffects array excluding a11y', () => {
    expect(pkg.sideEffects).toBeDefined();
    expect(Array.isArray(pkg.sideEffects)).toBe(true);
    const sfx = pkg.sideEffects as string[];
    expect(sfx.some((s: string) => s.includes('modal'))).toBe(true);
    expect(sfx.some((s: string) => s.includes('a11y'))).toBe(false);
  });
});

describe('sub-path module isolation', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    window.scrollTo = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('importing a11y barrel does not register pages-modal', async () => {
    const a11y = await import('./a11y/index.js');
    expect(a11y.RovingTabindexMixin).toBeDefined();
    expect(a11y.FocusTrapMixin).toBeDefined();
    expect(a11y.KeyboardShortcutMixin).toBeDefined();
    expect(a11y.LiveRegionMixin).toBeDefined();
    expect(customElements.get('pages-modal')).toBeUndefined();
  });

  it('importing modal barrel registers pages-modal', async () => {
    const modal = await import('./modal/index.js');
    expect(modal.PagesModal).toBeDefined();
    expect(customElements.get('pages-modal')).toBeDefined();
  });
});
