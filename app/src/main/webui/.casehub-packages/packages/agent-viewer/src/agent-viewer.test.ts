import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AgentViewerData } from './agent-viewer.js';
import type { CoordinationStep } from './coordination-types.js';
import './agent-viewer.js';
import type { AgentViewer } from './agent-viewer.js';

function fixture(): AgentViewerData {
  return {
    agent: {
      name: 'leonardo',
      description: 'Leonardo da Vinci — Renaissance polymath',
      slot: 'plant',
      disposition: { socialOrient: 'collaborative', ruleFollowing: 'flexible' },
      capabilities: [{ name: 'art-and-design', tags: ['visual', 'creative'] }],
      goals: [{ name: 'understand-electromagnetic-force', description: 'Understand AC', priority: 'PRIMARY', visibility: 'PUBLIC' }],
      constraints: [{ name: 'observation-before-theory', description: 'Direct observation', severity: 'HARD' }],
      briefing: 'You are Leonardo da Vinci.',
    },
    spec: {
      category: 'deliberation',
      type: 'voting',
      name: 'proposal-evaluation',
      aggregation: { type: 'majority-vote' },
      agents: [
        { type: 'worker', name: 'evaluator-1', description: 'Technical assessment' },
        { type: 'worker', name: 'evaluator-2', description: 'Cost-benefit review' },
      ],
    },
    breadcrumb: ['Pattern', 'leonardo'],
  };
}

describe('agent-viewer', () => {
  let el: AgentViewer;

  beforeEach(async () => {
    el = document.createElement('agent-viewer') as AgentViewer;
    el.data = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('renders breadcrumb', () => {
    const current = el.shadowRoot!.querySelector('.breadcrumb-current');
    expect(current?.textContent).toBe('leonardo');
    const segments = el.shadowRoot!.querySelectorAll('.breadcrumb-segment');
    expect(segments.length).toBe(1);
    expect(segments[0]?.textContent).toBe('Pattern');
  });

  it('renders tab bar with 2 tabs', () => {
    const tabs = el.shadowRoot!.querySelectorAll('.tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0]?.textContent).toBe('Eidos');
    expect(tabs[1]?.textContent).toBe('Pattern');
  });

  it('defaults to eidos tab', () => {
    const active = el.shadowRoot!.querySelector('.tab.active');
    expect(active?.textContent).toBe('Eidos');
    expect(el.shadowRoot!.querySelector('eidos-view')).toBeTruthy();
  });

  it('switches to pattern tab on click', async () => {
    const tabs = el.shadowRoot!.querySelectorAll('.tab');
    (tabs[1] as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.tab.active')?.textContent).toBe('Pattern');
    expect(el.shadowRoot!.querySelector('agency-deliberation-voting-view')).toBeTruthy();
  });

  it('pattern tab disabled when no pattern data', async () => {
    el.data = { ...fixture(), spec: undefined };
    await el.updateComplete;
    const patternTab = el.shadowRoot!.querySelectorAll('.tab')[1];
    expect(patternTab?.classList.contains('disabled')).toBe(true);
  });

  it('omits breadcrumb when absent', async () => {
    el.data = { ...fixture(), breadcrumb: undefined };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.breadcrumb')).toBeNull();
  });

  it('emits viewer:breadcrumb-back on segment click', () => {
    let detail: any = null;
    el.addEventListener('viewer:breadcrumb-back', ((e: CustomEvent) => {
      detail = e.detail;
    }) as EventListener);
    const segment = el.shadowRoot!.querySelector('.breadcrumb-segment') as HTMLElement;
    segment.click();
    expect(detail).not.toBeNull();
    expect(detail.index).toBe(0);
    expect(detail.segment).toBe('Pattern');
  });

  it('breadcrumb has navigation ARIA', () => {
    const nav = el.shadowRoot!.querySelector('[role="navigation"]');
    expect(nav).not.toBeNull();
    expect(nav!.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('renders debate pattern in pattern tab', async () => {
    el.data = {
      ...fixture(),
      spec: {
        category: 'deliberation',
        type: 'debate',
        name: 'adversarial-review',
        maxRounds: 7,
        judge: { type: 'worker', name: 'arbiter' },
        agents: [
          { type: 'worker', name: 'proponent' },
          { type: 'worker', name: 'opponent' },
        ],
      },
    };
    await el.updateComplete;
    const tabs = el.shadowRoot!.querySelectorAll('.tab');
    (tabs[1] as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('agency-deliberation-debate-view')).toBeTruthy();
  });
});

function stepsFixture(): CoordinationStep[] {
  return [
    { action: 'agent-delegate', model: 'claude-opus-5', outputFormat: 'structured',
      params: { descriptor: 'kyc-identity', docs: '${from.identity_docs}' } },
    { action: 'graphql', target: 'sanctions / screenEntity' },
  ];
}

describe('steps tab', () => {
  let el: AgentViewer;

  beforeEach(async () => {
    el = document.createElement('agent-viewer') as AgentViewer;
    el.data = { ...fixture(), steps: stepsFixture() };
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('shows Steps tab when steps data provided', () => {
    const tabs = el.shadowRoot!.querySelectorAll('.tab');
    expect(tabs.length).toBe(3);
    expect(tabs[2]?.textContent).toBe('Steps');
  });

  it('hides Steps tab when no steps data', async () => {
    el.data = { ...fixture(), steps: undefined };
    await el.updateComplete;
    const tabs = el.shadowRoot!.querySelectorAll('.tab');
    expect(tabs.length).toBe(2);
  });

  it('renders step cards in Steps tab', async () => {
    const tabs = el.shadowRoot!.querySelectorAll('.tab');
    (tabs[2] as HTMLElement).click();
    await el.updateComplete;
    const cards = el.shadowRoot!.querySelectorAll('.step-card');
    expect(cards.length).toBe(2);
  });

  it('renders action and target on step cards', async () => {
    const tabs = el.shadowRoot!.querySelectorAll('.tab');
    (tabs[2] as HTMLElement).click();
    await el.updateComplete;
    const actions = el.shadowRoot!.querySelectorAll('.step-action');
    expect(actions[0]?.textContent).toBe('agent-delegate');
    expect(actions[1]?.textContent).toBe('graphql');
  });

  it('renders model badge on step cards', async () => {
    const tabs = el.shadowRoot!.querySelectorAll('.tab');
    (tabs[2] as HTMLElement).click();
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.badge-model');
    expect(badge?.textContent).toBe('claude-opus-5');
  });
});
