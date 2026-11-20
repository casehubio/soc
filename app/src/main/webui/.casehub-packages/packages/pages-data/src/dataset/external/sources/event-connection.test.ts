import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createEventConnection} from "./event-connection.js";
import {isMatchedByRegistrations} from "./topic-matching.js";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  readyState = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number; reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(_code?: number, _reason?: string): void {
    this.readyState = 3; // CLOSED
  }

  simulateOpen(): void {
    this.readyState = 1; // OPEN
    this.onopen?.();
  }

  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }

  simulateClose(code = 1006, reason = ""): void {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
}

let origWS: typeof WebSocket;

beforeEach(() => {
  MockWebSocket.instances = [];
  origWS = globalThis.WebSocket;
  (globalThis as Record<string, unknown>).WebSocket = MockWebSocket;
});

afterEach(() => {
  (globalThis as Record<string, unknown>).WebSocket = origWS;
});

function lastWs(): MockWebSocket {
  const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
  if (!ws) throw new Error("No WebSocket instance found");
  return ws;
}

function parseSent(ws: MockWebSocket, index: number): Record<string, unknown> {
  const raw = ws.sent[index];
  if (!raw) throw new Error(`No message at index ${String(index)}`);
  return JSON.parse(raw) as Record<string, unknown>;
}

describe("isMatchedByRegistrations", () => {
  it("matches exact topic", () => {
    const regs = new Set(["debate:abc"]);
    expect(isMatchedByRegistrations("debate:abc", regs)).toBe(true);
  });

  it("does not match different exact topic", () => {
    const regs = new Set(["debate:abc"]);
    expect(isMatchedByRegistrations("debate:xyz", regs)).toBe(false);
  });

  it("matches single segment wildcard", () => {
    const regs = new Set(["debate:*"]);
    expect(isMatchedByRegistrations("debate:abc", regs)).toBe(true);
    expect(isMatchedByRegistrations("debate:xyz", regs)).toBe(true);
    expect(isMatchedByRegistrations("debate:room:123", regs)).toBe(false);
  });

  it("does not match non-matching wildcard", () => {
    const regs = new Set(["debate:*"]);
    expect(isMatchedByRegistrations("file:abc", regs)).toBe(false);
  });

  it("multi-segment wildcard matches zero or more", () => {
    const regs = new Set(["debate:**"]);
    expect(isMatchedByRegistrations("debate:abc", regs)).toBe(true);
    expect(isMatchedByRegistrations("debate:abc:def", regs)).toBe(true);
    expect(isMatchedByRegistrations("debate", regs)).toBe(true);
  });

  it("bare * matches single segment only", () => {
    const regs = new Set(["*"]);
    expect(isMatchedByRegistrations("anything", regs)).toBe(true);
    expect(isMatchedByRegistrations("debate:abc", regs)).toBe(false);
  });

  it("empty registrations match nothing", () => {
    const regs = new Set<string>();
    expect(isMatchedByRegistrations("debate:abc", regs)).toBe(false);
  });
});

