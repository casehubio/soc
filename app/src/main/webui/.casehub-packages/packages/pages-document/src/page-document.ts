import { parseDocument, type Document, isMap, isSeq, type YAMLMap, type YAMLSeq } from 'yaml';
import type { Diagnostic, LayoutMode, Unsubscribe } from './types.js';
import { getContainerDescriptor, type ContainerChildDescriptor } from './container-descriptors.js';
import { zodToFieldSchema } from './zod-to-fieldschema.js';
import { componentSchemaRegistry } from '@casehubio/pages-schema';
import type { FieldSchema } from '@casehubio/pages-component';
import { z } from 'zod';

const MAX_UNDO_STACK = 50;

function toRecord(node: unknown): Record<string, unknown> {
  if (!isMap(node)) return {};
  const result: Record<string, unknown> = {};
  for (const pair of (node as YAMLMap).items) {
    const key = String(pair.key);
    const val = (node as YAMLMap).get(key);
    result[key] = val;
  }
  return result;
}

export class PageDocument {
  private _doc: Document;
  private _diagnostics: Diagnostic[];
  private _undoStack: string[] = [];
  private _redoStack: string[] = [];
  private _listeners: Array<(yaml: string) => void> = [];
  private _inTransaction = false;
  private _transactionSnapshot: string | null = null;
  private _coordinated = false;

  private constructor(doc: Document, diagnostics: Diagnostic[]) {
    this._doc = doc;
    this._diagnostics = diagnostics;
  }

  static parse(yaml: string): PageDocument {
    const diagnostics: Diagnostic[] = [];
    let doc: Document;
    try {
      doc = parseDocument(yaml, { keepSourceTokens: true });
      for (const err of doc.errors) {
        diagnostics.push({
          severity: 'error',
          message: err.message,
          range: {
            start: { line: err.pos?.[0] ?? 0, character: 0 },
            end: { line: err.pos?.[1] ?? 0, character: 0 },
          },
        });
      }
    } catch {
      doc = parseDocument('');
      diagnostics.push({
        severity: 'error',
        message: 'Failed to parse YAML',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      });
    }
    return new PageDocument(doc, diagnostics);
  }

  static empty(): PageDocument {
    return PageDocument.parse('');
  }

  static parseCoordinated(yaml: string): PageDocument {
    const doc = PageDocument.parse(yaml);
    doc._coordinated = true;
    return doc;
  }

  get diagnostics(): readonly Diagnostic[] {
    return this._diagnostics;
  }

  toString(): string {
    return this._doc.toString();
  }

  // --- Change notification ---

  onChange(listener: (yaml: string) => void): Unsubscribe {
    this._listeners.push(listener);
    return () => {
      const idx = this._listeners.indexOf(listener);
      if (idx >= 0) this._listeners.splice(idx, 1);
    };
  }

  private _notify(): void {
    if (this._coordinated) return;
    if (this._inTransaction) return;
    const yaml = this.toString();
    for (const l of this._listeners) l(yaml);
  }

  // --- Undo/Redo ---

  private _pushUndo(): void {
    if (this._coordinated) return;
    if (this._inTransaction) return;
    this._undoStack.push(this.toString());
    if (this._undoStack.length > MAX_UNDO_STACK) {
      this._undoStack.shift();
    }
    this._redoStack.length = 0;
  }

  // --- Transaction API ---

  beginTransaction(): void {
    if (this._inTransaction) throw new Error('Already in transaction');
    this._inTransaction = true;
    this._transactionSnapshot = this.toString();
    if (!this._coordinated) {
      this._undoStack.push(this._transactionSnapshot);
      if (this._undoStack.length > MAX_UNDO_STACK) {
        this._undoStack.shift();
      }
      this._redoStack.length = 0;
    }
  }

  commitTransaction(): void {
    this._inTransaction = false;
    this._transactionSnapshot = null;
    this._notify();
  }

  abortTransaction(): void {
    if (!this._inTransaction) return;
    this._inTransaction = false;
    this._doc = parseDocument(this._transactionSnapshot!, { keepSourceTokens: true });
    this._transactionSnapshot = null;
    if (!this._coordinated) {
      this._undoStack.pop();
      this._redoStack.length = 0;
    }
  }

  undo(): boolean {
    const snapshot = this._undoStack.pop();
    if (!snapshot) return false;
    this._redoStack.push(this.toString());
    this._doc = parseDocument(snapshot, { keepSourceTokens: true });
    this._notify();
    return true;
  }

