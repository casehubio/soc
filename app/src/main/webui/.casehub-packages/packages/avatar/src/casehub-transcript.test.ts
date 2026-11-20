import { describe, it, expect, afterEach } from 'vitest';
import type { ConversationTurn } from './types.js';
import './casehub-transcript.js';

function makeTurn(overrides: Partial<ConversationTurn> = {}): ConversationTurn {
  return { role: 'user', text: 'Hello', status: 'final', ...overrides };
}

async function createElement(turns: ConversationTurn[] = []) {
  const el = document.createElement('casehub-transcript') as any;
  el.turns = turns;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('CasehubTranscript', () => {
  it('has correct ARIA attributes', async () => {
    const el = await createElement();
    expect(el.getAttribute('role')).toBe('log');
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.getAttribute('aria-label')).toBe('Conversation transcript');
  });

  it('renders user turns right-aligned', async () => {
    const el = await createElement([makeTurn({ role: 'user', text: 'Hi' })]);
    const bubble = el.shadowRoot!.querySelector('.turn.user');
    expect(bubble).toBeTruthy();
    expect(bubble!.textContent).toContain('Hi');
  });

  it('renders avatar turns left-aligned', async () => {
    const el = await createElement([makeTurn({ role: 'avatar', text: 'Hello!' })]);
    const bubble = el.shadowRoot!.querySelector('.turn.avatar');
    expect(bubble).toBeTruthy();
    expect(bubble!.textContent).toContain('Hello!');
  });

  it('renders partial turns with partial class', async () => {
    const el = await createElement([makeTurn({ status: 'partial', text: 'Hel' })]);
    const bubble = el.shadowRoot!.querySelector('.turn.partial');
    expect(bubble).toBeTruthy();
  });

  it('renders empty state with no children', async () => {
    const el = await createElement([]);
    const bubbles = el.shadowRoot!.querySelectorAll('.turn');
    expect(bubbles.length).toBe(0);
  });

  it('updates when turns property changes', async () => {
    const el = await createElement([]);
    el.turns = [makeTurn({ text: 'New message' })];
    await el.updateComplete;
    const bubble = el.shadowRoot!.querySelector('.turn');
    expect(bubble!.textContent).toContain('New message');
  });
});
