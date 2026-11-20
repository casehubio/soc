import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { registerCollection } from '../collections/registry.js';
import { mythicCollection } from '../collections/mythic/index.js';
import '../agent-avatar.js';

type AgentAvatarEl = HTMLElement & {
  archetype?: { family: string; subArchetype: string };
  code?: string;
  size?: string;
  collection?: string;
  updateComplete: Promise<boolean>;
};

beforeAll(() => {
  registerCollection(mythicCollection);
});

describe('agent-avatar', () => {
  let el: AgentAvatarEl;

  beforeEach(() => {
    el = document.createElement('agent-avatar') as AgentAvatarEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('has role="img"', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('img');
  });

  it('has aria-label with archetype info', async () => {
    el.archetype = { family: 'Sage', subArchetype: 'Detective' };
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toContain('Sage');
    expect(el.getAttribute('aria-label')).toContain('Detective');
  });

  it('renders SVG from archetype payload', async () => {
    el.archetype = { family: 'Sage', subArchetype: 'Detective' };
    await el.updateComplete;
    const svg = el.shadowRoot?.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders SVG from compact code', async () => {
    el.code = 'mythic:P0';
    await el.updateComplete;
    const svg = el.shadowRoot?.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders fallback when no input provided', async () => {
    await el.updateComplete;
    const svg = el.shadowRoot?.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('respects consumer aria-label', async () => {
    el.setAttribute('aria-label', 'Custom label');
    el.archetype = { family: 'Hero', subArchetype: 'Warrior' };
    // Re-create to test connectedCallback with pre-set aria-label
    el.remove();
    el = document.createElement('agent-avatar') as AgentAvatarEl;
    el.setAttribute('aria-label', 'Custom label');
    document.body.appendChild(el);
    el.archetype = { family: 'Hero', subArchetype: 'Warrior' };
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toBe('Custom label');
  });

  it('defaults to md size', () => {
    expect((el as any).size).toBe('md');
  });

  it('applies palette colours — no CSS custom property vars in rendered SVG', async () => {
    el.archetype = { family: 'Sage', subArchetype: 'Detective' };
    await el.updateComplete;
    const svgContent = el.shadowRoot?.innerHTML ?? '';
    expect(svgContent).not.toContain('var(--skin)');
    expect(svgContent).not.toContain('var(--primary)');
    expect(svgContent).not.toContain('var(--iris)');
  });
});