  redo(): boolean {
    const snapshot = this._redoStack.pop();
    if (!snapshot) return false;
    this._undoStack.push(this.toString());
    this._doc = parseDocument(snapshot, { keepSourceTokens: true });
    this._notify();
    return true;
  }

  canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  // --- Document-level properties ---

  getProperties(): Record<string, string> {
    const node = this._doc.getIn(['properties']);
    if (!isMap(node)) return {};
    const result: Record<string, string> = {};
    for (const pair of (node as YAMLMap).items) {
      result[String(pair.key)] = String((node as YAMLMap).get(String(pair.key)));
    }
    return result;
  }

  setProperty(key: string, value: string): void {
    this._pushUndo();
    this._doc.setIn(['properties', key], value);
    this._notify();
  }

  // --- Pages ---

  getPages(): PageNode[] {
    const seq = this._doc.getIn(['pages']);
    if (!isSeq(seq)) return [];
    return (seq as YAMLSeq).items.map((_, i) => new PageNode(this, ['pages', i]));
  }

  addPage(name: string): PageNode {
    this._pushUndo();
    const pagesSeq = this._doc.getIn(['pages']);
    if (!isSeq(pagesSeq)) {
      this._doc.setIn(['pages'], [{ name, components: [] }]);
    } else {
      this._doc.addIn(['pages'], this._doc.createNode({ name, components: [] }));
    }
    this._notify();
    const pages = this.getPages();
    return pages[pages.length - 1]!;
  }

  removePage(index: number): void {
    this._pushUndo();
    this._doc.deleteIn(['pages', index]);
    this._notify();
  }

  // --- Datasets ---

  getDatasets(): DatasetNode[] {
    const seq = this._doc.getIn(['datasets']);
    if (!isSeq(seq)) return [];
    return (seq as YAMLSeq).items.map((_, i) => new DatasetNode(this, ['datasets', i]));
  }

  addDataset(uuid: string, defaults?: Record<string, unknown>): DatasetNode {
    this._pushUndo();
    const entry = { uuid, ...defaults };
    const seq = this._doc.getIn(['datasets']);
    if (!isSeq(seq)) {
      this._doc.setIn(['datasets'], this._doc.createNode([entry]));
    } else {
      (seq as YAMLSeq).add(this._doc.createNode(entry));
    }
    this._notify();
    const datasets = this.getDatasets();
    return datasets[datasets.length - 1]!;
  }

  removeDataset(index: number): void {
    this._pushUndo();
    this._doc.deleteIn(['datasets', index]);
    this._notify();
  }

  // --- Navigation ---

  getNavTree(): NavTreeNode | undefined {
    const node = this._doc.getIn(['navTree']);
    if (!isMap(node)) return undefined;
    return new NavTreeNode(this, ['navTree']);
  }

  // --- yaml-core accessors (read-only) ---

  getModules(): Record<string, Record<string, unknown>> | undefined {
    const node = this._doc.getIn(['modules']);
    if (!isMap(node)) return undefined;
    return (node as YAMLMap).toJSON() as Record<string, Record<string, unknown>>;
  }

  getImports(): Record<string, unknown>[] | undefined {
    const node = this._doc.getIn(['imports']);
    if (!isSeq(node)) return undefined;
    return (node as YAMLSeq).toJSON() as Record<string, unknown>[];
  }

  getVariables(): Record<string, unknown> | undefined {
    const node = this._doc.getIn(['variables']);
    if (!isMap(node)) return undefined;
    return (node as YAMLMap).toJSON() as Record<string, unknown>;
  }

  // --- Internal ---

  /** @internal */
  _getDoc(): Document {
    return this._doc;
  }

  /** @internal */
  _pushUndoInternal(): void {
    this._pushUndo();
  }

  /** @internal */
  _notifyInternal(): void {
    this._notify();
  }
}

export class PageNode {
  constructor(
    private _doc: PageDocument,
    readonly path: readonly (string | number)[],
  ) {}

  get name(): string {
    return String(this._doc._getDoc().getIn([...this.path, 'name']) ?? '');
  }

  set name(value: string) {
    this._doc._pushUndoInternal();
    this._doc._getDoc().setIn([...this.path, 'name'], value);
    this._doc._notifyInternal();
  }

  getLayoutMode(): LayoutMode {
    const doc = this._doc._getDoc();
    if (isSeq(doc.getIn([...this.path, 'rows']))) return 'rows';
    if (isSeq(doc.getIn([...this.path, 'columns']))) return 'columns';
    return 'flat';
  }

  getRows(): RowNode[] {
    const seq = this._doc._getDoc().getIn([...this.path, 'rows']);
    if (!isSeq(seq)) return [];
    return (seq as YAMLSeq).items.map((_, i) => new RowNode(this._doc, [...this.path, 'rows', i]));
  }

