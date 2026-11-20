import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@casehubio/mosaic-core'; // Ensure schema-form is registered
import './work-item-detail.js';
import type { WorkItemDetail } from './work-item-detail.js';
import type { WorkItemResponse, WorkIdentity } from '@casehubio/mosaic-core';

describe('WorkItemDetail', () => {
  let element: WorkItemDetail;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    element = document.createElement('agency-work-item-detail') as WorkItemDetail;
    container.appendChild(element);
  });

  afterEach(() => {
    container.remove();
  });

  const mockIdentity: WorkIdentity = {
    userId: 'user-1',
    displayName: 'Test User',
    groups: ['group-1'],
  };

  const createMockWorkItem = (status: string = 'PENDING'): WorkItemResponse => ({
    id: 'wi-1',
    title: 'Test Work Item',
    description: 'Test description',
    types: ['test'],
    category: 'test',
    formKey: null,
    status: status as any,
    priority: 'MEDIUM',
    assigneeId: null,
    owner: 'user-1',
    candidateGroups: 'group-1',
    candidateUsers: null,
    requiredCapabilities: null,
    createdBy: 'user-1',
    delegationDeclineTarget: null,
    delegationChain: null,
    priorStatus: null,
    payload: null,
    resolution: null,
    claimDeadline: null,
    expiresAt: null,
    followUpDate: null,
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-07-01T10:00:00Z',
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
  });

  describe('Empty state', () => {
    it('should show empty state when no workItemId is provided', async () => {
      element.identity = mockIdentity;
      element.endpoint = 'http://localhost:8080';
      await element.updateComplete;

      const emptyState = element.shadowRoot?.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain('Select a work item');
    });
  });

  describe('PENDING status actions', () => {
    it('should show Claim and Escalate actions for PENDING status', async () => {
      const workItem = createMockWorkItem('PENDING');
      element.identity = mockIdentity;
      element.data = workItem;
      await element.updateComplete;

      // Debug
      console.log('element.data:', element.data?.status);
      console.log('element._loading:', (element as any)._loading);
      console.log('element._error:', (element as any)._error);

      // Give the action bar child component time to render
      const actionBar = element.shadowRoot?.querySelector('agency-detail-action-bar') as any;
      expect(actionBar).toBeTruthy();
      await actionBar?.updateComplete;

      const actions = actionBar?.shadowRoot?.querySelectorAll('button');
      const actionTexts = Array.from(actions || []).map((btn) => (btn as HTMLElement).textContent?.trim());
      expect(actionTexts).toContain('Claim');
      expect(actionTexts).toContain('Escalate');
    });
  });

  describe('ASSIGNED status actions', () => {
    it('should show Start, Release, Delegate, Escalate for ASSIGNED status', async () => {
      const workItem = { ...createMockWorkItem('ASSIGNED'), assigneeId: 'user-1' };
      element.identity = mockIdentity;
      element.data = workItem;
      await element.updateComplete;

      const actionBar = element.shadowRoot?.querySelector('agency-detail-action-bar') as any;
      await actionBar?.updateComplete;

      const actions = actionBar?.shadowRoot?.querySelectorAll('button');
      const actionTexts = Array.from(actions || []).map((btn) => (btn as HTMLElement).textContent?.trim());
      expect(actionTexts).toContain('Start');
      expect(actionTexts).toContain('Release');
      expect(actionTexts).toContain('Delegate');
      expect(actionTexts).toContain('Escalate');
    });
  });

  describe('IN_PROGRESS status actions', () => {
    it('should show Complete, Reject, Suspend, Delegate, Escalate for IN_PROGRESS', async () => {
      const workItem = { ...createMockWorkItem('IN_PROGRESS'), assigneeId: 'user-1' };
      element.identity = mockIdentity;
      element.data = workItem;
      await element.updateComplete;

      const actionBar = element.shadowRoot?.querySelector('agency-detail-action-bar') as any;
      await actionBar?.updateComplete;

      const actions = actionBar?.shadowRoot?.querySelectorAll('button');
      const actionTexts = Array.from(actions || []).map((btn) => (btn as HTMLElement).textContent?.trim());
      expect(actionTexts).toContain('Complete');
      expect(actionTexts).toContain('Reject');
      expect(actionTexts).toContain('Suspend');
      expect(actionTexts).toContain('Delegate');
      expect(actionTexts).toContain('Escalate');
    });
  });

  describe('SUSPENDED status actions', () => {
    it('should show Resume, Cancel, Escalate for SUSPENDED', async () => {
      const workItem = { ...createMockWorkItem('SUSPENDED'), assigneeId: 'user-1' };
      element.identity = mockIdentity;
      element.data = workItem;
      await element.updateComplete;

      const actionBar = element.shadowRoot?.querySelector('agency-detail-action-bar') as any;
      await actionBar?.updateComplete;

      const actions = actionBar?.shadowRoot?.querySelectorAll('button');
      const actionTexts = Array.from(actions || []).map((btn) => (btn as HTMLElement).textContent?.trim());
      expect(actionTexts).toContain('Resume');
      expect(actionTexts).toContain('Cancel');
      expect(actionTexts).toContain('Escalate');
    });
  });

  describe('DELEGATED status actions', () => {
    it('should show Accept Delegation and Decline Delegation when user is delegation target', async () => {
      const workItem = { ...createMockWorkItem('DELEGATED'), assigneeId: 'user-1' }; // current user is delegation target
      element.identity = mockIdentity;
      element.data = workItem;
      await element.updateComplete;

      const actionBar = element.shadowRoot?.querySelector('agency-detail-action-bar') as any;
      await actionBar?.updateComplete;

      const actions = actionBar?.shadowRoot?.querySelectorAll('button');
      const actionTexts = Array.from(actions || []).map((btn) => (btn as HTMLElement).textContent?.trim());
      expect(actionTexts).toContain('Accept Delegation');
      expect(actionTexts).toContain('Decline Delegation');
    });
  });

  describe('Terminal status states', () => {
    ['COMPLETED', 'REJECTED', 'FAULTED', 'CANCELLED', 'EXPIRED', 'ESCALATED', 'OBSOLETE'].forEach(status => {
      it(`should show terminal banner and no actions for ${status}`, async () => {
        const workItem = createMockWorkItem(status);
        element.identity = mockIdentity;
        element.data = workItem;
        await element.updateComplete;

        const banner = element.shadowRoot?.querySelector('.terminal-banner');
        expect(banner).toBeTruthy();
        expect(banner?.textContent).toContain(status);

        const actionBar = element.shadowRoot?.querySelector('agency-detail-action-bar');
        expect(actionBar).toBeFalsy();
      });
    });
  });

  describe('DetailActionBar ARIA', () => {
    it('sets role="toolbar" and aria-label on connect', async () => {
      const workItem = createMockWorkItem('PENDING');
      element.identity = mockIdentity;
      element.data = workItem;
      await element.updateComplete;
      const actionBar = element.shadowRoot?.querySelector('agency-detail-action-bar');
      expect(actionBar?.getAttribute('role')).toBe('toolbar');
      expect(actionBar?.getAttribute('aria-label')).toBe('Work item actions');
    });
  });

  describe('Tabs', () => {
    it('should render three tabs: Overview, Activity, Relations', async () => {
      const workItem = createMockWorkItem('PENDING');
      element.identity = mockIdentity;
      element.data = workItem;
      await element.updateComplete;

      const tabs = element.shadowRoot?.querySelectorAll('[role="tab"]');
      expect(tabs?.length).toBe(3);

      const tabTexts = Array.from(tabs || []).map(tab => tab.textContent?.trim());
      expect(tabTexts).toContain('Overview');
      expect(tabTexts).toContain('Activity');
      expect(tabTexts).toContain('Relations');
    });

    it('should show overview tab by default', async () => {
      const workItem = createMockWorkItem('PENDING');
      element.identity = mockIdentity;
      element.data = workItem;
      await element.updateComplete;

      const overviewTab = element.shadowRoot?.querySelector('[role="tabpanel"][data-tab="overview"]');
      expect(overviewTab).toBeTruthy();
      expect(overviewTab?.hasAttribute('hidden')).toBe(false);
    });
  });

  describe('Sticky header', () => {
    it('should render sticky header with title, status pill, priority badge', async () => {
      const workItem = { ...createMockWorkItem('IN_PROGRESS'), priority: 'HIGH' as const };
      element.identity = mockIdentity;
      element.data = workItem;
      await element.updateComplete;

      const header = element.shadowRoot?.querySelector('.sticky-header');
      expect(header).toBeTruthy();

      const title = header?.querySelector('.title');
      expect(title?.textContent).toBe('Test Work Item');

      const statusPill = header?.querySelector('.status-pill');
      expect(statusPill?.textContent).toContain('IN_PROGRESS');

      const priorityBadge = header?.querySelector('.priority-badge');
      expect(priorityBadge?.textContent).toContain('HIGH');
    });
  });

  describe('Relations', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it('fetches and displays relations when work item loads', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/relations/incoming'))
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 'r2',
                sourceId: 'wi-other',
                targetId: 'wi-1',
                relationType: 'BLOCKS',
                createdBy: 'user1',
                createdAt: '2026-07-07T00:00:00Z'
              }
            ]
          });
        if (url.includes('/relations'))
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 'r1',
                sourceId: 'wi-1',
                targetId: 'wi-2',
                relationType: 'RELATES_TO',
                createdBy: 'user1',
                createdAt: '2026-07-07T00:00:00Z'
              }
            ]
          });
        if (url.includes('/workitems/wi-2'))
          return Promise.resolve({
            ok: true,
            json: async () => ({
              item: {
                id: 'wi-2',
                title: 'Related Item',
                status: 'ASSIGNED'
              }
            })
          });
        if (url.includes('/workitems/wi-other'))
          return Promise.resolve({
            ok: true,
            json: async () => ({
              item: {
                id: 'wi-other',
                title: 'Blocking Item',
                status: 'IN_PROGRESS'
              }
            })
          });
        if (url.includes('/events'))
          return Promise.resolve({ ok: true, json: async () => [] });
        return Promise.resolve({
          ok: true,
          json: async () => ({
            item: createMockWorkItem('PENDING')
          })
        });
      });

      element.endpoint = 'http://localhost';
      element.workItemId = 'wi-1';
      element.identity = mockIdentity;
      await element.updateComplete;
      await new Promise(r => setTimeout(r, 100));

      // Relations should be fetched
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/relations'));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/relations/incoming'));

      // Related item details should be fetched
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/workitems/wi-2'));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/workitems/wi-other'));
    });
  });
});