describe("createEventConnection", () => {
  it("establishes WebSocket and reports connected", () => {
    const conn = createEventConnection("wss://example.com/ws");
    expect(conn.connected).toBe(false);
    lastWs().simulateOpen();
    expect(conn.connected).toBe(true);
    conn.close();
  });

  it("listen sends wire op with id when connected", () => {
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();
    const p = conn.listen(["debate:abc", "file:/x"]);
    p.catch(() => {}); // swallow close rejection
    const sent = parseSent(lastWs(), 0);
    expect(sent.op).toBe("listen");
    expect(sent.topics).toEqual(["debate:abc", "file:/x"]);
    expect(typeof sent.id).toBe("string");
    conn.close();
  });

  it("listen queued before connect is sent on open", () => {
    const conn = createEventConnection("wss://example.com/ws");
    void conn.listen(["debate:abc"]);
    expect(lastWs().sent.length).toBe(0);
    lastWs().simulateOpen();
    expect(lastWs().sent.length).toBe(1);
    const sent = parseSent(lastWs(), 0);
    expect(sent.op).toBe("listen");
    expect(sent.topics).toEqual(["debate:abc"]);
    expect(typeof sent.id).toBe("string");
    conn.close();
  });

  it("unlisten sends wire op with id", () => {
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();
    conn.listen(["debate:abc"]).catch(() => {}); // swallow close rejection
    conn.unlisten(["debate:abc"]).catch(() => {}); // swallow close rejection
    const sent = parseSent(lastWs(), 1);
    expect(sent.op).toBe("unlisten");
    expect(sent.topics).toEqual(["debate:abc"]);
    expect(typeof sent.id).toBe("string");
    conn.close();
  });

  it("send forwards arbitrary JSON", () => {
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();
    conn.send({ custom: "data" });
    expect(parseSent(lastWs(), 0)).toEqual({ custom: "data" });
    conn.close();
  });

  it("incoming event dispatches CustomEvent on eventTarget", () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener("pages-event", handler);
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();
    lastWs().simulateMessage(JSON.stringify({
      op: "event",
      topic: "debate:abc",
      payload: { text: "hello" },
    }));
    expect(handler).toHaveBeenCalledTimes(1);
    const firstCall = handler.mock.calls[0];
    if (!firstCall) throw new Error("Handler not called");
    const detail = (firstCall[0] as CustomEvent).detail as { topic: string; payload: unknown };
    expect(detail.topic).toBe("debate:abc");
    expect(detail.payload).toEqual({ text: "hello" });
    conn.close();
  });

  it("batch array-wrapped events dispatch multiple events", () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener("pages-event", handler);
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();
    lastWs().simulateMessage(JSON.stringify([
      { op: "event", topic: "a", payload: 1 },
      { op: "event", topic: "b", payload: 2 },
    ]));
    expect(handler).toHaveBeenCalledTimes(2);
    conn.close();
  });

  it("non-event ops are silently ignored", () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener("pages-event", handler);
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();
    lastWs().simulateMessage(JSON.stringify({
      op: "snapshot",
      dataset: "x",
      columns: [],
      rows: [],
    }));
    expect(handler).not.toHaveBeenCalled();
    conn.close();
  });

  it("dispatch-sequence op fires scenario-dispatch event", () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener("scenario-dispatch", handler);
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();
    lastWs().simulateMessage(JSON.stringify({
      op: "dispatch-sequence",
      sessionId: "s-001",
      executorId: "browser",
      steps: [{ name: "step1", label: "Do thing", commands: [{ action: "click" }] }],
      speed: 1.0,
      paused: false,
    }));
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail as Record<string, unknown>;
    expect(detail.op).toBe("dispatch-sequence");
    expect(detail.sessionId).toBe("s-001");
    expect(detail.steps).toHaveLength(1);
    conn.close();
  });

  it("executor-control op fires scenario-control event", () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener("scenario-control", handler);
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();
    lastWs().simulateMessage(JSON.stringify({
      op: "executor-control",
      sessionId: "s-001",
      command: "pause",
    }));
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail as Record<string, unknown>;
    expect(detail.op).toBe("executor-control");
    expect(detail.command).toBe("pause");
    conn.close();
  });

  it("close tears down cleanly with no reconnection", () => {
    vi.useFakeTimers();
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();
    conn.close();
    expect(conn.connected).toBe(false);
    const countBefore = MockWebSocket.instances.length;
    vi.advanceTimersByTime(60000);
    expect(MockWebSocket.instances.length).toBe(countBefore);
    vi.useRealTimers();
  });

  it("applies relay config to connection URL", () => {
    const conn = createEventConnection("wss://example.com/ws", {
      config: { relay: { endpoint: "wss://relay.example.com/proxy" } },
    });
    expect(lastWs().url).toContain("relay.example.com");
    expect(lastWs().url).toContain("target=");
    conn.close();
  });

  it("applies auth config to connection URL", () => {
    const conn = createEventConnection("wss://example.com/ws", {
      config: { auth: { type: "query-param", token: "abc123" } },
    });
    expect(lastWs().url).toContain("token=abc123");
    conn.close();
  });
});

