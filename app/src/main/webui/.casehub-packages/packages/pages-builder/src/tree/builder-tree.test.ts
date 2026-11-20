import { describe, it, expect, afterEach } from 'vitest';
import { PageDocument } from '@casehubio/pages-document';
import { buildTreeModel, PagesBuilderTree } from './builder-tree.js';
import { computeMenuItems } from './tree-context-menu.js';

const MINIMAL_PAGE = `pages:
- name: Overview
  components:
  - type: title
    properties:
      text: Hello
`;

const ROWS_PAGE = `pages:
- name: Dashboard
  rows:
  - columns:
    - span: 6
      components:
      - type: bar-chart
        properties:
          subtype: column
    - span: 6
      components:
      - type: pie-chart
`;

const WITH_DATASETS = `datasets:
- uuid: sales_tx
  name: Sales
  url: /api/sales
pages:
- name: Overview
  components:
  - type: metric
    properties:
      lookup:
        uuid: sales_tx
`;

const WITH_TABS = `pages:
- name: Overview
  components:
  - type: tabs
    tabs:
      Tab 1:
        components:
        - type: title
          properties:
            text: First
      Tab 2:
        components:
        - type: title
          properties:
            text: Second
`;

const WITH_NAV = `pages:
- name: Overview
  components:
  - type: title
navTree:
  root_items:
  - type: GROUP
    id: main-group
    children:
    - type: ITEM
      page: Overview
`;

// --- Model builder tests (pure logic) ---