  getColumns(): ColumnNode[] {
    const seq = this._doc._getDoc().getIn([...this.path, 'columns']);
    if (!isSeq(seq)) return [];
    return (seq as YAMLSeq).items.map((_, i) => new ColumnNode(this._doc, [...this.path, 'columns', i]));
  }

  getComponents(): ComponentNode[] {
    const seq = this._doc._getDoc().getIn([...this.path, 'components']);
    if (!isSeq(seq)) return [];
    return (seq as YAMLSeq).items.map((_, i) => new ComponentNode(this._doc, [...this.path, 'components', i]));
  }

  addRow(): RowNode {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const rowsPath = [...this.path, 'rows'];
    const seq = doc.getIn(rowsPath);
    const newRow = doc.createNode({ columns: [{ span: 12, components: [] }] });
    if (!isSeq(seq)) {
      doc.setIn(rowsPath, []);
      (doc.getIn(rowsPath) as YAMLSeq).add(newRow);
    } else {
      (seq as YAMLSeq).add(newRow);
    }
    this._doc._notifyInternal();
    const rows = this.getRows();
    return rows[rows.length - 1]!;
  }

  insertRowAt(index: number): RowNode {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const rowsPath = [...this.path, 'rows'];
    const seq = doc.getIn(rowsPath);
    const newRow = doc.createNode({ columns: [{ span: 12, components: [] }] });
    if (!isSeq(seq)) {
      doc.setIn(rowsPath, []);
      (doc.getIn(rowsPath) as YAMLSeq).add(newRow);
    } else {
      (seq as YAMLSeq).items.splice(index, 0, newRow);
    }
    this._doc._notifyInternal();
    return new RowNode(this._doc, [...this.path, 'rows', index]);
  }

  addComponent(type: string, props?: Record<string, unknown>): ComponentNode {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const compsPath = [...this.path, 'components'];
    const entry: Record<string, unknown> = { type };
    if (props && Object.keys(props).length > 0) {
      entry['properties'] = props;
    }
    const node = doc.createNode(entry);
    const seq = doc.getIn(compsPath);
    if (!isSeq(seq)) {
      doc.setIn(compsPath, []);
      (doc.getIn(compsPath) as YAMLSeq).add(node);
    } else {
      (seq as YAMLSeq).add(node);
    }
    this._doc._notifyInternal();
    const comps = this.getComponents();
    return comps[comps.length - 1]!;
  }

  insertChildAt(index: number, type: string, props?: Record<string, unknown>): ComponentNode {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const mode = this.getLayoutMode();
    const key = mode === 'rows' ? 'rows' : mode === 'columns' ? 'columns' : 'components';
    const seqPath = [...this.path, key];
    const entry: Record<string, unknown> = { type };
    if (props && Object.keys(props).length > 0) entry['properties'] = props;
    const node = doc.createNode(entry);
    const seq = doc.getIn(seqPath);
    if (!isSeq(seq)) {
      doc.setIn(seqPath, []);
      (doc.getIn(seqPath) as YAMLSeq).add(node);
    } else {
      (seq as YAMLSeq).items.splice(index, 0, node);
    }
    this._doc._notifyInternal();
    return new ComponentNode(this._doc, [...seqPath, index]);
  }

  wrapInRow(componentIndices: number[]): RowNode {
    const mode = this.getLayoutMode();
    if (mode === 'columns') throw new Error('Cannot wrap in row when page uses column layout');
    this._doc.beginTransaction();
    try {
      const doc = this._doc._getDoc();
      const sorted = [...componentIndices].sort((a, b) => a - b);
      const compsPath = [...this.path, 'components'];
      const compsSeq = doc.getIn(compsPath);
      if (!isSeq(compsSeq)) throw new Error('No components to wrap');
      const items = (compsSeq as YAMLSeq).items;
      const collected = sorted.map(i => JSON.parse(JSON.stringify(items[i])) as unknown);
      for (let i = sorted.length - 1; i >= 0; i--) {
        items.splice(sorted[i]!, 1);
      }
      const rowData = { columns: [{ span: 12, components: collected }] };
      if (mode === 'flat') {
        const remaining = items.splice(0, items.length);
        doc.deleteIn(compsPath);
        const rowsPath = [...this.path, 'rows'];
        const allRows: Record<string, unknown>[] = [rowData];
        if (remaining.length > 0) {
          allRows.push({ columns: [{ span: 12, components: remaining.map(r => JSON.parse(JSON.stringify(r)) as unknown) }] });
        }
        doc.setIn(rowsPath, doc.createNode(allRows));
      } else {
        const rowsPath = [...this.path, 'rows'];
        const rowsSeq = doc.getIn(rowsPath) as YAMLSeq;
        const rowNode = doc.createNode(rowData);
        rowsSeq.items.splice(sorted[0]!, 0, rowNode);
      }
      this._doc.commitTransaction();
      return this.getRows()[mode === 'flat' ? 0 : sorted[0]!]!;
    } catch (e) {
      this._doc.abortTransaction();
      throw e;
    }
  }

