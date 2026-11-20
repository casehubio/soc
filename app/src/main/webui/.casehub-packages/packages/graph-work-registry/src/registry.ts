import type { WorkStencil } from './model.js';
import { parseMarketplaceYaml, type ParseError } from './parser.js';

export interface RegistryLoadResult {
  readonly loaded: number;
  readonly errors: readonly RegistryError[];
}

export interface RegistryError {
  readonly url: string;
  readonly errors: readonly ParseError[];
}

export interface FetchFn {
  (url: string): Promise<string>;
}

const defaultFetch: FetchFn = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
  }
  return response.text();
};

export class WorkStencilRegistry {
  private readonly stencils = new Map<string, WorkStencil>();
  private readonly urls: string[] = [];
  private readonly fetchFn: FetchFn;
  private readonly cacheTtlMs: number;
  private lastLoadTime = 0;

  constructor(options?: { fetchFn?: FetchFn; cacheTtlMs?: number }) {
    this.fetchFn = options?.fetchFn ?? defaultFetch;
    this.cacheTtlMs = options?.cacheTtlMs ?? 5 * 60 * 1000;
  }

  async load(urls: readonly string[]): Promise<RegistryLoadResult> {
    this.urls.length = 0;
    this.urls.push(...urls);
    return this.reload();
  }

  async reload(): Promise<RegistryLoadResult> {
    const allErrors: RegistryError[] = [];
    const newStencils = new Map<string, WorkStencil>();

    for (const url of this.urls) {
      try {
        const content = await this.fetchFn(url);
        const result = parseMarketplaceYaml(content);
        for (const stencil of result.stencils) {
          newStencils.set(stencil.name, stencil);
        }
        if (result.errors.length > 0) {
          allErrors.push({ url, errors: result.errors });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        allErrors.push({ url, errors: [{ message: `Fetch failed: ${message}` }] });
      }
    }

    this.stencils.clear();
    for (const [name, stencil] of newStencils) {
      this.stencils.set(name, stencil);
    }
    this.lastLoadTime = Date.now();

    return { loaded: this.stencils.size, errors: allErrors };
  }

  async refreshIfStale(): Promise<RegistryLoadResult | undefined> {
    if (Date.now() - this.lastLoadTime < this.cacheTtlMs) return undefined;
    return this.reload();
  }

  get(name: string): WorkStencil | undefined {
    return this.stencils.get(name);
  }

  list(): readonly WorkStencil[] {
    return Array.from(this.stencils.values());
  }

  get size(): number {
    return this.stencils.size;
  }

  clear(): void {
    this.stencils.clear();
    this.urls.length = 0;
    this.lastLoadTime = 0;
  }
}