describe('buildTreeModel', () => {
  it('builds Pages section from minimal page', () => {
    const doc = PageDocument.parse(MINIMAL_PAGE);
    const model = buildTreeModel(doc);
    expect(model).toHaveLength(1);
    expect(model[0]!.label).toBe('Pages');
    expect(model[0]!.nodeType).toBe('section');
    expect(model[0]!.children).toHaveLength(1);

    const page = model[0]!.children[0]!;
    expect(page.label).toBe('Overview');
    expect(page.nodeType).toBe('page');
    expect(page.children).toHaveLength(1);

    const comp = page.children[0]!;
    expect(comp.nodeType).toBe('component');
    expect(comp.label).toBe('Hello');
  });

  it('builds row > column > component hierarchy', () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    const model = buildTreeModel(doc);
    const page = model[0]!.children[0]!;
    expect(page.children).toHaveLength(1);

    const row = page.children[0]!;
    expect(row.nodeType).toBe('row');
    expect(row.label).toBe('Row');
    expect(row.children).toHaveLength(2);

    const col1 = row.children[0]!;
    expect(col1.nodeType).toBe('column');
    expect(col1.label).toBe('Column (6)');
    expect(col1.children).toHaveLength(1);
    expect(col1.children[0]!.label).toBe('Bar Chart');
  });

  it('builds Datasets section', () => {
    const doc = PageDocument.parse(WITH_DATASETS);
    const model = buildTreeModel(doc);
    expect(model[0]!.label).toBe('Datasets');
    expect(model[0]!.children).toHaveLength(1);

    const ds = model[0]!.children[0]!;
    expect(ds.nodeType).toBe('dataset');
    expect(ds.label).toBe('Sales');
  });

  it('derives label from lookup.uuid', () => {
    const doc = PageDocument.parse(WITH_DATASETS);
    const model = buildTreeModel(doc);
    const pagesSection = model.find(s => s.label === 'Pages')!;
    const metricNode = pagesSection.children[0]!.children[0]!;
    expect(metricNode.label).toBe('sales_tx');
  });

  it('builds container children for tabs', () => {
    const doc = PageDocument.parse(WITH_TABS);
    const model = buildTreeModel(doc);
    const tabsNode = model[0]!.children[0]!.children[0]!;
    expect(tabsNode.label).toBe('Tabs');
    expect(tabsNode.children).toHaveLength(2);
    expect(tabsNode.children[0]!.label).toBe('Tab 1');
    expect(tabsNode.children[0]!.children[0]!.label).toBe('First');
    expect(tabsNode.children[1]!.label).toBe('Tab 2');
  });

  it('builds Navigation section', () => {
    const doc = PageDocument.parse(WITH_NAV);
    const model = buildTreeModel(doc);
    const navSection = model.find(s => s.label === 'Navigation');
    expect(navSection).toBeDefined();
    expect(navSection!.children).toHaveLength(1);
    expect(navSection!.children[0]!.label).toBe('main-group');
    expect(navSection!.children[0]!.nodeType).toBe('nav-item');
    expect(navSection!.children[0]!.children).toHaveLength(1);
  });

  it('returns empty array for empty document', () => {
    const doc = PageDocument.empty();
    expect(buildTreeModel(doc)).toHaveLength(0);
  });

  it('uses component type as fallback label', () => {
    const doc = PageDocument.parse(`pages:\n- name: P\n  components:\n  - type: bar-chart\n`);
    const model = buildTreeModel(doc);
    const comp = model[0]!.children[0]!.children[0]!;
    expect(comp.label).toBe('Bar Chart');
  });

  it('builds Modules section when modules present', () => {
    const doc = PageDocument.parse(`modules:\n  greeting:\n    parameters:\n      name:\n        type: STRING\npages:\n- name: P\n  components:\n  - type: title\n`);
    const model = buildTreeModel(doc);
    const modulesSection = model.find(s => s.label === 'Modules');
    expect(modulesSection).toBeDefined();
    expect(modulesSection!.nodeType).toBe('section');
    expect(modulesSection!.children).toHaveLength(1);
    expect(modulesSection!.children[0]!.label).toBe('greeting');
    expect(modulesSection!.children[0]!.nodeType).toBe('module');
  });

  it('builds Imports section when imports present', () => {
    const doc = PageDocument.parse(`imports:\n  - module: greeting\n    as: hi\npages:\n- name: P\n  components:\n  - type: title\n`);
    const model = buildTreeModel(doc);
    const importsSection = model.find(s => s.label === 'Imports');
    expect(importsSection).toBeDefined();
    expect(importsSection!.nodeType).toBe('section');
    expect(importsSection!.children).toHaveLength(1);
    expect(importsSection!.children[0]!.label).toBe('hi');
    expect(importsSection!.children[0]!.nodeType).toBe('import');
  });

  it('builds Variables section when variables present', () => {
    const doc = PageDocument.parse(`variables:\n  theme:\n    color: blue\npages:\n- name: P\n  components:\n  - type: title\n`);
    const model = buildTreeModel(doc);
    const varsSection = model.find(s => s.label === 'Variables');
    expect(varsSection).toBeDefined();
    expect(varsSection!.nodeType).toBe('section');
    expect(varsSection!.children).toHaveLength(1);
    expect(varsSection!.children[0]!.label).toBe('theme');
    expect(varsSection!.children[0]!.nodeType).toBe('variable');
  });
});