  removeChild(index: number): void {
    this._doc._pushUndoInternal();
    const mode = this.getLayoutMode();
    const key = mode === 'rows' ? 'rows' : mode === 'columns' ? 'columns' : 'components';
    this._doc._getDoc().deleteIn([...this.path, key, index]);
    this._doc._notifyInternal();
  }
}

export class RowNode {
  constructor(
    private _doc: PageDocument,
    readonly path: readonly (string | number)[],
  ) {}

  getColumns(): ColumnNode[] {
    const seq = this._doc._getDoc().getIn([...this.path, 'columns']);
    if (!isSeq(seq)) return [];
    return (seq as YAMLSeq).items.map((_, i) => new ColumnNode(this._doc, [...this.path, 'columns', i]));
  }

  addColumn(span = 12): ColumnNode {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const colsPath = [...this.path, 'columns'];
    const newCol = doc.createNode({ span, components: [] });
    const seq = doc.getIn(colsPath);
    if (!isSeq(seq)) {
      doc.setIn(colsPath, []);
      (doc.getIn(colsPath) as YAMLSeq).add(newCol);
    } else {
      (seq as YAMLSeq).add(newCol);
    }
    this._doc._notifyInternal();
    const cols = this.getColumns();
    return cols[cols.length - 1]!;
  }

  insertColumnAt(index: number, span = 12): ColumnNode {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const colsPath = [...this.path, 'columns'];
    const newCol = doc.createNode({ span, components: [] });
    const seq = doc.getIn(colsPath);
    if (!isSeq(seq)) {
      doc.setIn(colsPath, []);
      (doc.getIn(colsPath) as YAMLSeq).add(newCol);
    } else {
      (seq as YAMLSeq).items.splice(index, 0, newCol);
    }
    this._doc._notifyInternal();
    return new ColumnNode(this._doc, [...colsPath, index]);
  }

  removeColumn(index: number): void {
    this._doc._pushUndoInternal();
    this._doc._getDoc().deleteIn([...this.path, 'columns', index]);
    this._doc._notifyInternal();
  }
}

export class ColumnNode {
  constructor(
    private _doc: PageDocument,
    readonly path: readonly (string | number)[],
  ) {}

  get span(): number {
    const val = this._doc._getDoc().getIn([...this.path, 'span']);
    return typeof val === 'number' ? val : 12;
  }

  set span(value: number) {
    this._doc._pushUndoInternal();
    this._doc._getDoc().setIn([...this.path, 'span'], value);
    this._doc._notifyInternal();
  }

  getComponents(): ComponentNode[] {
    const seq = this._doc._getDoc().getIn([...this.path, 'components']);
    if (!isSeq(seq)) return [];
    return (seq as YAMLSeq).items.map((_, i) => new ComponentNode(this._doc, [...this.path, 'components', i]));
  }

  addComponent(type: string, props?: Record<string, unknown>): ComponentNode {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const compsPath = [...this.path, 'components'];
    const entry: Record<string, unknown> = { type };
    if (props && Object.keys(props).length > 0) {
      entry['properties'] = props;
    }
    const node = doc.createNode(entry);
    const seq = doc.getIn(compsPath);
    if (!isSeq(seq)) {
      doc.setIn(compsPath, []);
      (doc.getIn(compsPath) as YAMLSeq).add(node);
    } else {
      (seq as YAMLSeq).add(node);
    }
    this._doc._notifyInternal();
    const comps = this.getComponents();
    return comps[comps.length - 1]!;
  }

  insertComponentAt(index: number, type: string, props?: Record<string, unknown>): ComponentNode {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const compsPath = [...this.path, 'components'];
    const entry: Record<string, unknown> = { type };
    if (props && Object.keys(props).length > 0) entry['properties'] = props;
    const node = doc.createNode(entry);
    const seq = doc.getIn(compsPath);
    if (!isSeq(seq)) {
      doc.setIn(compsPath, []);
      (doc.getIn(compsPath) as YAMLSeq).add(node);
    } else {
      (seq as YAMLSeq).items.splice(index, 0, node);
    }
    this._doc._notifyInternal();
    return new ComponentNode(this._doc, [...compsPath, index]);
  }

