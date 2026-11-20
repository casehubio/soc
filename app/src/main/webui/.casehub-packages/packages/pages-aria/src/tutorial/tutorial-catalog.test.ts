import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { TutorialDescriptor } from './types.js';
import './tutorial-catalog.js';
import type { PagesTutorialCatalog } from './tutorial-catalog.js';

const DESCRIPTORS: TutorialDescriptor[] = [
  {
    scenario: 'arch-concepts', title: 'Architecture', description: 'Overview',
    area: 'scenario-automation', labels: ['difficulty:beginner', 'concept:architecture'], tags: ['overview'],
    estimated: '15 min', prerequisites: [], path: 'tutorials/arch/tutorial.yaml',
    contentType: 'slides-only',
    hero: { title: 'Architecture & Concepts', subtitle: 'Learn the basics', icon: '◎' },
  },
  {
    scenario: 'form-auto', title: 'Form Automation', description: 'Hands-on forms',
    area: 'scenario-automation', labels: ['difficulty:beginner', 'concept:aria'], tags: ['forms'],
    estimated: '10 min', prerequisites: ['arch-concepts'], path: 'tutorials/form/tutorial.yaml',
    contentType: 'hands-on',
    hero: { title: 'Form Automation', subtitle: 'Fill forms', icon: '✎' },
  },
  {
    scenario: 'admin-setup', title: 'Admin Setup', description: 'Platform admin',
    area: 'platform-admin', labels: ['difficulty:intermediate'], tags: ['admin'],
    estimated: '20 min', prerequisites: [], path: 'tutorials/admin/tutorial.yaml',
    contentType: 'hands-on',
  },
];

describe('pages-tutorial-catalog', () => {
  let el: PagesTutorialCatalog;

  beforeEach(async () => {
    el = document.createElement('pages-tutorial-catalog') as PagesTutorialCatalog;
    el.registry = DESCRIPTORS;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('renders area cards in tiles mode', () => {
    const cards = el.shadowRoot?.querySelectorAll('.area-card');
    expect(cards?.length).toBe(2);
  });

  it('fires area-select on area card click', async () => {
    const promise = new Promise<string>(resolve => {
      el.addEventListener('area-select', (e: Event) => {
        resolve((e as CustomEvent).detail.area);
      });
    });
    const card = el.shadowRoot?.querySelector('.area-card') as HTMLElement;
    card?.click();
    const area = await promise;
    expect(['scenario-automation', 'platform-admin']).toContain(area);
  });

  it('drills into area and shows tutorial cards', async () => {
    el.area = 'scenario-automation';
    await el.updateComplete;
    const cards = el.shadowRoot?.querySelectorAll('.tutorial-card');
    expect(cards?.length).toBe(2);
  });

  it('fires tutorial-select on tutorial card click', async () => {
    el.area = 'scenario-automation';
    await el.updateComplete;
    const promise = new Promise<string>(resolve => {
      el.addEventListener('tutorial-select', (e: Event) => {
        resolve((e as CustomEvent).detail.scenario);
      });
    });
    const card = el.shadowRoot?.querySelector('.tutorial-card') as HTMLElement;
    card?.click();
    const scenario = await promise;
    expect(['arch-concepts', 'form-auto']).toContain(scenario);
  });

  it('switches to list mode', async () => {
    el.mode = 'list';
    await el.updateComplete;
    const rows = el.shadowRoot?.querySelectorAll('.tutorial-row');
    expect(rows?.length).toBe(3);
  });

  it('shows breadcrumb when area is set', async () => {
    el.area = 'scenario-automation';
    await el.updateComplete;
    const breadcrumb = el.shadowRoot?.querySelector('.breadcrumb');
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb?.textContent).toContain('All Tutorials');
  });

  it('renders mode toggle', () => {
    const toggle = el.shadowRoot?.querySelector('.mode-toggle');
    expect(toggle).not.toBeNull();
    const buttons = toggle?.querySelectorAll('button');
    expect(buttons?.length).toBe(2);
  });

  it('renders hero icon when present', async () => {
    el.area = 'scenario-automation';
    await el.updateComplete;
    const icons = el.shadowRoot?.querySelectorAll('.hero-icon');
    expect(icons?.length).toBeGreaterThan(0);
  });

  it('filters by label in list mode', async () => {
    el.mode = 'list';
    el.labels = ['concept:aria'];
    await el.updateComplete;
    const rows = el.shadowRoot?.querySelectorAll('.tutorial-row');
    expect(rows?.length).toBe(1);
  });

  it('shows difficulty chips', async () => {
    el.area = 'scenario-automation';
    await el.updateComplete;
    const chips = el.shadowRoot?.querySelectorAll('.chip.difficulty-beginner');
    expect(chips?.length).toBeGreaterThan(0);
  });
});
