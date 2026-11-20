import { parseDocument, isMap, isSeq, isScalar, type YAMLMap, type YAMLSeq, type Scalar } from 'yaml';
import type { FormatRegistration, SymbolOccurrence } from '@casehubio/pages-lsp';
import { caseDefinitionDocumentSchema } from '../schemas/case-definition.generated.js';
import { scalarRange } from '../utils.js';

const caseDefinitionSymbolExtractor = (content: string): SymbolOccurrence[] => {
  const doc = parseDocument(content);
  const root = doc.contents;
  if (!isMap(root)) return [];
  const symbols: SymbolOccurrence[] = [];
  const rootMap = root as YAMLMap;

  const specNode = rootMap.get('spec', true);
  if (!isMap(specNode)) return symbols;
  const spec = specNode as YAMLMap;

  const capsNode = spec.get('capabilities', true);
  if (isSeq(capsNode)) {
    for (const item of (capsNode as YAMLSeq).items) {
      if (!isMap(item)) continue;
      const nameNode = (item as YAMLMap).get('name', true);
      if (isScalar(nameNode) && typeof nameNode.value === 'string') {
        symbols.push({ name: nameNode.value, kind: 'capability', role: 'definition', range: scalarRange(content, nameNode as Scalar) });
      }
    }
  }

  const workersNode = spec.get('workers', true);
  if (isSeq(workersNode)) {
    for (const item of (workersNode as YAMLSeq).items) {
      if (!isMap(item)) continue;
      const nameNode = (item as YAMLMap).get('name', true);
      if (isScalar(nameNode) && typeof nameNode.value === 'string') {
        symbols.push({ name: nameNode.value, kind: 'worker', role: 'definition', range: scalarRange(content, nameNode as Scalar) });
      }
      const wCapsNode = (item as YAMLMap).get('capabilities', true);
      if (isSeq(wCapsNode)) {
        for (const cap of (wCapsNode as YAMLSeq).items) {
          if (isScalar(cap) && typeof cap.value === 'string') {
            symbols.push({ name: cap.value, kind: 'capability', role: 'reference', range: scalarRange(content, cap as Scalar) });
          }
        }
      }
    }
  }

  const bindingsNode = spec.get('bindings', true);
  if (isSeq(bindingsNode)) {
    for (const item of (bindingsNode as YAMLSeq).items) {
      if (!isMap(item)) continue;
      const nameNode = (item as YAMLMap).get('name', true);
      if (isScalar(nameNode) && typeof nameNode.value === 'string') {
        symbols.push({ name: nameNode.value, kind: 'binding', role: 'definition', range: scalarRange(content, nameNode as Scalar) });
      }
      const capNode = (item as YAMLMap).get('capability', true);
      if (isScalar(capNode) && typeof capNode.value === 'string') {
        symbols.push({ name: capNode.value, kind: 'capability', role: 'reference', range: scalarRange(content, capNode as Scalar) });
      }
    }
  }

  return symbols;
};

export const caseDefinitionFormat: FormatRegistration = {
  formatId: 'case-definition',
  extensions: ['.case.yaml'],
  contentDetector: (inspector) =>
    inspector.hasKey(['dsl']) &&
    inspector.hasKey(['spec']) &&
    (inspector.hasKey(['spec', 'bindings']) ||
     inspector.hasKey(['spec', 'workers']) ||
     inspector.hasKey(['spec', 'capabilities'])),
  documentSchema: caseDefinitionDocumentSchema,
  symbolExtractor: caseDefinitionSymbolExtractor,
};
