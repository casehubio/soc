import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { registerCollection, mythicCollection } from '@casehubio/mosaic-agent-avatar-2d';
import './agent-profile-panel.js';
import type { PersonalityProfile } from '@casehubio/mosaic-core';

type ProfilePanelEl = HTMLElement & {
  profile: PersonalityProfile | null;
  archetype: { family: string; subArchetype: string } | null;
  locked: Set<string>;
  showConfirmButton: boolean;
  archetypeRoles: Array<{ profession: string; role: string }>;
  templateName: string;
  templateDesc: string;
  templateAlias: string;
  collection: string;
  updateComplete: Promise<boolean>;
};

beforeAll(() => {
  registerCollection(mythicCollection);
});

describe('agent-profile-panel', () => {
  let el: ProfilePanelEl;

  beforeEach(() => {
    el = document.createElement('agent-profile-panel') as ProfilePanelEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('renders with role="region" and aria-label', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Personality profile');
  });

  it('renders empty state when profile is null', async () => {
    await el.updateComplete;
    const placeholder = el.shadowRoot!.querySelector('.empty-state');
    expect(placeholder).toBeTruthy();
    expect(placeholder!.textContent).toContain('Select a template');
  });

  it('renders framework values from a complete profile', async () => {
    el.profile = {
      mbti: 'INTJ', enneagram: 'Type 5', disc: 'CD',
      sdi: 'Blue', belbin: { primary: 'Plant', secondaries: ['Monitor Evaluator'] },
      bigFive: { O: 'high', C: 'high', E: 'low', A: 'low', N: 'low' },
    };
    await el.updateComplete;

    const profileSection = el.shadowRoot!.querySelector('.profile-section');
    expect(profileSection).toBeTruthy();

    const values = el.shadowRoot!.querySelectorAll('.profile-value');
    expect(values.length).toBeGreaterThan(0);
  });

  it('emits profile:value:changed on pill click', async () => {
    el.profile = { mbti: 'INTJ' };
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('profile:value:changed', (e) => events.push(e as CustomEvent));

    const pill = el.shadowRoot!.querySelector('[role="option"]') as HTMLElement;
    pill?.click();

    expect(events.length).toBe(1);
    expect(events[0]!.detail.field).toBeTruthy();
  });

  it('emits profile:lock:changed on lock toggle', async () => {
    el.profile = { mbti: 'INTJ' };
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('profile:lock:changed', (e) => events.push(e as CustomEvent));

    const lockBtn = el.shadowRoot!.querySelector('.profile-lock') as HTMLElement;
    lockBtn?.click();

    expect(events.length).toBe(1);
    expect(events[0]!.detail.field).toBeTruthy();
    expect(typeof events[0]!.detail.locked).toBe('boolean');
  });

  it('emits profile:reset on Reset button click', async () => {
    el.profile = { mbti: 'INTJ' };
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('profile:reset', (e) => events.push(e as CustomEvent));

    const resetBtn = el.shadowRoot!.querySelector('[aria-label="Reset personality profile"]') as HTMLElement;
    resetBtn?.click();

    expect(events.length).toBe(1);
  });

  it('emits personality:confirmed on Select button click', async () => {
    el.profile = { mbti: 'INTJ' };
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('personality:confirmed', (e) => events.push(e as CustomEvent));

    const selectBtn = el.shadowRoot!.querySelector('[aria-label="Confirm personality selection"]') as HTMLElement;
    selectBtn?.click();

    expect(events.length).toBe(1);
  });

  it('hides confirm button when showConfirmButton is false', async () => {
    el.profile = { mbti: 'INTJ' };
    el.showConfirmButton = false;
    await el.updateComplete;

    const selectBtn = el.shadowRoot!.querySelector('[aria-label="Confirm personality selection"]');
    expect(selectBtn).toBeNull();
  });

  it('renders dispositions when profile has framework values', async () => {
    el.profile = {
      mbti: 'INTJ', enneagram: 'Type 5', disc: 'CD', sdi: 'Blue',
      belbin: { primary: 'Plant', secondaries: [] },
    };
    await el.updateComplete;

    const dispositions = el.shadowRoot!.querySelector('.disposition-section');
    expect(dispositions).toBeTruthy();
  });

  it('renders tendencies when profile has strong framework values', async () => {
    el.profile = {
      mbti: 'INTJ', enneagram: 'Type 5', disc: 'CD', sdi: 'Blue',
      belbin: { primary: 'Plant', secondaries: [] },
      bigFive: { O: 'high', C: 'high', E: 'low', A: 'low', N: 'low' },
    };
    await el.updateComplete;

    const tendencies = el.shadowRoot!.querySelector('.tendencies-section');
    expect(tendencies).toBeTruthy();
  });

  describe('detail header', () => {
    it('renders detail header when templateName is set', async () => {
      el.profile = { mbti: 'INTJ' };
      el.archetype = { family: 'Scholar', subArchetype: 'Analyst' };
      el.templateName = 'Scholar Analyst';
      el.templateDesc = 'Analytical thinker';
      el.templateAlias = 'sage';
      await el.updateComplete;

      const header = el.shadowRoot!.querySelector('.detail-header');
      expect(header).toBeTruthy();
      expect(header!.textContent).toContain('Scholar Analyst');
      expect(header!.textContent).toContain('Analytical thinker');
      expect(header!.textContent).toContain('sage');
    });

    it('does not render detail header when templateName is empty', async () => {
      el.profile = { mbti: 'INTJ' };
      el.archetype = { family: 'Scholar', subArchetype: 'Analyst' };
      await el.updateComplete;

      const header = el.shadowRoot!.querySelector('.detail-header');
      expect(header).toBeNull();
    });

    it('renders avatar in detail header', async () => {
      el.profile = { mbti: 'INTJ' };
      el.archetype = { family: 'Scholar', subArchetype: 'Analyst' };
      el.templateName = 'Scholar Analyst';
      await el.updateComplete;

      const avatar = el.shadowRoot!.querySelector('.detail-header agent-avatar');
      expect(avatar).toBeTruthy();
    });

    it('shows archetype key in detail header', async () => {
      el.profile = { mbti: 'INTJ' };
      el.archetype = { family: 'Scholar', subArchetype: 'Analyst' };
      el.templateName = 'Scholar Analyst';
      await el.updateComplete;

      const archLabel = el.shadowRoot!.querySelector('.detail-archetype');
      expect(archLabel).toBeTruthy();
      expect(archLabel!.textContent).toContain('Scholar/Analyst');
    });
  });

  describe('archetypeRoles', () => {
    it('renders role badges when archetypeRoles is set', async () => {
      el.profile = { mbti: 'INTJ' };
      el.archetypeRoles = [
        { profession: 'Engineering', role: 'Architect' },
        { profession: 'Research', role: 'Scientist' },
      ];
      await el.updateComplete;

      const badges = el.shadowRoot!.querySelectorAll('.role-badge');
      expect(badges.length).toBe(2);
      expect(badges[0]!.textContent).toContain('Engineering');
      expect(badges[0]!.textContent).toContain('Architect');
    });

    it('does not render role badges when archetypeRoles is empty', async () => {
      el.profile = { mbti: 'INTJ' };
      el.archetypeRoles = [];
      await el.updateComplete;

      const badges = el.shadowRoot!.querySelectorAll('.role-badge');
      expect(badges.length).toBe(0);
    });

    it('archetype roles list has ARIA attributes', async () => {
      el.profile = { mbti: 'INTJ' };
      el.archetypeRoles = [{ profession: 'Legal', role: 'Advocate' }];
      await el.updateComplete;

      const list = el.shadowRoot!.querySelector('[aria-label="Archetype roles"]');
      expect(list).toBeTruthy();
      expect(list!.getAttribute('role')).toBe('list');
    });
  });
});