describe("EventConnection ack/error handling", () => {
  it("listen resolves on incoming ack with matching id", async () => {
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();

    const promise = conn.listen(["debate:abc"]);
    const sent = parseSent(lastWs(), 0);
    const id = sent.id as string;

    lastWs().simulateMessage(JSON.stringify({
      op: "ack",
      id,
      topics: ["debate:abc"],
    }));

    const result = await promise;
    expect(result.topics).toEqual(["debate:abc"]);
    conn.close();
  });

  it("listen resolves with gaps when server reports them", async () => {
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();

    const promise = conn.listen(["debate:*"]);
    const sent = parseSent(lastWs(), 0);
    const id = sent.id as string;

    lastWs().simulateMessage(JSON.stringify({
      op: "ack",
      id,
      topics: ["debate:*"],
      gaps: ["debate:old"],
    }));

    const result = await promise;
    expect(result.topics).toEqual(["debate:*"]);
    expect(result.gaps).toEqual(["debate:old"]);
    conn.close();
  });

  it("listen rejects on incoming error with matching id", async () => {
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();

    const promise = conn.listen(["unknown:topic"]);
    const sent = parseSent(lastWs(), 0);
    const id = sent.id as string;

    lastWs().simulateMessage(JSON.stringify({
      op: "error",
      id,
      message: "unknown topic: unknown:topic",
    }));

    await expect(promise).rejects.toThrow("unknown topic: unknown:topic");
    conn.close();
  });

  it("unlisten resolves on ack", async () => {
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();

    void conn.listen(["debate:abc"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:abc"] }));

    const promise = conn.unlisten(["debate:abc"]);
    const unlistenSent = parseSent(lastWs(), 1);
    const id = unlistenSent.id as string;

    lastWs().simulateMessage(JSON.stringify({ op: "ack", id }));

    await promise;
    conn.close();
  });

  it("pending request timeout rejects after 10s, entry removed from map", async () => {
    vi.useFakeTimers();
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();

    const promise = conn.listen(["debate:abc"]);

    vi.advanceTimersByTime(10_000);

    await expect(promise).rejects.toThrow("request timeout");
    conn.close();
    vi.useRealTimers();
  });

  it("late ack after timeout is a no-op", async () => {
    vi.useFakeTimers();
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();

    const promise = conn.listen(["debate:abc"]);
    const sent = parseSent(lastWs(), 0);
    const id = sent.id as string;

    vi.advanceTimersByTime(10_000);
    await expect(promise).rejects.toThrow("request timeout");

    // Late ack — should not throw or cause issues
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id, topics: ["debate:abc"] }));

    conn.close();
    vi.useRealTimers();
  });

  it("close() rejects all pending with 'connection closed'", async () => {
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();

    const p1 = conn.listen(["debate:abc"]);
    const p2 = conn.listen(["file:/x"]);

    conn.close();

    await expect(p1).rejects.toThrow("connection closed");
    await expect(p2).rejects.toThrow("connection closed");
  });

  it("connection reset (onclose) rejects all pending", async () => {
    vi.useFakeTimers();
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();

    const p1 = conn.listen(["debate:abc"]);

    lastWs().simulateClose(1006);

    await expect(p1).rejects.toThrow("connection closed");
    conn.close();
    vi.useRealTimers();
  });

  it("unmatched ack is silently dropped", () => {
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();

    // No pending requests — this ack should be silently dropped
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: "nonexistent" }));

    conn.close();
  });
});

