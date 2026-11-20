import { PageDocument } from '@casehubio/pages-document';
import { parseDocument, isMap, isSeq, type YAMLMap, type YAMLSeq } from 'yaml';
import type { TreeNodeType } from '../tree/builder-tree.js';

export interface YamlRange {
  readonly from: number;
  readonly to: number;
}

function freshParse(doc: PageDocument) {
  return parseDocument(doc.toString(), { keepSourceTokens: true });
}

export function findPathAtOffset(doc: PageDocument, offset: number): readonly (string | number)[] | undefined {
  const fresh = freshParse(doc);
  const contents = fresh.contents;
  if (!contents) return undefined;
  const path = walkForPath(contents, offset, []);
  if (!path || path.length === 0) return undefined;
  return trimToNodeBoundary(path);
}

function walkForPath(node: unknown, offset: number, path: (string | number)[]): (string | number)[] | undefined {
  const range = (node as any)?.range as [number, number, number] | undefined;
  if (!range) return path.length > 0 ? path : undefined;
  if (offset < range[0] || offset > range[2]) return undefined;

  if (isMap(node)) {
    for (const pair of (node as YAMLMap).items) {
      const key = String(pair.key);
      if (pair.value != null) {
        const valRange = (pair.value as any)?.range as [number, number, number] | undefined;
        if (valRange && offset >= valRange[0] && offset <= valRange[2]) {
          const deeper = walkForPath(pair.value, offset, [...path, key]);
          if (deeper) return deeper;
        }
        const keyRange = (pair.key as any)?.range as [number, number, number] | undefined;
        if (keyRange && offset >= keyRange[0] && offset <= (valRange?.[2] ?? keyRange[2])) {
          return [...path, key];
        }
      }
    }
    return path.length > 0 ? path : undefined;
  }

  if (isSeq(node)) {
    const items = (node as YAMLSeq).items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemRange = (item as any)?.range as [number, number, number] | undefined;
      if (itemRange && offset >= itemRange[0] && offset <= itemRange[2]) {
        const deeper = walkForPath(item, offset, [...path, i]);
        if (deeper) return deeper;
      }
    }
    return path.length > 0 ? path : undefined;
  }

  return path.length > 0 ? path : undefined;
}

const NODE_KEYS = new Set(['pages', 'datasets', 'navTree', 'rows', 'columns', 'components', 'root_items', 'children']);

function trimToNodeBoundary(path: (string | number)[]): (string | number)[] {
  let lastNodeEnd = 0;
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    if (typeof seg === 'string' && NODE_KEYS.has(seg)) {
      if (i + 1 < path.length && typeof path[i + 1] === 'number') {
        lastNodeEnd = i + 2;
        i++;
      } else if (seg === 'navTree') {
        lastNodeEnd = i + 1;
      }
    }
  }
  return lastNodeEnd > 0 ? path.slice(0, lastNodeEnd) : path;
}

export function getNodeRange(doc: PageDocument, path: readonly (string | number)[]): YamlRange | null {
  if (path.length === 0) return null;
  const fresh = freshParse(doc);
  const node = fresh.getIn(path as (string | number)[], true);
  if (!node) return null;

  const range = (node as any)?.range as [number, number, number] | undefined;
  if (!range) return null;

  const yaml = fresh.toString();
  let to = range[1];
  while (to > range[0] && (yaml[to - 1] === '\n' || yaml[to - 1] === '\r')) to--;
  return { from: range[0], to };
}

export function classifyPath(path: readonly (string | number)[]): TreeNodeType | undefined {
  if (path.length === 0) return undefined;

  if (path.length === 1 && typeof path[0] === 'string') {
    if (path[0] === 'pages' || path[0] === 'datasets' || path[0] === 'navTree') return 'section';
    return undefined;
  }

  if (path[0] === 'datasets' && path.length >= 2) return 'dataset';
  if (path[0] === 'navTree') {
    if (path.length >= 3) return 'nav-item';
    return undefined;
  }
  if (path[0] !== 'pages') return undefined;
  if (path.length < 2) return undefined;

  for (let i = path.length - 1; i >= 0; i--) {
    const seg = path[i];
    if (seg === 'components' && i + 1 < path.length && typeof path[i + 1] === 'number') return 'component';
    if (seg === 'properties') return 'component';
  }
  for (let i = path.length - 1; i >= 0; i--) {
    const seg = path[i];
    if (seg === 'columns' && i + 1 < path.length && typeof path[i + 1] === 'number') return 'column';
  }
  for (let i = path.length - 1; i >= 0; i--) {
    const seg = path[i];
    if (seg === 'rows' && i + 1 < path.length && typeof path[i + 1] === 'number') return 'row';
  }

  if (path.length === 2 && path[0] === 'pages' && typeof path[1] === 'number') return 'page';
  if (path.length > 2 && path[0] === 'pages' && typeof path[1] === 'number') return 'page';

  return undefined;
}

export function getParentPath(path: readonly (string | number)[]): readonly (string | number)[] | null {
  if (path.length === 0) return null;
  if (path.length === 1) return null;

  if (path.length === 2 && typeof path[0] === 'string' && typeof path[1] === 'number') {
    return [path[0]];
  }

  const boundaries: number[] = [];
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    if (typeof seg === 'string' && NODE_KEYS.has(seg)) {
      if (i + 1 < path.length && typeof path[i + 1] === 'number') {
        boundaries.push(i + 2);
        i++;
      }
    }
  }

  if (boundaries.length < 2) {
    if (boundaries.length === 1 && typeof path[0] === 'string') return [path[0]];
    return null;
  }
  const parentEnd = boundaries[boundaries.length - 2]!;
  const parent = path.slice(0, parentEnd);
  return parent.length >= 1 ? parent : null;
}
