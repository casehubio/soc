import { describe, it, expect, afterEach } from 'vitest';
import './builder-shell.js';
import type { PagesBuilderShell } from './builder-shell.js';
import type { PagesBuilderTree } from '../tree/builder-tree.js';

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

async function awaitReady(shell: PagesBuilderShell): Promise<void> {
  await shell.updateComplete;
  const dockEl = shell.shadowRoot!.querySelector('pages-dock-workbench') as any;
  if (dockEl?.updateComplete) await dockEl.updateComplete;
}

describe('PagesBuilderShell', () => {
  let el: PagesBuilderShell;

  afterEach(() => {
    el?.remove();
  });

  it('creates document from yaml property', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.document.getPages()).toHaveLength(1);
    expect(el.document.getPages()[0]!.name).toBe('Overview');
  });

  it('renders toolbar buttons', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await el.updateComplete;

    const buttons = el.shadowRoot!.querySelectorAll('.toolbar-btn');
    const labels = Array.from(buttons).map(b => b.textContent?.trim());
    expect(labels).toContain('+ Page');
    expect(labels).toContain('+ Dataset');
    expect(labels).toContain('Undo');
    expect(labels).toContain('Redo');

    const dockEl = el.shadowRoot!.querySelector('pages-dock-workbench');
    expect(dockEl).toBeTruthy();
  });

  it('adds a page via toolbar button', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await el.updateComplete;

    const addPageBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === '+ Page') as HTMLElement;
    addPageBtn.click();
    await el.updateComplete;

    expect(el.document.getPages()).toHaveLength(2);
    expect(el.document.getPages()[1]!.name).toBe('New Page');
  });

  it('adds a dataset via toolbar button', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await el.updateComplete;

    const addDsBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === '+ Dataset') as HTMLElement;
    addDsBtn.click();
    await el.updateComplete;

    expect(el.document.getDatasets()).toHaveLength(1);
    expect(el.document.getDatasets()[0]!.uuid).toBe('new_dataset');
  });

  it('undo reverts last action', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await el.updateComplete;

    const addPageBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === '+ Page') as HTMLElement;
    addPageBtn.click();
    expect(el.document.getPages()).toHaveLength(2);
    await el.updateComplete;

    const undoBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === 'Undo') as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(false);
    undoBtn.click();
    expect(el.document.getPages()).toHaveLength(1);
  });

  it('renders outline tree', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree');
    expect(tree).toBeTruthy();
  });

  it('uses dock-workbench for layout with source and preview in split mode', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    expect(el.shadowRoot!.querySelector('pages-dock-workbench')).toBeTruthy();

    expect(el.shadowRoot!.querySelector('.editor-source')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.editor-visual')).toBeTruthy();
  });

  it('switches view modes via tabs', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tabs = el.shadowRoot!.querySelectorAll('.view-tab');
    (tabs[0] as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.editor-source')!.classList.contains('hidden')).toBe(false);
    expect(el.shadowRoot!.querySelector('.editor-visual')!.classList.contains('hidden')).toBe(true);

    (tabs[2] as HTMLElement).click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.editor-source')!.classList.contains('hidden')).toBe(true);
    expect(el.shadowRoot!.querySelector('.editor-visual')!.classList.contains('hidden')).toBe(false);
  });

  it('properties dock starts open', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const sections = el.shadowRoot!.querySelectorAll('.dock-section');
    expect(sections.length).toBeGreaterThanOrEqual(1);
    const header = sections[0]!.querySelector('.dock-section-header span');
    expect(header!.textContent).toBe('Properties');
  });

  it('shows both dock panels when both toggled open', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const compBtn = el.shadowRoot!.querySelector('button[data-dock-panel-id="components"]') as HTMLElement;
    compBtn.click();
    await el.updateComplete;
    const sections = el.shadowRoot!.querySelectorAll('.dock-section');
    expect(sections.length).toBe(2);
    const headers = Array.from(sections).map(s => s.querySelector('.dock-section-header span')!.textContent);
    expect(headers).toContain('Properties');
    expect(headers).toContain('Components');
  });

  it('toggles properties panel via dock bar button', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const propsBtn = el.shadowRoot!.querySelector('button[data-dock-panel-id="properties"]') as HTMLElement;
    propsBtn.click();
    await el.updateComplete;
    const propsPanel = el.shadowRoot!.querySelector('[data-component-id="properties"]') as HTMLElement;
    expect(propsPanel?.style.display).toBe('none');

    propsBtn.click();
    await el.updateComplete;
    expect(propsPanel?.style.display).not.toBe('none');
  });

  it('creates empty document when no yaml provided', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.document.getPages()).toHaveLength(0);
  });

  it('updates property source on node-select', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const propPalette = el.shadowRoot!.querySelector('pages-property-palette') as any;
    expect(propPalette).toBeTruthy();
    const emptyPanel = el.shadowRoot!.querySelector('.empty-panel');
    expect(emptyPanel).toBeNull();
  });

  it('property change updates data and YAML', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await el.updateComplete;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const propPalette = el.shadowRoot!.querySelector('pages-property-palette') as any;
    const source = propPalette.source;
    expect(source).toBeTruthy();

    source.onChange(['text'], 'Updated Title');
    await el.updateComplete;

    expect(el.document.toString()).toContain('Updated Title');
    const comp = el.document.getPages()[0]!.getComponents()[0]!;
    expect(comp.getProperties()['text']).toBe('Updated Title');
  });

  it('selecting enum value writes to YAML document', async () => {
    const yamlWithChart = `pages:\n- name: P\n  components:\n  - type: bar-chart\n`;
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = yamlWithChart;
    document.body.appendChild(el);
    await el.updateComplete;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const source = (el.shadowRoot!.querySelector('pages-property-palette') as any).source;
    expect(source.data['subtype']).toBeUndefined();

    source.onChange(['subtype'], 'column');
    await el.updateComplete;

    expect(el.document.toString()).toContain('subtype: column');
    const comp = el.document.getPages()[0]!.getComponents()[0]!;
    expect(comp.getProperties()['subtype']).toBe('column');
  });

  it('source.data reflects value after onChange (live, not stale)', async () => {
    const yamlWithChart = `pages:\n- name: P\n  components:\n  - type: bar-chart\n`;
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = yamlWithChart;
    document.body.appendChild(el);
    await el.updateComplete;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const source = (el.shadowRoot!.querySelector('pages-property-palette') as any).source;
    expect(source.data['subtype']).toBeUndefined();

    source.onChange(['subtype'], 'column');

    expect(source.data['subtype']).toBe('column');
    expect(el.document.toString()).toContain('subtype: column');
  });

  it('source.data reflects cleared value after onChange with blank', async () => {
    const yaml = `pages:\n- name: P\n  components:\n  - type: bar-chart\n    properties:\n      subtype: column\n`;
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = yaml;
    document.body.appendChild(el);
    await el.updateComplete;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const source = (el.shadowRoot!.querySelector('pages-property-palette') as any).source;
    expect(source.data['subtype']).toBe('column');

    source.onChange(['subtype'], '');

    expect(source.data['subtype']).toBeUndefined();
    expect(el.document.toString()).not.toContain('subtype');
  });

  it('clearing enum value removes property from YAML', async () => {
    const yamlWithSubtype = `pages:\n- name: P\n  components:\n  - type: bar-chart\n    properties:\n      subtype: column\n`;
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = yamlWithSubtype;
    document.body.appendChild(el);
    await el.updateComplete;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const source = (el.shadowRoot!.querySelector('pages-property-palette') as any).source;
    expect(source.data['subtype']).toBe('column');

    source.onChange(['subtype'], '');
    await el.updateComplete;

    expect(el.document.toString()).not.toContain('subtype');
    const comp = el.document.getPages()[0]!.getComponents()[0]!;
    expect(comp.getProperties()['subtype']).toBeUndefined();
  });

  it('re-selecting node after change shows updated data', async () => {
    const yamlWithChart = `pages:\n- name: P\n  components:\n  - type: bar-chart\n`;
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = yamlWithChart;
    document.body.appendChild(el);
    await el.updateComplete;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const source = (el.shadowRoot!.querySelector('pages-property-palette') as any).source;
    source.onChange(['subtype'], 'column');

    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const freshSource = (el.shadowRoot!.querySelector('pages-property-palette') as any).source;
    expect(freshSource.data['subtype']).toBe('column');
  });

  // --- Palette insertion and context ---

  async function openComponentsDock(shell: PagesBuilderShell): Promise<void> {
    const compBtn = shell.shadowRoot!.querySelector('button[data-dock-panel-id="components"]') as HTMLElement;
    compBtn.click();
    await shell.updateComplete;
  }

  it('clicking palette tile inserts component into selected page', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = `pages:\n- name: P\n  components:\n  - type: title\n`;
    document.body.appendChild(el);
    await el.updateComplete;
    await openComponentsDock(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    const palette = el.shadowRoot!.querySelector('pages-builder-palette') as HTMLElement;
    palette.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'metric', label: 'Metric', defaultProps: {} },
    }));
    await el.updateComplete;

    const comps = el.document.getPages()[0]!.getComponents();
    expect(comps).toHaveLength(2);
    expect(comps[1]!.type).toBe('metric');
  });

  it('clicking palette tile inserts component into selected column', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = `pages:\n- name: P\n  rows:\n  - columns:\n    - span: 12\n      components:\n      - type: title\n`;
    document.body.appendChild(el);
    await el.updateComplete;
    await openComponentsDock(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0, 'columns', 0], nodeType: 'column' },
    }));
    await el.updateComplete;

    const palette = el.shadowRoot!.querySelector('pages-builder-palette') as HTMLElement;
    palette.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'bar-chart', label: 'Bar Chart', defaultProps: { subtype: 'column' } },
    }));
    await el.updateComplete;

    const col = el.document.getPages()[0]!.getRows()[0]!.getColumns()[0]!;
    expect(col.getComponents()).toHaveLength(2);
    expect(col.getComponents()[1]!.type).toBe('bar-chart');
  });

  it('clicking palette tile when component selected inserts as sibling', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = `pages:\n- name: P\n  components:\n  - type: title\n`;
    document.body.appendChild(el);
    await el.updateComplete;
    await openComponentsDock(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const palette = el.shadowRoot!.querySelector('pages-builder-palette') as HTMLElement;
    palette.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'metric', label: 'Metric', defaultProps: {} },
    }));
    await el.updateComplete;

    const comps = el.document.getPages()[0]!.getComponents();
    expect(comps).toHaveLength(2);
    expect(comps[1]!.type).toBe('metric');
  });

  it('inserting component updates YAML text in editor', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = `pages:\n- name: P\n  components:\n  - type: title\n`;
    document.body.appendChild(el);
    await el.updateComplete;
    await openComponentsDock(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    const palette = el.shadowRoot!.querySelector('pages-builder-palette') as HTMLElement;
    palette.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'metric', label: 'Metric', defaultProps: {} },
    }));
    await el.updateComplete;

    const codeEditor = el.shadowRoot!.querySelector('pages-code-editor') as any;
    expect(codeEditor).toBeTruthy();
    const editorValue = codeEditor.value ?? '';
    expect(editorValue).toContain('metric');
  });

  it('inserting component updates tree and document model', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = `pages:\n- name: P\n  components:\n  - type: title\n`;
    document.body.appendChild(el);
    await el.updateComplete;
    await openComponentsDock(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    const before = el.document.getPages()[0]!.getComponents().length;

    const palette = el.shadowRoot!.querySelector('pages-builder-palette') as HTMLElement;
    palette.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'metric', label: 'Metric', defaultProps: {} },
    }));
    await el.updateComplete;

    const after = el.document.getPages()[0]!.getComponents().length;
    expect(after).toBe(before + 1);

    const yaml = el.document.toString();
    expect(yaml).toContain('type: metric');
    expect(yaml).toContain('type: title');
  });

  it('consecutive palette insertions all sync to YAML editor', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = `pages:\n- name: P\n  components:\n  - type: title\n`;
    document.body.appendChild(el);
    await el.updateComplete;
    await openComponentsDock(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    const palette = el.shadowRoot!.querySelector('pages-builder-palette') as HTMLElement;

    palette.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'rows', label: 'Rows', defaultProps: {} },
    }));
    await el.updateComplete;

    const yaml1 = el.document.toString();
    expect(yaml1).toContain('type: rows');
    const editor1 = (el.shadowRoot!.querySelector('pages-code-editor') as any)?.value ?? '';
    expect(editor1, 'first insertion should appear in editor').toContain('type: rows');

    palette.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'rows', label: 'Rows', defaultProps: {} },
    }));
    await el.updateComplete;

    const yaml2 = el.document.toString();
    const rowCount = (yaml2.match(/type: rows/g) || []).length;
    expect(rowCount, 'document should have 2 rows').toBe(2);

    const editor2 = (el.shadowRoot!.querySelector('pages-code-editor') as any)?.value ?? '';
    const editorRowCount = (editor2.match(/type: rows/g) || []).length;
    expect(editorRowCount, 'editor should also have 2 rows').toBe(2);

    palette.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'metric', label: 'Metric', defaultProps: {} },
    }));
    await el.updateComplete;

    const yaml3 = el.document.toString();
    expect(yaml3).toContain('type: metric');
    const editor3 = (el.shadowRoot!.querySelector('pages-code-editor') as any)?.value ?? '';
    expect(editor3, 'third insertion should appear in editor').toContain('type: metric');
    expect(editor3).toBe(yaml3);
  });

  it('palette context refreshes when selection changes', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = `pages:\n- name: P\n  components:\n  - type: title\ndatasets:\n- uuid: ds1\n`;
    document.body.appendChild(el);
    await el.updateComplete;

    const compBtn = el.shadowRoot!.querySelector('button[data-dock-panel-id="components"]') as HTMLElement;
    compBtn.click();
    await el.updateComplete;

    const palette1 = el.shadowRoot!.querySelector('pages-builder-palette') as any;
    expect(palette1.context).toBeDefined();
    expect(palette1.context.availableDatasets).toContain('ds1');

    el.document.addDataset('ds2');
    await el.updateComplete;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const palette2 = el.shadowRoot!.querySelector('pages-builder-palette') as any;
    expect(palette2.context.availableDatasets).toContain('ds2');
  });

  // --- Edit pipeline coordinator ---

  it('mutations use coordinated mode (no PageDocument onChange)', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const onChangeCalls: string[] = [];
    el.document.onChange(() => onChangeCalls.push('fired'));

    const addPageBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === '+ Page') as HTMLElement;
    addPageBtn.click();
    await el.updateComplete;

    expect(el.document.getPages()).toHaveLength(2);
    expect(onChangeCalls).toHaveLength(0);
  });

  it('_applyEdit emits builder-change via _syncViews', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const events: CustomEvent[] = [];
    el.addEventListener('builder-change', (e) => events.push(e as CustomEvent));

    const addPageBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === '+ Page') as HTMLElement;
    addPageBtn.click();
    await el.updateComplete;

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.yaml).toContain('New Page');
  });

  it('shell undo works in coordinated mode', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const addPageBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === '+ Page') as HTMLElement;
    addPageBtn.click();
    await el.updateComplete;
    expect(el.document.getPages()).toHaveLength(2);

    expect(el.document.canUndo()).toBe(false);

    const undoBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === 'Undo') as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(false);
    undoBtn.click();
    await el.updateComplete;
    expect(el.document.getPages()).toHaveLength(1);
  });

  it('shell redo restores state after undo', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const addPageBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === '+ Page') as HTMLElement;
    addPageBtn.click();
    expect(el.document.getPages()).toHaveLength(2);
    await el.updateComplete;

    const undoBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === 'Undo') as HTMLElement;
    undoBtn.click();
    expect(el.document.getPages()).toHaveLength(1);
    await el.updateComplete;

    const redoBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === 'Redo') as HTMLElement;
    redoBtn.click();
    await el.updateComplete;
    expect(el.document.getPages()).toHaveLength(2);
  });

  it('property change through _applyEdit emits builder-change', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await el.updateComplete;

    const events: CustomEvent[] = [];
    el.addEventListener('builder-change', (e) => events.push(e as CustomEvent));

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const source = (el.shadowRoot!.querySelector('pages-property-palette') as any).source;
    source.onChange(['text'], 'Modified');
    await el.updateComplete;

    expect(el.document.toString()).toContain('Modified');
    expect(events.length).toBeGreaterThan(0);
  });

  // --- Lazy property source ---

  it('property source stays fresh after document swap via undo', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await el.updateComplete;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const source1 = (el.shadowRoot!.querySelector('pages-property-palette') as any).source;
    source1.onChange(['text'], 'Modified');
    await el.updateComplete;
    expect(source1.data['text']).toBe('Modified');

    const undoBtn = Array.from(el.shadowRoot!.querySelectorAll('.toolbar-btn'))
      .find(b => b.textContent?.trim() === 'Undo') as HTMLElement;
    await el.updateComplete;
    undoBtn.click();
    await el.updateComplete;

    const source2 = (el.shadowRoot!.querySelector('pages-property-palette') as any).source;
    expect(source2.data['text']).toBe('Hello');
  });

  // --- Tree actions ---

  it('tree-action delete removes component', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = `pages:\n- name: P\n  components:\n  - type: title\n  - type: metric\n`;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-action', {
      bubbles: true, composed: true,
      detail: { action: 'delete', path: ['pages', 0, 'components', 1], nodeType: 'component' },
    }));
    await el.updateComplete;

    expect(el.document.getPages()[0]!.getComponents()).toHaveLength(1);
    expect(el.document.getPages()[0]!.getComponents()[0]!.type).toBe('title');
  });

  it('tree-action duplicate copies component', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = `pages:\n- name: P\n  components:\n  - type: title\n`;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-action', {
      bubbles: true, composed: true,
      detail: { action: 'duplicate', path: ['pages', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    expect(el.document.getPages()[0]!.getComponents()).toHaveLength(2);
  });

  it('tree-action add-row adds row to page', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const rowsBefore = el.document.getPages()[0]!.getRows().length;
    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-action', {
      bubbles: true, composed: true,
      detail: { action: 'add-row', path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    expect(el.document.getPages()[0]!.getRows()).toHaveLength(rowsBefore + 1);
  });

  it('tree-action delete removes page', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = `pages:\n- name: P1\n  components:\n  - type: title\n- name: P2\n  components:\n  - type: metric\n`;
    document.body.appendChild(el);
    await awaitReady(el);

    expect(el.document.getPages()).toHaveLength(2);
    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-action', {
      bubbles: true, composed: true,
      detail: { action: 'delete', path: ['pages', 1], nodeType: 'page' },
    }));
    await el.updateComplete;

    expect(el.document.getPages()).toHaveLength(1);
    expect(el.document.getPages()[0]!.name).toBe('P1');
  });

  // --- Editor→model sync ---

  it('editor text change flows through _applyEdit after debounce', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const newYaml = MINIMAL_PAGE.replace('Overview', 'Renamed');
    const codeEditor = el.shadowRoot!.querySelector('pages-code-editor') as any;
    codeEditor.value = newYaml;
    codeEditor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    expect(el.document.getPages()[0]!.name).toBe('Overview');

    await new Promise(r => setTimeout(r, 400));
    await el.updateComplete;

    expect(el.document.getPages()[0]!.name).toBe('Renamed');
  });

  it('invalid YAML does not update model', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const codeEditor = el.shadowRoot!.querySelector('pages-code-editor') as any;
    codeEditor.value = 'invalid: [yaml: {broken';
    codeEditor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    await new Promise(r => setTimeout(r, 400));
    await el.updateComplete;

    expect(el.document.getPages()[0]!.name).toBe('Overview');
  });

  // --- schema completions in text editor ---

  it('code editor receives schema completion extension', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const codeEditor = el.shadowRoot!.querySelector('pages-code-editor') as any;
    expect(codeEditor).toBeTruthy();
    expect(codeEditor.extensions.length).toBeGreaterThan(0);
  });

  // --- tree-add handler (inline picker) ---

  it('tree-add opens inline picker', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    expect(picker).toBeTruthy();
    expect(picker.open).toBe(true);
    expect(picker.context).toBeDefined();
    expect(picker.context.acceptsComponents).toBe(true);
  });

  it('tree-add picker inserts component into target node', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0, 'columns', 0], nodeType: 'column' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    picker.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'metric', label: 'Metric', defaultProps: {} },
    }));
    await el.updateComplete;

    const col = el.document.getPages()[0]!.getRows()[0]!.getColumns()[0]!;
    expect(col.getComponents()).toHaveLength(2);
    expect(col.getComponents()[1]!.type).toBe('metric');
  });

  it('tree-add on column sets acceptsComponents and hides layout types', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0, 'columns', 0], nodeType: 'column' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    expect(picker.context.acceptsComponents).toBe(true);
    expect(picker.context.parentType).toBe('column');
  });

  it('tree-add on row sets acceptsComponents false', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0], nodeType: 'row' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    expect(picker.context.acceptsComponents).toBe(false);
  });

  it('tree-add picker adds row when layout type selected on page', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const rowsBefore = el.document.getPages()[0]!.getRows().length;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    picker.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'rows', label: 'Rows', category: 'Layout', defaultProps: {} },
    }));
    await el.updateComplete;

    expect(el.document.getPages()[0]!.getRows().length).toBe(rowsBefore + 1);
  });

  it('tree-add picker closes after selection', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    expect(picker.open).toBe(true);

    picker.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'metric', label: 'Metric', defaultProps: {} },
    }));
    await el.updateComplete;

    expect(picker.open).toBe(false);
  });

  // --- clipboard: cut/copy ---

  it('tree-cut removes node from document', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const compsBefore = el.document.getPages()[0]!.getRows()[0]!.getColumns()[0]!.getComponents().length;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-cut', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    expect(el.document.getPages()[0]!.getRows()[0]!.getColumns()[0]!.getComponents().length).toBe(compsBefore - 1);
  });

  it('tree-copy does not remove node from document', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const compsBefore = el.document.getPages()[0]!.getRows()[0]!.getColumns()[0]!.getComponents().length;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-copy', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    expect(el.document.getPages()[0]!.getRows()[0]!.getColumns()[0]!.getComponents().length).toBe(compsBefore);
  });

  it('Esc exits insert mode without clearing clipboard', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-copy', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const { getClipboard: gc } = await import('../clipboard/builder-clipboard.js');
    expect(gc().insertMode).toBe(true);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;

    expect(gc().insertMode).toBe(false);
    expect(gc().fragment).not.toBeNull();
  });

  it('visual mode creates overlay root in preview container', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    el.renderPreview = (container) => {
      container.innerHTML = '<div data-component-type="title" style="width:100px;height:50px;">Hello</div>';
    };
    document.body.appendChild(el);
    await awaitReady(el);

    const overlayRoot = el.shadowRoot!.querySelector('.overlay-root');
    expect(overlayRoot).toBeTruthy();
  });

  it('tree-insert shows position picker first', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-insert', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0], nodeType: 'row' },
    }));
    await el.updateComplete;

    const posPicker = el.shadowRoot!.querySelector('pages-position-picker') as any;
    expect(posPicker).toBeTruthy();
    expect(posPicker.open).toBe(true);

    const inlinePicker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    expect(inlinePicker.open).toBe(false);
  });

  it('tree-insert on row filters to layout types only after position select', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-insert', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0], nodeType: 'row' },
    }));
    await el.updateComplete;

    const posPicker = el.shadowRoot!.querySelector('pages-position-picker') as any;
    posPicker.dispatchEvent(new CustomEvent('position-select', {
      bubbles: true, composed: true,
      detail: { position: 'before' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    expect(picker.open).toBe(true);
    expect(picker.context.acceptsComponents).toBe(false);
  });

  it('tree-add expands the parent node after adding a child', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as any;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    picker.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'rows', label: 'Rows', category: 'Layout', defaultProps: {} },
    }));
    await el.updateComplete;

    const pageItem = tree.shadowRoot?.querySelector('[data-path=\'["pages",0]\']');
    expect(pageItem?.getAttribute('aria-expanded')).toBe('true');
  });

  it('newly added row gets selected with correct nodeType', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as any;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    picker.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'rows', label: 'Rows', category: 'Layout', defaultProps: {} },
    }));
    await el.updateComplete;

    const selected = tree.selectedPath;
    expect(selected).toBeDefined();
    expect(selected).toContain('rows');
  });

  it('newly added node expands all the way down in tree', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as any;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    picker.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'rows', label: 'Rows', category: 'Layout', defaultProps: {} },
    }));
    await el.updateComplete;

    const newRowPath = JSON.stringify(tree.selectedPath);
    expect(tree._expandedPaths.has(newRowPath)).toBe(true);
  });

  it('newly added child gets selected after Add', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as any;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0, 'columns', 0], nodeType: 'column' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    picker.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'metric', label: 'Metric', category: 'Metrics', defaultProps: {} },
    }));
    await el.updateComplete;

    const selected = tree.selectedPath;
    expect(selected).toBeDefined();
    expect(selected[selected.length - 2]).toBe('components');
    expect(typeof selected[selected.length - 1]).toBe('number');
  });

  it('first dblclick navigates to parent without prior selection', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = MINIMAL_PAGE;
    el.renderPreview = (container) => {
      container.innerHTML = '<div data-component-type="title" style="width:100px;height:50px;">Hello</div>';
    };
    document.body.appendChild(el);
    await awaitReady(el);
    await new Promise(r => setTimeout(r, 300));

    const previewContainer = el.shadowRoot!.querySelector('.preview-container') as HTMLElement;
    const compEl = previewContainer.querySelector('[data-component-type="title"]') as HTMLElement;
    expect(compEl).toBeTruthy();

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as any;
    expect(tree.selectedPath).toBeUndefined();

    // Simulate real browser: click fires, then dblclick fires (timer not yet resolved)
    compEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    compEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));

    // Should have navigated to the PARENT (page), not just selected the component
    expect(tree.selectedPath).toBeDefined();
    expect(JSON.stringify(tree.selectedPath)).toBe(JSON.stringify(['pages', 0]));
  });

  it('Add row then Add child: highlight persists through each step', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    // Step 1: Add a row to page
    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as any;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0], nodeType: 'page' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    picker.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'rows', label: 'Rows', category: 'Layout', defaultProps: {} },
    }));
    await el.updateComplete;
    await new Promise(r => requestAnimationFrame(r));
    await el.updateComplete;

    // Verify Step 1: new row is selected and _scrollYamlToPath was called
    expect(tree.selectedPath).toBeDefined();
    expect(tree.selectedPath).toContain('rows');

    // Step 2: Add a markdown child to the new row's column
    const newRowPath = tree.selectedPath;
    const page = el.document.getPages()[0]!;
    const newRow = page.getRows()[newRowPath[3] as number]!;
    const col = newRow.getColumns()[0]!;
    const colPath = col.path;

    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: colPath, nodeType: 'column' },
    }));
    await el.updateComplete;

    const picker2 = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    picker2.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'markdown', label: 'Markdown', category: 'Content', defaultProps: {} },
    }));
    await el.updateComplete;
    await new Promise(r => requestAnimationFrame(r));
    await el.updateComplete;

    // Verify Step 2: markdown component is selected
    expect(tree.selectedPath).toBeDefined();
    const yaml = el.document.toString();
    expect(yaml).toContain('type: markdown');

    // The selectedPath should point to the new markdown component
    const selectedNodeType = el.shadowRoot?.querySelector<PagesBuilderTree>('pages-builder-tree')?.selectedPath;
    expect(selectedNodeType).toBeDefined();
  });

  it('Insert→After→Rows expands the new row in tree', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as any;
    tree.dispatchEvent(new CustomEvent('tree-insert', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0], nodeType: 'row' },
    }));
    await el.updateComplete;

    const posPicker = el.shadowRoot!.querySelector('pages-position-picker') as any;
    posPicker.dispatchEvent(new CustomEvent('position-select', {
      bubbles: true, composed: true,
      detail: { position: 'after' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    picker.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'rows', label: 'Rows', category: 'Layout', defaultProps: {} },
    }));
    await el.updateComplete;

    const selected = tree.selectedPath;
    expect(selected).toBeDefined();
    const newRowKey = JSON.stringify(selected);
    expect(tree._expandedPaths.has(newRowKey)).toBe(true);
  });

  it('newly inserted sibling gets selected after Insert', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const rowsBefore = el.document.getPages()[0]!.getRows().length;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as any;
    tree.dispatchEvent(new CustomEvent('tree-insert', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0], nodeType: 'row' },
    }));
    await el.updateComplete;

    const posPicker = el.shadowRoot!.querySelector('pages-position-picker') as any;
    posPicker.dispatchEvent(new CustomEvent('position-select', {
      bubbles: true, composed: true,
      detail: { position: 'before' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    picker.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'rows', label: 'Rows', category: 'Layout', defaultProps: {} },
    }));
    await el.updateComplete;

    const selected = tree.selectedPath;
    expect(selected).toBeDefined();
    expect(selected).toContain('rows');
    expect(el.document.getPages()[0]!.getRows().length).toBe(rowsBefore + 1);
  });

  it('Insert→Before→Rows inserts a proper row before the target', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const rowsBefore = el.document.getPages()[0]!.getRows().length;

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-insert', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0], nodeType: 'row' },
    }));
    await el.updateComplete;

    const posPicker = el.shadowRoot!.querySelector('pages-position-picker') as any;
    posPicker.dispatchEvent(new CustomEvent('position-select', {
      bubbles: true, composed: true,
      detail: { position: 'before' },
    }));
    await el.updateComplete;

    const picker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    picker.dispatchEvent(new CustomEvent('component-select', {
      bubbles: true, composed: true,
      detail: { type: 'rows', label: 'Rows', category: 'Layout', defaultProps: {} },
    }));
    await el.updateComplete;

    const rowsAfter = el.document.getPages()[0]!.getRows();
    expect(rowsAfter.length).toBe(rowsBefore + 1);
    const newRow = rowsAfter[0]!;
    expect(newRow.getColumns().length).toBe(1);
    expect(newRow.getColumns()[0]!.span).toBe(12);
  });

  it('tree-insert position-select opens inline picker with sibling context', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-insert', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0], nodeType: 'row' },
    }));
    await el.updateComplete;

    const posPicker = el.shadowRoot!.querySelector('pages-position-picker') as any;
    posPicker.dispatchEvent(new CustomEvent('position-select', {
      bubbles: true, composed: true,
      detail: { position: 'before' },
    }));
    await el.updateComplete;

    expect(posPicker.open).toBe(false);
    const inlinePicker = el.shadowRoot!.querySelector('pages-builder-inline-picker') as any;
    expect(inlinePicker.open).toBe(true);
    expect(inlinePicker.context.acceptsComponents).toBe(false);
  });

  it('Ctrl+X on selected node cuts it', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const compsBefore = el.document.getPages()[0]!.getRows()[0]!.getColumns()[0]!.getComponents().length;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', ctrlKey: true, bubbles: true }));
    await el.updateComplete;

    expect(el.document.getPages()[0]!.getRows()[0]!.getColumns()[0]!.getComponents().length).toBe(compsBefore - 1);
  });

  it('Ctrl+C on selected node copies without removing', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const compsBefore = el.document.getPages()[0]!.getRows()[0]!.getColumns()[0]!.getComponents().length;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));
    await el.updateComplete;

    expect(el.document.getPages()[0]!.getRows()[0]!.getColumns()[0]!.getComponents().length).toBe(compsBefore);
    const { getClipboard: gc } = await import('../clipboard/builder-clipboard.js');
    expect(gc().fragment).not.toBeNull();
    expect(gc().fragmentType).toBe('component');
  });

  it('tree-add pastes clipboard content as child when clipboard has fragment', async () => {
    el = document.createElement('pages-builder-shell') as PagesBuilderShell;
    el.yaml = ROWS_PAGE;
    document.body.appendChild(el);
    await awaitReady(el);

    const tree = el.shadowRoot!.querySelector('pages-builder-tree') as HTMLElement;
    tree.dispatchEvent(new CustomEvent('tree-copy', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0, 'columns', 0, 'components', 0], nodeType: 'component' },
    }));
    await el.updateComplete;

    const compsBefore = el.document.getPages()[0]!.getRows()[0]!.getColumns()[1]!.getComponents().length;
    tree.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: ['pages', 0, 'rows', 0, 'columns', 1], nodeType: 'column' },
    }));
    await el.updateComplete;

    expect(el.document.getPages()[0]!.getRows()[0]!.getColumns()[1]!.getComponents().length).toBe(compsBefore + 1);
  });
});
