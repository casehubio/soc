import { describe, it, expect } from "vitest";
import { parseExternalDataSetDef } from "./schema.js";
import { parseRefreshTime } from "./types.js";

const valid = (overrides: Record<string, unknown>) =>
  parseExternalDataSetDef({ uuid: "test-id", url: "https://example.com/api", ...overrides });

describe("ExternalDataSetDef schema", () => {
  it("accepts minimal url-based definition", () => {
    const result = valid({});
    expect(result.uuid).toBe("test-id");
    expect(result.url).toBe("https://example.com/api");
  });

  it("accepts content-based definition", () => {
    const result = parseExternalDataSetDef({ uuid: "x", content: '[{"a":1}]' });
    expect(result.content).toBe('[{"a":1}]');
  });

  it("accepts join-based definition", () => {
    const result = parseExternalDataSetDef({ uuid: "x", join: ["ds-a", "ds-b"] });
    expect(result.join).toEqual(["ds-a", "ds-b"]);
  });

  it("rejects missing uuid", () => {
    expect(() => parseExternalDataSetDef({ url: "https://x.com" })).toThrow();
  });

  it("rejects no data source (no url, content, or join)", () => {
    expect(() => parseExternalDataSetDef({ uuid: "x" })).toThrow(/Exactly one/);
  });

  it("rejects multiple data sources (url + content)", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "x", url: "https://x.com", content: "[]",
    })).toThrow(/Exactly one/);
  });

  it("rejects form + body together", () => {
    expect(() => valid({ form: { a: "1" }, body: '{"a":1}' })).toThrow(/mutually exclusive/);
  });

  it("rejects method without url", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "x", content: "[]", method: "POST",
    })).toThrow(/only valid when url/);
  });

  it("rejects headers without url", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "x", content: "[]", headers: { "X-Key": "v" },
    })).toThrow(/only valid when url/);
  });

  it("rejects extraction fields on join", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "x", join: ["a"], expression: "$.data",
    })).toThrow(/not valid with join/);
  });

  it("rejects extraction fields (type) on join", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "x", join: ["a"], type: "prometheus",
    })).toThrow(/not valid with join/);
  });

  it("rejects extraction fields (dataPath) on join", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "x", join: ["a"], dataPath: "data.items",
    })).toThrow(/not valid with join/);
  });

  it("accepts accumulate on content datasets", () => {
    const def = parseExternalDataSetDef({
      uuid: "test",
      content: '[["a"]]',
      accumulate: true,
    });
    expect(def.accumulate).toBe(true);
  });

  it("accepts refreshTime on content + expression + accumulate", () => {
    const def = parseExternalDataSetDef({
      uuid: "test",
      content: '[["a"]]',
      expression: '[["b"]]',
      accumulate: true,
      refreshTime: "1second",
    });
    expect(def.refreshTime).toBe("1second");
  });

  it("rejects refreshTime on bare content (no expression)", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "test",
      content: '[["a"]]',
      refreshTime: "1second",
    })).toThrow();
  });

  it("rejects refreshTime on WebSocket URLs", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "test",
      url: "ws://localhost:8080/ws",
      refreshTime: "1second",
    })).toThrow();
  });

  it("rejects refreshTime on SSE URLs", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "test",
      url: "sse://localhost:8080/events",
      refreshTime: "1second",
    })).toThrow();
  });

  it("rejects refreshTime on secure SSE URLs", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "test",
      url: "sses://localhost:8080/events",
      refreshTime: "1second",
    })).toThrow();
  });

  it("accepts keyColumn field", () => {
    const def = parseExternalDataSetDef({
      uuid: "test",
      url: "ws://localhost:8080/ws",
      keyColumn: "id",
    });
    expect(def.keyColumn).toBe("id");
  });

  it("accepts serverQuery-based definition", () => {
    const result = parseExternalDataSetDef({ uuid: "sq-1", serverQuery: true });
    expect(result.serverQuery).toBe(true);
  });

  it("rejects serverQuery combined with url", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "sq-1", serverQuery: true, url: "https://x.com",
    })).toThrow(/Exactly one/);
  });

  it("rejects extraction fields with serverQuery", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "sq-1", serverQuery: true, dataPath: "results",
    })).toThrow(/not valid with serverQuery/);
  });

  it("accepts refreshTime with serverQuery", () => {
    const result = parseExternalDataSetDef({
      uuid: "sq-1", serverQuery: true, refreshTime: "30second",
    });
    expect(result.refreshTime).toBe("30second");
  });

  it("rejects http options with serverQuery", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "sq-1", serverQuery: true, method: "POST",
    })).toThrow(/only valid when url is set/);
  });

  it("validates refreshTime format", () => {
    expect(() => valid({ refreshTime: "10min" })).toThrow();
    expect(() => valid({ refreshTime: "abc" })).toThrow();
    const result = valid({ refreshTime: "30second" });
    expect(result.refreshTime).toBe("30second");
  });

  it("accepts all valid refreshTime units", () => {
    for (const unit of ["millisecond", "second", "minute", "hour", "day", "week", "month", "quarter", "year"]) {
      expect(valid({ refreshTime: `5${unit}` }).refreshTime).toBe(`5${unit}`);
    }
  });

  it("allows type and expression together (composable pipeline)", () => {
    const result = valid({ type: "prometheus", expression: "$[value > 100]" });
    expect(result.type).toBe("prometheus");
    expect(result.expression).toBe("$[value > 100]");
  });

  it("allows dataPath with type and expression", () => {
    const result = valid({
      dataPath: "data.items",
      type: "prometheus",
      expression: "$[value > 0]",
    });
    expect(result.dataPath).toBe("data.items");
  });

  it("accepts columns with optional name", () => {
    const result = valid({
      columns: [
        { id: "col1", type: "NUMBER" },
        { id: "col2", name: "Column Two", type: "LABEL" },
      ],
    });
    expect(result.columns).toHaveLength(2);
    expect(result.columns![0]!.name).toBeUndefined();
    expect(result.columns![1]!.name).toBe("Column Two");
  });
});

