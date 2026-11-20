import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme, registerTheme, getTheme, listThemes, _resetAppliedThemes } from './runtime.js';

describe('runtime API', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '';
    document.documentElement.className = '';
    document.head.innerHTML = '';
    _resetAppliedThemes();
  });

  describe('registerTheme + listThemes', () => {
    it('lists registered themes', () => {
      registerTheme('test-light', '.pages-theme-test-light { --pages-accent-1: red; }');
      expect(listThemes()).toContain('test-light');
    });

    it('registers multiple themes', () => {
      registerTheme('a', '.pages-theme-a {}');
      registerTheme('b', '.pages-theme-b {}');
      const themes = listThemes();
      expect(themes).toContain('a');
      expect(themes).toContain('b');
    });
  });

  describe('applyTheme', () => {
    it('sets theme class on document.documentElement by default', () => {
      registerTheme('dark', '.pages-theme-dark { --pages-accent-1: blue; }');
      applyTheme('dark');
      expect(document.documentElement.classList.contains('pages-theme-dark')).toBe(true);
    });

    it('injects style element with data-pages-theme attribute', () => {
      registerTheme('dark', '.pages-theme-dark {}');
      applyTheme('dark');
      const style = document.querySelector('style[data-pages-theme]');
      expect(style).not.toBeNull();
    });

    it('removes previous theme class when switching', () => {
      registerTheme('light', '.pages-theme-light {}');
      registerTheme('dark', '.pages-theme-dark {}');
      applyTheme('light');
      applyTheme('dark');
      expect(document.documentElement.classList.contains('pages-theme-light')).toBe(false);
      expect(document.documentElement.classList.contains('pages-theme-dark')).toBe(true);
    });

    it('replaces existing style element on reapply', () => {
      registerTheme('dark', '.pages-theme-dark {}');
      applyTheme('dark');
      applyTheme('dark');
      const styles = document.querySelectorAll('style[data-pages-theme]');
      expect(styles.length).toBe(1);
    });

    it('applies to specific target element', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      registerTheme('dark', '.pages-theme-dark {}');
      applyTheme('dark', el);
      expect(el.classList.contains('pages-theme-dark')).toBe(true);
      expect(document.documentElement.classList.contains('pages-theme-dark')).toBe(false);
    });

    it('throws on unknown theme', () => {
      expect(() => { applyTheme('nonexistent'); }).toThrow(/Unknown theme/);
    });
  });

  describe('getTheme', () => {
    it('returns current theme name', () => {
      registerTheme('dark', '.pages-theme-dark {}');
      applyTheme('dark');
      expect(getTheme()).toBe('dark');
    });

    it('returns empty string when no theme applied', () => {
      expect(getTheme()).toBe('');
    });

    it('returns theme for specific target', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      registerTheme('dark', '.pages-theme-dark {}');
      applyTheme('dark', el);
      expect(getTheme(el)).toBe('dark');
    });
  });
});
