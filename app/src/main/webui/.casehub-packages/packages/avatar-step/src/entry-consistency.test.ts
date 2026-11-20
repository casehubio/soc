import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { registerCollection, mythicCollection } from '@casehubio/mosaic-agent-avatar-2d';
import './avatar-step.js';
import type { PersonalityProfile } from '@casehubio/mosaic-core';

type AvatarStepEl = HTMLElement & {
  updateComplete: Promise<boolean>;
  _frameworks: Record<string, string>;
  _bigFive: Record<string, string>;
  _selectedArchetype: string | null;
  _profession: string | null;
  _selectedRole: string | null;
  _profile: PersonalityProfile;
};

beforeAll(() => {
  registerCollection(mythicCollection);
});

function pill(el: AvatarStepEl, fw: string, value: string): HTMLElement | null {
  return el.shadowRoot!.querySelector(`[data-framework="${fw}"][data-value="${value}"]`);
}

function clickPill(el: AvatarStepEl, fw: string, value: string) {
  const p = pill(el, fw, value);
  expect(p, `pill ${fw}:${value}`).toBeTruthy();
  p!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
}

function clickArchetype(el: AvatarStepEl, family: string, sub: string) {
  const cell = el.shadowRoot!.querySelector(`[aria-label="${family} ${sub} avatar"]`) as HTMLElement;
  expect(cell, `avatar cell for ${family}/${sub}`).toBeTruthy();
  cell.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
}

function archetypeCell(el: AvatarStepEl, family: string, sub: string): HTMLElement {
  return el.shadowRoot!.querySelector(`[aria-label="${family} ${sub} avatar"]`) as HTMLElement;
}

function professionPills(el: AvatarStepEl): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll('.profession-pills [role="option"]'));
}

