import { parseDocument, isMap, isSeq, isScalar, type YAMLMap, type YAMLSeq, type Scalar } from 'yaml';
import { offsetToPosition } from '../utils.js';
import type { SymbolOccurrence, SymbolExtractor } from './types.js';

function scalarRange(content: string, scalar: Scalar) {
  const range = scalar.range!;
  return {
    start: offsetToPosition(content, range[0]),
    end: offsetToPosition(content, range[1]),
  };
}

function walkForReferences(node: unknown, content: string, symbols: SymbolOccurrence[]): void {
  if (isMap(node)) {
    const map = node as YAMLMap;

    const lookupNode = map.get('lookup', true);
    if (isMap(lookupNode)) {
      for (const key of ['uuid', 'dataSetUuid'] as const) {
        const val = (lookupNode as YAMLMap).get(key, true);
        if (isScalar(val) && typeof val.value === 'string') {
          symbols.push({
            name: val.value,
            kind: 'dataset',
            role: 'reference',
            range: scalarRange(content, val as Scalar),
          });
        }
      }
    }

    const typeNode = map.get('type', true);
    if (isScalar(typeNode) && typeNode.value === 'lazy-page') {
      const propsNode = map.get('properties', true);
      if (isMap(propsNode)) {
        const pageNode = (propsNode as YAMLMap).get('page', true);
        if (isScalar(pageNode) && typeof pageNode.value === 'string') {
          symbols.push({
            name: pageNode.value,
            kind: 'page',
            role: 'reference',
            range: scalarRange(content, pageNode as Scalar),
          });
        }
      }
    }

    for (const pair of map.items) {
      walkForReferences(pair.value, content, symbols);
    }
  } else if (isSeq(node)) {
    for (const item of (node as YAMLSeq).items) {
      walkForReferences(item, content, symbols);
    }
  }
}

function walkNavTree(node: unknown, content: string, symbols: SymbolOccurrence[]): void {
  if (isMap(node)) {
    const map = node as YAMLMap;
    const pageNode = map.get('page', true);
    if (isScalar(pageNode) && typeof pageNode.value === 'string') {
      symbols.push({
        name: pageNode.value,
        kind: 'page',
        role: 'reference',
        range: scalarRange(content, pageNode as Scalar),
      });
    }
    const childrenNode = map.get('children', true);
    if (isSeq(childrenNode)) {
      for (const child of (childrenNode as YAMLSeq).items) {
        walkNavTree(child, content, symbols);
      }
    }
  } else if (isSeq(node)) {
    for (const item of (node as YAMLSeq).items) {
      walkNavTree(item, content, symbols);
    }
  }
}

export const pageSymbolExtractor: SymbolExtractor = (content: string): SymbolOccurrence[] => {
  const doc = parseDocument(content);
  const root = doc.contents;
  if (!isMap(root)) return [];

  const symbols: SymbolOccurrence[] = [];
  const rootMap = root as YAMLMap;

  const datasetsNode = rootMap.get('datasets', true);
  if (isSeq(datasetsNode)) {
    for (const item of (datasetsNode as YAMLSeq).items) {
      if (!isMap(item)) continue;
      const uuid = (item as YAMLMap).get('uuid', true);
      if (isScalar(uuid) && typeof uuid.value === 'string') {
        symbols.push({
          name: uuid.value,
          kind: 'dataset',
          role: 'definition',
          range: scalarRange(content, uuid as Scalar),
        });
      }
    }
  }

  const pagesNode = rootMap.get('pages', true);
  if (isSeq(pagesNode)) {
    for (const item of (pagesNode as YAMLSeq).items) {
      if (!isMap(item)) continue;
      const name = (item as YAMLMap).get('name', true);
      if (isScalar(name) && typeof name.value === 'string') {
        symbols.push({
          name: name.value,
          kind: 'page',
          role: 'definition',
          range: scalarRange(content, name as Scalar),
        });
      }
    }
  }

  const navTreeNode = rootMap.get('navTree', true);
  if (isMap(navTreeNode)) {
    const rootItems = (navTreeNode as YAMLMap).get('root_items', true);
    if (isSeq(rootItems)) {
      walkNavTree(rootItems, content, symbols);
    }
  }

  walkForReferences(rootMap, content, symbols);

  return symbols;
};
