import type { PluginRegistry } from '@casehubio/yaml-core/step';
import type { CatalogActionSummary, CatalogActionDetail, ParameterInfo } from './step-catalog.js';

export interface CatalogDataSource {
  fetchSummaries(): Promise<CatalogActionSummary[]>;
  fetchDetail(name: string): Promise<CatalogActionDetail | null>;
  readonly priority: number;
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

export class RegistryCatalogSource implements CatalogDataSource {
  constructor(
    private readonly registry: PluginRegistry,
    readonly priority: number = 0,
  ) {}

  async fetchSummaries(): Promise<CatalogActionSummary[]> {
    const entries = new Map<string, import('@casehubio/yaml-core/step').CatalogEntry>();
    this.registry.createSource().populate(entries);
    const summaries: CatalogActionSummary[] = [];
    for (const [, entry] of entries) {
      const def = entry.definition;
      summaries.push({
        name: def.name,
        description: def.description ?? '',
        invokeKind: def.invoke?.kind ?? null,
        source: 'plugin',
        portability: def.portability ?? 'ts',
        inputCount: Object.keys(def.inputs).length,
        outputCount: Object.keys(def.outputs).length,
      });
    }
    return summaries;
  }

  async fetchDetail(name: string): Promise<CatalogActionDetail | null> {
    const entries = new Map<string, import('@casehubio/yaml-core/step').CatalogEntry>();
    this.registry.createSource().populate(entries);
    const entry = entries.get(name);
    if (!entry) return null;
    const def = entry.definition;
    return {
      name: def.name,
      description: def.description ?? '',
      invokeKind: def.invoke?.kind ?? null,
      source: 'plugin',
      portability: def.portability ?? 'ts',
      inputs: mapParams(def.inputs),
      outputs: mapParams(def.outputs),
      invoke: def.invoke ? { kind: def.invoke.kind, metadata: {} } : null,
    };
  }
}

export class RestCatalogSource implements CatalogDataSource {
  constructor(
    private readonly baseUrl: string,
    readonly priority: number = 10,
  ) {}

  async fetchSummaries(): Promise<CatalogActionSummary[]> {
    const res = await fetch(`${this.baseUrl}/api/catalog/actions`);
    if (!res.ok) return [];
    return res.json() as Promise<CatalogActionSummary[]>;
  }

  async fetchDetail(name: string): Promise<CatalogActionDetail | null> {
    const res = await fetch(`${this.baseUrl}/api/catalog/actions/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    return res.json() as Promise<CatalogActionDetail | null>;
  }
}

export class GraphqlCatalogSource implements CatalogDataSource {
  constructor(
    private readonly endpoint: string,
    readonly priority: number = 20,
  ) {}

  async fetchSummaries(): Promise<CatalogActionSummary[]> {
    const query = '{ stepCatalog { actions { name description invokeKind source portability inputCount outputCount } } }';
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return [];
    const data = await res.json() as { data?: { stepCatalog?: { actions?: CatalogActionSummary[] } } };
    return data?.data?.stepCatalog?.actions ?? [];
  }

  async fetchDetail(name: string): Promise<CatalogActionDetail | null> {
    const query = `{ stepCatalog { action(name: "${name}") { name description invokeKind source portability inputs { name type required defaultValue allowedValues format description } outputs { name type required defaultValue allowedValues format description } invoke { kind metadata } } } }`;
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data?: { stepCatalog?: { action?: CatalogActionDetail } } };
    return data?.data?.stepCatalog?.action ?? null;
  }
}
