import { describe, it, expect, afterEach } from 'vitest';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from './shared-styles.js';

@customElement('test-pattern-view')
class TestPatternView extends PatternViewMixin(LitElement) {
  static override styles = [patternViewStyles];
  override render() {
    if (!this.spec) return this.renderEmptyState();
    return html`<div class="content">${this.spec.category}/${this.spec.type}</div>`;
  }
}

@customElement('test-tabbed-pattern-view')
class TestTabbedPatternView extends PatternViewMixin(LitElement) {
  static override styles = [patternViewStyles];
  override renderExecution() {
    return html`<div class="exec-content">execution content</div>`;
  }
  override renderReports() {
    return html`<div class="reports-content">reports content</div>`;
  }
  override render() {
    if (!this.spec) return this.renderEmptyState();
    return html`${this.renderTabBar()}${this.renderTabPanel()}`;
  }
}

function fixture(): DeliberationPatternCategory {
  return { category: 'deliberation', type: 'voting', name: 'test-vote' };
}

describe('PatternViewMixin', () => {
  let el: TestPatternView;

  afterEach(() => el?.remove());

  it('sets role="region" on connect', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    el.spec = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
  });

  it('sets aria-label from category', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    el.spec = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toBe('deliberation view');
  });

  it('sets aria-label to "pattern view" when spec is undefined', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toBe('pattern view');
  });

  it('setLoading updates aria-busy', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    el.spec = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
    (el as any).setLoading(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
    (el as any).setLoading(false);
    expect(el.getAttribute('aria-busy')).toBe('false');
  });

  it('renderEmptyState renders default message', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.empty-state')?.textContent).toBe('No pattern data');
  });

  it('renders content when spec is set', async () => {
    el = document.createElement('test-pattern-view') as TestPatternView;
    el.spec = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.content')?.textContent).toBe('deliberation/voting');
  });
});

describe('PatternViewMixin tabs', () => {
  let el: TestTabbedPatternView;

  afterEach(() => el?.remove());

  async function create() {
    el = document.createElement('test-tabbed-pattern-view') as TestTabbedPatternView;
    el.spec = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
  }

  it('renders tablist with two tabs', async () => {
    await create();
    const tablist = el.shadowRoot!.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
  });

  it('Execution tab selected by default', async () => {
    await create();
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('tabs have aria-controls linking to panel', async () => {
    await create();
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute('aria-controls')).toBe('panel-execution');
    expect(tabs[1].getAttribute('aria-controls')).toBe('panel-reports');
  });

  it('tabpanel has id and aria-labelledby', async () => {
    await create();
    const panel = el.shadowRoot!.querySelector('[role="tabpanel"]');
    expect(panel!.getAttribute('id')).toBe('panel-execution');
    expect(panel!.getAttribute('aria-labelledby')).toBe('tab-execution');
  });

  it('renders execution content by default', async () => {
    await create();
    expect(el.shadowRoot!.querySelector('.exec-content')?.textContent).toBe('execution content');
    expect(el.shadowRoot!.querySelector('.reports-content')).toBeNull();
  });

  it('switches to reports tab on click', async () => {
    await create();
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    (tabs[1] as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.reports-content')?.textContent).toBe('reports content');
    expect(el.shadowRoot!.querySelector('.exec-content')).toBeNull();
  });

  it('roving tabindex: active tab has 0, inactive has -1', async () => {
    await create();
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');
  });

  it('arrow right moves to next tab', async () => {
    await create();
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    (tabs[0] as HTMLElement).focus();
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await el.updateComplete;
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('Home key moves to first tab', async () => {
    await create();
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    (tabs[1] as HTMLElement).click();
    await el.updateComplete;
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await el.updateComplete;
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  it('End key moves to last tab', async () => {
    await create();
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await el.updateComplete;
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });
});

describe('patternViewStyles', () => {
  it('is a CSSResult', () => {
    expect(patternViewStyles).toBeDefined();
    expect(patternViewStyles.cssText).toContain('display: block');
    expect(patternViewStyles.cssText).toContain('border-radius');
  });
});
