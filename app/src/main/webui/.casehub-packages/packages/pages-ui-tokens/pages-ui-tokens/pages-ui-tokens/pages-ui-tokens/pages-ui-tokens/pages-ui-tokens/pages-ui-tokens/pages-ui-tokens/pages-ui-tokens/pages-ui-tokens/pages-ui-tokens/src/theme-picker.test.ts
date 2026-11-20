import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { registerTheme, applyTheme, getTheme, _resetAppliedThemes, _resetThemeRegistry } from './runtime.js';

beforeAll(async () => {
  registerTheme('default-light', '.pages-theme-default-light {}');
  registerTheme('default-dark', '.pages-theme-default-dark {}');
  registerTheme('casehub-light', '.pages-theme-casehub-light {}');
  registerTheme('casehub-dark', '.pages-theme-casehub-dark {}');
  applyTheme('default-dark');
  await import('./theme-picker.js');
});

describe('pages-theme-picker', () => {
  let picker: HTMLElement;

  beforeEach(async () => {
    _resetAppliedThemes();
    document.body.innerHTML = '';
    registerTheme('default-light', '.pages-theme-default-light {}');
    registerTheme('default-dark', '.pages-theme-default-dark {}');
    registerTheme('casehub-light', '.pages-theme-casehub-light {}');
    registerTheme('casehub-dark', '.pages-theme-casehub-dark {}');
    applyTheme('default-dark');
    picker = document.createElement('pages-theme-picker');
    document.body.appendChild(picker);
    await (picker as any).updateComplete;
  });

  it('is a defined custom element', () => {
    expect(customElements.get('pages-theme-picker')).toBeDefined();
  });

  it('renders a shadow root', () => {
    expect(picker.shadowRoot).not.toBeNull();
  });

  it('renders a select dropdown', () => {
    const select = picker.shadowRoot?.querySelector('select');
    expect(select).not.toBeNull();
  });

  it('groups themes by family', () => {
    const select = picker.shadowRoot?.querySelector('select');
    const options = Array.from(select?.querySelectorAll('option') ?? []);
    const labels = options.map(o => o.textContent);
    expect(labels).toContain('Default');
    expect(labels).toContain('Casehub');
  });

  it('has light/dark mode toggle buttons', () => {
    const buttons = picker.shadowRoot?.querySelectorAll('button');
    expect(buttons?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('compact mode', () => {
  let picker: HTMLElement;

  beforeEach(async () => {
    _resetThemeRegistry();
    _resetAppliedThemes();
    document.body.innerHTML = '';
    registerTheme('default-light', '.pages-theme-default-light {}');
    registerTheme('default-dark', '.pages-theme-default-dark {}');
    registerTheme('casehub-light', '.pages-theme-casehub-light {}');
    registerTheme('casehub-dark', '.pages-theme-casehub-dark {}');
    applyTheme('default-dark');
    picker = document.createElement('pages-theme-picker');
    (picker as any).compact = true;
    document.body.appendChild(picker);
    await (picker as any).updateComplete;
  });

  it('renders a trigger button instead of a select dropdown', () => {
    expect(picker.shadowRoot?.querySelector('.compact-trigger')).not.toBeNull();
    expect(picker.shadowRoot?.querySelector('select')).toBeNull();
  });

  it('trigger contains a palette icon', () => {
    expect(picker.shadowRoot?.querySelector('.compact-trigger svg')).not.toBeNull();
  });

  it('trigger contains an accent colour dot', () => {
    expect(picker.shadowRoot?.querySelector('.accent-dot')).not.toBeNull();
  });

  it('trigger has aria-haspopup="dialog"', () => {
    const trigger = picker.shadowRoot?.querySelector('.compact-trigger');
    expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('trigger has aria-label', () => {
    const trigger = picker.shadowRoot?.querySelector('.compact-trigger');
    expect(trigger?.getAttribute('aria-label')).toBe('Theme settings');
  });

  it('renders a popover element', () => {
    const popover = picker.shadowRoot?.querySelector('[popover]');
    expect(popover).not.toBeNull();
    expect(popover?.getAttribute('popover')).toBe('auto');
  });

  it('popover has role and aria-label', () => {
    const popover = picker.shadowRoot?.querySelector('[popover]');
    expect(popover?.getAttribute('role')).toBe('group');
    expect(popover?.getAttribute('aria-label')).toBe('Theme settings');
  });

  it('shows family radio buttons when multiple families registered', () => {
    const radios = picker.shadowRoot?.querySelectorAll('input[type="radio"]');
    expect(radios?.length).toBe(2);
  });

  it('pre-selects the active family', () => {
    const checked = picker.shadowRoot?.querySelector('input[type="radio"]:checked') as HTMLInputElement | null;
    expect(checked).not.toBeNull();
    expect(checked?.value).toBe('default');
  });

  it('has mode toggle buttons inside the popover', () => {
    const popover = picker.shadowRoot?.querySelector('[popover]');
    const buttons = popover?.querySelectorAll('.mode-toggle button');
    expect(buttons?.length).toBe(2);
  });

  it('marks active mode button with aria-pressed', () => {
    const popover = picker.shadowRoot?.querySelector('[popover]');
    const buttons = Array.from(popover?.querySelectorAll('.mode-toggle button') ?? []);
    const darkButton = buttons.find(b => b.textContent?.includes('Dark'));
    expect(darkButton?.getAttribute('aria-pressed')).toBe('true');
  });

  it('omits family section when only one family registered', async () => {
    _resetThemeRegistry();
    _resetAppliedThemes();
    document.body.innerHTML = '';
    registerTheme('default-light', '.pages-theme-default-light {}');
    registerTheme('default-dark', '.pages-theme-default-dark {}');
    applyTheme('default-dark');
    const singlePicker = document.createElement('pages-theme-picker');
    (singlePicker as any).compact = true;
    document.body.appendChild(singlePicker);
    await (singlePicker as any).updateComplete;

    expect(singlePicker.shadowRoot?.querySelectorAll('input[type="radio"]').length).toBe(0);
    expect(singlePicker.shadowRoot?.querySelector('fieldset')).toBeNull();
    const modeButtons = singlePicker.shadowRoot?.querySelectorAll('.mode-toggle button');
    expect(modeButtons?.length).toBe(2);
  });

  it('selecting a family applies the theme', async () => {
    const radios = Array.from(picker.shadowRoot?.querySelectorAll('input[type="radio"]') ?? []);
    const casehubRadio = radios.find(r => r.value === 'casehub')!;
    casehubRadio.checked = true;
    casehubRadio.dispatchEvent(new Event('change', { bubbles: true }));
    await (picker as any).updateComplete;
    expect(getTheme()).toBe('casehub-dark');
  });

  it('toggling mode applies the theme', async () => {
    const popover = picker.shadowRoot?.querySelector('[popover]');
    const buttons = Array.from(popover?.querySelectorAll('.mode-toggle button') ?? []);
    const lightButton = buttons.find(b => b.textContent?.includes('Light'))!;
    lightButton.click();
    await (picker as any).updateComplete;
    expect(getTheme()).toBe('default-light');
  });

  it('uses a select dropdown when more than 5 families registered', async () => {
    _resetThemeRegistry();
    _resetAppliedThemes();
    document.body.innerHTML = '';
    for (const name of ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot']) {
      registerTheme(`${name}-light`, `.pages-theme-${name}-light {}`);
      registerTheme(`${name}-dark`, `.pages-theme-${name}-dark {}`);
    }
    applyTheme('alpha-dark');
    const manyPicker = document.createElement('pages-theme-picker');
    (manyPicker as any).compact = true;
    document.body.appendChild(manyPicker);
    await (manyPicker as any).updateComplete;

    expect(manyPicker.shadowRoot?.querySelectorAll('input[type="radio"]').length).toBe(0);
    const select = manyPicker.shadowRoot?.querySelector('.theme-popover select');
    expect(select).not.toBeNull();
    const options = select?.querySelectorAll('option');
    expect(options?.length).toBe(6);
  });

  it('selecting from dropdown applies the theme', async () => {
    _resetThemeRegistry();
    _resetAppliedThemes();
    document.body.innerHTML = '';
    for (const name of ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot']) {
      registerTheme(`${name}-light`, `.pages-theme-${name}-light {}`);
      registerTheme(`${name}-dark`, `.pages-theme-${name}-dark {}`);
    }
    applyTheme('alpha-dark');
    const manyPicker = document.createElement('pages-theme-picker');
    (manyPicker as any).compact = true;
    document.body.appendChild(manyPicker);
    await (manyPicker as any).updateComplete;

    const select = manyPicker.shadowRoot?.querySelector('.theme-popover select') as HTMLSelectElement;
    select.value = 'charlie';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await (manyPicker as any).updateComplete;
    expect(getTheme()).toBe('charlie-dark');
  });
});

describe('customize button', () => {
  let picker: HTMLElement;

  beforeEach(async () => {
    _resetThemeRegistry();
    _resetAppliedThemes();
    document.body.innerHTML = '';
    registerTheme('default-light', '.pages-theme-default-light {}');
    registerTheme('default-dark', '.pages-theme-default-dark {}');
    applyTheme('default-dark');
    picker = document.createElement('pages-theme-picker');
    document.body.appendChild(picker);
    await (picker as any).updateComplete;
  });

  it('renders a customize button in full mode', () => {
    const btn = picker.shadowRoot?.querySelector('.customize-btn');
    expect(btn).not.toBeNull();
  });

  it('customize button has aria-label', () => {
    const btn = picker.shadowRoot?.querySelector('.customize-btn');
    expect(btn?.getAttribute('aria-label')).toBe('Customize theme');
  });
});

describe('customize button in compact mode', () => {
  let picker: HTMLElement;

  beforeEach(async () => {
    _resetThemeRegistry();
    _resetAppliedThemes();
    document.body.innerHTML = '';
    registerTheme('default-light', '.pages-theme-default-light {}');
    registerTheme('default-dark', '.pages-theme-default-dark {}');
    applyTheme('default-dark');
    picker = document.createElement('pages-theme-picker');
    (picker as any).compact = true;
    document.body.appendChild(picker);
    await (picker as any).updateComplete;
  });

  it('renders a customize button in compact mode popover', () => {
    const popover = picker.shadowRoot?.querySelector('[popover]');
    const btn = popover?.querySelector('.customize-btn');
    expect(btn).not.toBeNull();
  });
});
