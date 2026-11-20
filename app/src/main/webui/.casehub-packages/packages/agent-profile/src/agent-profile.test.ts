import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './agent-profile.js';
import type { FullAgentDescriptor } from '@casehubio/mosaic-core';

const SAMPLE_DESCRIPTOR: FullAgentDescriptor = {
  agentId: 'agent-test-01',
  name: 'Test Support Agent',
  tenancyId: 'tenant-1',
  archetypeFamily: 'Sage',
  subArchetype: 'Detective',
  description: 'You are a customer support specialist focused on resolving issues efficiently.',
  profession: 'Support',
  role: 'Agent',
  preferredAlias: 'claude-sonnet-5',
  personality: {
    profession: 'Support',
    role: 'Agent',
    mbti: 'INTJ',
    enneagram: '5w6',
    disc: 'CD',
    belbin: { primary: 'Monitor Evaluator', secondaries: ['Implementer'] },
    sdi: 'Blue-Green',
    bigFive: { O: 'high', C: 'high', E: 'low', A: 'high', N: 'low' },
  },
};

type ProfileEl = HTMLElement & {
  descriptor?: FullAgentDescriptor;
  updateComplete: Promise<boolean>;
};

describe('agent-profile', () => {
  let el: ProfileEl;

  beforeEach(() => {
    el = document.createElement('agent-profile') as ProfileEl;
    el.descriptor = SAMPLE_DESCRIPTOR;
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  it('has ARIA role=region and aria-label including agent name', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toContain('Test Support Agent');
  });

  it('renders header with name and avatar', async () => {
    await el.updateComplete;
    const name = el.shadowRoot!.querySelector('.profile-name');
    expect(name?.textContent?.trim()).toBe('Test Support Agent');
    const avatar = el.shadowRoot!.querySelector('agent-avatar');
    expect(avatar).toBeTruthy();
  });

  it('renders archetype and profession badges', async () => {
    await el.updateComplete;
    const archBadge = el.shadowRoot!.querySelector('.badge-archetype');
    const profBadge = el.shadowRoot!.querySelector('.badge-profession');
    expect(archBadge?.textContent?.trim()).toBe('Sage/Detective');
    expect(profBadge?.textContent?.trim()).toBe('Support');
  });

  it('renders personality framework pills', async () => {
    await el.updateComplete;
    const pills = el.shadowRoot!.querySelectorAll('.framework-pill');
    expect(pills.length).toBeGreaterThanOrEqual(4);
    const texts = Array.from(pills).map(p => p.textContent?.trim());
    expect(texts.some(t => t?.includes('MBTI'))).toBe(true);
    expect(texts.some(t => t?.includes('INTJ'))).toBe(true);
  });

  it('renders disposition radar SVG', async () => {
    await el.updateComplete;
    const svg = el.shadowRoot!.querySelector('.radar-chart svg');
    expect(svg).toBeTruthy();
    const polygon = svg!.querySelector('polygon.radar-shape');
    expect(polygon).toBeTruthy();
  });

  it('renders per-axis disposition rows', async () => {
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.axis-row');
    expect(rows.length).toBe(5);
  });

  it('renders description text', async () => {
    await el.updateComplete;
    const desc = el.shadowRoot!.querySelector('.description-text');
    expect(desc?.textContent).toContain('customer support specialist');
  });

  it('edit button toggles inline edit mode', async () => {
    await el.updateComplete;
    const editBtn = el.shadowRoot!.querySelector('.edit-toggle') as HTMLElement;
    expect(editBtn).toBeTruthy();
    editBtn.click();
    await el.updateComplete;
    const editForm = el.shadowRoot!.querySelector('.edit-mode');
    expect(editForm).toBeTruthy();
  });

  it('emits agent:updated on save in edit mode', async () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler as EventListener);
    await el.updateComplete;

    const editBtn = el.shadowRoot!.querySelector('.edit-toggle') as HTMLElement;
    editBtn.click();
    await el.updateComplete;

    const saveBtn = el.shadowRoot!.querySelector('.btn-save') as HTMLElement;
    expect(saveBtn).toBeTruthy();
    saveBtn.click();

    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('agent:updated');
    expect(detail.payload.agentId).toBe('agent-test-01');
  });

  it('handles missing descriptor gracefully', async () => {
    const empty = document.createElement('agent-profile') as ProfileEl;
    document.body.appendChild(empty);
    await empty.updateComplete;
    const name = empty.shadowRoot!.querySelector('.profile-name');
    expect(name).toBeNull();
    empty.remove();
  });
});
