import { describe, it, expect } from 'vitest';
import { applyOrgEdgeLabels } from './edge-labels.js';

interface TestEdge {
  id: string;
  type?: string;
  source: string;
  target: string;
  data?: Record<string, unknown>;
  label?: string;
  labelBgStyle?: Record<string, unknown>;
  sourceHandle?: string;
  targetHandle?: string;
}

describe('applyOrgEdgeLabels', () => {
  it('adds scope label to scoped SUPERVISES edge', () => {
    const edges: TestEdge[] = [{
      id: 'e1', type: 'org-supervises', source: 'a', target: 'b',
      data: { scope: { capabilityName: 'rig-monitoring' } },
    }];
    const result = applyOrgEdgeLabels(edges as any);
    expect(result[0]!.label).toBe('scope: rig-monitoring');
    expect(result[0]!.labelBgStyle).toBeDefined();
  });

  it('adds no label to unscoped SUPERVISES edge', () => {
    const edges: TestEdge[] = [{
      id: 'e1', type: 'org-supervises', source: 'a', target: 'b', data: {},
    }];
    const result = applyOrgEdgeLabels(edges as any);
    expect(result[0]!.label).toBeUndefined();
  });

  it('adds BACKS_UP label with scope', () => {
    const edges: TestEdge[] = [{
      id: 'e1', type: 'org-backs-up', source: 'a', target: 'b',
      data: { scope: { capabilityName: 'code-analysis' } },
    }];
    const result = applyOrgEdgeLabels(edges as any);
    expect(result[0]!.label).toContain('BACKS_UP');
    expect(result[0]!.label).toContain('code-analysis');
  });

  it('adds BACKS_UP label without scope', () => {
    const edges: TestEdge[] = [{
      id: 'e1', type: 'org-backs-up', source: 'a', target: 'b', data: {},
    }];
    const result = applyOrgEdgeLabels(edges as any);
    expect(result[0]!.label).toBe('BACKS_UP');
  });

  it('adds DELEGATES_TO label always', () => {
    const edges: TestEdge[] = [{
      id: 'e1', type: 'org-delegates-to', source: 'a', target: 'b', data: {},
    }];
    const result = applyOrgEdgeLabels(edges as any);
    expect(result[0]!.label).toBe('DELEGATES_TO');
  });

  it('adds no label to ESCALATES_TO', () => {
    const edges: TestEdge[] = [{
      id: 'e1', type: 'org-escalates-to', source: 'a', target: 'b', data: {},
    }];
    const result = applyOrgEdgeLabels(edges as any);
    expect(result[0]!.label).toBeUndefined();
  });

  it('adds no label to REPORTS_TO', () => {
    const edges: TestEdge[] = [{
      id: 'e1', type: 'org-reports-to', source: 'a', target: 'b', data: {},
    }];
    const result = applyOrgEdgeLabels(edges as any);
    expect(result[0]!.label).toBeUndefined();
  });

  it('adds extendedKind as label for EXTENDED', () => {
    const edges: TestEdge[] = [{
      id: 'e1', type: 'org-extended', source: 'a', target: 'b',
      data: { extendedKind: 'bids-to' },
    }];
    const result = applyOrgEdgeLabels(edges as any);
    expect(result[0]!.label).toBe('bids-to');
  });

  it('does not modify edges without org type', () => {
    const edges: TestEdge[] = [{
      id: 'e1', type: 'other-type', source: 'a', target: 'b', data: {},
    }];
    const result = applyOrgEdgeLabels(edges as any);
    expect(result[0]!.label).toBeUndefined();
  });
});