describe("EventConnection seq tracking + dedup", () => {
  it("incoming event with numeric seq updates topicSeqs", () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener("pages-event", handler);
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();

    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: { text: "a" }, seq: 5,
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    conn.close();
  });

  it("event with seq <= tracked seq is silently skipped (dedup)", () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener("pages-event", handler);
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();

    // First event — seq 5
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: { text: "a" }, seq: 5,
    }));
    expect(handler).toHaveBeenCalledTimes(1);

    // Duplicate — same seq
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: { text: "a" }, seq: 5,
    }));
    expect(handler).toHaveBeenCalledTimes(1); // not dispatched

    // Older seq
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: { text: "a" }, seq: 3,
    }));
    expect(handler).toHaveBeenCalledTimes(1); // not dispatched

    // New seq
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: { text: "b" }, seq: 6,
    }));
    expect(handler).toHaveBeenCalledTimes(2); // dispatched

    conn.close();
  });

  it("events without seq field are not deduped", () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener("pages-event", handler);
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();

    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: { text: "a" },
    }));
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: { text: "b" },
    }));
    expect(handler).toHaveBeenCalledTimes(2);
    conn.close();
  });

  it("seq tracking is per-topic", () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener("pages-event", handler);
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();

    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 5,
    }));
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:xyz", payload: {}, seq: 3,
    }));

    // debate:abc at 5, debate:xyz at 3 — both dispatched
    expect(handler).toHaveBeenCalledTimes(2);

    // seq 4 for debate:xyz is new (> 3), should dispatch
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:xyz", payload: {}, seq: 4,
    }));
    expect(handler).toHaveBeenCalledTimes(3);

    // seq 5 for debate:abc is not new (= 5), should skip
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 5,
    }));
    expect(handler).toHaveBeenCalledTimes(3);

    conn.close();
  });

  it("unlisten cleans topicSeqs for topics no longer matched", async () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();

    // Listen to debate:abc and receive an event
    void conn.listen(["debate:abc"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:abc"] }));
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 10,
    }));

    // Unlisten debate:abc
    const unlistenPromise = conn.unlisten(["debate:abc"]);
    const unlistenSent = parseSent(lastWs(), 1);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: unlistenSent.id }));
    await unlistenPromise;

    // Force reconnect — since should NOT include debate:abc
    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    const reconnectedWs = lastWs();
    reconnectedWs.simulateOpen();

    // No registrations remain, so no message is sent on reconnect
    expect(reconnectedWs.sent.length).toBe(0);

    conn.close();
    vi.useRealTimers();
  });
});

