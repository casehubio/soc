// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { AgencyEnvMapEditorElement } from './agency-env-map-editor.js';
import { AgencySequenceEditorElement } from './agency-sequence-editor.js';
import { AgencySwfLinkElement } from './agency-swf-link.js';

describe('agency-env-map-editor', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('agency-env-map-editor')).toBe(AgencyEnvMapEditorElement);
  });

  it('has a value property defaulting to empty object', () => {
    const el = new AgencyEnvMapEditorElement();
    expect(el.value).toEqual({});
  });

  it('has aria-label on textarea', async () => {
    const el = new AgencyEnvMapEditorElement();
    document.body.appendChild(el);
    await el.updateComplete;
    const textarea = el.shadowRoot!.querySelector('textarea');
    expect(textarea?.getAttribute('aria-label')).toBe('Environment variables');
    el.remove();
  });
});

describe('agency-sequence-editor', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('agency-sequence-editor')).toBe(AgencySequenceEditorElement);
  });

  it('renders worker names as list items', async () => {
    const el = new AgencySequenceEditorElement();
    el.value = ['worker-a', 'worker-b'];
    document.body.appendChild(el);
    await el.updateComplete;
    const items = el.shadowRoot!.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('worker-a');
    expect(el.shadowRoot!.querySelector('ol')?.getAttribute('aria-label')).toBe('Worker sequence');
    el.remove();
  });
});

describe('agency-swf-link', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('agency-swf-link')).toBe(AgencySwfLinkElement);
  });

  it('renders drill-down link with aria-label', async () => {
    const el = new AgencySwfLinkElement();
    document.body.appendChild(el);
    await el.updateComplete;
    const link = el.shadowRoot!.querySelector('a');
    expect(link?.textContent).toContain('Drill down');
    expect(link?.getAttribute('aria-label')).toBe('Drill down to definition');
    el.remove();
  });
});
