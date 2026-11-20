import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { registerCollection, mythicCollection, type AgentAvatar } from '@casehubio/mosaic-agent-avatar-2d';
import './agent-catalog.js';

type CatalogEl = HTMLElement & {
  updateComplete: Promise<boolean>;
  suppressDetail: boolean;
  selectedTemplateId: string | null;
  collection: string;
  groupBy: 'role' | 'family';
};

// Catalog behavior does not depend on SVG artwork. Avoid rendering the full
// artwork for every card in every test; the integration test below covers it.
const catalogTestCollection = { ...mythicCollection, parts: new Map<string, string>() };

describe('agent-catalog', () => {
  let el: CatalogEl;

  beforeEach(() => {
    registerCollection(catalogTestCollection);
    el = document.createElement('agent-catalog') as CatalogEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
    registerCollection(catalogTestCollection);
  });

  it('renders real SVG artwork for a catalog avatar', async () => {
    await el.updateComplete;
    const avatars = el.shadowRoot!.querySelectorAll<AgentAvatar>('agent-avatar');
    expect(avatars.length).toBeGreaterThan(0);
    await Promise.all(Array.from(avatars, avatar => avatar.updateComplete));

    // Render one real avatar, rather than a full catalog of SVGs on every update.
    registerCollection(mythicCollection);
    const avatar = avatars[0]!;
    avatar.requestUpdate();
    await avatar.updateComplete;
    expect(avatar.shadowRoot!.querySelector('svg [data-part]')).toBeTruthy();
  });

  it('renders with role="region" and aria-label', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Agent template catalog');
  });

  it('renders featured section with curated templates', async () => {
    await el.updateComplete;
    const featured = el.shadowRoot!.querySelectorAll('.featured-card');
    expect(featured.length).toBeGreaterThanOrEqual(3);
    expect(featured.length).toBeLessThanOrEqual(5);
  });

  it('renders profession filter pills', async () => {
    await el.updateComplete;
    const pills = el.shadowRoot!.querySelectorAll('[data-filter="profession"]');
    expect(pills.length).toBeGreaterThan(0);
  });

  it('renders search input', async () => {
    await el.updateComplete;
    const search = el.shadowRoot!.querySelector('[role="searchbox"]');
    expect(search).toBeTruthy();
  });

  it('renders role groups with template cards', async () => {
    await el.updateComplete;
    const groups = el.shadowRoot!.querySelectorAll('.role-group');
    expect(groups.length).toBeGreaterThan(0);
    const cards = el.shadowRoot!.querySelectorAll('.template-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('profession filter reduces to matching role groups', async () => {
    await el.updateComplete;
    const allGroups = el.shadowRoot!.querySelectorAll('.role-group').length;
    const pill = el.shadowRoot!.querySelector('[data-filter="profession"][data-value="Legal"]') as HTMLElement;
    expect(pill).toBeTruthy();
    pill.click();
    await el.updateComplete;
    const filteredGroups = el.shadowRoot!.querySelectorAll('.role-group').length;
    expect(filteredGroups).toBeLessThan(allGroups);
    expect(filteredGroups).toBeGreaterThan(0);
  });

  it('hides featured section when profession filter active', async () => {
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('[data-filter="profession"]') as HTMLElement;
    pill.click();
    await el.updateComplete;
    const featured = el.shadowRoot!.querySelector('.featured-section');
    expect(featured).toBeNull();
  });

  it('card click expands detail below its role group', async () => {
    await el.updateComplete;
    const card = el.shadowRoot!.querySelector('.template-card') as HTMLElement;
    card.click();
    await el.updateComplete;
    const detail = el.shadowRoot!.querySelector('.detail-expansion');
    expect(detail).toBeTruthy();
    expect(detail!.getAttribute('role')).toBe('region');
    const group = detail!.closest('.role-group');
    expect(group).toBeTruthy();
  });

  it('second card click collapses previous and expands new', async () => {
    await el.updateComplete;
    const cards = el.shadowRoot!.querySelectorAll('.template-card');
    (cards[0] as HTMLElement).click();
    await el.updateComplete;
    const firstId = el.shadowRoot!.querySelector('.detail-expansion')?.getAttribute('data-template-id');
    (cards[1] as HTMLElement).click();
    await el.updateComplete;
    const details = el.shadowRoot!.querySelectorAll('.detail-expansion');
    expect(details.length).toBe(1);
    expect(details[0]!.getAttribute('data-template-id')).not.toBe(firstId);
  });

  it('select button emits catalog:template:selected', async () => {
    await el.updateComplete;
    const card = el.shadowRoot!.querySelector('.template-card') as HTMLElement;
    card.click();
    await el.updateComplete;
    let detail: Record<string, unknown> | undefined;
    el.addEventListener('catalog:template:selected', ((e: CustomEvent) => {
      detail = e.detail;
    }) as EventListener);
    const selectBtn = el.shadowRoot!.querySelector('.select-btn') as HTMLElement;
    selectBtn.click();
    await el.updateComplete;
    expect(detail).toBeDefined();
    expect(detail!.template).toBeDefined();
    const tmpl = detail!.template as Record<string, unknown>;
    expect(tmpl.archetypeFamily).toBeTruthy();
    expect(tmpl.personality).toBeDefined();
  });

  it('search filters templates by label', async () => {
    await el.updateComplete;
    const allCards = el.shadowRoot!.querySelectorAll('.template-card').length;
    const input = el.shadowRoot!.querySelector('[role="searchbox"]') as HTMLInputElement;
    input.value = 'investigator';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;
    const filteredCards = el.shadowRoot!.querySelectorAll('.template-card').length;
    expect(filteredCards).toBeLessThan(allCards);
    expect(filteredCards).toBeGreaterThan(0);
  });

  describe('suppressDetail mode', () => {
    it('single-click emits catalog:template:selected when suppressDetail is true', async () => {
      el.suppressDetail = true;
      await el.updateComplete;

      const events: CustomEvent[] = [];
      el.addEventListener('catalog:template:selected', (e) => events.push(e as CustomEvent));

      const card = el.shadowRoot!.querySelector('.template-card') as HTMLElement;
      card.click();
      expect(events.length).toBe(1);
      expect(events[0]!.detail.template).toBeTruthy();
    });

    it('does not render detail expansion when suppressDetail is true', async () => {
      el.suppressDetail = true;
      await el.updateComplete;

      const card = el.shadowRoot!.querySelector('.template-card') as HTMLElement;
      card.click();
      await el.updateComplete;

      const detail = el.shadowRoot!.querySelector('.detail-expansion');
      expect(detail).toBeNull();
    });

    it('click on already-selected card emits catalog:template:deselected', async () => {
      el.suppressDetail = true;
      await el.updateComplete;

      const card = el.shadowRoot!.querySelector('.template-card') as HTMLElement;
      const templateId = card.getAttribute('data-template-id')!;

      el.selectedTemplateId = templateId;
      await el.updateComplete;

      const deselected: CustomEvent[] = [];
      el.addEventListener('catalog:template:deselected', (e) => deselected.push(e as CustomEvent));
      card.click();
      expect(deselected.length).toBe(1);
    });
  });

  describe('selectedTemplateId', () => {
    it('highlights the matching card visually', async () => {
      await el.updateComplete;

      const card = el.shadowRoot!.querySelector('.template-card') as HTMLElement;
      const templateId = card.getAttribute('data-template-id')!;

      el.selectedTemplateId = templateId;
      await el.updateComplete;

      const highlighted = el.shadowRoot!.querySelector('.template-card.selected');
      expect(highlighted).toBeTruthy();
      expect(highlighted!.getAttribute('data-template-id')).toBe(templateId);
    });

    it('clears highlight when set to null', async () => {
      await el.updateComplete;

      const card = el.shadowRoot!.querySelector('.template-card') as HTMLElement;
      el.selectedTemplateId = card.getAttribute('data-template-id')!;
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.template-card.selected')).toBeTruthy();

      el.selectedTemplateId = null;
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.template-card.selected')).toBeNull();
    });
  });

  describe('collection property', () => {
    it('passes collection to agent-avatar elements in cards', async () => {
      el.collection = 'chibi';
      await el.updateComplete;
      const avatar = el.shadowRoot!.querySelector('agent-avatar') as HTMLElement & { collection: string };
      expect(avatar).toBeTruthy();
      expect(avatar.getAttribute('collection') ?? avatar.collection).toBe('chibi');
    });

    it('defaults to mythic when no collection set', async () => {
      await el.updateComplete;
      const avatar = el.shadowRoot!.querySelector('agent-avatar') as HTMLElement & { collection: string };
      expect(avatar).toBeTruthy();
      expect(avatar.getAttribute('collection') ?? avatar.collection).toBe('mythic');
    });
  });

  describe('groupBy property', () => {
    it('defaults to role grouping', async () => {
      await el.updateComplete;
      expect(el.groupBy).toBe('role');
      const groups = el.shadowRoot!.querySelectorAll('.role-group');
      expect(groups.length).toBeGreaterThan(0);
    });

    it('switches to family grouping when set to family', async () => {
      el.groupBy = 'family';
      await el.updateComplete;
      const familyGroups = el.shadowRoot!.querySelectorAll('.family-group');
      expect(familyGroups.length).toBeGreaterThan(0);
      const roleGroups = el.shadowRoot!.querySelectorAll('.role-group');
      expect(roleGroups.length).toBe(0);
    });

    it('family groups have aria-label with family name', async () => {
      el.groupBy = 'family';
      await el.updateComplete;
      const group = el.shadowRoot!.querySelector('.family-group') as HTMLElement;
      expect(group).toBeTruthy();
      expect(group.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
