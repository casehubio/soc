import { parseDocument, isMap, isSeq, isScalar, type YAMLMap, type YAMLSeq, type Scalar } from 'yaml';
import type { FormatRegistration, SymbolOccurrence } from '@casehubio/pages-lsp';
import { orgDocumentSchema } from '../schemas/org.generated.js';
import { scalarRange } from '../utils.js';

const orgSymbolExtractor = (content: string): SymbolOccurrence[] => {
  const doc = parseDocument(content);
  const root = doc.contents;
  if (!isMap(root)) return [];
  const symbols: SymbolOccurrence[] = [];

  const orgNode = (root as YAMLMap).get('organization', true);
  if (!isMap(orgNode)) return symbols;

  const unitsNode = (orgNode as YAMLMap).get('units', true);
  if (isSeq(unitsNode)) {
    for (const item of (unitsNode as YAMLSeq).items) {
      if (!isMap(item)) continue;
      const unitIdNode = (item as YAMLMap).get('unitId', true);
      if (isScalar(unitIdNode) && typeof unitIdNode.value === 'string') {
        symbols.push({
          name: unitIdNode.value,
          kind: 'org-unit',
          role: 'definition',
          range: scalarRange(content, unitIdNode as Scalar),
        });
      }
      const parentNode = (item as YAMLMap).get('parentUnitId', true);
      if (isScalar(parentNode) && typeof parentNode.value === 'string') {
        symbols.push({
          name: parentNode.value,
          kind: 'org-unit',
          role: 'reference',
          range: scalarRange(content, parentNode as Scalar),
        });
      }
    }
  }

  return symbols;
};

export const orgFormat: FormatRegistration = {
  formatId: 'org',
  extensions: ['.org.yaml'],
  contentDetector: (inspector) => inspector.hasKey(['organization']),
  documentSchema: orgDocumentSchema,
  symbolExtractor: orgSymbolExtractor,
};