describe("EventConnection reconnect since", () => {
  it("reconnect sends since map with accumulated seq positions", () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();

    void conn.listen(["debate:abc"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:abc"] }));

    // Receive events with seqs
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 5,
    }));
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 10,
    }));

    // Simulate reconnect
    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    const reconnectedWs = lastWs();
    reconnectedWs.simulateOpen();

    const sent = parseSent(reconnectedWs, 0);
    expect(sent.op).toBe("listen");
    expect(sent.topics).toEqual(["debate:abc"]);
    expect(sent.since).toEqual({ "debate:abc": 10 });

    conn.close();
    vi.useRealTimers();
  });

  it("reconnect without prior seq sends since with 0 for exact topics", () => {
    vi.useFakeTimers();
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();

    void conn.listen(["debate:abc"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:abc"] }));

    // No events received — reconnect should still seed at 0
    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    const reconnectedWs = lastWs();
    reconnectedWs.simulateOpen();

    const sent = parseSent(reconnectedWs, 0);
    expect(sent.op).toBe("listen");
    expect(sent.topics).toEqual(["debate:abc"]);
    expect(sent.since).toEqual({ "debate:abc": 0 });

    conn.close();
    vi.useRealTimers();
  });

  it("reconnect since includes wildcard matches from topicSeqs", () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();

    void conn.listen(["debate:*"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:*"] }));

    // Events arrive for concrete topics under the wildcard
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 5,
    }));
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:xyz", payload: {}, seq: 8,
    }));

    // Reconnect
    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    const reconnectedWs = lastWs();
    reconnectedWs.simulateOpen();

    const sent = parseSent(reconnectedWs, 0);
    expect(sent.op).toBe("listen");
    expect(sent.topics).toEqual(["debate:*"]);
    // Wildcard is NOT in since (server handles expansion)
    // But concrete topics matching the wildcard ARE in since
    expect(sent.since).toEqual({ "debate:abc": 5, "debate:xyz": 8 });

    conn.close();
    vi.useRealTimers();
  });

  it("reconnect since seeds exact topics at 0", () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();

    // Listen to both exact and wildcard
    void conn.listen(["debate:abc", "file:*"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:abc", "file:*"] }));

    // Only receive event for file:doc (under wildcard)
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "file:doc", payload: {}, seq: 3,
    }));

    // Reconnect
    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    const reconnectedWs = lastWs();
    reconnectedWs.simulateOpen();

    const sent = parseSent(reconnectedWs, 0);
    expect(sent.since).toEqual({
      "debate:abc": 0,   // Phase 1: exact topic seeded at 0
      "file:doc": 3,     // Phase 2: concrete topic from topicSeqs
    });

    conn.close();
    vi.useRealTimers();
  });

  it("reconnect since filters stale entries after unlisten", () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();

    // Listen to two topics
    void conn.listen(["debate:abc", "debate:xyz"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({
      op: "ack", id: listenSent.id, topics: ["debate:abc", "debate:xyz"],
    }));

    // Events for both
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 5,
    }));
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:xyz", payload: {}, seq: 8,
    }));

    // Unlisten debate:xyz — topicSeqs entry cleaned
    const unlistenPromise = conn.unlisten(["debate:xyz"]);
    const unlistenSent = parseSent(lastWs(), 1);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: unlistenSent.id }));
    void unlistenPromise;

    // Reconnect — since should only include debate:abc
    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    const reconnectedWs = lastWs();
    reconnectedWs.simulateOpen();

    const sent = parseSent(reconnectedWs, 0);
    expect(sent.topics).toEqual(["debate:abc"]);
    expect(sent.since).toEqual({ "debate:abc": 5 });

    conn.close();
    vi.useRealTimers();
  });

  it("reconnect listen awaits ack and defers connected status", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const conn = createEventConnection("wss://example.com/ws", {
      onStatusChange: onChange,
    });
    lastWs().simulateOpen();

    void conn.listen(["debate:abc"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:abc"] }));
    onChange.mockClear();

    // Reconnect
    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    const reconnectedWs = lastWs();
    reconnectedWs.simulateOpen();

    // Status should NOT be connected yet — waiting for listen ack
    expect(conn.status).not.toBe("connected");

    // Ack the reconnect listen
    const reconnectSent = parseSent(reconnectedWs, 0);
    reconnectedWs.simulateMessage(JSON.stringify({
      op: "ack",
      id: reconnectSent.id,
      topics: ["debate:abc"],
    }));

    // Now connected
    expect(conn.status).toBe("connected");

    conn.close();
    vi.useRealTimers();
  });

  it("reconnect ack passes gaps through onStatusChange", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const conn = createEventConnection("wss://example.com/ws", {
      onStatusChange: onChange,
    });
    lastWs().simulateOpen();

    void conn.listen(["debate:*"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:*"] }));
    onChange.mockClear();

    // Reconnect
    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    const reconnectedWs = lastWs();
    reconnectedWs.simulateOpen();

    // Ack with gaps
    const reconnectSent = parseSent(reconnectedWs, 0);
    reconnectedWs.simulateMessage(JSON.stringify({
      op: "ack",
      id: reconnectSent.id,
      topics: ["debate:*"],
      gaps: ["debate:old-topic"],
    }));

    expect(onChange).toHaveBeenCalledWith("connected", { gaps: ["debate:old-topic"] });

    conn.close();
    vi.useRealTimers();
  });

  it("reconnect ack without gaps passes empty gaps array", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const conn = createEventConnection("wss://example.com/ws", {
      onStatusChange: onChange,
    });
    lastWs().simulateOpen();

    void conn.listen(["debate:abc"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:abc"] }));
    onChange.mockClear();

    // Reconnect
    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    const reconnectedWs = lastWs();
    reconnectedWs.simulateOpen();

    // Ack without gaps
    const reconnectSent = parseSent(reconnectedWs, 0);
    reconnectedWs.simulateMessage(JSON.stringify({
      op: "ack",
      id: reconnectSent.id,
      topics: ["debate:abc"],
    }));

    expect(onChange).toHaveBeenCalledWith("connected", { gaps: [] });

    conn.close();
    vi.useRealTimers();
  });

  it("reconnect listen timeout transitions to connected without detail", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const conn = createEventConnection("wss://example.com/ws", {
      onStatusChange: onChange,
    });
    lastWs().simulateOpen();

    void conn.listen(["debate:abc"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:abc"] }));
    onChange.mockClear();

    // Reconnect
    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    lastWs().simulateOpen();

    // No ack — wait for timeout
    vi.advanceTimersByTime(10_000);

    expect(conn.status).toBe("connected");
    expect(onChange).toHaveBeenCalledWith("connected");

    conn.close();
    vi.useRealTimers();
  });

  it("reconnection re-sends listen registrations with since", () => {
    vi.useFakeTimers();
    const conn = createEventConnection("wss://example.com/ws");
    lastWs().simulateOpen();
    void conn.listen(["debate:abc"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:abc"] }));

    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    const reconnectedWs = lastWs();
    reconnectedWs.simulateOpen();

    const sent = parseSent(reconnectedWs, 0);
    expect(sent.op).toBe("listen");
    expect(sent.topics).toEqual(["debate:abc"]);
    expect(typeof sent.id).toBe("string");
    // Since should include the seeded value
    expect(sent.since).toEqual({ "debate:abc": 0 });

    conn.close();
    vi.useRealTimers();
  });
});

describe('EventConnection status tracking', () => {
  it('starts as disconnected', () => {
    const conn = createEventConnection('ws://localhost:8080', {
      onStatusChange: vi.fn(),
    });
    expect(conn.status).toBe('disconnected');
    conn.close();
  });

  it('transitions to connected on WebSocket open', () => {
    const onChange = vi.fn();
    const conn = createEventConnection('ws://localhost:8080', {
      onStatusChange: onChange,
    });
    expect(conn.status).toBe('disconnected');

    lastWs().simulateOpen();

    expect(conn.status).toBe('connected');
    expect(onChange).toHaveBeenCalledWith('connected');
    conn.close();
  });

  it('transitions to reconnecting on WebSocket close (non-permanent)', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const conn = createEventConnection('ws://localhost:8080', {
      onStatusChange: onChange,
    });
    lastWs().simulateOpen();
    onChange.mockClear();

    lastWs().simulateClose(1006); // Network error

    expect(conn.status).toBe('reconnecting');
    expect(onChange).toHaveBeenCalledWith('reconnecting');

    conn.close();
    vi.useRealTimers();
  });

  it('transitions to disconnected on permanent close (code >= 4000)', () => {
    const onChange = vi.fn();
    const conn = createEventConnection('ws://localhost:8080', {
      onStatusChange: onChange,
    });
    lastWs().simulateOpen();
    onChange.mockClear();

    lastWs().simulateClose(4000); // Permanent error

    expect(conn.status).toBe('disconnected');
    expect(onChange).toHaveBeenCalledWith('disconnected');

    conn.close();
  });

  it('transitions to disconnected on close()', () => {
    const onChange = vi.fn();
    const conn = createEventConnection('ws://localhost:8080', {
      onStatusChange: onChange,
    });
    lastWs().simulateOpen();
    onChange.mockClear();

    conn.close();

    expect(conn.status).toBe('disconnected');
    expect(onChange).toHaveBeenCalledWith('disconnected');
  });

  it('transitions from reconnecting to connected on successful reconnect', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const conn = createEventConnection('ws://localhost:8080', {
      onStatusChange: onChange,
    });
    lastWs().simulateOpen();
    lastWs().simulateClose(1006);
    onChange.mockClear();

    vi.advanceTimersByTime(1500);
    lastWs().simulateOpen();

    expect(conn.status).toBe('connected');
    expect(onChange).toHaveBeenCalledWith('connected');

    conn.close();
    vi.useRealTimers();
  });

  it('onStatusChange is optional', () => {
    const conn = createEventConnection('ws://localhost:8080');
    lastWs().simulateOpen();
    expect(conn.status).toBe('connected');
    conn.close();
  });
});

describe('EventConnection rAF batching', () => {
  it('dispatches events immediately when batchEvents is false (default)', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener('pages-event', handler);
    const conn = createEventConnection('ws://localhost:8080', {
      config: { eventTarget: target },
      // batchEvents not set — defaults to false
    });
    lastWs().simulateOpen();

    lastWs().simulateMessage(JSON.stringify({
      op: 'event',
      topic: 'debate:abc',
      payload: { text: 'hello' },
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    conn.close();
  });

  it('batches events when batchEvents is true', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener('pages-event', handler);

    // Mock requestAnimationFrame
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    const conn = createEventConnection('ws://localhost:8080', {
      config: { eventTarget: target },
      batchEvents: true,
    });
    lastWs().simulateOpen();

    // Receive multiple events
    lastWs().simulateMessage(JSON.stringify({
      op: 'event',
      topic: 'debate:abc',
      payload: { text: 'hello' },
    }));
    lastWs().simulateMessage(JSON.stringify({
      op: 'event',
      topic: 'debate:xyz',
      payload: { text: 'world' },
    }));

    // Events not dispatched yet
    expect(handler).not.toHaveBeenCalled();

    // Flush rAF
    expect(rafCallbacks.length).toBe(1);
    rafCallbacks[0]?.(0);

    // Now events are dispatched
    expect(handler).toHaveBeenCalledTimes(2);

    conn.close();
    vi.unstubAllGlobals();
  });

  it('batching consolidates multiple messages into one rAF flush', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener('pages-event', handler);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    const conn = createEventConnection('ws://localhost:8080', {
      config: { eventTarget: target },
      batchEvents: true,
    });
    lastWs().simulateOpen();

    // Receive 3 events before any rAF flush
    lastWs().simulateMessage(JSON.stringify({
      op: 'event',
      topic: 'a',
      payload: 1,
    }));
    lastWs().simulateMessage(JSON.stringify({
      op: 'event',
      topic: 'b',
      payload: 2,
    }));
    lastWs().simulateMessage(JSON.stringify({
      op: 'event',
      topic: 'c',
      payload: 3,
    }));

    // Only one rAF scheduled
    expect(rafCallbacks.length).toBe(1);
    expect(handler).not.toHaveBeenCalled();

    // Flush
    rafCallbacks[0]?.(0);

    // All 3 events dispatched
    expect(handler).toHaveBeenCalledTimes(3);

    conn.close();
    vi.unstubAllGlobals();
  });
});

describe("EventConnection cursor persistence", () => {
  function createMockStorage(): Storage {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      get length() { return store.size; },
      key: (index: number) => [...store.keys()][index] ?? null,
    };
  }

  it("persists topicSeqs to storage on event receipt", () => {
    const storage = createMockStorage();
    const target = new EventTarget();
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
      cursorStorage: storage,
    });
    lastWs().simulateOpen();

    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 5,
    }));

    const stored = JSON.parse(storage.getItem("pages-ec:wss://example.com/ws") ?? "{}") as Record<string, number>;
    expect(stored["debate:abc"]).toBe(5);

    conn.close();
  });

  it("loads persisted cursors into topicSeqs on construction", () => {
    vi.useFakeTimers();
    const storage = createMockStorage();
    const target = new EventTarget();
    storage.setItem("pages-ec:wss://example.com/ws", JSON.stringify({ "debate:abc": 10 }));

    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
      cursorStorage: storage,
    });
    lastWs().simulateOpen();

    void conn.listen(["debate:abc"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:abc"] }));

    // Reconnect — since should use persisted seq 10
    lastWs().simulateClose(1006);
    vi.advanceTimersByTime(1500);
    const reconnectedWs = lastWs();
    reconnectedWs.simulateOpen();

    const sent = parseSent(reconnectedWs, 0);
    expect(sent.since).toEqual({ "debate:abc": 10 });

    conn.close();
    vi.useRealTimers();
  });

  it("deduplicates events using persisted cursors", () => {
    const storage = createMockStorage();
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener("pages-event", handler);
    storage.setItem("pages-ec:wss://example.com/ws", JSON.stringify({ "debate:abc": 10 }));

    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
      cursorStorage: storage,
    });
    lastWs().simulateOpen();

    // Event with seq <= persisted (10) should be deduped
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 10,
    }));
    expect(handler).not.toHaveBeenCalled();

    // Event with seq > persisted should dispatch
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 11,
    }));
    expect(handler).toHaveBeenCalledTimes(1);

    conn.close();
  });

  it("cleans storage entry on close", () => {
    const storage = createMockStorage();
    const target = new EventTarget();
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
      cursorStorage: storage,
    });
    lastWs().simulateOpen();

    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 5,
    }));
    expect(storage.getItem("pages-ec:wss://example.com/ws")).not.toBeNull();

    conn.close();
    expect(storage.getItem("pages-ec:wss://example.com/ws")).toBeNull();
  });

  it("removes unlistened topics from storage", async () => {
    const storage = createMockStorage();
    const target = new EventTarget();
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
      cursorStorage: storage,
    });
    lastWs().simulateOpen();

    void conn.listen(["debate:abc", "debate:xyz"]);
    const listenSent = parseSent(lastWs(), 0);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: listenSent.id, topics: ["debate:abc", "debate:xyz"] }));

    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 5,
    }));
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:xyz", payload: {}, seq: 8,
    }));

    const unlistenPromise = conn.unlisten(["debate:xyz"]);
    const unlistenSent = parseSent(lastWs(), 1);
    lastWs().simulateMessage(JSON.stringify({ op: "ack", id: unlistenSent.id }));
    await unlistenPromise;

    const stored = JSON.parse(storage.getItem("pages-ec:wss://example.com/ws") ?? "{}") as Record<string, number>;
    expect(stored["debate:abc"]).toBe(5);
    expect(stored["debate:xyz"]).toBeUndefined();

    conn.close();
  });

  it("no persistence when cursorStorage is not set", () => {
    const target = new EventTarget();
    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
    });
    lastWs().simulateOpen();

    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 5,
    }));

    // No storage used — nothing to check except no error thrown
    conn.close();
  });

  it("handles corrupted storage gracefully", () => {
    const storage = createMockStorage();
    const target = new EventTarget();
    storage.setItem("pages-ec:wss://example.com/ws", "not-json{{{");

    const conn = createEventConnection("wss://example.com/ws", {
      config: { eventTarget: target },
      cursorStorage: storage,
    });
    lastWs().simulateOpen();

    // Should not throw — corrupted data is ignored
    lastWs().simulateMessage(JSON.stringify({
      op: "event", topic: "debate:abc", payload: {}, seq: 1,
    }));

    const stored = JSON.parse(storage.getItem("pages-ec:wss://example.com/ws") ?? "{}") as Record<string, number>;
    expect(stored["debate:abc"]).toBe(1);

    conn.close();
  });
});
