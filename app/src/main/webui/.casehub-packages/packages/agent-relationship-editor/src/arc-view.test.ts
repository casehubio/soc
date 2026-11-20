import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './arc-view.js';
import type { AgentRelationship } from '@casehubio/mosaic-graph-stencil-org';
import type { AgentRosterEntry } from './types.js';

const SAMPLE_RELATIONSHIPS: AgentRelationship[] = [
  { sourceAgentId: 'alice', targetAgentId: 'bob', kind: 'SUPERVISES', tenancyId: 't1' },
  { sourceAgentId: 'alice', targetAgentId: 'carol', kind: 'DELEGATES_TO', tenancyId: 't1' },
  { sourceAgentId: 'dave', targetAgentId: 'alice', kind: 'REPORTS_TO', tenancyId: 't1' },
];

const SAMPLE_ROSTER: AgentRosterEntry[] = [
  { agentId: 'alice', name: 'Alice' },
  { agentId: 'bob', name: 'Bob' },
  { agentId: 'carol', name: 'Carol' },
  { agentId: 'dave', name: 'Dave' },
];

type ArcViewEl = HTMLElement & {
  agentId?: string;
  relationships?: AgentRelationship[];
  roster?: AgentRosterEntry[];
  updateComplete: Promise<boolean>;
};

describe('arc-view', () => {
  let el: ArcViewEl;

  beforeEach(() => {
    el = document.createElement('arc-view') as ArcViewEl;
    el.agentId = 'alice';
    el.relationships = SAMPLE_RELATIONSHIPS;
    el.roster = SAMPLE_ROSTER;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('has ARIA role=img and aria-label', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Relationship arc diagram');
  });

  it('renders SVG element', async () => {
    await el.updateComplete;
    const svg = el.shadowRoot!.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders correct number of arcs', async () => {
    await el.updateComplete;
    const paths = el.shadowRoot!.querySelectorAll('path');
    expect(paths.length).toBe(3);
  });

  it('renders agent labels', async () => {
    await el.updateComplete;
    const labels = el.shadowRoot!.querySelectorAll('text');
    const texts = Array.from(labels).map(l => l.textContent?.trim());
    expect(texts).toContain('Alice');
    expect(texts).toContain('Bob');
    expect(texts).toContain('Carol');
    expect(texts).toContain('Dave');
  });
});