  removeComponent(index: number): void {
    this._doc._pushUndoInternal();
    this._doc._getDoc().deleteIn([...this.path, 'components', index]);
    this._doc._notifyInternal();
  }

  getProperties(): Record<string, unknown> {
    return toRecord(this._doc._getDoc().getIn([...this.path, 'properties']));
  }

  setProperty(key: string, value: unknown): void {
    this._doc._pushUndoInternal();
    this._doc._getDoc().setIn([...this.path, 'properties', key], value);
    this._doc._notifyInternal();
  }
}

export interface ContainerChildren {
  slots: Record<string, ComponentNode[]>;
  descriptor: ContainerChildDescriptor;
}

const fieldSchemaCache = new Map<string, FieldSchema>();

export class ComponentNode {
  constructor(
    private _doc: PageDocument,
    readonly path: readonly (string | number)[],
  ) {}

  get type(): string {
    return String(this._doc._getDoc().getIn([...this.path, 'type']) ?? '');
  }

  getProperties(): Record<string, unknown> {
    return toRecord(this._doc._getDoc().getIn([...this.path, 'properties']));
  }

  setProperty(key: string, value: unknown): void {
    this._doc._pushUndoInternal();
    this._doc._getDoc().setIn([...this.path, 'properties', key], value);
    this._doc._notifyInternal();
  }

  removeProperty(key: string): void {
    this._doc._pushUndoInternal();
    this._doc._getDoc().deleteIn([...this.path, 'properties', key]);
    this._doc._notifyInternal();
  }

  getSchema(): FieldSchema {
    const t = this.type;
    const cached = fieldSchemaCache.get(t);
    if (cached) return cached;
    const zodSchema = componentSchemaRegistry.get(t);
    if (!zodSchema) return { type: 'object' };
    const fs = zodToFieldSchema(zodSchema);
    fieldSchemaCache.set(t, fs);
    return fs;
  }

  isContainer(): boolean {
    return getContainerDescriptor(this.type) !== undefined;
  }

  getChildren(): ContainerChildren {
    const desc = getContainerDescriptor(this.type);
    if (!desc) return { slots: {}, descriptor: { type: this.type, slots: [], defaultContentSlot: '' } };
    const doc = this._doc._getDoc();
    const slots: Record<string, ComponentNode[]> = {};

    for (const slot of desc.slots) {
      if (slot.kind === 'named-record') {
        const mapNode = doc.getIn([...this.path, slot.yamlKey]);
        if (isMap(mapNode)) {
          for (const pair of (mapNode as YAMLMap).items) {
            const name = String(pair.key);
            const entryNode = (mapNode as YAMLMap).get(name, true);
            if (isMap(entryNode)) {
              const compsSeq = (entryNode as YAMLMap).get(slot.childKey, true);
              if (isSeq(compsSeq)) {
                slots[name] = (compsSeq as YAMLSeq).items.map((_, i) =>
                  new ComponentNode(this._doc, [...this.path, slot.yamlKey, name, slot.childKey, i])
                );
              } else {
                slots[name] = [];
              }
            }
          }
        }
      } else if (slot.kind === 'array') {
        const seq = doc.getIn([...this.path, slot.yamlKey]);
        if (isSeq(seq)) {
          slots[slot.yamlKey] = (seq as YAMLSeq).items.map((_, i) =>
            new ComponentNode(this._doc, [...this.path, slot.yamlKey, i])
          );
        }
      } else if (slot.kind === 'nested-array') {
        const container = doc.getIn([...this.path, slot.yamlKey]);
        if (isMap(container)) {
          const seq = (container as YAMLMap).get(slot.childKey, true);
          if (isSeq(seq)) {
            slots[slot.yamlKey] = (seq as YAMLSeq).items.map((_, i) =>
              new ComponentNode(this._doc, [...this.path, slot.yamlKey, slot.childKey, i])
            );
          }
        }
      }
    }
    return { slots, descriptor: desc };
  }

