import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { registerCollection, mythicCollection, chibiCollection, simpsonsCollection, neonCollection } from '@casehubio/mosaic-agent-avatar-2d';
import './avatar-step.js';

type AvatarStepEl = HTMLElement & {
  updateComplete: Promise<boolean>;
  _frameworks: Record<string, string>;
  _bigFive: Record<string, string>;
  _collection: string;
  _selectedArchetype: string | null;
  _profession: string | null;
};

beforeAll(() => {
  registerCollection(mythicCollection);
  registerCollection(chibiCollection);
  registerCollection(simpsonsCollection);
  registerCollection(neonCollection);
});

describe('avatar-step integration', () => {
  let el: AvatarStepEl;

  beforeEach(() => {
    el = document.createElement('avatar-step') as AvatarStepEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('shows collection bar when multiple collections registered', async () => {
    await el.updateComplete;
    const radios = el.shadowRoot!.querySelectorAll('[role="radio"]');
    const collectionRadios = el.shadowRoot!.querySelectorAll('.collection-btn');
    expect(collectionRadios.length).toBe(4);
  });

  it('filters grid when personality framework selected', async () => {
    await el.updateComplete;

    // Click MBTI INTJ pill in personality sidebar
    const intjPill = el.shadowRoot!.querySelector('[data-framework="mbti"][data-value="INTJ"]') as HTMLElement;
    intjPill.click();
    await el.updateComplete;

    // INTJ → Sage, Magician, Sovereign = 12 compatible archetypes
    const active = el.shadowRoot!.querySelectorAll('.avatar-cell:not(.incompatible)');
    const disabled = el.shadowRoot!.querySelectorAll('.avatar-cell.incompatible');
    expect(active.length).toBe(12);
    expect(disabled.length).toBe(36);
  });

  it('profession preset shows variants and selects archetype', async () => {
    await el.updateComplete;

    let selectedDetail: Record<string, unknown> | undefined;
    el.addEventListener('avatar:archetype:selected', ((e: CustomEvent) => {
      selectedDetail = e.detail;
    }) as EventListener);

    // Select Software profession via internal state
    el._profession = 'Software';
    await el.updateComplete;

    // Click "Architect" role pill to expand variants
    const pills = el.shadowRoot!.querySelectorAll('.role-pills .pill');
    const architectPill = [...pills].find(p => p.textContent?.trim() === 'Architect') as HTMLElement;
    expect(architectPill).toBeTruthy();
    architectPill.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await el.updateComplete;

    // Should show variant buttons
    const variantBtns = el.shadowRoot!.querySelectorAll('.variant-card');
    expect(variantBtns.length).toBeGreaterThanOrEqual(2);

    // Click first variant
    variantBtns[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(selectedDetail).toBeDefined();
    expect(selectedDetail!.archetype).toBeDefined();
  });

  it('switching collection updates avatar rendering', async () => {
    await el.updateComplete;

    // Select an archetype first
    const cell = el.shadowRoot!.querySelector('.avatar-cell:not(.incompatible)') as HTMLElement;
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await el.updateComplete;

    // Switch to chibi
    const chibiBtn = [...el.shadowRoot!.querySelectorAll('.collection-btn')]
      .find(b => b.textContent?.trim() === 'Chibi') as HTMLElement;
    chibiBtn?.click();
    await el.updateComplete;

    expect(el._collection).toBe('chibi');
  });

  it('reset clears all personality filters', async () => {
    await el.updateComplete;

    // Select MBTI in personality sidebar
    const intjPill = el.shadowRoot!.querySelector('[data-framework="mbti"][data-value="INTJ"]') as HTMLElement;
    intjPill.click();
    await el.updateComplete;

    // Verify filter active
    let disabled = el.shadowRoot!.querySelectorAll('.avatar-cell.incompatible');
    expect(disabled.length).toBe(36);

    // Reset
    const resetBtn = el.shadowRoot!.querySelector('.reset-btn') as HTMLElement;
    resetBtn.click();
    await el.updateComplete;

    // All 48 should be active again
    disabled = el.shadowRoot!.querySelectorAll('.avatar-cell.incompatible');
    expect(disabled.length).toBe(0);
  });
});
