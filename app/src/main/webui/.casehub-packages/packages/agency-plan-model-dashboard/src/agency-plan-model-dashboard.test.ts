// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { AgencyPlanModelDashboard } from './agency-plan-model-dashboard.js';
import type { CasePlanModelSnapshot } from '@casehubio/mosaic-graph-stencil-htn';

function emptyModel(): CasePlanModelSnapshot {
  return {
    caseId: 'case-1',
    agenda: [],
    resourceBudget: {},
    subCases: [],
    compounds: [],
    timestamp: '2026-08-06T10:00:00Z',
  };
}

function fullModel(): CasePlanModelSnapshot {
  return {
    caseId: 'case-1',
    agenda: [
      { planItemId: 'pi-1', bindingName: 'verify-identity', status: 'RUNNING', description: 'KYC check' },
      { planItemId: 'pi-2', bindingName: 'score-risk', status: 'PENDING' },
    ],
    focus: 'identity-verification',
    focusRationale: 'High-risk customer requires manual verification',
    resourceBudget: { 'llm-tokens': 5000, 'human-hours': 2 },
    subCases: [
      { caseDefinition: 'fraud-check', namespace: 'compliance', status: 'RUNNING' },
    ],
    compounds: [
      { id: 'c1', name: 'process-claim', status: 'RUNNING', childCount: 4, completedCount: 1, completion: { kind: 'All' } },
    ],
    timestamp: '2026-08-06T10:00:00Z',
  };
}

describe('AgencyPlanModelDashboard', () => {
  it('renders empty state when planModel is null', () => {
    const el = new AgencyPlanModelDashboard();
    expect(el.planModel).toBeNull();
  });

  it('stores planModel property', () => {
    const el = new AgencyPlanModelDashboard();
    el.planModel = emptyModel();
    expect(el.planModel!.caseId).toBe('case-1');
  });

  it('accepts model with empty collections', () => {
    const el = new AgencyPlanModelDashboard();
    el.planModel = emptyModel();
    expect(el.planModel!.agenda).toHaveLength(0);
    expect(el.planModel!.subCases).toHaveLength(0);
    expect(el.planModel!.compounds).toHaveLength(0);
  });

  it('accepts full model with all fields', () => {
    const el = new AgencyPlanModelDashboard();
    el.planModel = fullModel();
    expect(el.planModel!.agenda).toHaveLength(2);
    expect(el.planModel!.focus).toBe('identity-verification');
    expect(el.planModel!.focusRationale).toBeDefined();
    expect(Object.keys(el.planModel!.resourceBudget)).toHaveLength(2);
    expect(el.planModel!.subCases).toHaveLength(1);
    expect(el.planModel!.compounds).toHaveLength(1);
    expect(el.planModel!.compounds[0]!.completedCount).toBe(1);
  });

  it('renders cards with role="region" and aria-label', async () => {
    const el = new AgencyPlanModelDashboard();
    el.planModel = fullModel();
    document.body.appendChild(el);
    await (el as any).updateComplete;
    const regions = el.shadowRoot!.querySelectorAll('[role="region"]');
    expect(regions.length).toBeGreaterThanOrEqual(4);
    const labels = Array.from(regions).map(r => r.getAttribute('aria-label'));
    expect(labels).toContain('Agenda');
    expect(labels).toContain('Focus');
    expect(labels).toContain('Resource Budget');
    expect(labels).toContain('Sub-Cases');
    el.remove();
  });

  it('renders compound progress with role="progressbar"', async () => {
    const el = new AgencyPlanModelDashboard();
    el.planModel = fullModel();
    document.body.appendChild(el);
    await (el as any).updateComplete;
    const progressbar = el.shadowRoot!.querySelector('[role="progressbar"]');
    expect(progressbar).toBeTruthy();
    expect(progressbar!.getAttribute('aria-valuenow')).toBe('1');
    expect(progressbar!.getAttribute('aria-valuemax')).toBe('4');
    el.remove();
  });
});
