import { describe, it, expect, vi, beforeEach } from "vitest";
import { ServerPaginationManager } from "./server-pagination.js";
import type { ServerPaginationConfig } from "@casehubio/pages-data";
import { dataSetId } from "@casehubio/pages-data";

const dsId = dataSetId("test-ds");
const config: ServerPaginationConfig = {
  offsetParam: "offset",
  limitParam: "limit",
  sortParam: "sort",
  orderParam: "order",
  defaultPageSize: 25,
  maxCachedPages: 3,
};

function mockResponse(rows: unknown[], total: number) {
  const body = { items: rows, total };
  return {
    ok: true,
    headers: new Map([["content-type", "application/json"]]) as unknown as Headers,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe("ServerPaginationManager", () => {
  let fetchFn: ReturnType<typeof vi.fn>;
  let manager: ServerPaginationManager;

  beforeEach(() => {
    fetchFn = vi.fn().mockResolvedValue(
      mockResponse([{ name: "Alice" }, { name: "Bob" }], 100),
    );
    manager = new ServerPaginationManager(fetchFn);
  });

  it("registers a dataset config", () => {
    manager.register(dsId, config, "https://api.example.com/items?offset={offset}&limit={limit}", "total", "items");
    expect(manager.has(dsId)).toBe(true);
  });

  it("returns false for unregistered dataset", () => {
    expect(manager.has(dsId)).toBe(false);
  });

  it("fetches page on cache miss", async () => {
    manager.register(dsId, config, "https://api.example.com/items?offset={offset}&limit={limit}", "total", "items");
    const result = await manager.fetchPage(dsId, 0, 25);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const calledUrl = fetchFn.mock.calls[0]![0] as string;
    expect(calledUrl).toContain("offset=0");
    expect(calledUrl).toContain("limit=25");
    expect(result).toBeDefined();
    expect(result!.totalRows).toBe(100);
  });

  it("returns cached page on hit without fetching", async () => {
    manager.register(dsId, config, "https://api.example.com/items?offset={offset}&limit={limit}", "total", "items");
    await manager.fetchPage(dsId, 0, 25);
    fetchFn.mockClear();
    const result = await manager.fetchPage(dsId, 0, 25);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("clears cache on sort change", async () => {
    manager.register(dsId, config, "https://api.example.com/items?offset={offset}&limit={limit}&sort={sort}&order={order}", "total", "items");
    await manager.fetchPage(dsId, 0, 25);
    manager.clearCache(dsId);
    fetchFn.mockClear();
    await manager.fetchPage(dsId, 0, 25, { sort: "name", order: "asc" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("builds URL with sort and filter params", async () => {
    manager.register(dsId, config, "https://api.example.com/items?offset={offset}&limit={limit}&sort={sort}&order={order}", "total", "items");
    await manager.fetchPage(dsId, 0, 25, { sort: "name", order: "desc" });
    const calledUrl = fetchFn.mock.calls[0]![0] as string;
    expect(calledUrl).toContain("sort=name");
    expect(calledUrl).toContain("order=desc");
  });

  it("strips empty query params from URL", async () => {
    manager.register(dsId, config, "https://api.example.com/items?offset={offset}&limit={limit}&sort={sort}&order={order}", "total", "items");
    await manager.fetchPage(dsId, 0, 25);
    const calledUrl = fetchFn.mock.calls[0]![0] as string;
    expect(calledUrl).not.toContain("sort=");
    expect(calledUrl).not.toContain("order=");
  });

  it("returns undefined for unregistered dataset", async () => {
    const result = await manager.fetchPage(dsId, 0, 25);
    expect(result).toBeUndefined();
  });
});
