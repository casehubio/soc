import type { DataSetId, ServerPaginationConfig } from "@casehubio/pages-data";
import { PageCache } from "@casehubio/pages-data";
import type { CachedPage, PageCacheKey } from "@casehubio/pages-data";
import { extractDataSet, createPresetRegistry } from "@casehubio/pages-data";

interface DatasetRegistration {
  config: ServerPaginationConfig;
  urlTemplate: string;
  totalPath: string | undefined;
  dataPath: string | undefined;
  cache: PageCache;
}

export interface FetchPageOptions {
  sort?: string;
  order?: string;
  filter?: string;
}

export class ServerPaginationManager {
  private readonly _datasets = new Map<DataSetId, DatasetRegistration>();
  private readonly _fetchFn: typeof globalThis.fetch;

  constructor(fetchFn?: typeof globalThis.fetch) {
    this._fetchFn = fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  register(
    id: DataSetId,
    config: ServerPaginationConfig,
    urlTemplate: string,
    totalPath: string | undefined,
    dataPath?: string,
  ): void {
    this._datasets.set(id, {
      config,
      urlTemplate,
      totalPath,
      dataPath,
      cache: new PageCache(config.maxCachedPages ?? 5),
    });
  }

  has(id: DataSetId): boolean {
    return this._datasets.has(id);
  }

  clearCache(id: DataSetId): void {
    this._datasets.get(id)?.cache.clear();
  }

  async fetchPage(
    id: DataSetId,
    offset: number,
    limit: number,
    options?: FetchPageOptions,
  ): Promise<CachedPage | undefined> {
    const reg = this._datasets.get(id);
    if (!reg) return undefined;

    const key: PageCacheKey = {
      offset,
      limit,
      sort: options?.sort,
      order: options?.order,
      filter: options?.filter,
    };

    const cached = reg.cache.get(key);
    if (cached) return cached;

    const url = this._buildUrl(reg, offset, limit, options);
    const response = await this._fetchFn(url);
    const contentType = response.headers?.get("content-type") ?? undefined;
    const data = contentType?.includes("application/json")
      ? await (response).json() as unknown
      : await (response).text();

    let totalRows = 0;
    if (reg.totalPath) {
      let current: unknown = data;
      for (const segment of reg.totalPath.split(".")) {
        if (current === null || current === undefined || typeof current !== "object") break;
        current = (current as Record<string, unknown>)[segment];
      }
      if (typeof current === "number" && Number.isFinite(current)) totalRows = current;
    }

    const { dataset } = await extractDataSet(
      { data, ...(contentType ? { contentType } : {}) },
      { url, ...(reg.dataPath ? { dataPath: reg.dataPath } : {}) },
      createPresetRegistry(),
    );

    const page: CachedPage = { dataset, totalRows };
    reg.cache.store(key, page);
    return page;
  }

  dispose(): void {
    for (const [, reg] of this._datasets) {
      reg.cache.clear();
    }
    this._datasets.clear();
  }

  private _buildUrl(
    reg: DatasetRegistration,
    offset: number,
    limit: number,
    options?: FetchPageOptions,
  ): string {
    const config = reg.config;
    let url = reg.urlTemplate;

    url = url.replace(`{${config.offsetParam}}`, String(offset));
    url = url.replace(`{${config.limitParam}}`, String(limit));

    if (config.sortParam) {
      url = url.replace(`{${config.sortParam}}`, options?.sort ?? "");
    }
    if (config.orderParam) {
      url = url.replace(`{${config.orderParam}}`, options?.order ?? "");
    }
    if (config.filterParam) {
      url = url.replace(`{${config.filterParam}}`, options?.filter ?? "");
    }

    const parsed = new URL(url);
    const toDelete: string[] = [];
    parsed.searchParams.forEach((v, k) => {
      if (v === "") toDelete.push(k);
    });
    for (const k of toDelete) parsed.searchParams.delete(k);

    return parsed.toString();
  }
}
