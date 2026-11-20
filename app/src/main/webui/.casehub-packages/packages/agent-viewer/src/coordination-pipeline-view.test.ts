import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CoordinationPipeline, PhaseItem } from './coordination-types.js';
import './coordination-pipeline-view.js';
import type { CoordinationPipelineView } from './coordination-pipeline-view.js';

function kycPipeline(): CoordinationPipeline {
  return {
    name: 'kyc-verification',
    description: 'KYC verification pipeline',
    agentCount: 4,
    barrierCount: 2,
    channelCount: 1,
    phases: [
      {
        type: 'step',
        action: 'agent-delegate',
        target: 'doc-classifier',
        model: 'claude-sonnet-5',
        outputFormat: 'structured',
        params: {
          'descriptor': 'document-classifier',
          'params.documents': '${params.applicationDocs}',
          'params.taxonomy': 'kyc-v3',
        },
      },
      {
        type: 'signal',
        name: 'docs-classified',
        description: 'fan-out to extractors',
      },
      {
        type: 'parallel',
        lanes: {
          'identity-extractor': [
            {
              action: 'agent-delegate',
              model: 'claude-opus-5',
              outputFormat: 'structured',
              params: { descriptor: 'kyc-identity', docs: '${from.identity_docs}' },
            },
            { action: 'graphql', target: 'sanctions / screenEntity' },
          ],
          'financial-extractor': [
            {
              action: 'agent-delegate',
              model: 'claude-opus-5',
              outputFormat: 'structured',
              params: { descriptor: 'kyc-financials', docs: '${from.financial_docs}' },
            },
            { action: 'rest', target: 'POST /api/aml/check' },
          ],
          'address-verifier': [
            {
              action: 'agent-delegate',
              model: 'claude-sonnet-5',
              outputFormat: 'structured',
              params: { descriptor: 'kyc-address', docs: '${from.address_docs}' },
            },
            { action: 'mcp-call', target: 'geo-verify' },
          ],
        },
      },
      {
        type: 'quorum',
        name: 'extraction-complete',
        required: 2,
        of: 3,
      },
      {
        type: 'step',
        action: 'agent-delegate',
        target: 'risk-assessor',
        model: 'claude-opus-5',
        outputFormat: 'structured',
        params: {
          'descriptor': 'kyc-risk-decision',
          'params.identity': '${identity-extractor.result}',
          'params.financials': '${financial-extractor.result}',
          'params.address': '${address-verifier.result}',
          'params.riskPolicy': '${params.riskTier}',
        },
        routing: {
          expression: '${ risk-assessor.result.decision }',
          cases: [
            {
              pattern: 'approve',
              step: {
                action: 'rest',
                target: 'POST /api/kyc/approve',
                channel: 'notify-compliance',
              },
            },
            {
              pattern: 'escalate',
              step: {
                action: 'agent-delegate',
                target: 'senior-reviewer',
                model: 'claude-opus-5',
              },
            },
            {
              pattern: 'reject',
              step: {
                action: 'rest',
                target: 'POST /api/kyc/reject',
                channel: 'notify-applicant',
              },
            },
          ],
        },
      },
    ],
  };
}