describe('entry-point consistency', () => {
  let el: AvatarStepEl;

  beforeEach(() => {
    el = document.createElement('avatar-step') as AvatarStepEl;
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  // ── Facet-driven exploration ──

  describe('first facet selection auto-selects best profession', () => {
    it('selecting MBTI from clean state auto-selects profession and role', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      await el.updateComplete;
      expect(el._profession).toBeTruthy();
      expect(el._selectedRole).toBeTruthy();
    });

    it('selecting Enneagram from clean state auto-selects profession', async () => {
      await el.updateComplete;
      clickPill(el, 'enneagram', 'Type 7');
      await el.updateComplete;
      await el.updateComplete;
      expect(el._profession).toBeTruthy();
    });

    it('switching facet value clears stale profession when archetype was selected', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      // Select an archetype within context
      const cell = archetypeCell(el, 'Jester', 'Entertainer');
      cell.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      await el.updateComplete;
      await el.updateComplete;
      expect(el._selectedArchetype).toBe('Jester/Entertainer');
      // Switch to INTJ — clears everything
      clickPill(el, 'mbti', 'INTJ');
      await el.updateComplete;
      await el.updateComplete;
      // After clearing, should auto-select best profession for INTJ
      expect(el._selectedArchetype).toBeNull();
      expect(el._profession).toBeTruthy();
    });

    it('switching facet without archetype re-auto-selects profession for new type', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'INTJ');
      await el.updateComplete;
      await el.updateComplete;
      const intjProf = el._profession;
      const intjRole = el._selectedRole;
      expect(intjProf).toBeTruthy();
      // Switch to ESFP — no archetype selected, just auto-profession
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      await el.updateComplete;
      // Profession should change to best match for ESFP
      expect(el._profession).toBeTruthy();
      expect(el._profession !== intjProf || el._selectedRole !== intjRole).toBe(true);
    });
  });

  describe('facet filter highlights compatible professions', () => {
    it('ESFP highlights compatible professions (selected or has-compatible)', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      await el.updateComplete;
      const pills = professionPills(el);
      const highlighted = pills.filter(p =>
        p.classList.contains('has-compatible') || p.getAttribute('aria-selected') === 'true'
      );
      expect(highlighted.length).toBeGreaterThan(1);
    });

    it('clearing facet removes compatible highlights', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFP'); // toggle off
      await el.updateComplete;
      await el.updateComplete;
      const pills = professionPills(el);
      const compatible = pills.filter(p => p.classList.contains('has-compatible'));
      expect(compatible.length).toBe(0);
    });
  });

  // ── Grid tier consistency ──

  describe('grid shows tiers from facet filters', () => {
    it('ESFP-compatible archetypes have strong or weak tier class', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      await el.updateComplete;
      // Check that at least some cells have strong or weak tier
      const cells = el.shadowRoot!.querySelectorAll('.avatar-cell');
      const compatible = Array.from(cells).filter(c =>
        c.classList.contains('strong') || c.classList.contains('weak')
      );
      expect(compatible.length).toBeGreaterThan(0);
    });

    it('ESFP-incompatible archetypes have incompatible tier', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      await el.updateComplete;
      // Sage/Scientist has INTJ affinity — should be incompatible with ESFP
      const scientist = archetypeCell(el, 'Magician', 'Scientist');
      expect(scientist.classList.contains('incompatible')).toBe(true);
    });

    it('all 48 cells remain visible (no compact hiding)', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      await el.updateComplete;
      const cells = el.shadowRoot!.querySelectorAll('.avatar-cell');
      expect(cells.length).toBe(48);
    });
  });

  // ── Compatible cell click keeps filter context ──

  describe('clicking compatible cell within facet context', () => {
    it('selects archetype without changing framework filters', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      await el.updateComplete;
      const before = { ...el._frameworks };
      // Click a compatible archetype
      const entertainer = archetypeCell(el, 'Jester', 'Entertainer');
      entertainer.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      await el.updateComplete;
      await el.updateComplete;
      expect(el._selectedArchetype).toBe('Jester/Entertainer');
      expect(el._frameworks).toEqual(before);
    });

    it('auto-selects matching profession for the chosen archetype', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      clickArchetype(el, 'Jester', 'Entertainer');
      await el.updateComplete;
      await el.updateComplete;
      expect(el._profession).toBeTruthy();
    });
  });

  // ── Incompatible cell click resets ──

  describe('clicking incompatible cell resets filters', () => {
    it('resets frameworks and selects the archetype', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      await el.updateComplete;
      // Find an incompatible cell and click it
      const scientist = archetypeCell(el, 'Magician', 'Scientist');
      scientist.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      await el.updateComplete;
      await el.updateComplete;
      expect(el._selectedArchetype).toBe('Magician/Scientist');
      // Frameworks should be reset and then filled from the archetype
      expect(el._frameworks.mbti).not.toBe('ESFP');
    });
  });

  // ── Switching to incompatible facet clears stale state ──

  describe('switching to incompatible facet clears stale profession/archetype', () => {
    it('changing MBTI clears incompatible archetype selection', async () => {
      await el.updateComplete;
      // Select ESFJ and an archetype
      clickPill(el, 'mbti', 'ESFJ');
      await el.updateComplete;
      clickArchetype(el, 'Caregiver', 'Healer');
      await el.updateComplete;
      await el.updateComplete;
      expect(el._selectedArchetype).toBe('Caregiver/Healer');
      expect(el._profession).toBeTruthy();
      // Switch to INTJ — Healer is incompatible with INTJ
      clickPill(el, 'mbti', 'INTJ');
      await el.updateComplete;
      await el.updateComplete;
      expect(el._selectedArchetype).toBeNull();
    });

    it('changing MBTI replaces profession/role with best match for new type', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFJ');
      await el.updateComplete;
      clickArchetype(el, 'Caregiver', 'Healer');
      await el.updateComplete;
      await el.updateComplete;
      const oldProfession = el._profession;
      const oldRole = el._selectedRole;
      expect(oldRole).toBeTruthy();
      // Switch to INTJ — clears archetype, auto-selects best profession for INTJ
      clickPill(el, 'mbti', 'INTJ');
      await el.updateComplete;
      await el.updateComplete;
      expect(el._selectedArchetype).toBeNull();
      // New profession/role should be for INTJ, not the old ESFJ context
      expect(el._profession).toBeTruthy();
      expect(el._selectedRole).toBeTruthy();
    });

    it('variant cards are not shown for stale profession after facet change', async () => {
      await el.updateComplete;
      clickPill(el, 'mbti', 'ESFJ');
      await el.updateComplete;
      clickArchetype(el, 'Caregiver', 'Healer');
      await el.updateComplete;
      await el.updateComplete;
      // Should have variant cards now
      const variantsBefore = el.shadowRoot!.querySelectorAll('.variant-card');
      expect(variantsBefore.length).toBeGreaterThan(0);
      // Switch to INTJ
      clickPill(el, 'mbti', 'INTJ');
      await el.updateComplete;
      await el.updateComplete;
      // Variant cards should clear if profession cleared
      if (!el._profession) {
        const variantsAfter = el.shadowRoot!.querySelectorAll('.variant-card');
        expect(variantsAfter.length).toBe(0);
      }
    });
  });

  // ── External archetype with profession syncs correctly ──

  describe('external archetype with profession navigates to correct role', () => {
    it('syncs to profession from externalProfile when available', async () => {
      await el.updateComplete;
      (el as any).externalProfile = {
        profession: 'Coaching',
        role: 'Life Coach',
        mbti: 'ENFJ',
        enneagram: 'Type 1',
        disc: 'C',
        sdi: 'Green',
      };
      (el as any).externalArchetype = { family: 'Sage', subArchetype: 'Mentor' };
      await el.updateComplete;
      await el.updateComplete;
      expect(el._selectedArchetype).toBe('Sage/Mentor');
      expect(el._profession).toBe('Coaching');
      expect(el._selectedRole).toBe('Life Coach');
    });
  });

  // ── Facet click after external archetype doesn't reset everything ──

  describe('facet click after external archetype auto-selects new profession', () => {
    it('clicking ESFP after external Sage/Mentor selects new profession', async () => {
      await el.updateComplete;
      (el as any).externalProfile = {
        profession: 'Coaching',
        role: 'Life Coach',
        mbti: 'ENFJ',
      };
      (el as any).externalArchetype = { family: 'Sage', subArchetype: 'Mentor' };
      await el.updateComplete;
      await el.updateComplete;
      expect(el._selectedArchetype).toBe('Sage/Mentor');
      expect(el._profession).toBe('Coaching');
      // Now click ESFP — should clear Sage/Mentor and auto-select new profession
      clickPill(el, 'mbti', 'ESFP');
      await el.updateComplete;
      await el.updateComplete;
      expect(el._frameworks.mbti).toBe('ESFP');
      expect(el._selectedArchetype).toBeNull();
      expect(el._profession).toBeTruthy();
    });
  });

  // ── Avatar click without filters (existing behavior preserved) ──

  describe('avatar click without facet filters auto-fills frameworks', () => {
    it('fills MBTI from archetype profile', async () => {
      await el.updateComplete;
      clickArchetype(el, 'Hero', 'Warrior');
      await el.updateComplete;
      await el.updateComplete;
      expect(el._frameworks.mbti).toBeTruthy();
    });

    it('auto-selects a matching profession', async () => {
      await el.updateComplete;
      clickArchetype(el, 'Hero', 'Warrior');
      await el.updateComplete;
      await el.updateComplete;
      expect(el._profession).toBeTruthy();
    });
  });
});
