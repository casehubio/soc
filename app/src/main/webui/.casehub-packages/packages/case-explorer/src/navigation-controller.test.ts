import { describe, it, expect, beforeEach } from 'vitest';
import { NavigationController } from './navigation-controller.js';
import type { EntityTypeRegistration, EntityEvent } from './types.js';
import { columnId } from '@casehubio/pages-data';

describe('NavigationController', () => {
  const caseType: EntityTypeRegistration = {
    type: 'case-instance',
    label: 'Cases',
    listEndpoint: '/api/cases',
    detailEndpoint: (id) => `/api/cases/${id}`,
    columnConfig: [{ id: columnId('summary'), label: 'Name' }],
  };

  const workerType: EntityTypeRegistration = {
    type: 'worker',
    label: 'Workers',
    listEndpoint: '/api/workers',
    detailEndpoint: (id) => `/api/workers/${id}`,
    columnConfig: [{ id: columnId('summary'), label: 'Name' }],
  };

  let updateCount: number;
  let mockHost: { addController: () => void; requestUpdate: () => void; removeController: () => void };

  beforeEach(() => {
    updateCount = 0;
    mockHost = {
      addController: () => {},
      requestUpdate: () => { updateCount++; },
      removeController: () => {},
    };
  });

  function create(types: readonly EntityTypeRegistration[] = [caseType, workerType]) {
    return new NavigationController(mockHost as any, types);
  }

  it('initial state: first entity type selected, list mode, empty breadcrumbs', () => {
    const nav = create();
    expect(nav.state.currentEntityType).toBe('case-instance');
    expect(nav.state.viewMode).toBe('list');
    expect(nav.state.breadcrumbs.length).toBe(0);
    expect(nav.state.selectedEntityId).toBeNull();
  });

  it('selectEntityType switches type and resets selection and breadcrumbs', () => {
    const nav = create();
    nav.selectEntity({ id: 'c1', type: 'case-instance' });
    nav.selectEntityType('worker');

    expect(nav.state.currentEntityType).toBe('worker');
    expect(nav.state.selectedEntityId).toBeNull();
    expect(nav.state.breadcrumbs.length).toBe(0);
  });

  it('selectEntity sets selectedEntityId', () => {
    const nav = create();
    nav.selectEntity({ id: 'c1', type: 'case-instance' });

    expect(nav.state.selectedEntityId).toBe('c1');
  });

  it('drillDown pushes breadcrumb and switches type and selection', () => {
    const nav = create();
    nav.selectEntity({ id: 'c1', type: 'case-instance' });
    nav.drillDown('worker', 'w1', 'Worker lint');

    expect(nav.state.currentEntityType).toBe('worker');
    expect(nav.state.selectedEntityId).toBe('w1');
    expect(nav.state.breadcrumbs.length).toBe(1);
    expect(nav.state.breadcrumbs[0]!.entityType).toBe('case-instance');
    expect(nav.state.breadcrumbs[0]!.entityId).toBe('c1');
    expect(nav.state.breadcrumbs[0]!.label).toBe('Cases');
  });

  it('navigateBack pops breadcrumbs to given index', () => {
    const nav = create();
    nav.selectEntity({ id: 'c1', type: 'case-instance' });
    nav.drillDown('worker', 'w1', 'Worker lint');
    nav.drillDown('case-instance', 'sc1', 'Sub-case A');

    expect(nav.state.breadcrumbs.length).toBe(2);

    nav.navigateBack(0);

    expect(nav.state.currentEntityType).toBe('case-instance');
    expect(nav.state.selectedEntityId).toBe('c1');
    expect(nav.state.breadcrumbs.length).toBe(0);
  });

  it('setViewMode switches between list and tree', () => {
    const nav = create();
    expect(nav.state.viewMode).toBe('list');

    nav.setViewMode('tree');
    expect(nav.state.viewMode).toBe('tree');

    nav.setViewMode('list');
    expect(nav.state.viewMode).toBe('list');
  });

  it('handleEntityEvent returns true when event matches selected entity', () => {
    const nav = create();
    nav.selectEntity({ id: 'c1', type: 'case-instance' });

    const event: EntityEvent = {
      entityType: 'case-instance',
      entityId: 'c1',
      eventType: 'state-changed',
      timestamp: '2026-01-01T00:00:00Z',
    };

    expect(nav.handleEntityEvent(event)).toBe(true);
  });

  it('handleEntityEvent returns false when event does not match', () => {
    const nav = create();
    nav.selectEntity({ id: 'c1', type: 'case-instance' });

    const event: EntityEvent = {
      entityType: 'case-instance',
      entityId: 'c2',
      eventType: 'state-changed',
      timestamp: '2026-01-01T00:00:00Z',
    };

    expect(nav.handleEntityEvent(event)).toBe(false);
  });

  it('multi-level drill-down builds correct breadcrumb trail', () => {
    const nav = create();
    nav.selectEntity({ id: 'c1', type: 'case-instance' });
    nav.drillDown('worker', 'w1', 'Worker lint');
    nav.drillDown('case-instance', 'sc1', 'Sub-case A');

    expect(nav.state.breadcrumbs.length).toBe(2);
    expect(nav.state.breadcrumbs[0]!.entityType).toBe('case-instance');
    expect(nav.state.breadcrumbs[0]!.entityId).toBe('c1');
    expect(nav.state.breadcrumbs[1]!.entityType).toBe('worker');
    expect(nav.state.breadcrumbs[1]!.entityId).toBe('w1');
    expect(nav.state.currentEntityType).toBe('case-instance');
    expect(nav.state.selectedEntityId).toBe('sc1');
  });

  it('getRegistration returns the registration for a type', () => {
    const nav = create();
    expect(nav.getRegistration('case-instance')).toBe(caseType);
    expect(nav.getRegistration('worker')).toBe(workerType);
    expect(nav.getRegistration('unknown')).toBeUndefined();
  });

  it('each mutation triggers host requestUpdate', () => {
    const nav = create();
    updateCount = 0;

    nav.selectEntity({ id: 'c1', type: 'case-instance' });
    expect(updateCount).toBe(1);

    nav.selectEntityType('worker');
    expect(updateCount).toBe(2);

    nav.setViewMode('tree');
    expect(updateCount).toBe(3);
  });
});