describe('computeMenuItems', () => {
  it('returns component actions for component nodes', () => {
    const items = computeMenuItems('component', false);
    const actions = items.filter(i => !i.separator).map(i => i.action ?? i.label);
    expect(actions).toContain('delete');
    expect(actions).toContain('duplicate');
    expect(actions).toContain('move-up');
    expect(actions).toContain('move-down');
  });

  it('includes add-child for container components', () => {
    const items = computeMenuItems('component', true);
    expect(items.find(i => i.action === 'add-child')).toBeDefined();
  });

  it('does not include add-child for non-container components', () => {
    const items = computeMenuItems('component', false);
    expect(items.find(i => i.action === 'add-child')).toBeUndefined();
  });

  it('returns wrap submenu for components', () => {
    const items = computeMenuItems('component', false);
    const wrapItem = items.find(i => i.label === 'Wrap in…');
    expect(wrapItem).toBeDefined();
    expect(wrapItem!.children).toBeDefined();
    expect(wrapItem!.children!.find(c => c.action === 'wrap-tabs')).toBeDefined();
  });

  it('returns row actions for row nodes', () => {
    const items = computeMenuItems('row', false);
    const actions = items.filter(i => !i.separator).map(i => i.action);
    expect(actions).toContain('move-up');
    expect(actions).toContain('add-column');
    expect(actions).toContain('delete');
  });

  it('returns page actions for page nodes', () => {
    const items = computeMenuItems('page', false);
    const actions = items.filter(i => !i.separator).map(i => i.action);
    expect(actions).toContain('add-row');
    expect(actions).toContain('add-child');
    expect(actions).toContain('delete');
  });

  it('returns dataset actions for dataset nodes', () => {
    const items = computeMenuItems('dataset', false);
    const actions = items.filter(i => !i.separator).map(i => i.action);
    expect(actions).toContain('duplicate');
    expect(actions).toContain('delete');
    expect(actions).not.toContain('move-up');
  });

  it('returns empty for section nodes', () => {
    expect(computeMenuItems('section', false)).toHaveLength(0);
  });
});

describe('PagesBuilderTree interactions', () => {
  let el: PagesBuilderTree;

  afterEach(() => {
    el?.remove();
  });

  it('shows + button on container nodes on hover', async () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const addBtns = el.shadowRoot!.querySelectorAll('.add-btn');
    expect(addBtns.length).toBeGreaterThan(0);
  });

  it('add-btn stays in layout flow to prevent hover shift', () => {
    const cssText = (PagesBuilderTree as unknown as { styles: { cssText: string } }).styles.cssText;
    expect(cssText).not.toMatch(/\.add-btn\s*\{[^}]*display:\s*none/);
    expect(cssText).toMatch(/\.add-btn\s*\{[^}]*opacity:\s*0/);
  });

  it('fires tree-action with delete on Delete key', async () => {
    const doc = PageDocument.parse(MINIMAL_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const compPath = buildTreeModel(doc)[0]!.children[0]!.children[0]!.path;
    el.selectedPath = compPath;
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('tree-action', (e: Event) => { events.push(e as CustomEvent); });

    const tree = el.shadowRoot!.querySelector('[role="tree"]')!;
    tree.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.action).toBe('delete');
  });

  it('fires tree-add on + button click', async () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('tree-add', (e: Event) => { events.push(e as CustomEvent); });

    const addBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.add-btn')!;
    addBtn.click();

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.path).toBeDefined();
  });

  it('tree-add event includes target element for picker positioning', async () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('tree-add', (e: Event) => { events.push(e as CustomEvent); });

    const addBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.add-btn')!;
    addBtn.click();

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.target).toBeInstanceOf(HTMLElement);
  });

  it('renders insert button on every non-section node', async () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const insertBtns = el.shadowRoot!.querySelectorAll('.insert-btn');
    const nonSectionItems = el.shadowRoot!.querySelectorAll('[data-node-type]:not([data-node-type="section"])');
    expect(insertBtns.length).toBe(nonSectionItems.length);
  });

  it('renders cut and copy buttons on every non-section node', async () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const cutBtns = el.shadowRoot!.querySelectorAll('.cut-btn');
    const copyBtns = el.shadowRoot!.querySelectorAll('.copy-btn');
    const nonSectionItems = el.shadowRoot!.querySelectorAll('[data-node-type]:not([data-node-type="section"])');
    expect(cutBtns.length).toBe(nonSectionItems.length);
    expect(copyBtns.length).toBe(nonSectionItems.length);
  });

  it('fires tree-cut on cut button click', async () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('tree-cut', (e: Event) => { events.push(e as CustomEvent); });

    const cutBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.cut-btn')!;
    cutBtn.click();

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.path).toBeDefined();
    expect(events[0]!.detail.nodeType).toBeDefined();
  });

  it('fires tree-copy on copy button click', async () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('tree-copy', (e: Event) => { events.push(e as CustomEvent); });

    const copyBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.copy-btn')!;
    copyBtn.click();

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.path).toBeDefined();
  });

  it('fires tree-insert on insert button click', async () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('tree-insert', (e: Event) => { events.push(e as CustomEvent); });

    const insertBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.insert-btn')!;
    insertBtn.click();

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.path).toBeDefined();
    expect(events[0]!.detail.target).toBeInstanceOf(HTMLElement);
  });

  it('highlights valid paste targets when insert mode active for component', async () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    el.clipboardFragmentType = 'component';
    el.insertMode = true;
    await el.updateComplete;

    const validTargets = el.shadowRoot!.querySelectorAll('.paste-target');
    expect(validTargets.length).toBeGreaterThan(0);
    const pageTargets = el.shadowRoot!.querySelectorAll('[data-node-type="page"].paste-target');
    expect(pageTargets.length).toBeGreaterThan(0);
  });

  it('does not highlight sections as paste targets', async () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    el.clipboardFragmentType = 'component';
    el.insertMode = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const sectionTargets = el.shadowRoot!.querySelectorAll('[data-node-type="section"].paste-target');
    expect(sectionTargets.length).toBe(0);
  });

  it('clears paste-target class when insert mode is false', async () => {
    const doc = PageDocument.parse(ROWS_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    el.clipboardFragmentType = 'component';
    el.insertMode = true;
    document.body.appendChild(el);
    await el.updateComplete;

    el.insertMode = false;
    await el.updateComplete;

    const targets = el.shadowRoot!.querySelectorAll('.paste-target');
    expect(targets.length).toBe(0);
  });

  it('opens context menu on right-click', async () => {
    const doc = PageDocument.parse(MINIMAL_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const treeItem = el.shadowRoot!.querySelector('[data-node-type="page"]')!;
    treeItem.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }));
    await el.updateComplete;

    const menu = el.shadowRoot!.querySelector('pages-context-menu');
    expect(menu).toBeTruthy();
    expect((menu as any).open).toBe(true);
  });
});

