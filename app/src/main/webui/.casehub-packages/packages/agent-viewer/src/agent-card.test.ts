import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AgentRef } from '@casehubio/mosaic-core';
import './agent-card.js';
import type { AgentCard } from './agent-card.js';

describe('agent-card', () => {
  let el: AgentCard;

  beforeEach(async () => {
    el = document.createElement('agent-card') as AgentCard;
    el.agent = {
      type: 'worker',
      name: 'risk-scorer',
      description: 'statistical risk model',
      capabilities: ['risk-assessment'],
    };
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('renders agent name', () => {
    expect(el.shadowRoot!.querySelector('.name')?.textContent).toBe('risk-scorer');
  });

  it('renders icon', () => {
    expect(el.shadowRoot!.querySelector('.icon')?.textContent?.trim()).toBe('⬡');
  });

  it('renders description', () => {
    expect(el.shadowRoot!.querySelector('.description')?.textContent).toBe('statistical risk model');
  });

  it('renders type badge', () => {
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('worker');
  });

  it('omits description when absent', async () => {
    el.agent = { type: 'worker', name: 'minimal' };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.description')).toBeNull();
  });

  it('renders human icon for human type', async () => {
    el.agent = { type: 'human', name: 'expert' };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.icon')?.textContent?.trim()).toBe('👤');
  });

  it('defaults worker icon to hexagon', () => {
    expect(el.shadowRoot!.querySelector('.icon')?.textContent?.trim()).toBe('⬡');
  });
});
