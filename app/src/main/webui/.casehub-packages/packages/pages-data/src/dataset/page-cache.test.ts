import { describe, it, expect } from "vitest";
import { PageCache } from "./page-cache.js";
import type { TypedDataSet } from "./types.js";

function mockDataSet(): TypedDataSet {
  return { columns: [], rows: [] };
}

describe("PageCache", () => {
  it("returns undefined on cache miss", () => {
    const cache = new PageCache(5);
    expect(cache.get({ offset: 0, limit: 25 })).toBeUndefined();
  });

  it("returns stored page on cache hit", () => {
    const cache = new PageCache(5);
    const ds = mockDataSet();
    cache.store({ offset: 0, limit: 25 }, { dataset: ds, totalRows: 100 });
    const result = cache.get({ offset: 0, limit: 25 });
    expect(result).toBeDefined();
    expect(result!.totalRows).toBe(100);
    expect(result!.dataset).toBe(ds);
  });

  it("distinguishes keys by sort and filter", () => {
    const cache = new PageCache(5);
    const ds1 = mockDataSet();
    const ds2 = mockDataSet();
    cache.store({ offset: 0, limit: 25 }, { dataset: ds1, totalRows: 100 });
    cache.store({ offset: 0, limit: 25, sort: "name", order: "asc" }, { dataset: ds2, totalRows: 100 });
    expect(cache.get({ offset: 0, limit: 25 })!.dataset).toBe(ds1);
    expect(cache.get({ offset: 0, limit: 25, sort: "name", order: "asc" })!.dataset).toBe(ds2);
  });

  it("evicts LRU entry when capacity exceeded", () => {
    const cache = new PageCache(2);
    const ds0 = mockDataSet();
    const ds1 = mockDataSet();
    const ds2 = mockDataSet();
    cache.store({ offset: 0, limit: 25 }, { dataset: ds0, totalRows: 100 });
    cache.store({ offset: 25, limit: 25 }, { dataset: ds1, totalRows: 100 });
    cache.get({ offset: 0, limit: 25 });
    cache.store({ offset: 50, limit: 25 }, { dataset: ds2, totalRows: 100 });
    expect(cache.get({ offset: 0, limit: 25 })).toBeDefined();
    expect(cache.get({ offset: 25, limit: 25 })).toBeUndefined();
    expect(cache.get({ offset: 50, limit: 25 })).toBeDefined();
  });

  it("clear() removes all entries", () => {
    const cache = new PageCache(5);
    cache.store({ offset: 0, limit: 25 }, { dataset: mockDataSet(), totalRows: 50 });
    cache.store({ offset: 25, limit: 25 }, { dataset: mockDataSet(), totalRows: 50 });
    cache.clear();
    expect(cache.get({ offset: 0, limit: 25 })).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("updates existing entry without growing size", () => {
    const cache = new PageCache(5);
    const ds1 = mockDataSet();
    const ds2 = mockDataSet();
    cache.store({ offset: 0, limit: 25 }, { dataset: ds1, totalRows: 100 });
    cache.store({ offset: 0, limit: 25 }, { dataset: ds2, totalRows: 200 });
    expect(cache.size).toBe(1);
    expect(cache.get({ offset: 0, limit: 25 })!.totalRows).toBe(200);
  });
});