// --- DOM rendering tests ---

describe('PagesBuilderTree', () => {
  let el: PagesBuilderTree;

  afterEach(() => {
    el?.remove();
  });

  it('renders page nodes as tree items', async () => {
    const doc = PageDocument.parse(MINIMAL_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('[role="treeitem"]');
    expect(items.length).toBeGreaterThan(0);

    const tree = el.shadowRoot!.querySelector('[role="tree"]');
    expect(tree).toBeTruthy();
    expect(tree!.getAttribute('aria-label')).toBe('Document outline');
  });

  it('renders with correct aria-level', async () => {
    const doc = PageDocument.parse(MINIMAL_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('[role="treeitem"]');
    const levels = Array.from(items).map(i => i.getAttribute('aria-level'));
    expect(levels).toContain('1');
    expect(levels).toContain('2');
  });

  it('emits node-select on click', async () => {
    const doc = PageDocument.parse(MINIMAL_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('node-select', (e: Event) => { events.push(e as CustomEvent); });

    const pageItem = el.shadowRoot!.querySelector('[data-node-type="page"]') as HTMLElement;
    pageItem?.click();

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.nodeType).toBe('page');
    expect(events[0]!.detail.path).toBeDefined();
  });

  it('sections start expanded and toggle on click', async () => {
    const doc = PageDocument.parse(MINIMAL_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    const section = el.shadowRoot!.querySelector('[data-node-type="section"]') as HTMLElement;
    expect(section?.getAttribute('aria-expanded')).toBe('true');

    section?.click();
    await el.updateComplete;

    expect(section?.getAttribute('aria-expanded')).toBe('false');
  });

  it('updates tree when document changes', async () => {
    const doc = PageDocument.parse(MINIMAL_PAGE);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    document.body.appendChild(el);
    await el.updateComplete;

    doc.addPage('New Page');
    await el.updateComplete;

    const labels = Array.from(el.shadowRoot!.querySelectorAll('.label')).map(l => l.textContent);
    expect(labels).toContain('New Page');
  });

  it('renders empty when no document set', async () => {
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    document.body.appendChild(el);
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('[role="treeitem"]');
    expect(items).toHaveLength(0);
  });
});

describe('Tree insertion points', () => {
  let el: PagesBuilderTree;

  afterEach(() => el?.remove());

  const THREE_COMPS = `pages:
- name: P1
  components:
  - type: bar-chart
  - type: title
  - type: input
`;

  async function setup(yaml: string, expandPath?: readonly (string | number)[]): Promise<void> {
    const doc = PageDocument.parse(yaml);
    el = document.createElement('pages-builder-tree') as PagesBuilderTree;
    el.document = doc;
    if (expandPath) el.selectedPath = expandPath;
    document.body.appendChild(el);
    await el.updateComplete;
  }

  it('renders N+1 insertion points for N children of expanded container', async () => {
    await setup(THREE_COMPS, ['pages', 0, 'components', 0]);
    const points = el.shadowRoot!.querySelectorAll('.tree-insertion-point');
    expect(points.length).toBe(4);
  });

  it('does not render insertion points for collapsed containers', async () => {
    await setup(THREE_COMPS);
    const points = el.shadowRoot!.querySelectorAll('.tree-insertion-point');
    expect(points.length).toBe(0);
  });

  it('insertion points have correct data-index attributes', async () => {
    await setup(THREE_COMPS, ['pages', 0, 'components', 0]);
    const points = el.shadowRoot!.querySelectorAll('.tree-insertion-point');
    const indices = Array.from(points).map(p => p.getAttribute('data-index'));
    expect(indices).toEqual(['0', '1', '2', '3']);
  });

  it('insertion point fires tree-insert-at with correct detail', async () => {
    await setup(THREE_COMPS, ['pages', 0, 'components', 0]);
    let detail: any;
    el.addEventListener('tree-insert-at', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });

    const point = el.shadowRoot!.querySelector('.tree-insertion-point') as HTMLElement;
    point.click();
    expect(detail).toBeTruthy();
    expect(detail.index).toBe(0);
    expect(detail.parentPath).toEqual(['pages', 0]);
    expect(detail.parentNodeType).toBe('page');
    expect(detail.target).toBeInstanceOf(HTMLElement);
  });

  it('insertion points have ARIA attributes', async () => {
    await setup(THREE_COMPS, ['pages', 0, 'components', 0]);
    const point = el.shadowRoot!.querySelector('.tree-insertion-point');
    expect(point?.getAttribute('role')).toBe('button');
    expect(point?.getAttribute('aria-label')).toContain('Insert');
  });

  it('row shows insertion points between columns', async () => {
    await setup(ROWS_PAGE, ['pages', 0, 'rows', 0, 'columns', 0]);
    const rowGroup = el.shadowRoot!.querySelectorAll('.tree-insertion-point');
    expect(rowGroup.length).toBeGreaterThanOrEqual(3);
  });

  it('does not render insertion points for section nodes', async () => {
    await setup(THREE_COMPS, ['pages', 0, 'components', 0]);
    const sectionGroups = el.shadowRoot!.querySelectorAll('[data-node-type="section"]');
    expect(sectionGroups.length).toBeGreaterThan(0);
    for (const section of sectionGroups) {
      const group = section.nextElementSibling;
      if (group?.getAttribute('role') === 'group') {
        const directInsertionPoints = Array.from(group.children)
          .filter(c => c.classList.contains('tree-insertion-point'));
        expect(directInsertionPoints.length).toBe(0);
      }
    }
  });
});
