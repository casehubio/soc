import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { RovingTabindexMixin, KeyboardShortcutMixin, type RovingDirection } from '@casehubio/pages-primitives/a11y';
import { PageDocument, type PageNode, type RowNode, type ColumnNode, type ComponentNode, type DatasetNode, type NavTreeNode } from '@casehubio/pages-document';
import { COMPONENT_CATALOG } from '../catalog/component-catalog.js';
import { lookupRecord } from '../data/lookup-record.js';
import { computeMenuItems } from './tree-context-menu.js';

import '@casehubio/pages-primitives/context-menu';

export type TreeNodeType = 'page' | 'row' | 'column' | 'component' | 'dataset' | 'nav-item' | 'module' | 'import' | 'variable' | 'section';

export interface TreeNodeInfo {
  readonly label: string;
  readonly icon: string;
  readonly nodeType: TreeNodeType;
  readonly path: readonly (string | number)[];
  readonly children: readonly TreeNodeInfo[];
}

// --- Tree model builder (pure logic, independently testable) ---

const catalogByType = new Map(COMPONENT_CATALOG.map(e => [e.type, e]));

function componentLabel(comp: ComponentNode): string {
  const props = comp.getProperties();
  if (comp.type === 'title' && typeof props['text'] === 'string') return props['text'];
  if (typeof props['title'] === 'string') return props['title'];
  const lookupRaw = props['lookup'];
  if (lookupRaw != null && typeof lookupRaw === 'object') {
    const lookup = lookupRecord(lookupRaw);
    if (typeof lookup?.['uuid'] === 'string') return lookup['uuid'];
  }
  return catalogByType.get(comp.type)?.label ?? comp.type;
}

function buildComponentNode(comp: ComponentNode): TreeNodeInfo {
  const entry = catalogByType.get(comp.type);
  const children: TreeNodeInfo[] = [];

  if (comp.isContainer()) {
    const containerChildren = comp.getChildren();
    for (const [slotName, comps] of Object.entries(containerChildren.slots)) {
      children.push({
        label: slotName,
        icon: 'folder_open',
        nodeType: 'section',
        path: [...comp.path, slotName],
        children: comps.map(buildComponentNode),
      });
    }
  }

  return {
    label: componentLabel(comp),
    icon: entry?.icon ?? 'widgets',
    nodeType: 'component',
    path: comp.path,
    children,
  };
}

function buildColumnNode(col: ColumnNode): TreeNodeInfo {
  return {
    label: `Column (${col.span})`,
    icon: 'view_column',
    nodeType: 'column',
    path: col.path,
    children: col.getComponents().map(buildComponentNode),
  };
}

function buildRowNode(row: RowNode): TreeNodeInfo {
  return {
    label: 'Row',
    icon: 'table_rows',
    nodeType: 'row',
    path: row.path,
    children: row.getColumns().map(buildColumnNode),
  };
}

function buildPageNode(page: PageNode): TreeNodeInfo {
  const mode = page.getLayoutMode();
  let children: TreeNodeInfo[];
  if (mode === 'rows') {
    children = page.getRows().map(buildRowNode);
  } else if (mode === 'columns') {
    children = page.getColumns().map(buildColumnNode);
  } else {
    children = page.getComponents().map(buildComponentNode);
  }
  return {
    label: page.name || 'Untitled',
    icon: 'insert_drive_file',
    nodeType: 'page',
    path: page.path,
    children,
  };
}

function buildDatasetNode(ds: DatasetNode): TreeNodeInfo {
  return {
    label: ds.name ?? ds.uuid,
    icon: 'storage',
    nodeType: 'dataset',
    path: ds.path,
    children: [],
  };
}

function buildNavItemNode(nav: NavTreeNode): TreeNodeInfo {
  return {
    label: nav.id ?? nav.page ?? 'Nav Item',
    icon: nav.type === 'GROUP' ? 'folder' : 'link',
    nodeType: 'nav-item',
    path: nav.path,
    children: nav.children.map(buildNavItemNode),
  };
}

function buildModuleNode(name: string): TreeNodeInfo {
  return {
    label: name,
    icon: 'extension',
    nodeType: 'module',
    path: ['modules', name],
    children: [],
  };
}

function buildImportNode(imp: Record<string, unknown>): TreeNodeInfo {
  return {
    label: (imp['as'] as string) ?? (imp['module'] as string) ?? 'Import',
    icon: 'link',
    nodeType: 'import',
    path: ['imports'],
    children: [],
  };
}

