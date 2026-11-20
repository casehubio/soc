import { parseDocument, isMap, isSeq, isScalar, type YAMLMap, type YAMLSeq, type Scalar } from 'yaml';
import type { FormatRegistration, SymbolOccurrence } from '@casehubio/pages-lsp';
import { swfDocumentSchema } from '../schemas/swf.js';
import { scalarRange } from '../utils.js';

const FLOW_DIRECTIVES = new Set(['continue', 'exit', 'end']);

function walkForThenRefs(node: YAMLMap, content: string, symbols: SymbolOccurrence[]): void {
  const thenNode = node.get('then', true);
  if (isScalar(thenNode) && typeof thenNode.value === 'string' && !FLOW_DIRECTIVES.has(thenNode.value)) {
    symbols.push({
      name: thenNode.value,
      kind: 'swf-task',
      role: 'reference',
      range: scalarRange(content, thenNode as Scalar),
    });
  }
  const switchNode = node.get('switch', true);
  if (isSeq(switchNode)) {
    for (const caseItem of (switchNode as YAMLSeq).items) {
      if (!isMap(caseItem)) continue;
      for (const pair of (caseItem as YAMLMap).items) {
        if (isMap(pair.value)) {
          const caseThen = (pair.value as YAMLMap).get('then', true);
          if (isScalar(caseThen) && typeof caseThen.value === 'string' && !FLOW_DIRECTIVES.has(caseThen.value)) {
            symbols.push({
              name: caseThen.value,
              kind: 'swf-task',
              role: 'reference',
              range: scalarRange(content, caseThen as Scalar),
            });
          }
        }
      }
    }
  }
}

const swfSymbolExtractor = (content: string): SymbolOccurrence[] => {
  const doc = parseDocument(content);
  const root = doc.contents;
  if (!isMap(root)) return [];
  const symbols: SymbolOccurrence[] = [];

  const doNode = (root as YAMLMap).get('do', true);
  if (!isSeq(doNode)) return symbols;

  for (const item of (doNode as YAMLSeq).items) {
    if (!isMap(item)) continue;
    const map = item as YAMLMap;
    if (map.items.length === 0) continue;
    const firstPair = map.items[0]!;
    const keyNode = firstPair.key;
    if (isScalar(keyNode) && typeof keyNode.value === 'string') {
      symbols.push({
        name: keyNode.value,
        kind: 'swf-task',
        role: 'definition',
        range: scalarRange(content, keyNode as Scalar),
      });
    }
    const taskBody = firstPair.value;
    if (isMap(taskBody)) {
      walkForThenRefs(taskBody as YAMLMap, content, symbols);
    }
  }

  return symbols;
};

export const swfFormat: FormatRegistration = {
  formatId: 'swf',
  extensions: ['.swf.yaml'],
  contentDetector: (inspector) => inspector.hasKey(['do']),
  documentSchema: swfDocumentSchema,
  symbolExtractor: swfSymbolExtractor,
};