describe("serverPagination schema", () => {
  it("accepts serverPagination on url-based dataset", () => {
    const result = parseExternalDataSetDef({
      uuid: "orders",
      url: "https://api.example.com/orders?offset={offset}&limit={limit}",
      dataPath: "items",
      serverPagination: {
        offsetParam: "offset",
        limitParam: "limit",
        defaultPageSize: 25,
      },
    });
    expect(result.serverPagination).toBeDefined();
    expect(result.serverPagination!.offsetParam).toBe("offset");
    expect(result.serverPagination!.limitParam).toBe("limit");
    expect(result.serverPagination!.defaultPageSize).toBe(25);
  });

  it("accepts optional sort, order, filter, totalPath, maxCachedPages", () => {
    const result = parseExternalDataSetDef({
      uuid: "orders",
      url: "https://api.example.com/orders?offset={offset}&limit={limit}&sort={sort}",
      serverPagination: {
        offsetParam: "offset",
        limitParam: "limit",
        sortParam: "sort",
        orderParam: "order",
        filterParam: "filter",
        defaultPageSize: 25,
        maxCachedPages: 10,
        totalPath: "meta.total",
      },
    });
    expect(result.serverPagination!.sortParam).toBe("sort");
    expect(result.serverPagination!.orderParam).toBe("order");
    expect(result.serverPagination!.filterParam).toBe("filter");
    expect(result.serverPagination!.maxCachedPages).toBe(10);
    expect(result.serverPagination!.totalPath).toBe("meta.total");
  });

  it("rejects serverPagination without url", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "x",
      content: "[]",
      serverPagination: { offsetParam: "o", limitParam: "l", defaultPageSize: 10 },
    })).toThrow();
  });

  it("rejects serverPagination with serverQuery", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "x",
      serverQuery: true,
      serverPagination: { offsetParam: "o", limitParam: "l", defaultPageSize: 10 },
    })).toThrow();
  });

  it("rejects serverPagination missing required fields", () => {
    expect(() => parseExternalDataSetDef({
      uuid: "x",
      url: "https://api.example.com/data",
      serverPagination: { offsetParam: "o" },
    })).toThrow();
  });

  it("passes through to ExternalDataSetDef without modification", () => {
    const result = parseExternalDataSetDef({
      uuid: "orders",
      url: "https://api.example.com/orders",
      serverPagination: {
        offsetParam: "skip",
        limitParam: "take",
        defaultPageSize: 50,
      },
    });
    expect(result.serverPagination!.offsetParam).toBe("skip");
    expect(result.serverPagination!.limitParam).toBe("take");
    expect(result.serverPagination!.defaultPageSize).toBe(50);
  });
});

describe("parseRefreshTime", () => {
  it("converts seconds", () => {
    expect(parseRefreshTime("2second")).toBe(2000);
    expect(parseRefreshTime("30second")).toBe(30000);
  });

  it("converts minutes", () => {
    expect(parseRefreshTime("1minute")).toBe(60000);
    expect(parseRefreshTime("5minute")).toBe(300000);
  });

  it("converts milliseconds", () => {
    expect(parseRefreshTime("500millisecond")).toBe(500);
  });

  it("converts hours", () => {
    expect(parseRefreshTime("1hour")).toBe(3600000);
  });

  it("returns default for invalid input", () => {
    expect(parseRefreshTime("bogus")).toBe(10000);
  });
});
