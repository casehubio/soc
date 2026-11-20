import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AgentDescriptor } from './agent-types.js';
import './eidos-view.js';
import type { EidosView } from './eidos-view.js';

function fixture(): AgentDescriptor {
  return {
    name: 'leonardo',
    description: 'Leonardo da Vinci — Renaissance polymath',
    slot: 'plant',
    disposition: {
      socialOrient: 'collaborative',
      ruleFollowing: 'flexible',
      riskAppetite: 'bold',
      autonomy: 'autonomous',
      conflictMode: 'accommodating',
    },
    capabilities: [
      { name: 'art-and-design', tags: ['visual', 'creative'] },
      { name: 'mechanical-engineering', tags: ['engineering', 'invention'] },
      { name: 'anatomical-study', tags: ['science', 'observation'] },
    ],
    goals: [
      { name: 'understand-electromagnetic-force', description: 'Understand alternating current', priority: 'PRIMARY', visibility: 'PUBLIC' },
      { name: 'understand-the-cost', description: 'Learn what he sacrificed', priority: 'SECONDARY', visibility: 'PRIVATE' },
    ],
    constraints: [
      { name: 'observation-before-theory', description: 'Ground in direct observation', severity: 'HARD', visibility: 'PUBLIC' },
      { name: 'beauty-matters', description: 'Elegance is not decoration', severity: 'SOFT', visibility: 'PUBLIC' },
    ],
    briefing: 'You are Leonardo da Vinci, aged fifty-four.',
  };
}