function buildVariableNode(prefix: string): TreeNodeInfo {
  return {
    label: prefix,
    icon: 'data_object',
    nodeType: 'variable',
    path: ['variables', prefix],
    children: [],
  };
}

export function buildTreeModel(doc: PageDocument): TreeNodeInfo[] {
  const sections: TreeNodeInfo[] = [];

  const modules = doc.getModules();
  if (modules) {
    sections.push({
      label: 'Modules',
      icon: 'library_books',
      nodeType: 'section',
      path: ['modules'],
      children: Object.keys(modules).map(buildModuleNode),
    });
  }

  const imports = doc.getImports();
  if (imports && imports.length > 0) {
    sections.push({
      label: 'Imports',
      icon: 'input',
      nodeType: 'section',
      path: ['imports'],
      children: imports.map(buildImportNode),
    });
  }

  const variables = doc.getVariables();
  if (variables) {
    sections.push({
      label: 'Variables',
      icon: 'data_object',
      nodeType: 'section',
      path: ['variables'],
      children: Object.keys(variables).map(buildVariableNode),
    });
  }

  const datasets = doc.getDatasets();
  if (datasets.length > 0) {
    sections.push({
      label: 'Datasets',
      icon: 'database',
      nodeType: 'section',
      path: ['datasets'],
      children: datasets.map(buildDatasetNode),
    });
  }

  const pages = doc.getPages();
  if (pages.length > 0) {
    sections.push({
      label: 'Pages',
      icon: 'pages',
      nodeType: 'section',
      path: ['pages'],
      children: pages.map(buildPageNode),
    });
  }

  const nav = doc.getNavTree();
  if (nav) {
    sections.push({
      label: 'Navigation',
      icon: 'navigation',
      nodeType: 'section',
      path: ['navTree'],
      children: nav.children.map(buildNavItemNode),
    });
  }

  return sections;
}

// --- Lit component ---

function pathKey(path: readonly (string | number)[]): string {
  return JSON.stringify(path);
}

@customElement('pages-builder-tree')
export class PagesBuilderTree extends RovingTabindexMixin(KeyboardShortcutMixin(LitElement)) {
  override rovingSelector = '[role="treeitem"]';
  override rovingDirection: RovingDirection = 'vertical';

  @property({ attribute: false }) document: PageDocument | undefined;
  @property({ attribute: false }) selectedPath: readonly (string | number)[] | undefined;
  @property({ attribute: false }) clipboardFragmentType: string | undefined;
  @property({ type: Boolean }) insertMode = false;

