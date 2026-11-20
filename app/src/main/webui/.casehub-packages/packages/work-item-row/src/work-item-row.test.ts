import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { WorkItemResponse } from '@casehubio/mosaic-core';
import './work-item-row.js';

const mockItem: WorkItemResponse = {
  id: 'wi-001',
  title: 'Review AML alert #1234',
  description: null,
  types: ['compliance'],
  category: 'compliance',
  formKey: null,
  status: 'PENDING',
  priority: 'HIGH',
  assigneeId: null,
  owner: null,
  candidateGroups: 'compliance-officers',
  candidateUsers: null,
  requiredCapabilities: null,
  createdBy: 'system',
  delegationDeclineTarget: null,
  delegationChain: null,
  priorStatus: null,
  payload: null,
  resolution: null,
  claimDeadline: null,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  followUpDate: null,
  createdAt: new Date(Date.now() - 7200000).toISOString(),
  updatedAt: new Date().toISOString(),
  assignedAt: null,
  startedAt: null,
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
};

describe('agency-work-item-row', () => {
  let el: HTMLElement & { item: WorkItemResponse };

  beforeEach(async () => {
    el = document.createElement('agency-work-item-row') as any;
    el.item = mockItem;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  });

  afterEach(() => el.remove());

  it('renders the title', () => {
    expect(el.shadowRoot!.textContent).toContain('Review AML alert #1234');
  });

  it('renders a status pill', () => {
    const pill = el.shadowRoot!.querySelector('.status-pill');
    expect(pill).toBeTruthy();
    expect(pill!.textContent!.trim()).toBe('PENDING');
  });

  it('renders priority border with correct class', () => {
    const row = el.shadowRoot!.querySelector('.row');
    expect(row!.classList.contains('priority-high')).toBe(true);
  });

  it('renders relative age', () => {
    expect(el.shadowRoot!.textContent).toContain('2h');
  });

  it('uses fixed grid columns for cross-row alignment', () => {
    // Each work-item-row is a separate shadow DOM — auto-sized grid columns
    // cannot align across rows. The grid must use fixed widths for status,
    // category, and age columns.
    const styles = el.shadowRoot!.querySelector('style')!.textContent!;
    const rowRule = styles.match(/\.row\s*\{[^}]*\}/);
    expect(rowRule).toBeTruthy();
    // Must NOT use 'auto' for columns — auto sizes independently per shadow root
    expect(rowRule![0]).not.toContain('auto');
    // Must use fixed pixel widths for the non-title columns
    expect(rowRule![0]).toMatch(/grid-template-columns.*\dpx.*\dpx.*\dpx/);
  });

  it('status pill renders IN_PROGRESS correctly', async () => {
    el.item = { ...mockItem, status: 'IN_PROGRESS' };
    await (el as any).updateComplete;
    const pill = el.shadowRoot!.querySelector('.status-pill');
    expect(pill!.textContent!.trim()).toBe('IN_PROGRESS');
  });
});
