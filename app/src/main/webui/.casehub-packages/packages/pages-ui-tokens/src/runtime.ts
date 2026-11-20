const themeRegistry = new Map<string, string>();
let appliedThemes = new WeakMap<Element, string>();

export function registerTheme(name: string, css: string): void {
  themeRegistry.set(name, css);
}

export function applyTheme(name: string, target: HTMLElement = document.documentElement): void {
  const css = themeRegistry.get(name);
  if (!css) throw new Error(`Unknown theme: "${name}". Available: ${listThemes().join(', ')}`);

  const currentTheme = appliedThemes.get(target);
  if (currentTheme) {
    target.classList.remove(`pages-theme-${currentTheme}`);
  }

  const root = target === document.documentElement ? document.head : target;
  const existing = root.querySelector('style[data-pages-theme]');
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.setAttribute('data-pages-theme', name);
  style.textContent = css;
  root.prepend(style);

  target.classList.add(`pages-theme-${name}`);
  appliedThemes.set(target, name);

  target.dispatchEvent(new CustomEvent('pages-theme-change', {
    bubbles: true,
    detail: { name, mode: name.endsWith('-dark') ? 'dark' : 'light' },
  }));
}

export function getTheme(target: HTMLElement = document.documentElement): string {
  return appliedThemes.get(target) ?? '';
}

export function listThemes(): string[] {
  return [...themeRegistry.keys()];
}

export function _resetAppliedThemes(): void {
  appliedThemes = new WeakMap<Element, string>();
}

export function _resetThemeRegistry(): void {
  themeRegistry.clear();
}
