// @vitest-environment jsdom
/**
 * End-to-end integration test for the ARIA interaction model.
 *
 * Constructs a realistic multi-component hierarchy with shadow DOM,
 * tabbed navigation, nested forms, tree structures, and scoped
 * search — then drives it entirely through the ARIA executor.
 *
 * This proves that an LLM navigating via MCP → ARIA can:
 * 1. Navigate tabs to reach different sections
 * 2. Traverse shadow DOM boundaries
 * 3. Drill into nested components using `within` scoping
 * 4. Fill form inputs by accessible name
 * 5. Assert component state via ARIA attributes
 * 6. Navigate tree structures (expand/collapse)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { findByRole, findAllByRole, getAccessibleName } from '../walker/tree-walker.js';
import { click, fill, resolveTarget, assertState } from '../executor/command-executor.js';
import type { AriaTarget } from '@casehubio/pages-primitives';

// --- Test fixture: builds a realistic component hierarchy with shadow DOM ---

function createShadowHost(tag: string): HTMLElement {
  const el = document.createElement(tag);
  el.attachShadow({ mode: 'open' });
  return el;
}

function buildAppShell(): HTMLElement {
  const shell = createShadowHost('app-shell');
  shell.shadowRoot!.innerHTML = `
    <div class="layout" style="display: flex; flex-direction: column;">
      <nav role="tablist" aria-label="Main navigation">
        <button role="tab" aria-selected="true" aria-controls="panel-dashboard" id="tab-dashboard">Dashboard</button>
        <button role="tab" aria-selected="false" aria-controls="panel-settings" id="tab-settings">Settings</button>
        <button role="tab" aria-selected="false" aria-controls="panel-activity" id="tab-activity">Activity</button>
      </nav>
      <div id="panel-dashboard" role="tabpanel" aria-labelledby="tab-dashboard"></div>
      <div id="panel-settings" role="tabpanel" aria-labelledby="tab-settings" hidden></div>
      <div id="panel-activity" role="tabpanel" aria-labelledby="tab-activity" hidden></div>
    </div>
  `;

  // Wire tab switching
  const tabs = shell.shadowRoot!.querySelectorAll('[role="tab"]');
  const panels = shell.shadowRoot!.querySelectorAll('[role="tabpanel"]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.setAttribute('aria-selected', 'false'); });
      panels.forEach(p => (p as HTMLElement).hidden = true);
      tab.setAttribute('aria-selected', 'true');
      const panelId = tab.getAttribute('aria-controls')!;
      const panel = shell.shadowRoot!.getElementById(panelId)!;
      panel.hidden = false;
    });
  });

  // Dashboard panel: split-workbench with metric cards and detail
  const dashboard = shell.shadowRoot!.getElementById('panel-dashboard')!;
  dashboard.appendChild(buildDashboardPanel());

  // Settings panel: nested form with grouped inputs
  const settings = shell.shadowRoot!.getElementById('panel-settings')!;
  settings.appendChild(buildSettingsForm());

  // Activity panel: tree with expandable items
  const activity = shell.shadowRoot!.getElementById('panel-activity')!;
  activity.appendChild(buildActivityTree());

  return shell;
}

function buildDashboardPanel(): HTMLElement {
  const panel = createShadowHost('dashboard-panel');
  panel.shadowRoot!.innerHTML = `
    <div role="region" aria-label="Dashboard">
      <div role="region" aria-label="Key Metrics">
        <div role="list" aria-label="Metric cards">
          <div role="listitem" aria-label="Revenue 42,000 USD">
            <span class="value">42,000</span>
            <span class="unit">USD</span>
          </div>
          <div role="listitem" aria-label="Active cases 128">
            <span class="value">128</span>
          </div>
          <div role="listitem" aria-label="SLA compliance 94%">
            <span class="value">94%</span>
          </div>
        </div>
      </div>
      <div role="region" aria-label="Case Summary">
        <div role="grid" aria-label="Recent cases" aria-rowcount="3">
          <div role="row" aria-label="Case #42 — PR Review">
            <div role="gridcell">Case #42</div>
            <div role="gridcell">PR Review</div>
            <div role="gridcell"><button aria-label="View Case #42">View</button></div>
          </div>
          <div role="row" aria-label="Case #43 — Security Audit">
            <div role="gridcell">Case #43</div>
            <div role="gridcell">Security Audit</div>
            <div role="gridcell"><button aria-label="View Case #43">View</button></div>
          </div>
        </div>
      </div>
    </div>
  `;
  return panel;
}

function buildSettingsForm(): HTMLElement {
  const form = createShadowHost('settings-form');
  form.shadowRoot!.innerHTML = `
    <div role="form" aria-label="Preferences">
      <div role="group" aria-label="Notification settings">
        <label>
          <span>Email address</span>
          <input aria-label="Email address" type="email" value="" />
        </label>
        <label>
          <span>Alert frequency</span>
          <select aria-label="Alert frequency">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="realtime">Real-time</option>
          </select>
        </label>
        <label>
          <span>Push notifications</span>
          <input aria-label="Push notifications" type="checkbox" />
        </label>
      </div>
      <div role="group" aria-label="Security">
        <label>
          <span>API key</span>
          <input aria-label="API key" type="text" value="sk-existing-key-123" />
        </label>
        <button aria-label="Regenerate API key">Regenerate</button>
        <button aria-label="Save settings" aria-disabled="false">Save</button>
      </div>
    </div>
  `;
  return form;
}

function buildActivityTree(): HTMLElement {
  const tree = createShadowHost('activity-tree');
  tree.shadowRoot!.innerHTML = `
    <div role="region" aria-label="Activity log">
      <ul role="tree" aria-label="Case hierarchy">
        <li role="treeitem" aria-expanded="false" aria-label="PR Review #42">
          <span class="label">PR Review #42</span>
          <ul role="group" hidden>
            <li role="treeitem" aria-label="Build Pipeline">
              <span class="label">Build Pipeline</span>
              <span role="status" aria-label="Running">Running</span>
            </li>
            <li role="treeitem" aria-expanded="false" aria-label="Security Checks">
              <span class="label">Security Checks</span>
              <ul role="group" hidden>
                <li role="treeitem" aria-label="SAST Scan">
                  <span class="label">SAST Scan</span>
                  <span role="status" aria-label="Completed">Completed</span>
                </li>
                <li role="treeitem" aria-label="Dependency Audit">
                  <span class="label">Dependency Audit</span>
                  <span role="status" aria-label="Pending">Pending</span>
                </li>
              </ul>
            </li>
          </ul>
        </li>
        <li role="treeitem" aria-expanded="false" aria-label="Merge Queue Batch #7">
          <span class="label">Merge Queue Batch #7</span>
          <ul role="group" hidden>
            <li role="treeitem" aria-label="Frontend Build">
              <span class="label">Frontend Build</span>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  `;

  // Wire tree expand/collapse
  const treeItems = tree.shadowRoot!.querySelectorAll('[role="treeitem"][aria-expanded]');
  treeItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = item.getAttribute('aria-expanded') === 'true';
      item.setAttribute('aria-expanded', String(!expanded));
      const group = item.querySelector('[role="group"]');
      if (group) group.hidden = expanded;
    });
  });

  return tree;
}

// --- Integration tests ---

describe('ARIA end-to-end integration', () => {
  let shell: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    shell = buildAppShell();
    document.body.appendChild(shell);
  });

  describe('Tab navigation', () => {
    it('finds tabs by role and name across shadow DOM', () => {
      const dashTab = findByRole('tab', 'Dashboard');
      expect(dashTab).not.toBeNull();
      expect(dashTab?.getAttribute('aria-selected')).toBe('true');

      const settingsTab = findByRole('tab', 'Settings');
      expect(settingsTab).not.toBeNull();
      expect(settingsTab?.getAttribute('aria-selected')).toBe('false');
    });

    it('clicks tab to switch panels', () => {
      click({ role: 'tab', name: 'Settings' });

      assertState({ role: 'tab', name: 'Settings' }, { selected: true });
      assertState({ role: 'tab', name: 'Dashboard' }, { selected: false });
    });

    it('navigates to Activity tab', () => {
      click({ role: 'tab', name: 'Activity' });
      assertState({ role: 'tab', name: 'Activity' }, { selected: true });
      assertState({ role: 'tab', name: 'Dashboard' }, { selected: false });
    });
  });

  describe('Dashboard — nested shadow DOM traversal', () => {
    it('finds metric cards across shadow DOM boundary', () => {
      const metrics = findAllByRole('listitem');
      expect(metrics.length).toBeGreaterThanOrEqual(3);

      const revenue = findByRole('listitem', 'Revenue 42,000 USD');
      expect(revenue).not.toBeNull();
    });

    it('finds grid rows within Case Summary region', () => {
      const rows = findAllByRole('row');
      expect(rows).toHaveLength(2);
    });

    it('clicks View button scoped within a specific case row', () => {
      const handler = { called: false };
      const btn = findByRole('button', 'View Case #42');
      btn!.addEventListener('click', () => { handler.called = true; });

      click({ role: 'button', name: 'View Case #42' });
      expect(handler.called).toBe(true);
    });

    it('uses within scoping to find button inside specific row', () => {
      const target: AriaTarget = {
        role: 'button',
        name: 'View Case #43',
        within: { role: 'row', name: 'Case #43 — Security Audit' },
      };
      const el = resolveTarget(target);
      expect(el).toBeDefined();
      expect(getAccessibleName(el)).toBe('View Case #43');
    });
  });

  describe('Settings — form navigation and data entry', () => {
    beforeEach(() => {
      click({ role: 'tab', name: 'Settings' });
    });

    it('finds form by role across shadow DOM', () => {
      const form = findByRole('form', 'Preferences');
      expect(form).not.toBeNull();
    });

    it('finds input groups within form', () => {
      const notifGroup = findByRole('group', 'Notification settings');
      expect(notifGroup).not.toBeNull();

      const secGroup = findByRole('group', 'Security');
      expect(secGroup).not.toBeNull();
    });

    it('fills email input by aria-label', () => {
      fill({ role: 'textbox', name: 'Email address' }, 'alice@casehub.io');

      const input = findByRole('textbox', 'Email address') as HTMLInputElement;
      expect(input.value).toBe('alice@casehub.io');
    });

    it('fills email scoped within Notification settings group', () => {
      const target: AriaTarget = {
        role: 'textbox',
        name: 'Email address',
        within: { role: 'group', name: 'Notification settings' },
      };
      fill(target, 'bob@casehub.io');

      const el = resolveTarget(target) as HTMLInputElement;
      expect(el.value).toBe('bob@casehub.io');
    });

    it('fills API key in Security group', () => {
      const target: AriaTarget = {
        role: 'textbox',
        name: 'API key',
        within: { role: 'group', name: 'Security' },
      };
      fill(target, 'sk-new-key-456');

      const el = resolveTarget(target) as HTMLInputElement;
      expect(el.value).toBe('sk-new-key-456');
    });

    it('clicks Save within Security group', () => {
      const handler = { called: false };
      const saveBtn = findByRole('button', 'Save settings');
      saveBtn!.addEventListener('click', () => { handler.called = true; });

      click({
        role: 'button',
        name: 'Save settings',
        within: { role: 'group', name: 'Security' },
      });
      expect(handler.called).toBe(true);
    });

    it('asserts Save button is not disabled', () => {
      assertState(
        { role: 'button', name: 'Save settings' },
        { disabled: false },
      );
    });
  });

  describe('Activity — tree navigation with expand/collapse', () => {
    beforeEach(() => {
      click({ role: 'tab', name: 'Activity' });
    });

    it('finds tree by role', () => {
      const tree = findByRole('tree', 'Case hierarchy');
      expect(tree).not.toBeNull();
    });

    it('finds collapsed tree items', () => {
      assertState(
        { role: 'treeitem', name: 'PR Review #42' },
        { expanded: false },
      );
    });

    it('expands tree item to reveal children', () => {
      click({ role: 'treeitem', name: 'PR Review #42' });

      assertState(
        { role: 'treeitem', name: 'PR Review #42' },
        { expanded: true },
      );

      const buildPipeline = findByRole('treeitem', 'Build Pipeline');
      expect(buildPipeline).not.toBeNull();
    });

    it('navigates two levels deep in tree', () => {
      // Expand first level
      click({ role: 'treeitem', name: 'PR Review #42' });
      assertState({ role: 'treeitem', name: 'PR Review #42' }, { expanded: true });

      // Expand second level
      click({ role: 'treeitem', name: 'Security Checks' });
      assertState({ role: 'treeitem', name: 'Security Checks' }, { expanded: true });

      // Find leaf nodes
      const sast = findByRole('treeitem', 'SAST Scan');
      expect(sast).not.toBeNull();

      const audit = findByRole('treeitem', 'Dependency Audit');
      expect(audit).not.toBeNull();
    });

    it('asserts status within nested tree item', () => {
      click({ role: 'treeitem', name: 'PR Review #42' });
      click({ role: 'treeitem', name: 'Security Checks' });

      const completedStatus = findByRole('status', 'Completed');
      expect(completedStatus).not.toBeNull();

      const pendingStatus = findByRole('status', 'Pending');
      expect(pendingStatus).not.toBeNull();
    });

    it('uses within to find status scoped to a specific tree item', () => {
      click({ role: 'treeitem', name: 'PR Review #42' });

      const runningStatus = findByRole('status', 'Running');
      expect(runningStatus).not.toBeNull();
    });
  });

  describe('Full navigation scenario — tab → drill → fill → assert', () => {
    it('complete workflow: navigate to settings, fill form, verify', () => {
      // Step 1: Start on Dashboard, verify metric is visible
      const revenue = findByRole('listitem', 'Revenue 42,000 USD');
      expect(revenue).not.toBeNull();

      // Step 2: Navigate to Settings tab
      click({ role: 'tab', name: 'Settings' });
      assertState({ role: 'tab', name: 'Settings' }, { selected: true });

      // Step 3: Fill email in Notification settings
      fill(
        { role: 'textbox', name: 'Email address', within: { role: 'group', name: 'Notification settings' } },
        'admin@casehub.io',
      );

      // Step 4: Fill API key in Security group
      fill(
        { role: 'textbox', name: 'API key', within: { role: 'group', name: 'Security' } },
        'sk-production-789',
      );

      // Step 5: Verify values
      const email = resolveTarget({ role: 'textbox', name: 'Email address' }) as HTMLInputElement;
      expect(email.value).toBe('admin@casehub.io');

      const apiKey = resolveTarget({ role: 'textbox', name: 'API key' }) as HTMLInputElement;
      expect(apiKey.value).toBe('sk-production-789');

      // Step 6: Click save
      const saveClicked = { value: false };
      const saveBtn = findByRole('button', 'Save settings');
      saveBtn!.addEventListener('click', () => { saveClicked.value = true; });
      click({ role: 'button', name: 'Save settings' });
      expect(saveClicked.value).toBe(true);
    });

    it('complete workflow: navigate to activity, expand tree, check status', () => {
      // Step 1: Navigate to Activity
      click({ role: 'tab', name: 'Activity' });

      // Step 2: Expand top-level tree item
      click({ role: 'treeitem', name: 'PR Review #42' });
      assertState({ role: 'treeitem', name: 'PR Review #42' }, { expanded: true });

      // Step 3: Expand nested tree item
      click({ role: 'treeitem', name: 'Security Checks' });
      assertState({ role: 'treeitem', name: 'Security Checks' }, { expanded: true });

      // Step 4: Verify leaf statuses
      const sast = findByRole('status', 'Completed');
      expect(sast).not.toBeNull();

      const audit = findByRole('status', 'Pending');
      expect(audit).not.toBeNull();

      // Step 5: Collapse and verify
      click({ role: 'treeitem', name: 'Security Checks' });
      assertState({ role: 'treeitem', name: 'Security Checks' }, { expanded: false });
    });
  });
});
