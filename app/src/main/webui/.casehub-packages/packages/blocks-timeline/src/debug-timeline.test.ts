import { describe, it, expect } from 'vitest';
import { html, render } from 'lit';
import './blocks-timeline.js';
import type { BlocksTimeline } from './blocks-timeline.js';
import { eventChronologyStrategy } from './strategies/event-chronology.js';

const mockEvents = [
  { eventType: 'CASE_STARTED', streamType: 'CASE', timestamp: '2026-01-01T10:00:00Z', payload: {} },
  { eventType: 'TASK_CREATED', streamType: 'WORKER', timestamp: '2026-01-01T10:05:00Z', payload: {} },
];

describe('debug', () => {
  it('shows shadow content', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(html`<blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} layout="vertical"></blocks-timeline>`, container);
    const el = container.firstElementChild as BlocksTimeline;
    await el.updateComplete;
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;
    console.log('SHADOW:', el.shadowRoot?.innerHTML?.substring(0, 500));
    console.log('NODES:', el.shadowRoot?.querySelectorAll('[role="listitem"]').length);
    console.log('DATA:', (el as any).data);
    console.log('_NODES:', (el as any)._nodes?.length);
    expect(true).toBe(true);
  });
});
