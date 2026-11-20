import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { WorkItemResponse } from '@casehubio/mosaic-core';
import './human-work-item-card.js';
import type { HumanWorkItemCard } from './human-work-item-card.js';

function makeItem(overrides: Partial<WorkItemResponse> = {}): WorkItemResponse {
  return {
    id: 'wi-001',
    title: 'Review compliance report',
    description: null,
    types: [],
    category: 'review',
    formKey: null,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigneeId: 'jsmith',
    owner: null,
    candidateGroups: null,
    candidateUsers: null,
    requiredCapabilities: null,
    createdBy: null,
    delegationDeclineTarget: null,
    delegationChain: null,
    priorStatus: null,
    payload: null,
    resolution: null,
    claimDeadline: null,
    expiresAt: null,
    followUpDate: null,
    createdAt: '2026-10-28T10:00:00Z',
    updatedAt: '2026-10-28T12:00:00Z',
    assignedAt: '2026-10-28T10:30:00Z',
    startedAt: '2026-10-28T11:00:00Z',
    completedAt: null,
    suspendedAt: null,
    labels: [],
    confidenceScore: null,
    callerRef: null,
    version: 1,
    templateId: null,
    outcome: null,
    permittedOutcomes: null,
    inputDataSchema: null,
    outputDataSchema: null,
    excludedUsers: null,
    scope: null,
    percentComplete: null,
    statusNote: null,
    ...overrides,
  };
}

describe('human-work-item-card', () => {
  let el: HumanWorkItemCard;

  beforeEach(async () => {
    el = document.createElement('human-work-item-card') as HumanWorkItemCard;
    el.item = makeItem();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('renders title', () => {
    expect(el.shadowRoot!.querySelector('.title')?.textContent?.trim())
      .toBe('Review compliance report');
  });

  it('renders human icon', () => {
    expect(el.shadowRoot!.querySelector('.icon')?.textContent?.trim())
      .toBe('👤');
  });

  it('renders assignee', () => {
    expect(el.shadowRoot!.querySelector('.assignee')?.textContent)
      .toContain('jsmith');
  });

  it('shows Unassigned when assigneeId is null', async () => {
    el.item = makeItem({ assigneeId: null });
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.assignee')?.textContent)
      .toContain('Unassigned');
  });

  it('renders status pill with correct label', () => {
    const pill = el.shadowRoot!.querySelector('.status-pill');
    expect(pill?.textContent?.trim()).toBe('In Progress');
  });

  it('renders all status values', async () => {
    const statuses = [
      ['PENDING', 'Pending'], ['ASSIGNED', 'Assigned'],
      ['IN_PROGRESS', 'In Progress'], ['COMPLETED', 'Completed'],
      ['SUSPENDED', 'Suspended'], ['DELEGATED', 'Delegated'],
      ['CANCELLED', 'Cancelled'], ['EXPIRED', 'Expired'],
      ['ESCALATED', 'Escalated'], ['REJECTED', 'Rejected'],
      ['FAULTED', 'Faulted'], ['OBSOLETE', 'Obsolete'],
    ] as const;
    for (const [value, label] of statuses) {
      el.item = makeItem({ status: value });
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.status-pill')?.textContent?.trim())
        .toBe(label);
    }
  });

  it('renders priority badge', () => {
    const badge = el.shadowRoot!.querySelector('.priority-badge');
    expect(badge?.textContent?.trim()).toBe('HIGH');
    expect(badge?.classList.contains('high')).toBe(true);
  });

  it('renders sla-indicator when expiresAt is set', async () => {
    el.item = makeItem({ expiresAt: '2026-10-29T18:00:00Z' });
    await el.updateComplete;
    const sla = el.shadowRoot!.querySelector('agency-sla-indicator');
    expect(sla).not.toBeNull();
    expect(sla?.getAttribute('deadline')).toBe('2026-10-29T18:00:00Z');
  });

  it('uses claimDeadline as fallback when expiresAt is null', async () => {
    el.item = makeItem({ expiresAt: null, claimDeadline: '2026-10-29T12:00:00Z' });
    await el.updateComplete;
    const sla = el.shadowRoot!.querySelector('agency-sla-indicator');
    expect(sla).not.toBeNull();
    expect(sla?.getAttribute('deadline')).toBe('2026-10-29T12:00:00Z');
  });

  it('hides sla-indicator when no deadline', () => {
    expect(el.shadowRoot!.querySelector('agency-sla-indicator')).toBeNull();
  });

  it('shows progress bar when percentComplete is set', async () => {
    el.item = makeItem({ percentComplete: 80 });
    await el.updateComplete;
    const bar = el.shadowRoot!.querySelector('.progress-bar');
    expect(bar).not.toBeNull();
  });

  it('hides progress bar when percentComplete is null', () => {
    expect(el.shadowRoot!.querySelector('.progress-bar')).toBeNull();
  });

  it('emits work-item:select on click', async () => {
    let detail: any = null;
    el.addEventListener('work-item:select', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });
    el.shadowRoot!.querySelector('.card')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(detail).toEqual({ workItemId: 'wi-001' });
  });

  it('emits work-item:select on Enter key', async () => {
    let detail: any = null;
    el.addEventListener('work-item:select', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });
    el.shadowRoot!.querySelector('.card')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    expect(detail).toEqual({ workItemId: 'wi-001' });
  });

  it('emits work-item:select on Space key', async () => {
    let detail: any = null;
    el.addEventListener('work-item:select', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });
    el.shadowRoot!.querySelector('.card')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    );
    expect(detail).toEqual({ workItemId: 'wi-001' });
  });

  it('has ARIA role article', () => {
    expect(el.getAttribute('role')).toBe('article');
  });

  it('has ARIA label with title and status', () => {
    expect(el.getAttribute('aria-label'))
      .toBe('Work item: Review compliance report, In Progress, priority HIGH');
  });

  it('card has tabindex 0', () => {
    expect(el.shadowRoot!.querySelector('.card')?.getAttribute('tabindex')).toBe('0');
  });

  it('sets data-sla-breached on breach event', () => {
    el.dispatchEvent(new CustomEvent('sla.state-changed', {
      detail: { state: 'breached' },
    }));
    expect(el.hasAttribute('data-sla-breached')).toBe(true);
  });

  it('removes data-sla-breached when state returns to normal', () => {
    el.dispatchEvent(new CustomEvent('sla.state-changed', {
      detail: { state: 'breached' },
    }));
    el.dispatchEvent(new CustomEvent('sla.state-changed', {
      detail: { state: 'normal' },
    }));
    expect(el.hasAttribute('data-sla-breached')).toBe(false);
  });
});