describe('coordination-pipeline-view (lanes)', () => {
  let el: CoordinationPipelineView;

  beforeEach(async () => {
    el = document.createElement('coordination-pipeline-view') as CoordinationPipelineView;
    el.pipeline = kycPipeline();
    document.body.appendChild(el);
    await el.updateComplete;
    el.viewMode = 'lanes';
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('renders pipeline header with name', () => {
    const title = el.shadowRoot!.querySelector('.pipeline-header .title');
    expect(title?.textContent).toBe('kyc-verification');
  });

  it('renders pipeline meta counts', () => {
    const meta = el.shadowRoot!.querySelector('.pipeline-header .meta');
    expect(meta?.textContent).toContain('4 agents');
    expect(meta?.textContent).toContain('2 barriers');
    expect(meta?.textContent).toContain('1 channel');
  });

  it('renders first agent-delegate step card', () => {
    const cards = el.shadowRoot!.querySelectorAll('.step-card');
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = cards[0]!;
    expect(firstCard.querySelector('.step-action')?.textContent).toBe('agent-delegate');
    expect(firstCard.querySelector('.step-target')?.textContent).toBe('doc-classifier');
  });

  it('renders model badge on step card', () => {
    const badge = el.shadowRoot!.querySelector('.badge-model');
    expect(badge?.textContent).toBe('claude-sonnet-5');
  });

  it('renders output format badge', () => {
    const badge = el.shadowRoot!.querySelector('.badge-format');
    expect(badge?.textContent).toBe('structured');
  });

  it('renders params with expression pills', () => {
    const body = el.shadowRoot!.querySelector('.invoke-body');
    expect(body).not.toBeNull();
    const fromExpr = body!.querySelector('.expr.param');
    expect(fromExpr?.textContent).toBe('${params.applicationDocs}');
  });

  it('renders literal values in quotes', () => {
    const body = el.shadowRoot!.querySelector('.invoke-body');
    const literals = body!.querySelectorAll('.value');
    const texts = Array.from(literals).map(l => l.textContent);
    expect(texts).toContain('"document-classifier"');
    expect(texts).toContain('"kyc-v3"');
  });

  it('renders signal barrier', () => {
    const barriers = el.shadowRoot!.querySelectorAll('.barrier-bar');
    const signalBarrier = Array.from(barriers).find(b => b.classList.contains('signal'));
    expect(signalBarrier).not.toBeNull();
    expect(signalBarrier!.querySelector('.barrier-label')?.textContent).toBe('◇ signal');
    expect(signalBarrier!.querySelector('.barrier-name')?.textContent).toBe('docs-classified');
    expect(signalBarrier!.querySelector('.barrier-detail')?.textContent).toBe('fan-out to extractors');
  });

  it('renders quorum barrier with counts', () => {
    const barriers = el.shadowRoot!.querySelectorAll('.barrier-bar');
    const quorum = Array.from(barriers).find(b => b.classList.contains('quorum'));
    expect(quorum).not.toBeNull();
    expect(quorum!.querySelector('.barrier-label')?.textContent).toBe('▮ quorum');
    expect(quorum!.querySelector('.barrier-name')?.textContent).toBe('extraction-complete');
    expect(quorum!.querySelector('.barrier-detail')?.textContent).toBe('required: 2 of 3');
  });

  it('renders 3 swim lanes', () => {
    const lanes = el.shadowRoot!.querySelectorAll('.swim-lane');
    expect(lanes.length).toBe(3);
  });

  it('renders lane names', () => {
    const laneNames = el.shadowRoot!.querySelectorAll('.lane-name');
    expect(laneNames[0]?.textContent).toBe('identity-extractor');
    expect(laneNames[1]?.textContent).toBe('financial-extractor');
    expect(laneNames[2]?.textContent).toBe('address-verifier');
  });

  it('renders grid columns matching lane count', () => {
    const grid = el.shadowRoot!.querySelector('.swim-lanes') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('1fr 1fr 1fr');
  });

  it('renders drillable step cards for agent-delegate actions', () => {
    const drillables = el.shadowRoot!.querySelectorAll('.step-card.drillable');
    expect(drillables.length).toBe(5);
  });

  it('renders drill-down hint on drillable cards', () => {
    const hints = el.shadowRoot!.querySelectorAll('.drill-hint');
    expect(hints.length).toBe(5);
    expect(hints[0]?.textContent).toBe('↗ drill down');
  });

  it('renders match/case routing', () => {
    const keyword = el.shadowRoot!.querySelector('.keyword');
    expect(keyword?.textContent).toBe('match');
    const condition = el.shadowRoot!.querySelector('.condition');
    expect(condition?.textContent).toBe('${ risk-assessor.result.decision }');
  });

  it('renders 3 match cases', () => {
    const cases = el.shadowRoot!.querySelectorAll('.match-case');
    expect(cases.length).toBe(3);
  });

  it('renders match case patterns', () => {
    const patterns = el.shadowRoot!.querySelectorAll('.match-pattern');
    expect(patterns[0]?.textContent).toBe('"approve"');
    expect(patterns[1]?.textContent).toBe('"escalate"');
    expect(patterns[2]?.textContent).toBe('"reject"');
  });

  it('renders channel badges on match case steps', () => {
    const channels = el.shadowRoot!.querySelectorAll('.badge-channel');
    expect(channels.length).toBe(2);
    expect(channels[0]?.textContent).toBe('→ notify-compliance');
  });

  it('derives icons from match case pattern names', () => {
    const cases = el.shadowRoot!.querySelectorAll('.match-case .step-icon');
    expect(cases[0]?.textContent).toBe('✓');
    expect(cases[0]?.classList.contains('approve')).toBe(true);
    expect(cases[1]?.textContent).toBe('⚠');
    expect(cases[2]?.textContent).toBe('✕');
    expect(cases[2]?.classList.contains('reject')).toBe(true);
  });

  it('renders expression type "from" for agent result references', () => {
    const fromExprs = el.shadowRoot!.querySelectorAll('.expr.from');
    expect(fromExprs.length).toBeGreaterThan(0);
  });

  it('renders nothing when pipeline is undefined', async () => {
    el.pipeline = undefined as unknown as CoordinationPipeline;
    await el.updateComplete;
    expect(el.shadowRoot!.children.length).toBe(1); // style only
  });

  it('omits meta span when no counts provided', async () => {
    el.pipeline = {
      name: 'minimal',
      phases: [],
    };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.pipeline-header .meta')).toBeNull();
  });

  it('renders each lane with correct step types', () => {
    const lanes = el.shadowRoot!.querySelectorAll('.swim-lane');
    const firstLaneActions = lanes[0]!.querySelectorAll('.step-action');
    expect(firstLaneActions[0]?.textContent).toBe('agent-delegate');
    expect(firstLaneActions[1]?.textContent).toBe('graphql');

    const secondLaneActions = lanes[1]!.querySelectorAll('.step-action');
    expect(secondLaneActions[1]?.textContent).toBe('rest');

    const thirdLaneActions = lanes[2]!.querySelectorAll('.step-action');
    expect(thirdLaneActions[1]?.textContent).toBe('mcp-call');
  });
});

describe('viewMode and toggle', () => {
  let el: CoordinationPipelineView;

  beforeEach(async () => {
    el = document.createElement('coordination-pipeline-view') as CoordinationPipelineView;
    el.pipeline = kycPipeline();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('auto-detects graph mode for KYC pipeline (parallel + quorum)', () => {
    expect(el.viewMode).toBe('graph');
  });

  it('renders toggle in header', () => {
    const toggle = el.shadowRoot!.querySelector('.view-toggle');
    expect(toggle).not.toBeNull();
    const buttons = toggle!.querySelectorAll('[role="radio"]');
    expect(buttons).toHaveLength(2);
  });

  it('toggle has correct ARIA attributes', () => {
    const group = el.shadowRoot!.querySelector('[role="radiogroup"]');
    expect(group).not.toBeNull();
    const radios = el.shadowRoot!.querySelectorAll('[role="radio"]');
    const active = Array.from(radios).find(r => r.getAttribute('aria-checked') === 'true');
    expect(active?.textContent?.trim()).toBe('Graph');
  });

  it('switches to lanes view on toggle click', async () => {
    const radios = el.shadowRoot!.querySelectorAll('[role="radio"]');
    const lanesBtn = Array.from(radios).find(r => r.textContent?.trim() === 'Lanes');
    (lanesBtn as HTMLElement).click();
    await el.updateComplete;
    expect(el.viewMode).toBe('lanes');
    expect(el.shadowRoot!.querySelector('.swim-lanes')).not.toBeNull();
  });

  it('renders graph view container when in graph mode', () => {
    expect(el.shadowRoot!.querySelector('.graph-view')).not.toBeNull();
  });

  it('does not render swim-lanes in graph mode', () => {
    expect(el.shadowRoot!.querySelector('.swim-lanes')).toBeNull();
  });

  it('defaults to lanes for pipeline without parallel + quorum', async () => {
    el.pipeline = {
      name: 'simple',
      phases: [
        { type: 'step', action: 'agent-delegate', target: 'a' },
        { type: 'step', action: 'rest', target: 'b' },
      ],
    };
    await el.updateComplete;
    expect(el.viewMode).toBe('lanes');
    expect(el.shadowRoot!.querySelector('.graph-view')).toBeNull();
  });
});

describe('graph view rendering', () => {
  let el: CoordinationPipelineView;

  beforeEach(async () => {
    el = document.createElement('coordination-pipeline-view') as CoordinationPipelineView;
    el.pipeline = kycPipeline();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('renders graph tiers as flex rows', () => {
    const tiers = el.shadowRoot!.querySelectorAll('.graph-tier');
    expect(tiers.length).toBeGreaterThanOrEqual(3);
  });

  it('renders classifier as single-node tier', () => {
    const tiers = el.shadowRoot!.querySelectorAll('.graph-tier');
    const firstTier = tiers[0];
    const cards = firstTier.querySelectorAll('.step-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].querySelector('.step-target')?.textContent).toBe('doc-classifier');
  });

  it('renders 3 parallel extractors in one tier', () => {
    const tiers = el.shadowRoot!.querySelectorAll('.graph-tier');
    const parallelTier = Array.from(tiers).find(t => t.querySelectorAll('.step-card').length === 3);
    expect(parallelTier).not.toBeNull();
  });

  it('renders fan-out connector with lane name labels', () => {
    const fanOut = el.shadowRoot!.querySelector('.graph-connector.fan-out');
    expect(fanOut).not.toBeNull();
    const labels = fanOut!.querySelectorAll('.edge-label');
    expect(labels).toHaveLength(3);
    expect(labels[0].textContent?.trim()).toBe('identity-extractor');
    expect(labels[1].textContent?.trim()).toBe('financial-extractor');
    expect(labels[2].textContent?.trim()).toBe('address-verifier');
  });

  it('renders fan-in connector with quorum barrier', () => {
    const fanIn = el.shadowRoot!.querySelector('.graph-connector.fan-in');
    expect(fanIn).not.toBeNull();
    const quorum = fanIn!.querySelector('.graph-quorum');
    expect(quorum).not.toBeNull();
    expect(quorum!.textContent).toContain('QUORUM');
    expect(quorum!.textContent).toContain('2 of 3');
  });

  it('renders outcome nodes with color-coded classes', () => {
    const tiers = el.shadowRoot!.querySelectorAll('.graph-tier');
    const lastTier = tiers[tiers.length - 1];
    const outcomes = lastTier.querySelectorAll('.outcome-node');
    expect(outcomes).toHaveLength(3);
    expect(outcomes[0].classList.contains('green')).toBe(true);
    expect(outcomes[1].classList.contains('amber')).toBe(true);
    expect(outcomes[2].classList.contains('red')).toBe(true);
  });

  it('renders decision node with emphasis class', () => {
    const decision = el.shadowRoot!.querySelector('.decision-node');
    expect(decision).not.toBeNull();
  });

  it('renders extra step count badge for multi-step lanes', () => {
    const badges = el.shadowRoot!.querySelectorAll('.extra-steps');
    expect(badges.length).toBeGreaterThanOrEqual(3);
    expect(badges[0].textContent?.trim()).toBe('+1 more');
  });

  it('graph view has correct ARIA', () => {
    const graphView = el.shadowRoot!.querySelector('.graph-view');
    expect(graphView?.getAttribute('role')).toBe('img');
    expect(graphView?.getAttribute('aria-label')).toContain('kyc-verification');
  });
});

describe('drill-down events', () => {
  let el: CoordinationPipelineView;

  beforeEach(async () => {
    el = document.createElement('coordination-pipeline-view') as CoordinationPipelineView;
    el.pipeline = kycPipeline();
    document.body.appendChild(el);
    await el.updateComplete;
    el.viewMode = 'lanes';
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('emits coordination:drill-down on drillable card click', () => {
    let detail: any = null;
    el.addEventListener('coordination:drill-down', ((e: CustomEvent) => {
      detail = e.detail;
    }) as EventListener);
    const drillable = el.shadowRoot!.querySelector('.step-card.drillable') as HTMLElement;
    drillable.click();
    expect(detail).not.toBeNull();
    expect(detail.agentName).toBeDefined();
    expect(detail.steps).toBeDefined();
    expect(Array.isArray(detail.steps)).toBe(true);
  });

  it('emits drill-down with correct lane steps', () => {
    let detail: any = null;
    el.addEventListener('coordination:drill-down', ((e: CustomEvent) => {
      detail = e.detail;
    }) as EventListener);
    const drillables = el.shadowRoot!.querySelectorAll('.step-card.drillable');
    (drillables[1] as HTMLElement).click();
    expect(detail.steps.length).toBe(2);
  });

  it('drillable cards have role button', () => {
    const drillable = el.shadowRoot!.querySelector('.step-card.drillable') as HTMLElement;
    expect(drillable.getAttribute('role')).toBe('button');
  });

  it('drillable cards activate on Enter key', () => {
    let detail: any = null;
    el.addEventListener('coordination:drill-down', ((e: CustomEvent) => {
      detail = e.detail;
    }) as EventListener);
    const drillable = el.shadowRoot!.querySelector('.step-card.drillable') as HTMLElement;
    drillable.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(detail).not.toBeNull();
  });

  it('emits drill-down from graph view drillable nodes', async () => {
    el.viewMode = 'graph';
    await el.updateComplete;
    let detail: any = null;
    el.addEventListener('coordination:drill-down', ((e: CustomEvent) => {
      detail = e.detail;
    }) as EventListener);
    const drillable = el.shadowRoot!.querySelector('.step-card.drillable') as HTMLElement;
    if (drillable) {
      drillable.click();
      expect(detail).not.toBeNull();
    }
  });
});

describe('focus mode', () => {
  let el: CoordinationPipelineView;

  beforeEach(async () => {
    el = document.createElement('coordination-pipeline-view') as CoordinationPipelineView;
    el.pipeline = kycPipeline();
    document.body.appendChild(el);
    await el.updateComplete;
    el.viewMode = 'lanes';
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('does not dim steps when focusMode is false', async () => {
    el.focusMode = false;
    await el.updateComplete;
    const dimmed = el.shadowRoot!.querySelectorAll('.step-card.dimmed');
    expect(dimmed).toHaveLength(0);
  });

  it('dims non-agent-delegate steps when focusMode is true', async () => {
    el.focusMode = true;
    await el.updateComplete;
    const dimmed = el.shadowRoot!.querySelectorAll('.step-card.dimmed');
    expect(dimmed.length).toBeGreaterThan(0);
  });

  it('does not dim agent-delegate steps when focusMode is true', async () => {
    el.focusMode = true;
    await el.updateComplete;
    const allCards = el.shadowRoot!.querySelectorAll('.step-card');
    const undimmed = Array.from(allCards).filter(c => !c.classList.contains('dimmed'));
    expect(undimmed.length).toBeGreaterThan(0);
    for (const card of undimmed) {
      expect(card.querySelector('.step-action')?.textContent).toBe('agent-delegate');
    }
  });

  it('shows focus badge in header when focusMode is true', async () => {
    el.focusMode = true;
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.focus-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('LLM Logic');
  });

  it('hides focus badge when focusMode is false', async () => {
    el.focusMode = false;
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.focus-badge');
    expect(badge).toBeNull();
  });
});
