import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { registerCollection, mythicCollection, chibiCollection } from '@casehubio/mosaic-agent-avatar-2d';
import './agent-personality-workbench.js';
import type { PersonalityProfile, FullAgentDescriptor } from '@casehubio/mosaic-core';

type WorkbenchEl = HTMLElement & {
  initialDescriptor: FullAgentDescriptor | null;
  _activeView: 'role' | 'character';
  _collection: string;
  _groupBy: 'role' | 'family';
  _collectionDropdownOpen: boolean;
  _profile: PersonalityProfile | null;
  _archetype: { family: string; subArchetype: string } | null;
  _selectedTemplateId: string | null;
  _templateName: string;
  _templateDesc: string;
  _templateAlias: string;
  _locked: Set<string>;
  updateComplete: Promise<boolean>;
};

beforeAll(() => {
  registerCollection(mythicCollection);
  registerCollection(chibiCollection);
});

describe('agent-personality-workbench', () => {
  let el: WorkbenchEl;

  beforeAll(async () => {
    el = document.createElement('agent-personality-workbench') as WorkbenchEl;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterAll(() => {
    el.remove();
  });

  afterEach(async () => {
    el._activeView = 'role';
    el._collection = 'mythic';
    el._collectionDropdownOpen = false;
    el._groupBy = 'role';
    el._profile = null;
    el._archetype = null;
    el._selectedTemplateId = null;
    el._templateName = '';
    el._templateDesc = '';
    el._templateAlias = '';
    el._locked = new Set();
    await el.updateComplete;
  });

  it('renders with role="region" and aria-label', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Agent personality workbench');
  });

  it('renders tablist with two tabs', async () => {
    await el.updateComplete;
    const tablist = el.shadowRoot!.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
  });

  it('shows templates tab by default', async () => {
    await el.updateComplete;
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
  });

  it('switches tabs on click', async () => {
    await el.updateComplete;
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    (tabs[1] as HTMLElement).click();
    await el.updateComplete;
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(el._activeView).toBe('character');
  });

  it('renders profile panel', async () => {
    await el.updateComplete;
    const panel = el.shadowRoot!.querySelector('agent-profile-panel');
    expect(panel).toBeTruthy();
  });

  it('renders agent-catalog in templates tab', async () => {
    await el.updateComplete;
    const catalog = el.shadowRoot!.querySelector('agent-catalog');
    expect(catalog).toBeTruthy();
  });

  it('renders avatar-step in advanced tab', async () => {
    await el.updateComplete;
    const avatarStep = el.shadowRoot!.querySelector('avatar-step');
    expect(avatarStep).toBeTruthy();
  });

  it('updates profile when catalog:template:selected fires', async () => {
    await el.updateComplete;
    const catalog = el.shadowRoot!.querySelector('agent-catalog')!;
    catalog.dispatchEvent(new CustomEvent('catalog:template:selected', {
      detail: {
        template: {
          agentId: '', name: 'Test', tenancyId: '',
          archetypeFamily: 'Guardian', subArchetype: 'Sentinel',
          personality: { mbti: 'ISTJ', enneagram: 'Type 1' },
        } as unknown as FullAgentDescriptor,
        templateId: 'test-template-id',
      },
      bubbles: true, composed: true,
    }));
    await el.updateComplete;
    expect(el._profile?.mbti).toBe('ISTJ');
    expect(el._archetype?.family).toBe('Guardian');
    expect(el._selectedTemplateId).toBe('test-template-id');
  });

  it('clears state when catalog:template:deselected fires', async () => {
    await el.updateComplete;
    el._profile = { mbti: 'INTJ' };
    el._selectedTemplateId = 'test-1';
    await el.updateComplete;

    const catalog = el.shadowRoot!.querySelector('agent-catalog')!;
    catalog.dispatchEvent(new CustomEvent('catalog:template:deselected', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el._profile).toBeNull();
    expect(el._selectedTemplateId).toBeNull();
  });

  it('clears state when profile:reset fires', async () => {
    await el.updateComplete;
    el._profile = { mbti: 'INTJ' };
    el._archetype = { family: 'Scholar', subArchetype: 'Analyst' };
    el._selectedTemplateId = 'test-1';
    await el.updateComplete;

    const panel = el.shadowRoot!.querySelector('agent-profile-panel')!;
    panel.dispatchEvent(new CustomEvent('profile:reset', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el._profile).toBeNull();
    expect(el._archetype).toBeNull();
    expect(el._selectedTemplateId).toBeNull();
    expect(el._locked.size).toBe(0);
  });

  it('emits personality:confirmed with profile and archetype', async () => {
    await el.updateComplete;
    el._profile = { mbti: 'INTJ' };
    el._archetype = { family: 'Scholar', subArchetype: 'Analyst' };

    const events: CustomEvent[] = [];
    el.addEventListener('personality:confirmed', (e) => events.push(e as CustomEvent));

    const panel = el.shadowRoot!.querySelector('agent-profile-panel')!;
    panel.dispatchEvent(new CustomEvent('personality:confirmed', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(events.length).toBe(1);
    expect(events[0]!.detail.profile.mbti).toBe('INTJ');
    expect(events[0]!.detail.archetype.family).toBe('Scholar');
  });

  it('tabs are focusable', async () => {
    await el.updateComplete;
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
    expect((tabs[0] as HTMLElement).tagName).toBe('BUTTON');
    expect((tabs[1] as HTMLElement).tagName).toBe('BUTTON');
  });

  describe('collection dropdown', () => {
    it('renders collection dropdown trigger in nav bar', async () => {
      await el.updateComplete;
      const trigger = el.shadowRoot!.querySelector('.collection-trigger');
      expect(trigger).toBeTruthy();
    });

    it('defaults to mythic collection', async () => {
      await el.updateComplete;
      expect(el._collection).toBe('mythic');
      const trigger = el.shadowRoot!.querySelector('.collection-trigger');
      expect(trigger!.textContent!.trim().toLowerCase()).toContain('mythic');
    });

    it('opens dropdown menu on click', async () => {
      await el.updateComplete;
      const trigger = el.shadowRoot!.querySelector('.collection-trigger') as HTMLElement;
      trigger.click();
      await el.updateComplete;
      const menu = el.shadowRoot!.querySelector('.collection-menu');
      expect(menu).toBeTruthy();
      const options = el.shadowRoot!.querySelectorAll('.collection-option');
      expect(options.length).toBeGreaterThanOrEqual(1);
    });

    it('updates collection on option click', async () => {
      await el.updateComplete;
      el._collectionDropdownOpen = true;
      await el.updateComplete;
      const options = el.shadowRoot!.querySelectorAll('.collection-option');
      if (options.length < 2) return;
      (options[1] as HTMLElement).click();
      await el.updateComplete;
      expect(el._collection).not.toBe('mythic');
    });

    it('passes collection to avatar-step', async () => {
      await el.updateComplete;
      const avatarStep = el.shadowRoot!.querySelector('avatar-step') as HTMLElement & { collection: string };
      expect(avatarStep).toBeTruthy();
      expect(avatarStep.collection).toBe(el._collection);
    });

    it('passes collection to agent-catalog', async () => {
      await el.updateComplete;
      const catalog = el.shadowRoot!.querySelector('agent-catalog') as HTMLElement & { collection: string };
      expect(catalog).toBeTruthy();
      expect(catalog.collection).toBe(el._collection);
    });

    it('dropdown is in nav bar alongside tabs', async () => {
      await el.updateComplete;
      const navBar = el.shadowRoot!.querySelector('.nav-bar') as HTMLElement;
      const tabBar = el.shadowRoot!.querySelector('[role="tablist"]') as HTMLElement;
      expect(navBar).toBeTruthy();
      expect(tabBar).toBeTruthy();
      expect(navBar.contains(tabBar)).toBe(true);
    });
  });

  it('defaults groupBy to role', async () => {
    await el.updateComplete;
    expect(el._groupBy).toBe('role');
  });

  describe('profile panel properties', () => {
    it('passes templateName to profile panel on template selection', async () => {
      await el.updateComplete;
      const catalog = el.shadowRoot!.querySelector('agent-catalog')!;
      catalog.dispatchEvent(new CustomEvent('catalog:template:selected', {
        detail: {
          template: {
            agentId: '', name: 'Scholar Analyst', tenancyId: '',
            archetypeFamily: 'Scholar', subArchetype: 'Analyst',
            description: 'Analytical thinker',
            preferredAlias: 'sage',
            personality: { mbti: 'INTJ' },
          } as unknown as FullAgentDescriptor,
          templateId: 'test-id',
        },
        bubbles: true, composed: true,
      }));
      await el.updateComplete;
      expect(el._templateName).toBe('Scholar Analyst');
      expect(el._templateDesc).toBe('Analytical thinker');
      expect(el._templateAlias).toBe('sage');
      const panel = el.shadowRoot!.querySelector('agent-profile-panel') as HTMLElement & { templateName: string; templateDesc: string; templateAlias: string };
      expect(panel.templateName).toBe('Scholar Analyst');
      expect(panel.templateDesc).toBe('Analytical thinker');
      expect(panel.templateAlias).toBe('sage');
    });

    it('clears template info on deselection', async () => {
      await el.updateComplete;
      el._templateName = 'Test';
      el._templateDesc = 'Desc';
      el._templateAlias = 'alias';
      await el.updateComplete;

      const catalog = el.shadowRoot!.querySelector('agent-catalog')!;
      catalog.dispatchEvent(new CustomEvent('catalog:template:deselected', { bubbles: true, composed: true }));
      await el.updateComplete;
      expect(el._templateName).toBe('');
      expect(el._templateDesc).toBe('');
      expect(el._templateAlias).toBe('');
    });

    it('passes collection to profile panel', async () => {
      await el.updateComplete;
      const panel = el.shadowRoot!.querySelector('agent-profile-panel') as HTMLElement & { collection: string };
      expect(panel.collection).toBe(el._collection);
    });
  });
});