  addChild(slot: string, type: string, props?: Record<string, unknown>): ComponentNode {
    const desc = getContainerDescriptor(this.type);
    if (!desc) throw new Error(`${this.type} is not a container`);
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const entry: Record<string, unknown> = { type };
    if (props && Object.keys(props).length > 0) entry['properties'] = props;
    const compNode = doc.createNode(entry);

    let slotDesc = desc.slots.find(s => s.yamlKey === slot);
    const isNamedEntry = !slotDesc && desc.slots.some(s => s.kind === 'named-record');
    if (!slotDesc && isNamedEntry) {
      slotDesc = desc.slots.find(s => s.kind === 'named-record');
    }
    if (!slotDesc) throw new Error(`Invalid slot "${slot}" for ${this.type}`);

    if (slotDesc.kind === 'named-record') {
      const mapPath = [...this.path, slotDesc.yamlKey];
      let mapNode = doc.getIn(mapPath);
      if (!isMap(mapNode)) {
        doc.setIn(mapPath, doc.createNode({}));
        mapNode = doc.getIn(mapPath);
      }
      const entryPath = [...mapPath, slot];
      let entryNode = doc.getIn(entryPath);
      if (!isMap(entryNode)) {
        const newEntry = doc.createNode({ [slotDesc.childKey]: [] });
        (mapNode as YAMLMap).set(doc.createNode(slot), newEntry);
        entryNode = (mapNode as YAMLMap).get(slot, true);
      }
      const compsSeq = (entryNode as YAMLMap).get(slotDesc.childKey, true);
      if (!isSeq(compsSeq)) throw new Error('Slot child array not found');
      compsSeq.add(compNode);
      const idx = compsSeq.items.length - 1;
      const compsPath = [...entryPath, slotDesc.childKey];
      this._doc._notifyInternal();
      return new ComponentNode(this._doc, [...compsPath, idx]);
    } else if (slotDesc.kind === 'array') {
      const arrPath = [...this.path, slotDesc.yamlKey];
      let seq = doc.getIn(arrPath);
      if (!isSeq(seq)) {
        doc.setIn(arrPath, []);
        seq = doc.getIn(arrPath);
      }
      (seq as YAMLSeq).add(compNode);
      const idx = (seq as YAMLSeq).items.length - 1;
      this._doc._notifyInternal();
      return new ComponentNode(this._doc, [...arrPath, idx]);
    } else {
      const containerPath = [...this.path, slotDesc.yamlKey];
      let container = doc.getIn(containerPath);
      if (!isMap(container)) {
        doc.setIn(containerPath, { [slotDesc.childKey]: [] });
        container = doc.getIn(containerPath);
      }
      const childPath = [...containerPath, slotDesc.childKey];
      let seq = doc.getIn(childPath);
      if (!isSeq(seq)) {
        doc.setIn(childPath, []);
        seq = doc.getIn(childPath);
      }
      (seq as YAMLSeq).add(compNode);
      const idx = (seq as YAMLSeq).items.length - 1;
      this._doc._notifyInternal();
      return new ComponentNode(this._doc, [...childPath, idx]);
    }
  }

