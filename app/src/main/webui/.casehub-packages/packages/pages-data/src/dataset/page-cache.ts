import type { TypedDataSet } from "./types.js";

export interface PageCacheKey {
  readonly offset: number;
  readonly limit: number;
  readonly sort?: string | undefined;
  readonly order?: string | undefined;
  readonly filter?: string | undefined;
}

export interface CachedPage {
  readonly dataset: TypedDataSet;
  readonly totalRows: number;
}

function serializeKey(key: PageCacheKey): string {
  return `${key.offset}:${key.limit}:${key.sort ?? ""}:${key.order ?? ""}:${key.filter ?? ""}`;
}

export class PageCache {
  private readonly _maxSize: number;
  private readonly _entries = new Map<string, CachedPage>();
  private readonly _accessOrder: string[] = [];

  constructor(maxSize: number) {
    this._maxSize = maxSize;
  }

  get(key: PageCacheKey): CachedPage | undefined {
    const k = serializeKey(key);
    const entry = this._entries.get(k);
    if (entry) {
      const idx = this._accessOrder.indexOf(k);
      if (idx !== -1) this._accessOrder.splice(idx, 1);
      this._accessOrder.push(k);
    }
    return entry;
  }

  store(key: PageCacheKey, page: CachedPage): void {
    const k = serializeKey(key);
    if (this._entries.has(k)) {
      const idx = this._accessOrder.indexOf(k);
      if (idx !== -1) this._accessOrder.splice(idx, 1);
    } else if (this._entries.size >= this._maxSize) {
      const evict = this._accessOrder.shift();
      if (evict) this._entries.delete(evict);
    }
    this._entries.set(k, page);
    this._accessOrder.push(k);
  }

  clear(): void {
    this._entries.clear();
    this._accessOrder.length = 0;
  }

  get size(): number {
    return this._entries.size;
  }
}