  @state() private _expandedPaths = new Set<string>();
  @state() private _treeModel: TreeNodeInfo[] = [];
  @state() private _contextMenuOpen = false;
  @state() private _contextMenuItems: import('@casehubio/pages-primitives').MenuItem[] = [];
  @state() private _contextMenuNode: TreeNodeInfo | undefined;
  @state() private _contextMenuX = 0;
  @state() private _contextMenuY = 0;
  private _unsub: (() => void) | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this._subscribeToDocument();
    this._rebuildModel();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsub?.();
    this._unsub = undefined;
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('document')) {
      this._unsub?.();
      this._subscribeToDocument();
      this._rebuildModel();
    }
    if (changed.has('selectedPath') && this.selectedPath) {
      this._expandToPath(this.selectedPath);
    }
  }

  private _expandToPath(target: readonly (string | number)[]): void {
    const next = new Set(this._expandedPaths);
    let changed = false;
    const isPrefix = (nodePath: readonly (string | number)[], targetPath: readonly (string | number)[]): boolean => {
      if (nodePath.length >= targetPath.length) return false;
      return nodePath.every((seg, i) => String(seg) === String(targetPath[i]));
    };
    const walk = (nodes: readonly TreeNodeInfo[]): void => {
      for (const node of nodes) {
        if (isPrefix(node.path, target) && node.children.length > 0) {
          const key = pathKey(node.path);
          if (!next.has(key)) { next.add(key); changed = true; }
          walk(node.children);
        }
      }
    };
    walk(this._treeModel);
    if (changed) this._expandedPaths = next;
  }

  private _subscribeToDocument(): void {
    if (this.document) {
      this._unsub = this.document.onChange(() => {
        this._rebuildModel();
      });
    }
  }

  private _rebuildModel(): void {
    this._treeModel = this.document ? buildTreeModel(this.document) : [];
    for (const section of this._treeModel) {
      const key = pathKey(section.path);
      if (!this._expandedPaths.has(key)) {
        this._expandedPaths = new Set([...this._expandedPaths, key]);
      }
    }
  }

  private _isExpanded(path: readonly (string | number)[]): boolean {
    return this._expandedPaths.has(pathKey(path));
  }

  expandPath(path: readonly (string | number)[]): void {
    const key = pathKey(path);
    if (!this._expandedPaths.has(key)) {
      this._expandedPaths = new Set([...this._expandedPaths, key]);
    }
  }

  private _toggleExpanded(path: readonly (string | number)[]): void {
    const key = pathKey(path);
    const next = new Set(this._expandedPaths);
    if (next.has(key)) next.delete(key); else next.add(key);
    this._expandedPaths = next;
  }

  private _isSelected(path: readonly (string | number)[]): boolean {
    if (!this.selectedPath) return false;
    return pathKey(path) === pathKey(this.selectedPath);
  }

  private _selectNode(path: readonly (string | number)[], nodeType: TreeNodeType): void {
    this.selectedPath = path;
    this.dispatchEvent(new CustomEvent('node-select', {
      bubbles: true, composed: true,
      detail: { path, nodeType },
    }));
  }

  private _handleItemClick(node: TreeNodeInfo, e: Event): void {
    e.stopPropagation();
    if (node.children.length > 0) {
      this._toggleExpanded(node.path);
    }
    if (node.nodeType !== 'section') {
      this._selectNode(node.path, node.nodeType);
    }
  }

  private _handleItemKeydown(node: TreeNodeInfo, e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleItemClick(node, e);
    } else if (e.key === 'ArrowRight' && node.children.length > 0 && !this._isExpanded(node.path)) {
      e.preventDefault();
      this._toggleExpanded(node.path);
    } else if (e.key === 'ArrowLeft' && this._isExpanded(node.path)) {
      e.preventDefault();
      this._toggleExpanded(node.path);
    }
  }

  private _isContainerNode(node: TreeNodeInfo): boolean {
    return node.nodeType === 'page' || node.nodeType === 'row' || node.nodeType === 'column' ||
      (node.nodeType === 'component' && node.children.length > 0);
  }

  private _handleContextMenu(node: TreeNodeInfo, e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (node.nodeType === 'section') return;
    this._selectNode(node.path, node.nodeType);
    const isContainer = node.nodeType === 'component' && node.children.length > 0;
    this._contextMenuItems = computeMenuItems(node.nodeType, isContainer);
    this._contextMenuNode = node;
    this._contextMenuX = e.clientX;
    this._contextMenuY = e.clientY;
    this._contextMenuOpen = true;
  }

  private _handleMenuAction(e: CustomEvent): void {
    const action = e.detail.action as string;
    this._contextMenuOpen = false;
    if (!this._contextMenuNode) return;
    this.dispatchEvent(new CustomEvent('tree-action', {
      bubbles: true, composed: true,
      detail: { action, path: this._contextMenuNode.path, nodeType: this._contextMenuNode.nodeType },
    }));
  }

  private _handleMenuClose(): void {
    this._contextMenuOpen = false;
  }

  private _handleAddClick(node: TreeNodeInfo, e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('tree-add', {
      bubbles: true, composed: true,
      detail: { path: node.path, nodeType: node.nodeType, target: e.currentTarget as HTMLElement },
    }));
  }

  private _handleInsertClick(node: TreeNodeInfo, e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('tree-insert', {
      bubbles: true, composed: true,
      detail: { path: node.path, nodeType: node.nodeType, target: e.currentTarget as HTMLElement },
    }));
  }

  private _handleCutClick(node: TreeNodeInfo, e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('tree-cut', {
      bubbles: true, composed: true,
      detail: { path: node.path, nodeType: node.nodeType },
    }));
  }

  private _handleCopyClick(node: TreeNodeInfo, e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('tree-copy', {
      bubbles: true, composed: true,
      detail: { path: node.path, nodeType: node.nodeType },
    }));
  }

  private _handleTreeKeydown(e: KeyboardEvent): void {
    if (!this.selectedPath || !this._contextMenuNode && !this.selectedPath) return;
    const path = this.selectedPath;
    const nodeType = this._treeModel.length > 0 ? this._findNodeType(path) : undefined;
    if (!nodeType) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('tree-action', {
        bubbles: true, composed: true,
        detail: { action: 'delete', path, nodeType },
      }));
    } else if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('tree-action', {
        bubbles: true, composed: true,
        detail: { action: 'duplicate', path, nodeType },
      }));
    } else if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('tree-add', {
        bubbles: true, composed: true,
        detail: { path, nodeType },
      }));
    } else if (e.ctrlKey && e.shiftKey && e.key === 'ArrowUp') {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('tree-action', {
        bubbles: true, composed: true,
        detail: { action: 'move-up', path, nodeType },
      }));
    } else if (e.ctrlKey && e.shiftKey && e.key === 'ArrowDown') {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('tree-action', {
        bubbles: true, composed: true,
        detail: { action: 'move-down', path, nodeType },
      }));
    }
  }

  private _findNodeType(path: readonly (string | number)[]): TreeNodeType | undefined {
    const key = pathKey(path);
    const search = (nodes: readonly TreeNodeInfo[]): TreeNodeType | undefined => {
      for (const node of nodes) {
        if (pathKey(node.path) === key) return node.nodeType;
        const found = search(node.children);
        if (found) return found;
      }
      return undefined;
    };
    return search(this._treeModel);
  }

  private _isPasteTarget(node: TreeNodeInfo): boolean {
    if (!this.insertMode || !this.clipboardFragmentType || node.nodeType === 'section') return false;
    const ft = this.clipboardFragmentType;
    if (ft === 'component') return node.nodeType === 'column' || node.nodeType === 'page' || node.nodeType === 'component';
    if (ft === 'row') return node.nodeType === 'page' || node.nodeType === 'row';
    if (ft === 'column') return node.nodeType === 'row' || node.nodeType === 'column';
    return false;
  }

  private _renderNode(node: TreeNodeInfo, level: number): TemplateResult {
    const hasChildren = node.children.length > 0;
    const expanded = hasChildren && this._isExpanded(node.path);
    const selected = this._isSelected(node.path);
    const isSection = node.nodeType === 'section';
    const pasteTarget = this._isPasteTarget(node);

    return html`
      <div class="tree-node">
        <div
          role="treeitem"
          aria-level="${level}"
          aria-expanded="${hasChildren ? String(expanded) : nothing}"
          aria-selected="${selected}"
          class="tree-item${selected ? ' selected' : ''}${isSection ? ' section' : ''}${pasteTarget ? ' paste-target' : ''}"
          style="padding-left: ${level * 16}px"
          tabindex="-1"
          data-path="${pathKey(node.path)}"
          data-node-type="${node.nodeType}"
          @click="${(e: Event) => this._handleItemClick(node, e)}"
          @keydown="${(e: KeyboardEvent) => this._handleItemKeydown(node, e)}"
          @contextmenu="${(e: MouseEvent) => this._handleContextMenu(node, e)}"
        >
          ${hasChildren ? html`<span class="toggle">${expanded ? '▼' : '▸'}</span>`
            : html`<span class="toggle-spacer"></span>`}
          <span class="label">${node.label}</span>
          ${this._isContainerNode(node) ? html`
            <button class="add-btn" title="Add child" aria-label="Add to ${node.label}" @click="${(e: Event) => this._handleAddClick(node, e)}">+</button>
          ` : nothing}
          ${!isSection ? html`
            <button class="insert-btn" title="Insert before/after" aria-label="Insert near ${node.label}" @click="${(e: Event) => this._handleInsertClick(node, e)}">↓</button>
            <button class="cut-btn" title="Cut" aria-label="Cut ${node.label}" @click="${(e: Event) => this._handleCutClick(node, e)}">✂</button>
            <button class="copy-btn" title="Copy" aria-label="Copy ${node.label}" @click="${(e: Event) => this._handleCopyClick(node, e)}">⎘</button>
          ` : nothing}
        </div>
        ${expanded ? html`
          <div role="group">
            ${this._renderChildrenWithInsertionPoints(node, level + 1)}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _renderChildrenWithInsertionPoints(
    parent: TreeNodeInfo, childLevel: number,
  ): TemplateResult[] {
    const results: TemplateResult[] = [];
    const children = parent.children;
    const showInsertionPoints = this._isContainerNode(parent)
      && parent.nodeType !== 'section';

    if (showInsertionPoints) {
      results.push(this._renderInsertionPoint(parent, 0, childLevel));
    }

    for (let i = 0; i < children.length; i++) {
      results.push(this._renderNode(children[i]!, childLevel));
      if (showInsertionPoints) {
        results.push(this._renderInsertionPoint(parent, i + 1, childLevel));
      }
    }
    return results;
  }

  private _renderInsertionPoint(
    parent: TreeNodeInfo, index: number, level: number,
  ): TemplateResult {
    return html`
      <div
        class="tree-insertion-point"
        role="button"
        aria-label="Insert at position ${index} in ${parent.label}"
        style="padding-left: ${level * 16}px"
        data-index="${index}"
        @click="${(e: Event) => this._handleInsertionPointClick(parent, index, e)}"
      >
        <span class="insertion-line"></span>
        <span class="insertion-icon">+</span>
        <span class="insertion-line"></span>
      </div>
    `;
  }

  private _handleInsertionPointClick(
    parent: TreeNodeInfo, index: number, e: Event,
  ): void {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('tree-insert-at', {
      bubbles: true, composed: true,
      detail: {
        parentPath: parent.path,
        index,
        parentNodeType: parent.nodeType,
        target: e.currentTarget as HTMLElement,
      },
    }));
  }

  override render(): TemplateResult {
    return html`
      <div role="tree" aria-label="Document outline" @keydown="${(e: KeyboardEvent) => this._handleTreeKeydown(e)}">
        ${this._treeModel.map(section => this._renderNode(section, 1))}
      </div>
      <pages-context-menu
        .items="${this._contextMenuItems}"
        ?open="${this._contextMenuOpen}"
        style="left: ${this._contextMenuX}px; top: ${this._contextMenuY}px"
        @menu-action="${this._handleMenuAction}"
        @menu-close="${this._handleMenuClose}"
      ></pages-context-menu>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, sans-serif);
      font-size: var(--pages-font-size-sm, 13px);
      user-select: none;
    }

    .tree-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      cursor: pointer;
      border-radius: 4px;
      white-space: nowrap;
      outline: none;
    }

    .tree-item:hover {
      background: var(--pages-hover-bg, rgba(0, 0, 0, 0.04));
    }

    .tree-item:focus-visible {
      outline: 2px solid var(--pages-focus-ring, #4285f4);
      outline-offset: -2px;
    }

    .tree-item.selected {
      background: var(--pages-selected-bg, rgba(66, 133, 244, 0.12));
      color: var(--pages-selected-color, #1967d2);
    }

    .tree-item.section {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 0.05em;
      color: var(--pages-section-color, #5f6368);
    }

    .toggle {
      width: 16px;
      text-align: center;
      flex-shrink: 0;
      font-size: 10px;
    }

    .toggle-spacer {
      width: 16px;
      flex-shrink: 0;
    }

    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .add-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: 1px solid var(--pages-border-color, #dadce0);
      border-radius: 4px;
      background: var(--pages-surface-bg, #fff);
      color: var(--pages-text-secondary, #5f6368);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 0;
      flex-shrink: 0;
      opacity: 0;
    }

    .insert-btn, .cut-btn, .copy-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: 1px solid var(--pages-border-color, #dadce0);
      border-radius: 4px;
      background: var(--pages-surface-bg, #fff);
      color: var(--pages-text-secondary, #5f6368);
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
      padding: 0;
      flex-shrink: 0;
      opacity: 0;
    }

    .tree-item:hover .add-btn,
    .tree-item:hover .insert-btn,
    .tree-item:hover .cut-btn,
    .tree-item:hover .copy-btn {
      opacity: 1;
    }

    .add-btn:hover, .insert-btn:hover, .cut-btn:hover, .copy-btn:hover {
      background: var(--pages-primary, #1967d2);
      color: #fff;
      border-color: var(--pages-primary, #1967d2);
    }

    .tree-item.paste-target {
      outline: 2px solid var(--pages-primary, #1967d2);
      outline-offset: -2px;
      border-radius: 4px;
    }

    .tree-item.paste-target .add-btn,
    .tree-item.paste-target .insert-btn {
      opacity: 1;
      color: var(--pages-primary, #1967d2);
      border-color: var(--pages-primary, #1967d2);
    }

    .tree-insertion-point {
      display: flex;
      align-items: center;
      height: 12px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 150ms ease;
      padding-right: 8px;
    }

    .tree-insertion-point:hover,
    .tree-insertion-point:focus-visible {
      opacity: 1;
    }

    .insertion-line {
      flex: 1;
      height: 1px;
      background: var(--pages-primary, #4285f4);
    }

    .insertion-icon {
      font-size: 10px;
      color: var(--pages-primary, #4285f4);
      padding: 0 4px;
      font-weight: bold;
      line-height: 1;
    }
  `;
}
