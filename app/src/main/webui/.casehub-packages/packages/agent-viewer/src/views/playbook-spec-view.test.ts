import { describe, it, expect, afterEach } from 'vitest';
import './playbook-spec-view.js';

describe('agency-playbook-spec-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-playbook-spec-view');
    (el as any).spec = spec;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label', async () => {
    await create({ category: 'playbook', type: 'sequence', name: 'deploy-pipeline' });
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('playbook view');
  });

  it('renders playbook type badge', async () => {
    await create({ category: 'playbook', type: 'parallel', name: 'fan-out' });
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('parallel');
  });

  it('renders name', async () => {
    await create({ category: 'playbook', type: 'loop', name: 'retry-loop', description: 'Retries until success' });
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('retry-loop');
  });

  it('renders description', async () => {
    await create({ category: 'playbook', type: 'loop', name: 'retry-loop', description: 'Retries until success' });
    expect(el.shadowRoot!.textContent).toContain('Retries until success');
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });

  it('renders all playbook types', async () => {
    for (const type of ['sequence', 'parallel', 'conditional', 'match', 'loop', 'try-catch']) {
      await create({ category: 'playbook', type, name: `test-${type}` });
      expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe(type);
      el.remove();
    }
  });
});