  replaceWith(newType: string): ComponentNode {
    this._doc.beginTransaction();
    try {
      const doc = this._doc._getDoc();
      const parentPath = this.path.slice(0, -1);
      const currentIndex = this.path[this.path.length - 1] as number;
      const oldProps = this.getProperties();
      const targetSchema = componentSchemaRegistry.get(newType);
      const entry: Record<string, unknown> = { type: newType };
      const compatible: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(oldProps)) {
        const serializer = value as { toJSON?: () => unknown } | null;
        const jsVal = serializer !== null && typeof serializer?.toJSON === 'function' ? serializer.toJSON() : value;
        if (targetSchema) {
          if (targetSchema instanceof z.ZodObject && !(key in targetSchema.shape)) continue;
        }
        compatible[key] = jsVal;
      }
      if (Object.keys(compatible).length > 0) entry['properties'] = compatible;
      doc.deleteIn(this.path as (string | number)[]);
      const newNode = doc.createNode(entry);
      const parentSeq = doc.getIn(parentPath as (string | number)[]);
      if (isSeq(parentSeq)) {
        (parentSeq as YAMLSeq).items.splice(currentIndex, 0, newNode);
      }
      this._doc.commitTransaction();
      return new ComponentNode(this._doc, [...parentPath, currentIndex]);
    } catch (e) {
      this._doc.abortTransaction();
      throw e;
    }
  }

  moveToSlot(target: { path: readonly (string | number)[]; slotName: string }, index: number): void {
    this._doc.beginTransaction();
    try {
      const doc = this._doc._getDoc();
      const sourceJson = JSON.parse(JSON.stringify(doc.getIn(this.path as (string | number)[])));
      doc.deleteIn(this.path as (string | number)[]);
      const targetComp = doc.getIn(target.path as (string | number)[]);
      if (!isMap(targetComp)) throw new Error('Target is not a map');
      const targetType = String((targetComp as YAMLMap).get('type'));
      const desc = getContainerDescriptor(targetType);
      if (!desc) throw new Error(`${targetType} is not a container`);
      const slotDesc = desc.slots.find(s => s.kind === 'named-record');
      if (!slotDesc || slotDesc.kind !== 'named-record') throw new Error('Target has no named-record slots');
      const mapPath = [...target.path, slotDesc.yamlKey] as (string | number)[];
      let mapNode = doc.getIn(mapPath);
      if (!isMap(mapNode)) {
        doc.setIn(mapPath, doc.createNode({}));
        mapNode = doc.getIn(mapPath);
      }
      const existingEntry = (mapNode as YAMLMap).get(target.slotName, true);
      let entryNode: YAMLMap | undefined = isMap(existingEntry) ? existingEntry : undefined;
      if (!entryNode) {
        const newEntry = doc.createNode({ [slotDesc.childKey]: [] });
        (mapNode as YAMLMap).set(doc.createNode(target.slotName), newEntry);
        entryNode = newEntry;
      }
      const compsSeq = entryNode.get(slotDesc.childKey, true);
      if (!isSeq(compsSeq)) throw new Error('Slot child array not found');
      const compNode = doc.createNode(sourceJson);
      compsSeq.items.splice(index, 0, compNode);
      this._doc.commitTransaction();
    } catch (e) {
      this._doc.abortTransaction();
      throw e;
    }
  }

  wrapIn(containerType: string): ComponentNode {
    const desc = getContainerDescriptor(containerType);
    if (!desc) throw new Error(`${containerType} is not a container type`);
    this._doc.beginTransaction();
    try {
      const doc = this._doc._getDoc();
      const parentPath = this.path.slice(0, -1);
      const currentIndex = this.path[this.path.length - 1] as number;
      const sourceJson = JSON.parse(JSON.stringify(doc.getIn(this.path as (string | number)[])));
      doc.deleteIn(this.path as (string | number)[]);
      const defaultSlot = desc.defaultContentSlot;
      const slotDesc = desc.slots.find(s => s.yamlKey === defaultSlot)!;
      let containerYaml: Record<string, unknown>;
      if (slotDesc.kind === 'named-record') {
        containerYaml = { type: containerType, [slotDesc.yamlKey]: { 'Tab 1': { [slotDesc.childKey]: [sourceJson] } } };
      } else if (slotDesc.kind === 'array') {
        containerYaml = { type: containerType, [slotDesc.yamlKey]: [sourceJson] };
      } else {
        containerYaml = { type: containerType, [slotDesc.yamlKey]: { [slotDesc.childKey]: [sourceJson] } };
      }
      const containerNode = doc.createNode(containerYaml);
      const parentSeq = doc.getIn(parentPath as (string | number)[]);
      if (isSeq(parentSeq)) {
        (parentSeq as YAMLSeq).items.splice(currentIndex, 0, containerNode);
      }
      this._doc.commitTransaction();
      return new ComponentNode(this._doc, [...parentPath, currentIndex]);
    } catch (e) {
      this._doc.abortTransaction();
      throw e;
    }
  }

  moveToIndex(parent: { path: readonly (string | number)[]; slot?: string }, index: number): void {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const sourceNode = doc.getIn(this.path as (string | number)[]);
    doc.deleteIn(this.path as (string | number)[]);
    const targetPath = [...parent.path];
    if (parent.slot) targetPath.push(parent.slot);
    const targetSeq = doc.getIn(targetPath);
    if (isSeq(targetSeq)) {
      const items = (targetSeq as YAMLSeq).items;
      items.splice(index, 0, sourceNode);
    }
    this._doc._notifyInternal();
  }

  duplicate(): ComponentNode {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const sourceNode = doc.getIn(this.path as (string | number)[]);
    const clone = doc.createNode(JSON.parse(JSON.stringify(sourceNode)));
    const parentPath = this.path.slice(0, -1);
    const currentIndex = this.path[this.path.length - 1] as number;
    const parentSeq = doc.getIn(parentPath as (string | number)[]);
    if (isSeq(parentSeq)) {
      (parentSeq as YAMLSeq).items.splice(currentIndex + 1, 0, clone);
    }
    this._doc._notifyInternal();
    return new ComponentNode(this._doc, [...parentPath, currentIndex + 1]);
  }
}

export class DatasetNode {
  constructor(
    private _doc: PageDocument,
    readonly path: readonly (string | number)[],
  ) {}

  get uuid(): string {
    return String(this._doc._getDoc().getIn([...this.path, 'uuid']) ?? '');
  }

