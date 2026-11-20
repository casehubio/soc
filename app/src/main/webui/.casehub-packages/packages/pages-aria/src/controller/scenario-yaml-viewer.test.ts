import { describe, it, expect } from 'vitest';
import './scenario-yaml-viewer.js';

describe('PagesScenarioYamlViewer', () => {
  it('is defined as a custom element', () => {
    expect(customElements.get('pages-scenario-yaml-viewer')).toBeDefined();
  });

  it('renders empty state when no scenario', async () => {
    const el = document.createElement('pages-scenario-yaml-viewer');
    document.body.appendChild(el);
    await (el as any).updateComplete;
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('.yaml-empty')).not.toBeNull();
    document.body.removeChild(el);
  });

  it('has scenario property', () => {
    const el = document.createElement('pages-scenario-yaml-viewer') as any;
    el.scenario = 'help-desk-demo';
    expect(el.scenario).toBe('help-desk-demo');
  });

  it('yaml lines use pre-wrap for text wrapping', async () => {
    const el = document.createElement('pages-scenario-yaml-viewer') as any;
    document.body.appendChild(el);
    await el.updateComplete;
    const styles = el.shadowRoot!.adoptedStyleSheets?.[0]
      ?? el.shadowRoot!.querySelector('style');
    const cssText = styles instanceof CSSStyleSheet
      ? Array.from(styles.cssRules).map(r => r.cssText).join('\n')
      : (styles as HTMLStyleElement)?.textContent ?? '';
    expect(cssText).toContain('pre-wrap');
    el.remove();
  });

  it('renders in standalone mode filling container', async () => {
    const el = document.createElement('pages-scenario-yaml-viewer') as any;
    el.setAttribute('mode', 'standalone');
    document.body.appendChild(el);
    await el.updateComplete;
    const card = el.shadowRoot!.querySelector('.viewer-card');
    expect(card).not.toBeNull();
    el.remove();
  });

  it('renders tab bar with Source and Guide tabs', async () => {
    const el = document.createElement('pages-scenario-yaml-viewer') as any;
    document.body.appendChild(el);
    el._yamlSource = 'scenario: test\nsteps: []';
    await el.updateComplete;
    const tabs = el.shadowRoot!.querySelectorAll('.tab-btn');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent!.trim()).toBe('Source');
    expect(tabs[1].textContent!.trim()).toBe('Guide');
    el.remove();
  });

  it('renders guide content when set', async () => {
    const el = document.createElement('pages-scenario-yaml-viewer') as any;
    document.body.appendChild(el);
    el._guideContent = { markdown: '## Hello\n\nWorld' };
    el._activeTab = 'guide';
    await el.updateComplete;
    const guide = el.shadowRoot!.querySelector('.guide-content');
    expect(guide).not.toBeNull();
    expect(guide!.querySelector('h2')!.textContent).toBe('Hello');
    el.remove();
  });

  it('updates guide content on scenario-narrative event', async () => {
    const eventTarget = new EventTarget();
    const el = document.createElement('pages-scenario-yaml-viewer') as any;
    el.eventTarget = eventTarget;
    document.body.appendChild(el);
    await el.updateComplete;
    eventTarget.dispatchEvent(new CustomEvent('scenario-narrative', {
      detail: { type: 'inline', markdown: '## Test Content' },
    }));
    await el.updateComplete;
    expect(el._guideContent).toEqual({ type: 'inline', markdown: '## Test Content' });
    el.remove();
  });

  it('guide content persists after dismiss event', async () => {
    const eventTarget = new EventTarget();
    const el = document.createElement('pages-scenario-yaml-viewer') as any;
    el.eventTarget = eventTarget;
    document.body.appendChild(el);
    await el.updateComplete;
    eventTarget.dispatchEvent(new CustomEvent('scenario-narrative', {
      detail: { type: 'inline', markdown: '## Persisted' },
    }));
    await el.updateComplete;
    eventTarget.dispatchEvent(new CustomEvent('scenario-narrative-dismiss'));
    await el.updateComplete;
    expect(el._guideContent).toEqual({ type: 'inline', markdown: '## Persisted' });
    el.remove();
  });

  it('shows empty state on Guide tab when no content', async () => {
    const el = document.createElement('pages-scenario-yaml-viewer') as any;
    document.body.appendChild(el);
    el._activeTab = 'guide';
    await el.updateComplete;
    const empty = el.shadowRoot!.querySelector('.guide-empty');
    expect(empty).not.toBeNull();
    expect(empty!.textContent!.trim()).toBe('No guide content');
    el.remove();
  });
});
