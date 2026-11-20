// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { AgencyCaseFlowToolbar } from './agency-case-flow-toolbar.js';

describe('AgencyCaseFlowToolbar', () => {
  it('stores stat properties', () => {
    const el = new AgencyCaseFlowToolbar();
    el.nodeCount = 5;
    el.completedCount = 2;
    el.runningCount = 1;
    el.failedCount = 1;
    expect(el.nodeCount).toBe(5);
    expect(el.completedCount).toBe(2);
    expect(el.runningCount).toBe(1);
    expect(el.failedCount).toBe(1);
  });

  it('stores caseStatus property', () => {
    const el = new AgencyCaseFlowToolbar();
    el.caseStatus = 'ACTIVE';
    expect(el.caseStatus).toBe('ACTIVE');
  });

  it('sets role="status" and aria-label on connect', () => {
    const el = new AgencyCaseFlowToolbar();
    document.body.appendChild(el);
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-label')).toBe('Case flow status');
    expect(el.getAttribute('aria-live')).toBe('polite');
    el.remove();
  });

  it('computes staleness from timestamp', () => {
    const el = new AgencyCaseFlowToolbar();
    const old = new Date(Date.now() - 45_000).toISOString();
    expect(el._computeStaleness(old)).toBeGreaterThanOrEqual(44);
    expect(el._computeStaleness(old)).toBeLessThanOrEqual(46);
  });

  it('computes zero staleness for recent timestamp', () => {
    const el = new AgencyCaseFlowToolbar();
    const recent = new Date(Date.now() - 2_000).toISOString();
    expect(el._computeStaleness(recent)).toBeLessThanOrEqual(3);
  });
});