describe('eidos-view', () => {
  let el: EidosView;

  beforeEach(async () => {
    el = document.createElement('eidos-view') as EidosView;
    el.agent = fixture();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('renders agent name', () => {
    expect(el.shadowRoot!.querySelector('.agent-name')?.textContent).toBe('leonardo');
  });

  it('renders slot badge', () => {
    expect(el.shadowRoot!.querySelector('.badge-slot')?.textContent).toBe('plant');
  });

  it('renders description', () => {
    expect(el.shadowRoot!.textContent).toContain('Renaissance polymath');
  });

  it('renders all 5 disposition axes from named fields', () => {
    const labels = el.shadowRoot!.querySelectorAll('.disp-label');
    expect(labels.length).toBe(5);
    expect(labels[0]?.textContent).toBe('Social orientation');
    expect(labels[4]?.textContent).toBe('Conflict mode');
  });

  it('bare-string disposition renders full bar and value label', () => {
    const values = el.shadowRoot!.querySelectorAll('.disp-value');
    expect(values[0]?.textContent).toBe('collaborative');
    expect(values[4]?.textContent).toBe('accommodating');
    const fills = el.shadowRoot!.querySelectorAll('.disp-bar-fill');
    expect(fills.length).toBe(5);
    expect((fills[0] as HTMLElement).style.width).toBe('100%');
  });

  it('weighted disposition renders proportional bar', async () => {
    el.agent = {
      ...fixture(),
      disposition: {
        socialOrient: [{ term: 'collaborative', weight: 0.7 }, { term: 'independent', weight: 0.3 }],
      },
    };
    await el.updateComplete;
    const fill = el.shadowRoot!.querySelector('.disp-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('70%');
    expect(el.shadowRoot!.querySelector('.disp-value')?.textContent).toBe('collaborative');
  });

  it('renders all capabilities', () => {
    expect(el.shadowRoot!.querySelectorAll('.capability').length).toBe(3);
  });

  it('renders tags from YAML', () => {
    const tags = el.shadowRoot!.querySelectorAll('.domain-tag');
    expect(tags.length).toBe(6);
    expect(tags[0]?.textContent).toBe('visual');
    expect(tags[1]?.textContent).toBe('creative');
  });

  it('omits confidence bar and health dot when not in YAML', () => {
    expect(el.shadowRoot!.querySelectorAll('.cap-score').length).toBe(0);
    expect(el.shadowRoot!.querySelectorAll('.cap-health').length).toBe(0);
  });

  it('renders health dot with status-derived color and tooltip', async () => {
    el.agent = {
      ...fixture(),
      capabilities: [
        { name: 'test-ready', health: { type: 'ready' } },
        { name: 'test-degraded', health: { type: 'degraded', reason: 'RATE_LIMITED', detail: 'quota exceeded' } },
        { name: 'test-unavailable', health: { type: 'unavailable', reason: 'service down' } },
      ],
    };
    await el.updateComplete;
    const dots = el.shadowRoot!.querySelectorAll('.cap-health') as NodeListOf<HTMLElement>;
    expect(dots.length).toBe(3);
    expect(dots[0]!.style.background).toBe('rgb(166, 227, 161)');
    expect(dots[0]!.title).toBe('Ready');
    expect(dots[1]!.style.background).toBe('rgb(249, 226, 175)');
    expect(dots[1]!.title).toContain('RATE_LIMITED');
    expect(dots[2]!.style.background).toBe('rgb(243, 139, 168)');
    expect(dots[2]!.title).toContain('service down');
  });

  it('shows qualityHint bar when present', async () => {
    el.agent = {
      ...fixture(),
      capabilities: [{ name: 'test', qualityHint: 0.85, tags: [] }],
    };
    await el.updateComplete;
    const fill = el.shadowRoot!.querySelector('.cap-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('85%');
    expect(el.shadowRoot!.querySelector('.cap-score')?.textContent).toBe('0.8');
  });

  it('renders goals with name and priority', () => {
    const items = el.shadowRoot!.querySelectorAll('.priority-badge');
    expect(items.length).toBe(2);
    expect(items[0]?.textContent).toBe('PRIMARY');
    expect(el.shadowRoot!.textContent).toContain('understand-electromagnetic-force');
  });

  it('shows PRIVATE badge on private goals', () => {
    expect(el.shadowRoot!.textContent).toContain('PRIVATE');
  });

  it('renders constraints with name and severity', () => {
    const items = el.shadowRoot!.querySelectorAll('.severity-badge');
    expect(items.length).toBe(2);
    expect(items[0]?.textContent).toBe('HARD');
    expect(el.shadowRoot!.textContent).toContain('observation-before-theory');
  });

  it('renders briefing text', () => {
    expect(el.shadowRoot!.querySelector('.briefing')?.textContent).toContain('Leonardo da Vinci');
  });

  it('renders model badge when modelFamily present', async () => {
    el.agent = { ...fixture(), modelFamily: 'claude', modelVersion: 'opus-5' };
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.badge-model');
    expect(badge?.textContent).toBe('claude-opus-5');
  });

  it('renders archetype badge', async () => {
    el.agent = { ...fixture(), archetype: 'polymath' };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.badge-archetype')?.textContent).toBe('polymath');
  });

  it('omits optional sections when data is absent', async () => {
    el.agent = { name: 'minimal' };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.disposition-grid')).toBeNull();
    expect(el.shadowRoot!.querySelector('.capability-list')).toBeNull();
    expect(el.shadowRoot!.querySelector('.goals-constraints')).toBeNull();
    expect(el.shadowRoot!.querySelector('.briefing')).toBeNull();
  });

  it('renders enriched Leonardo with mixed disposition and qualityHint', async () => {
    el.agent = {
      name: 'leonardo',
      description: 'Leonardo da Vinci — Renaissance polymath',
      slot: 'plant',
      disposition: {
        socialOrient: [{ term: 'collaborative', weight: 0.8 }, { term: 'independent', weight: 0.2 }],
        ruleFollowing: 'flexible',
        riskAppetite: [{ term: 'bold', weight: 0.9 }, { term: 'cautious', weight: 0.1 }],
        autonomy: [{ term: 'autonomous', weight: 0.85 }, { term: 'guided', weight: 0.15 }],
        conflictMode: 'accommodating',
      },
      capabilities: [
        { name: 'art-and-design', tags: ['visual', 'creative'], qualityHint: 0.95 },
        { name: 'mechanical-engineering', tags: ['engineering', 'invention'], qualityHint: 0.90 },
        { name: 'anatomical-study', tags: ['science', 'observation'], qualityHint: 0.85 },
      ],
      goals: [
        { name: 'understand-electromagnetic-force', description: 'Understand alternating current', priority: 'PRIMARY', visibility: 'PUBLIC' },
      ],
      constraints: [
        { name: 'observation-before-theory', description: 'Ground in direct observation', severity: 'HARD' },
      ],
      briefing: 'You are Leonardo da Vinci.',
    };
    await el.updateComplete;
    const fills = el.shadowRoot!.querySelectorAll('.disp-bar-fill');
    expect(fills.length).toBe(5);
    expect((fills[0] as HTMLElement).style.width).toBe('80%');
    expect((fills[1] as HTMLElement).style.width).toBe('100%');
    expect((fills[2] as HTMLElement).style.width).toBe('90%');
    const capFills = el.shadowRoot!.querySelectorAll('.cap-bar-fill');
    expect(capFills.length).toBe(3);
    expect((capFills[0] as HTMLElement).style.width).toBe('95%');
    const scores = el.shadowRoot!.querySelectorAll('.cap-score');
    expect(scores.length).toBe(3);
  });
});
