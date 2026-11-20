import { describe, it, expect, vi, afterEach } from "vitest";
import { mutableRestSource } from "./mutable-rest-source.js";
import type { DataSink, SourceError, DataAction } from "../types.js";
import type { DataSetEvent } from "../../dataset/events.js";
import { ColumnType, col } from "./test-helpers.js";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function collectSink(): { sink: DataSink; events: DataSetEvent[]; errors: SourceError[] } {
  const events: DataSetEvent[] = [];
  const errors: SourceError[] = [];
  return {
    sink: {
      apply(event) { events.push(event); },
      error(err) { errors.push(err); },
    },
    events,
    errors,
  };
}

const READ_URL = "https://api.example.com/items";
const COLUMNS = [col("id", ColumnType.TEXT), col("name", ColumnType.TEXT), col("status", ColumnType.LABEL)];

function snapshotFetch(): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue(jsonResponse([["1", "Alice", "Active"], ["2", "Bob", "Inactive"]]));
}

describe("mutableRestSource", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("update dispatches PATCH with :key substitution and emits replace event", async () => {
    const writeFetch = vi.fn().mockResolvedValue(jsonResponse({ id: "1", name: "Alice Updated", status: "Active" }));
    const source = mutableRestSource(READ_URL, {
      update: { url: "https://api.example.com/items/:key" },
      keyColumn: "id",
    }, { columns: COLUMNS, fetchFn: snapshotFetch(), writeFetchFn: writeFetch });

    const { sink, events } = collectSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(events.length).toBe(1); });

    await source.dispatch({ type: "update", key: "1", changes: { name: "Alice Updated" } });

    expect(writeFetch).toHaveBeenCalledOnce();
    const [url, init] = writeFetch.mock.calls[0]!;
    expect(url).toBe("https://api.example.com/items/1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Alice Updated" });

    const replaceEvent = events.find(e => e.type === "replace");
    expect(replaceEvent).toBeDefined();
    expect(replaceEvent!.type).toBe("replace");
  });

  it("create dispatches POST and emits append event", async () => {
    const writeFetch = vi.fn().mockResolvedValue(jsonResponse({ id: "3", name: "Charlie", status: "Active" }));
    const source = mutableRestSource(READ_URL, {
      create: { url: "https://api.example.com/items" },
      keyColumn: "id",
    }, { columns: COLUMNS, fetchFn: snapshotFetch(), writeFetchFn: writeFetch });

    const { sink, events } = collectSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(events.length).toBe(1); });

    await source.dispatch({ type: "create", data: { id: "3", name: "Charlie", status: "Active" } });

    expect(writeFetch).toHaveBeenCalledOnce();
    const [url, init] = writeFetch.mock.calls[0]!;
    expect(url).toBe("https://api.example.com/items");
    expect(init.method).toBe("POST");

    const appendEvent = events.find(e => e.type === "append");
    expect(appendEvent).toBeDefined();
  });

  it("delete dispatches DELETE and emits remove event", async () => {
    const writeFetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const source = mutableRestSource(READ_URL, {
      delete: { url: "https://api.example.com/items/:key" },
      keyColumn: "id",
    }, { columns: COLUMNS, fetchFn: snapshotFetch(), writeFetchFn: writeFetch });

    const { sink, events } = collectSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(events.length).toBe(1); });

    await source.dispatch({ type: "delete", key: "2" });

    expect(writeFetch).toHaveBeenCalledOnce();
    const [url, init] = writeFetch.mock.calls[0]!;
    expect(url).toBe("https://api.example.com/items/2");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();

    const removeEvent = events.find(e => e.type === "remove");
    expect(removeEvent).toBeDefined();
    expect((removeEvent as any).key).toBe("2");
  });

  it("unsupported action type rejects", async () => {
    const source = mutableRestSource(READ_URL, { keyColumn: "id" }, {
      columns: COLUMNS, fetchFn: snapshotFetch(),
    });
    const { sink, events } = collectSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(events.length).toBe(1); });

    await expect(source.dispatch({ type: "update", key: "1", changes: {} }))
      .rejects.toThrow("Unsupported action type");
  });

  it("HTTP error rejects promise", async () => {
    const writeFetch = vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 }));
    const source = mutableRestSource(READ_URL, {
      update: { url: "https://api.example.com/items/:key" },
      keyColumn: "id",
    }, { columns: COLUMNS, fetchFn: snapshotFetch(), writeFetchFn: writeFetch });

    const { sink, events } = collectSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(events.length).toBe(1); });

    await expect(source.dispatch({ type: "update", key: "1", changes: {} }))
      .rejects.toThrow("404");
  });

  it("function URL template receives full action", async () => {
    const urlFn = vi.fn().mockReturnValue("https://api.example.com/custom/1");
    const writeFetch = vi.fn().mockResolvedValue(jsonResponse({ id: "1", name: "X", status: "Y" }));
    const source = mutableRestSource(READ_URL, {
      update: { url: urlFn },
      keyColumn: "id",
    }, { columns: COLUMNS, fetchFn: snapshotFetch(), writeFetchFn: writeFetch });

    const { sink, events } = collectSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(events.length).toBe(1); });

    const action: DataAction = { type: "update", key: "1", changes: { name: "X" } };
    await source.dispatch(action);

    expect(urlFn).toHaveBeenCalledWith(action);
    expect(writeFetch.mock.calls[0]![0]).toBe("https://api.example.com/custom/1");
  });

  it("custom headers are sent with write requests", async () => {
    const writeFetch = vi.fn().mockResolvedValue(jsonResponse({ id: "1", name: "X", status: "Y" }));
    const source = mutableRestSource(READ_URL, {
      update: { url: "https://api.example.com/items/:key" },
      headers: { "Authorization": "Bearer tok123" },
      keyColumn: "id",
    }, { columns: COLUMNS, fetchFn: snapshotFetch(), writeFetchFn: writeFetch });

    const { sink, events } = collectSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(events.length).toBe(1); });

    await source.dispatch({ type: "update", key: "1", changes: { name: "X" } });

    const headers = writeFetch.mock.calls[0]![1].headers;
    expect(headers["Authorization"]).toBe("Bearer tok123");
  });

  it("refreshAfterWrite re-fetches read URL instead of merging", async () => {
    const readFetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse([["1", "Alice", "Active"]]))
      .mockResolvedValueOnce(jsonResponse([["1", "Alice Updated", "Active"]]));
    const writeFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const source = mutableRestSource(READ_URL, {
      update: { url: "https://api.example.com/items/:key" },
      refreshAfterWrite: true,
      keyColumn: "id",
    }, { columns: COLUMNS, fetchFn: readFetch, writeFetchFn: writeFetch });

    const { sink, events } = collectSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(events.length).toBe(1); });

    await source.dispatch({ type: "update", key: "1", changes: { name: "Alice Updated" } });

    expect(readFetch).toHaveBeenCalledTimes(2);
    const snapshotEvents = events.filter(e => e.type === "snapshot");
    expect(snapshotEvents.length).toBe(2);
  });

  it("204 No Content auto-refreshes when refreshAfterWrite is false", async () => {
    const readFetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse([["1", "Alice", "Active"]]))
      .mockResolvedValueOnce(jsonResponse([["1", "Alice", "Active"], ["3", "Charlie", "Active"]]));
    const writeFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const source = mutableRestSource(READ_URL, {
      create: { url: "https://api.example.com/items" },
      keyColumn: "id",
    }, { columns: COLUMNS, fetchFn: readFetch, writeFetchFn: writeFetch });

    const { sink, events } = collectSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(events.length).toBe(1); });

    await source.dispatch({ type: "create", data: { id: "3", name: "Charlie", status: "Active" } });

    expect(readFetch).toHaveBeenCalledTimes(2);
  });

  it("custom method override works", async () => {
    const writeFetch = vi.fn().mockResolvedValue(jsonResponse({ id: "1", name: "X", status: "Y" }));
    const source = mutableRestSource(READ_URL, {
      update: { url: "https://api.example.com/items/:key", method: "PUT" },
      keyColumn: "id",
    }, { columns: COLUMNS, fetchFn: snapshotFetch(), writeFetchFn: writeFetch });

    const { sink, events } = collectSink();
    source.connect(sink);
    await vi.waitFor(() => { expect(events.length).toBe(1); });

    await source.dispatch({ type: "update", key: "1", changes: { name: "X" } });
    expect(writeFetch.mock.calls[0]![1].method).toBe("PUT");
  });
});