  get name(): string | undefined {
    const val = this._doc._getDoc().getIn([...this.path, 'name']);
    return val != null ? String(val) : undefined;
  }

  get url(): string | undefined {
    const val = this._doc._getDoc().getIn([...this.path, 'url']);
    return val != null ? String(val) : undefined;
  }

  get content(): string | undefined {
    const val = this._doc._getDoc().getIn([...this.path, 'content']);
    return val != null ? String(val) : undefined;
  }

  getSource(): 'url' | 'content' | 'join' | 'serverQuery' | undefined {
    const doc = this._doc._getDoc();
    if (doc.getIn([...this.path, 'url']) != null) return 'url';
    if (doc.getIn([...this.path, 'content']) != null) return 'content';
    if (doc.getIn([...this.path, 'join']) != null) return 'join';
    if (doc.getIn([...this.path, 'serverQuery']) != null) return 'serverQuery';
    return undefined;
  }

  getColumns(): Array<{ id: string; type: string; name?: string }> {
    const seq = this._doc._getDoc().getIn([...this.path, 'columns']);
    if (!isSeq(seq)) return [];
    return (seq as YAMLSeq).items.map((item) => {
      if (!isMap(item)) return { id: '', type: '' };
      const m = item as YAMLMap;
      return {
        id: String(m.get('id') ?? ''),
        type: String(m.get('type') ?? ''),
        ...(m.get('name') != null ? { name: String(m.get('name')) } : {}),
      };
    });
  }

  addColumn(id: string, type: string, name?: string): void {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const colsPath = [...this.path, 'columns'];
    const entry: Record<string, string> = { id, type };
    if (name) entry['name'] = name;
    const seq = doc.getIn(colsPath);
    if (!isSeq(seq)) {
      doc.setIn(colsPath, [entry]);
    } else {
      doc.addIn(colsPath, doc.createNode(entry));
    }
    this._doc._notifyInternal();
  }

  removeColumn(index: number): void {
    this._doc._pushUndoInternal();
    this._doc._getDoc().deleteIn([...this.path, 'columns', index]);
    this._doc._notifyInternal();
  }

  getProperties(): Record<string, unknown> {
    return toRecord(this._doc._getDoc().getIn(this.path as (string | number)[]));
  }

  setProperty(key: string, value: unknown): void {
    this._doc._pushUndoInternal();
    this._doc._getDoc().setIn([...this.path, key], value);
    this._doc._notifyInternal();
  }
}

export class NavTreeNode {
  constructor(
    private _doc: PageDocument,
    readonly path: readonly (string | number)[],
  ) {}

  get type(): string | undefined {
    const val = this._doc._getDoc().getIn([...this.path, 'type']);
    return val != null ? String(val) : undefined;
  }

  get id(): string | undefined {
    const val = this._doc._getDoc().getIn([...this.path, 'id']);
    return val != null ? String(val) : undefined;
  }

  get page(): string | undefined {
    const val = this._doc._getDoc().getIn([...this.path, 'page']);
    return val != null ? String(val) : undefined;
  }

  get children(): NavTreeNode[] {
    const key = this.path.length <= 1 ? 'root_items' : 'children';
    const seq = this._doc._getDoc().getIn([...this.path, key]);
    if (!isSeq(seq)) return [];
    return (seq as YAMLSeq).items.map((_, i) => new NavTreeNode(this._doc, [...this.path, key, i]));
  }

  setPage(page: string): void {
    this._doc._pushUndoInternal();
    this._doc._getDoc().setIn([...this.path, 'page'], page);
    this._doc._notifyInternal();
  }

  setId(id: string): void {
    this._doc._pushUndoInternal();
    this._doc._getDoc().setIn([...this.path, 'id'], id);
    this._doc._notifyInternal();
  }

  addChild(item: { type?: 'GROUP' | 'ITEM'; id?: string; page?: string }): NavTreeNode {
    this._doc._pushUndoInternal();
    const doc = this._doc._getDoc();
    const key = this.path.length <= 1 ? 'root_items' : 'children';
    const childrenPath = [...this.path, key];
    const seq = doc.getIn(childrenPath);
    if (!isSeq(seq)) {
      doc.setIn(childrenPath, [item]);
    } else {
      doc.addIn(childrenPath, doc.createNode(item));
    }
    this._doc._notifyInternal();
    const children = this.children;
    return children[children.length - 1]!;
  }

  removeChild(index: number): void {
    this._doc._pushUndoInternal();
    const key = this.path.length <= 1 ? 'root_items' : 'children';
    this._doc._getDoc().deleteIn([...this.path, key, index]);
    this._doc._notifyInternal();
  }
}
