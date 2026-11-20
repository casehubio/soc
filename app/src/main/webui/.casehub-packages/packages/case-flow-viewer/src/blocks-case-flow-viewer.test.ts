// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { BlocksCaseFlowViewer } from './blocks-case-flow-viewer.js';

describe('BlocksCaseFlowViewer', () => {
  it('can be instantiated', () => {
    const el = new BlocksCaseFlowViewer();
    expect(el).toBeDefined();
  });

  it('sets readonly to true on connect', () => {
    const el = new BlocksCaseFlowViewer();
    document.body.appendChild(el);
    expect(el.readonly).toBe(true);
    el.remove();
  });

  it('defaults runtimeState to null', () => {
    const el = new BlocksCaseFlowViewer();
    expect(el.runtimeState).toBeNull();
  });

  it('defaults selectionTopic to empty', () => {
    const el = new BlocksCaseFlowViewer();
    expect(el.selectionTopic).toBe('');
  });

  it('accepts runtimeState property', () => {
    const el = new BlocksCaseFlowViewer();
    el.runtimeState = {
      planItems: [], milestones: [], timestamp: '2026-09-02T10:00:00Z',
    };
    expect(el.runtimeState).toBeDefined();
  });

  it('sets aria-label on connect', () => {
    const el = new BlocksCaseFlowViewer();
    document.body.appendChild(el);
    expect(el.getAttribute('aria-label')).toBe('Case flow viewer');
    expect(el.getAttribute('role')).toBe('region');
    el.remove();
  });
});

describe('parallel groups', () => {
  it('maps parallelGroups to layout partition options', () => {
    const el = new BlocksCaseFlowViewer();
    el.runtimeState = {
      planItems: [],
      milestones: [],
      timestamp: '2026-09-02T10:00:00Z',
      parallelGroups: [['extract-text', 'classify'], ['validate']],
    };
    const opts = (el as any)._layoutOptions();
    expect(opts.partitions).toBeDefined();
    expect(opts.partitions.get('binding:extract-text')).toBe(0);
    expect(opts.partitions.get('binding:classify')).toBe(0);
    expect(opts.partitions.get('binding:validate')).toBe(1);
  });

  it('returns no partitions when parallelGroups is absent', () => {
    const el = new BlocksCaseFlowViewer();
    el.runtimeState = {
      planItems: [], milestones: [], timestamp: '2026-09-02T10:00:00Z',
    };
    const opts = (el as any)._layoutOptions();
    expect(opts.partitions).toBeUndefined();
  });

  it('returns no partitions when runtimeState is null', () => {
    const el = new BlocksCaseFlowViewer();
    const opts = (el as any)._layoutOptions();
    expect(opts.partitions).toBeUndefined();
  });
});
