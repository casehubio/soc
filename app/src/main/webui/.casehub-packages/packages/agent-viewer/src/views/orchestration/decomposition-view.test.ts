import { describe, it, expect, afterEach } from 'vitest';
import type { OrchestrationPatternCategory } from '@casehubio/mosaic-core';
import './decomposition-view.js';

function fixture(): OrchestrationPatternCategory {
  return {
    category: 'orchestration',
    type: 'decomposition',
    name: 'research-planner',
    description: 'Decomposes complex research tasks into specialist sub-tasks',
    decomposition: { type: 'llm' },
    routing: { type: 'llm-selected' },
    aggregation: { type: 'collect-all' },
    termination: [{ type: 'goal-reached' }],
    failurePolicy: {
      onRoutingFailure: 'RETRY_BROADER',
      onDeadlock: 'ESCALATE',
      replanPolicy: { maxReplans: 3, fallbackAction: 'ESCALATE' },
    },
    agents: [
      { type: 'worker', name: 'literature-reviewer', description: 'Reviews academic literature', capabilities: ['literature-review'] },
      { type: 'worker', name: 'data-analyst', description: 'Analyses datasets', capabilities: ['data-analysis'] },
      { type: 'worker', name: 'synthesis-writer', description: 'Synthesises findings into narrative', capabilities: ['writing'] },
    ],
  };
}

describe('agency-orchestration-decomposition-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-orchestration-decomposition-view');
    (el as any).spec = spec;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label', async () => {
    await create(fixture());
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('orchestration view');
  });

  it('renders category and type badges', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.category-badge')?.textContent).toBe('orchestration');
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('decomposition');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('research-planner');
  });

  it('renders decomposition strategy badge', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.decomposition-badge')?.textContent).toContain('llm');
  });

  it('renders agent cards', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(3);
  });

  it('renders replan policy', async () => {
    await create(fixture());
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('3');
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });
});
