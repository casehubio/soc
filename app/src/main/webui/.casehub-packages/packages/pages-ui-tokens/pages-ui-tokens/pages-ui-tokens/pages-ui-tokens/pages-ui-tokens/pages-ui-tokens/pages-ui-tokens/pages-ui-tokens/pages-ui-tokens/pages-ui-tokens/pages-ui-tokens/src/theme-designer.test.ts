import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { registerTheme, listThemes, _resetThemeRegistry, _resetAppliedThemes, applyTheme } from './runtime.js';
import { initPresets } from './transforms/index.js';

function createMockLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  };
}

beforeAll(async () => {
  Object.defineProperty(globalThis, 'localStorage', { value: createMockLocalStorage(), writable: true, configurable: true });
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no server'));
  initPresets();
  registerTheme('default-light', '.pages-theme-default-light {}');
  registerTheme('default-dark', '.pages-theme-default-dark {}');
  applyTheme('default-dark');
  await import('./theme-designer.js');
});

describe('pages-theme-designer', () => {
  let designer: HTMLElement & {
    open: boolean;
    _accentHue: number;
    _neutralHue: number;
    _chroma: number;
    _contrast: number;
    _themeName: string;
    _advancedMode: boolean;
    updateComplete: Promise<boolean>;
    _onSave: () => Promise<void>;
  };

  beforeEach(async () => {
    _resetAppliedThemes();
    _resetThemeRegistry();
    Object.defineProperty(globalThis, 'localStorage', { value: createMockLocalStorage(), writable: true, configurable: true });
    initPresets();
    registerTheme('default-light', '.pages-theme-default-light {}');
    registerTheme('default-dark', '.pages-theme-default-dark {}');
    applyTheme('default-dark');
    document.body.innerHTML = '';
    designer = document.createElement('pages-theme-designer') as any;
    document.body.appendChild(designer);
    await designer.updateComplete;
  });

  it('is a defined custom element', () => {
    expect(customElements.get('pages-theme-designer')).toBeDefined();
  });

  it('renders a shadow root', () => {
    expect(designer.shadowRoot).not.toBeNull();
  });

  it('is hidden when open is false', async () => {
    designer.open = false;
    await designer.updateComplete;
    expect(designer.shadowRoot?.querySelector('.designer-overlay')).toBeNull();
  });

  it('shows overlay when open is true', async () => {
    designer.open = true;
    await designer.updateComplete;
    expect(designer.shadowRoot?.querySelector('.designer-overlay')).not.toBeNull();
  });

  it('renders hue sliders for accent and neutral plus chroma and contrast', async () => {
    designer.open = true;
    await designer.updateComplete;
    const sliders = designer.shadowRoot?.querySelectorAll('input[type="range"]');
    expect(sliders?.length).toBeGreaterThanOrEqual(4);
  });

  it('renders colour preview swatches', async () => {
    designer.open = true;
    await designer.updateComplete;
    const swatches = designer.shadowRoot?.querySelectorAll('.swatch-section');
    expect(swatches?.length).toBeGreaterThanOrEqual(2);
  });

  it('renders a name input', async () => {
    designer.open = true;
    await designer.updateComplete;
    const nameInput = designer.shadowRoot?.querySelector('input[type="text"]');
    expect(nameInput).not.toBeNull();
  });

  it('renders save and close buttons', async () => {
    designer.open = true;
    await designer.updateComplete;
    const buttons = Array.from(designer.shadowRoot?.querySelectorAll('button') ?? []);
    const labels = buttons.map(b => b.textContent?.trim().toLowerCase());
    expect(labels).toContain('save');
    expect(labels).toContain('close');
  });

  it('dispatches pages-designer-closed on close button click', async () => {
    designer.open = true;
    await designer.updateComplete;
    const handler = vi.fn();
    designer.addEventListener('pages-designer-closed', handler);
    const closeBtn = Array.from(designer.shadowRoot?.querySelectorAll('button') ?? [])
      .find(b => b.textContent?.trim().toLowerCase() === 'close');
    closeBtn?.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('dispatches pages-theme-created on save', async () => {
    designer.open = true;
    designer._themeName = 'my-custom';
    designer._accentHue = 200;
    designer._neutralHue = 220;
    designer._chroma = 0.15;
    designer._contrast = 0.5;
    await designer.updateComplete;

    const handler = vi.fn();
    designer.addEventListener('pages-theme-created', handler);
    await designer._onSave();

    expect(handler).toHaveBeenCalledOnce();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.name).toBe('my-custom');
  });

  it('registers theme after save so it appears in listThemes', async () => {
    designer.open = true;
    designer._themeName = 'brand-new';
    designer._accentHue = 180;
    await designer.updateComplete;

    await designer._onSave();

    const themes = listThemes();
    expect(themes.some(t => t.includes('brand-new'))).toBe(true);
  });

  it('renders widget preview sections', async () => {
    designer.open = true;
    await designer.updateComplete;
    const sections = designer.shadowRoot?.querySelectorAll('.widget-section');
    expect(sections?.length).toBeGreaterThanOrEqual(5);
  });

  it('renders preview buttons, badges, and table', async () => {
    designer.open = true;
    await designer.updateComplete;
    expect(designer.shadowRoot?.querySelector('.preview-btn-primary')).not.toBeNull();
    expect(designer.shadowRoot?.querySelector('.badge-success')).not.toBeNull();
    expect(designer.shadowRoot?.querySelector('.preview-table')).not.toBeNull();
  });
});

describe('advanced mode', () => {
  let designer: any;

  beforeEach(async () => {
    _resetAppliedThemes();
    _resetThemeRegistry();
    Object.defineProperty(globalThis, 'localStorage', { value: createMockLocalStorage(), writable: true, configurable: true });
    initPresets();
    registerTheme('default-light', '.pages-theme-default-light {}');
    registerTheme('default-dark', '.pages-theme-default-dark {}');
    applyTheme('default-dark');
    document.body.innerHTML = '';
    designer = document.createElement('pages-theme-designer');
    designer.open = true;
    document.body.appendChild(designer);
    await designer.updateComplete;
  });

  it('has an advanced mode toggle', () => {
    const toggle = designer.shadowRoot?.querySelector('.advanced-toggle');
    expect(toggle).not.toBeNull();
  });

  it('shows simple mode controls by default', () => {
    const simplePanel = designer.shadowRoot?.querySelector('.tab-bar');
    expect(simplePanel).not.toBeNull();
    const pipelinePanel = designer.shadowRoot?.querySelector('.pipeline-editor');
    expect(pipelinePanel).toBeNull();
  });

  it('switches to pipeline editor when toggled', async () => {
    designer._advancedMode = true;
    await designer.updateComplete;
    const pipelinePanel = designer.shadowRoot?.querySelector('.pipeline-editor');
    expect(pipelinePanel).not.toBeNull();
    const simplePanel = designer.shadowRoot?.querySelector('.tab-bar');
    expect(simplePanel).toBeNull();
  });

  it('pipeline editor shows transform stages', async () => {
    designer._advancedMode = true;
    await designer.updateComplete;
    const stages = designer.shadowRoot?.querySelectorAll('.pipeline-stage');
    expect(stages?.length).toBeGreaterThan(0);
  });

  it('has add-stage button', async () => {
    designer._advancedMode = true;
    await designer.updateComplete;
    const addBtn = designer.shadowRoot?.querySelector('.add-stage-btn');
    expect(addBtn).not.toBeNull();
  });
});
