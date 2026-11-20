import type { Catalog } from '@casehubio/yaml-core/step';
import type { CatalogActionSummary, CatalogActionDetail, ParameterInfo } from '../controller/step-catalog.js';

export interface CatalogListHandler {
  list(): CatalogActionSummary[];
  detail(name: string): CatalogActionDetail | null;
}

function mapParams(params: Record<string, { type: string; required: boolean; defaultValue?: string; allowedValues?: string[]; format?: string; description?: string }>): Record<string, ParameterInfo> {
  const result: Record<string, ParameterInfo> = {};
  for (const [name, p] of Object.entries(params)) {
    result[name] = {
      type: p.type,
      required: p.required,
      defaultValue: p.defaultValue ?? null,
      allowedValues: p.allowedValues ?? null,
      format: p.format ?? null,
      description: p.description ?? null,
    };
  }
  return result;
}

export function createCatalogListHandler(catalog: Catalog): CatalogListHandler {
  return {
    list(): CatalogActionSummary[] {
      const summaries: CatalogActionSummary[] = [];
      for (const name of catalog.availableActions()) {
        const entry = catalog.resolve(name);
        if (!entry) continue;
        const def = entry.definition;
        summaries.push({
          name: def.name,
          description: def.description ?? '',
          invokeKind: def.invoke?.kind ?? null,
          source: 'registry',
          portability: def.portability ?? 'ts',
          inputCount: Object.keys(def.inputs).length,
          outputCount: Object.keys(def.outputs).length,
        });
      }
      return summaries;
    },

    detail(name: string): CatalogActionDetail | null {
      const entry = catalog.resolve(name);
      if (!entry) return null;
      const def = entry.definition;
      return {
        name: def.name,
        description: def.description ?? '',
        invokeKind: def.invoke?.kind ?? null,
        source: 'registry',
        portability: def.portability ?? 'ts',
        inputs: mapParams(def.inputs),
        outputs: mapParams(def.outputs),
        invoke: def.invoke ? { kind: def.invoke.kind, metadata: {} } : null,
      };
    },
  };
}
