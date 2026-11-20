import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './agent-relationship-editor.js';
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
  { agentId: 'eve', name: 'Eve' },
];

type EditorEl = HTMLElement & {
  agentId?: string;
  relationships?: AgentRelationship[];
  roster?: AgentRosterEntry[];
  agents?: Record<string, any>;
  tenancyId?: string;
  updateComplete: Promise<boolean>;
};

describe('agent-relationship-editor', () => {
  let el: EditorEl;

  beforeEach(() => {
    el = document.createElement('agent-relationship-editor') as EditorEl;
    el.agentId = 'alice';
    el.relationships = SAMPLE_RELATIONSHIPS;
    el.roster = SAMPLE_ROSTER;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('has ARIA role=region and aria-label including agentId', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toContain('alice');
  });

  it('renders grouped sections by relationship kind', async () => {
    await el.updateComplete;
    const sections = el.shadowRoot!.querySelectorAll('.kind-section');
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('renders relationship rows with direction arrows', async () => {
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.relationship-row');
    expect(rows.length).toBe(3);
    const arrows = el.shadowRoot!.querySelectorAll('.direction-arrow');
    expect(arrows.length).toBe(3);
  });

  it('add button shows inline add form', async () => {
    await el.updateComplete;
    const addBtn = el.shadowRoot!.querySelector('.add-relationship') as HTMLElement;
    expect(addBtn).toBeTruthy();
    addBtn.click();
    await el.updateComplete;
    const addForm = el.shadowRoot!.querySelector('.add-form');
    expect(addForm).toBeTruthy();
  });

  it('add form has agent picker populated from roster', async () => {
    await el.updateComplete;
    const addBtn = el.shadowRoot!.querySelector('.add-relationship') as HTMLElement;
    addBtn.click();
    await el.updateComplete;
    const select = el.shadowRoot!.querySelector('.add-form select.target-picker') as HTMLSelectElement;
    expect(select).toBeTruthy();
    const options = select.querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(SAMPLE_ROSTER.length);
  });

  it('adding a relationship shows pending addition in green', async () => {
    await el.updateComplete;
    const addBtn = el.shadowRoot!.querySelector('.add-relationship') as HTMLElement;
    addBtn.click();
    await el.updateComplete;

    const targetPicker = el.shadowRoot!.querySelector('.add-form select.target-picker') as HTMLSelectElement;
    targetPicker.value = 'eve';
    targetPicker.dispatchEvent(new Event('change'));

    const confirmAdd = el.shadowRoot!.querySelector('.add-form .btn-add-confirm') as HTMLElement;
    confirmAdd.click();
    await el.updateComplete;

    const pendingRows = el.shadowRoot!.querySelectorAll('.pending-addition');
    expect(pendingRows.length).toBe(1);
  });

  it('delete marks row as pending removal with strikethrough', async () => {
    await el.updateComplete;
    const deleteBtn = el.shadowRoot!.querySelector('.relationship-row .btn-delete') as HTMLElement;
    expect(deleteBtn).toBeTruthy();
    deleteBtn.click();
    await el.updateComplete;
    const pendingRows = el.shadowRoot!.querySelectorAll('.pending-removal');
    expect(pendingRows.length).toBe(1);
  });

  it('emits relationship:changed with changeset on confirm', async () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler as EventListener);
    await el.updateComplete;

    const deleteBtn = el.shadowRoot!.querySelector('.relationship-row .btn-delete') as HTMLElement;
    deleteBtn.click();
    await el.updateComplete;

    const confirmBtn = el.shadowRoot!.querySelector('.btn-confirm') as HTMLElement;
    expect(confirmBtn).toBeTruthy();
    confirmBtn.click();

    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('relationship:changed');
    expect(detail.payload.removals).toHaveLength(1);
    expect(detail.payload.additions).toBeDefined();
  });

  it('handles empty relationships gracefully', async () => {
    const empty = document.createElement('agent-relationship-editor') as EditorEl;
    empty.agentId = 'alice';
    empty.relationships = [];
    empty.roster = SAMPLE_ROSTER;
    document.body.appendChild(empty);
    await empty.updateComplete;
    const emptyState = empty.shadowRoot!.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    empty.remove();
  });

  describe('tab ARIA', () => {
    it('renders tablist with three tabs', async () => {
      await el.updateComplete;
      const tablist = el.shadowRoot!.querySelector('[role="tablist"]');
      expect(tablist).toBeTruthy();
      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
      expect(tabs).toHaveLength(2);
    });

    it('marks active tab with aria-selected', async () => {
      await el.updateComplete;
      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
      const activeTab = Array.from(tabs).find(t => t.getAttribute('aria-selected') === 'true');
      expect(activeTab).toBeTruthy();
      expect(activeTab!.textContent!.trim()).toBe('Table');
    });

    it('each tab has aria-controls pointing to a tabpanel id', async () => {
      await el.updateComplete;
      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
      for (const tab of Array.from(tabs)) {
        expect(tab.getAttribute('aria-controls')).toBeTruthy();
      }
    });
  });

  describe('diagram tab', () => {
    it('renders agency-org-diagram with readonly when diagram tab is active', async () => {
      await el.updateComplete;
      const diagramTab = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'))
        .find(t => t.textContent!.trim() === 'Diagram') as HTMLElement;
      diagramTab.click();
      await el.updateComplete;

      const diagram = el.shadowRoot!.querySelector('agency-org-diagram');
      expect(diagram).toBeTruthy();
      expect(diagram!.hasAttribute('readonly')).toBe(true);
    });

    it('diagram tabpanel has aria-labelledby', async () => {
      await el.updateComplete;
      const diagramTab = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'))
        .find(t => t.textContent!.trim() === 'Diagram') as HTMLElement;
      diagramTab.click();
      await el.updateComplete;

      const tabpanel = el.shadowRoot!.querySelector('[role="tabpanel"]');
      expect(tabpanel).toBeTruthy();
      expect(tabpanel!.getAttribute('aria-labelledby')).toBe('tab-diagram');
    });

    it('diagram receives yaml from roster and relationships', async () => {
      await el.updateComplete;
      const diagramTab = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'))
        .find(t => t.textContent!.trim() === 'Diagram') as HTMLElement;
      diagramTab.click();
      await el.updateComplete;

      const diagram = el.shadowRoot!.querySelector('agency-org-diagram') as any;
      expect(diagram).toBeTruthy();
      expect(diagram.yaml).toBeTruthy();
      expect(diagram.yaml).toContain('alice');
    });

    it('passes agents property through to diagram', async () => {
      el.agents = { alice: { profession: 'Engineer' } };
      await el.updateComplete;
      const diagramTab = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'))
        .find(t => t.textContent!.trim() === 'Diagram') as HTMLElement;
      diagramTab.click();
      await el.updateComplete;

      const diagram = el.shadowRoot!.querySelector('agency-org-diagram') as any;
      expect(diagram.agents).toEqual({ alice: { profession: 'Engineer' } });
    });
  });

  describe('bidirectional interaction', () => {
    it('updates agentId when diagram agent node is clicked', async () => {
      await el.updateComplete;
      const diagramTab = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'))
        .find(t => t.textContent!.trim() === 'Diagram') as HTMLElement;
      diagramTab.click();
      await el.updateComplete;

      el.dispatchEvent(new CustomEvent('pages-event', {
        detail: {
          topic: 'relationship-editor:diagram:agent-selected',
          payload: { nodeId: 'agent:u1:bob' },
        },
        bubbles: true,
        composed: true,
      }));
      await el.updateComplete;

      expect(el.agentId).toBe('bob');
    });

    it('ignores unit node clicks', async () => {
      await el.updateComplete;

      el.dispatchEvent(new CustomEvent('pages-event', {
        detail: {
          topic: 'relationship-editor:diagram:agent-selected',
          payload: { nodeId: 'unit:u1' },
        },
        bubbles: true,
        composed: true,
      }));
      await el.updateComplete;

      expect(el.agentId).toBe('alice');
    });
  });

  describe('richer table rows', () => {
    it('renders avatar when agents property has avatar code', async () => {
      el.agents = { bob: { avatar: 'mythic:P15', profession: 'Engineer' } };
      await el.updateComplete;

      const avatar = el.shadowRoot!.querySelector('agent-avatar');
      expect(avatar).toBeTruthy();
    });

    it('renders profession badge when agents property has profession', async () => {
      el.agents = { bob: { profession: 'Engineer', role: 'Senior' } };
      await el.updateComplete;

      const profession = el.shadowRoot!.querySelector('.agent-profession');
      expect(profession).toBeTruthy();
      expect(profession!.textContent).toContain('Engineer');
    });

    it('falls back to name only when no agents property', async () => {
      await el.updateComplete;

      const avatar = el.shadowRoot!.querySelector('agent-avatar');
      expect(avatar).toBeFalsy();
      const name = el.shadowRoot!.querySelector('.agent-name');
      expect(name).toBeTruthy();
    });
  });
});
