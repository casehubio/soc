import { describe, it, expect } from 'vitest';
import './blocks-org-diagram-toolbar.js';

describe('blocks-org-diagram-toolbar', () => {
  it('registers as custom element', () => {
    expect(customElements.get('blocks-org-diagram-toolbar')).toBeDefined();
  });

  it('renders with ARIA', async () => {
    const el = document.createElement('blocks-org-diagram-toolbar') as any;
    el.unitCount = 3;
    el.agentCount = 7;
    el.relationshipCount = 5;
    el.archetype = 'federation';
    el.confidence = 'high';
    document.body.appendChild(el);
    await el.updateComplete;

    const shadow = el.shadowRoot!;
    const select = shadow.querySelector('select');
    expect(select).toBeDefined();
    expect(select?.querySelector('option[value="auto"]')).toBeDefined();

    const badge = shadow.querySelector('.badge');
    expect(badge?.textContent).toContain('federation');

    const stats = shadow.querySelector('.stats');
    expect(stats?.textContent).toContain('3 units');
    expect(stats?.textContent).toContain('7 agents');

    el.remove();
  });

  it('emits toolbar-layout-change on select', async () => {
    const el = document.createElement('blocks-org-diagram-toolbar') as any;
    document.body.appendChild(el);
    await el.updateComplete;

    let received: string | undefined;
    el.addEventListener('toolbar-layout-change', (e: CustomEvent) => {
      received = e.detail.strategy;
    });

    const select = el.shadowRoot!.querySelector('select') as HTMLSelectElement;
    select.value = 'tree';
    select.dispatchEvent(new Event('change'));

    expect(received).toBe('tree');
    el.remove();
  });

  it('disables save when not dirty', async () => {
    const el = document.createElement('blocks-org-diagram-toolbar') as any;
    el.hasBackend = true;
    el.dirty = false;
    document.body.appendChild(el);
    await el.updateComplete;

    const saveBtn = el.shadowRoot!.querySelector('.save-btn') as HTMLButtonElement;
    expect(saveBtn?.disabled).toBe(true);
    el.remove();
  });
});
