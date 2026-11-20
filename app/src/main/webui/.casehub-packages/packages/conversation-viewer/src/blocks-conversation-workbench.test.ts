import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emitPagesEvent } from '@casehubio/pages-data';
import type { ConversationState } from './types.js';
import './blocks-conversation-workbench.js';

type WorkbenchElement = HTMLElement & {
  conversationState?: ConversationState;
  selectionTopic: string;
  configure: (props: Record<string, unknown>) => void;
  updateComplete: Promise<boolean>;
};

const MOCK_STATE: ConversationState = {
  points: [
    {
      id: 'p1', topic: 'Auth scoping', round: 1,
      classification: { priority: 'HIGH', scope: 'ARCHITECTURE' },
      entries: [{ entryType: 'RAISE', content: 'Auth needs scoping', agentRole: 'REV', round: 1 }],
      status: 'OPEN',
    },
    {
      id: 'p2', topic: 'Error model', round: 1,
      classification: { priority: 'MEDIUM', scope: 'API' },
      entries: [{ entryType: 'RAISE', content: 'Error model', agentRole: 'REV', round: 1 }],
      status: 'AGREED',
    },
  ],
  convergence: { state: 'CONVERGING', confidence: 0.72, reason: 'Progress on auth' },
  commonGround: {
    facts: [
      { id: 'f1', topic: 'Error model', content: 'Use RFC 7807', epistemicStatus: 'ESTABLISHED', acknowledgedBy: ['REV', 'IMP'], disputedBy: [], round: 1 },
    ],
  },
  humanFlags: [],
  memos: [],
  subTaskFindings: [],
  obligations: [],
  currentRound: 2,
};

function createElement(): WorkbenchElement {
  const el = document.createElement('blocks-conversation-workbench') as WorkbenchElement;
  document.body.appendChild(el);
  return el;
}

describe('blocks-conversation-workbench', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('renders split-workbench', async () => {
    const el = createElement();
    el.conversationState = MOCK_STATE;
    await el.updateComplete;
    const sw = el.shadowRoot?.querySelector('pages-split-workbench');
    expect(sw).toBeTruthy();
  });

  it('renders convergence indicator in left pane', async () => {
    const el = createElement();
    el.conversationState = MOCK_STATE;
    await el.updateComplete;
    const indicator = el.shadowRoot?.querySelector('blocks-convergence-indicator');
    expect(indicator).toBeTruthy();
  });

  it('renders point list in left pane', async () => {
    const el = createElement();
    el.conversationState = MOCK_STATE;
    await el.updateComplete;
    const list = el.shadowRoot?.querySelector('blocks-point-list');
    expect(list).toBeTruthy();
  });

  it('shows common-ground-panel when no point selected', async () => {
    const el = createElement();
    el.conversationState = MOCK_STATE;
    await el.updateComplete;
    const panel = el.shadowRoot?.querySelector('blocks-common-ground-panel');
    expect(panel).toBeTruthy();
    const detail = el.shadowRoot?.querySelector('blocks-point-detail');
    expect(detail).toBeNull();
  });

  it('shows point-detail when point selected', async () => {
    const el = createElement();
    el.conversationState = MOCK_STATE;
    el.selectionTopic = 'conversation-point';
    await el.updateComplete;

    emitPagesEvent(el, 'conversation-point:selected', { pointId: 'p1' });
    await el.updateComplete;

    const detail = el.shadowRoot?.querySelector('blocks-point-detail');
    expect(detail).toBeTruthy();
    const panel = el.shadowRoot?.querySelector('blocks-common-ground-panel');
    expect(panel).toBeNull();
  });

  it('returns to common-ground on deselection', async () => {
    const el = createElement();
    el.conversationState = MOCK_STATE;
    el.selectionTopic = 'conversation-point';
    await el.updateComplete;

    emitPagesEvent(el, 'conversation-point:selected', { pointId: 'p1' });
    await el.updateComplete;
    emitPagesEvent(el, 'conversation-point:deselected', { pointId: 'p1' });
    await el.updateComplete;

    const panel = el.shadowRoot?.querySelector('blocks-common-ground-panel');
    expect(panel).toBeTruthy();
  });

  it('stale selection guard clears selection when point disappears', async () => {
    const el = createElement();
    el.conversationState = MOCK_STATE;
    el.selectionTopic = 'conversation-point';
    await el.updateComplete;

    emitPagesEvent(el, 'conversation-point:selected', { pointId: 'p1' });
    await el.updateComplete;

    el.conversationState = { ...MOCK_STATE, points: [MOCK_STATE.points[1]!] };
    await el.updateComplete;

    const panel = el.shadowRoot?.querySelector('blocks-common-ground-panel');
    expect(panel).toBeTruthy();
  });

  it('configure() updates properties', async () => {
    const el = createElement();
    el.configure({ conversationState: MOCK_STATE, selectionTopic: 'my-topic' });
    await el.updateComplete;
    const sw = el.shadowRoot?.querySelector('pages-split-workbench');
    expect(sw).toBeTruthy();
    expect(el.selectionTopic).toBe('my-topic');
  });
});
