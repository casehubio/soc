import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WsTriggerPool } from "./ws-trigger-pool.js";
import type { WsTriggerHandler } from "./ws-trigger-pool.js";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 1;
  closed = false;

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }

  close() {
    this.closed = true;
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

describe("WsTriggerPool", () => {
  let pool: WsTriggerPool;

  beforeEach(() => {
    MockWebSocket.instances = [];
    pool = new WsTriggerPool(MockWebSocket as unknown as typeof WebSocket);
  });

  afterEach(() => {
    pool.disconnectAll();
    vi.useRealTimers();
  });

  it("creates one WebSocket per URL", () => {
    const h1: WsTriggerHandler = vi.fn();
    const h2: WsTriggerHandler = vi.fn();

    pool.subscribe("ws://test/events", h1);
    pool.subscribe("ws://test/events", h2);

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("creates separate WebSockets for different URLs", () => {
    pool.subscribe("ws://a/events", vi.fn());
    pool.subscribe("ws://b/events", vi.fn());

    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("fans out parsed messages to all handlers", () => {
    const h1: WsTriggerHandler = vi.fn();
    const h2: WsTriggerHandler = vi.fn();

    pool.subscribe("ws://test/events", h1);
    pool.subscribe("ws://test/events", h2);

    const ws = MockWebSocket.instances[0]!;
    const msg = { op: "event", topic: "planitem.state", payload: { caseId: "c1" } };
    ws.simulateMessage(msg);

    expect(h1).toHaveBeenCalledWith(msg);
    expect(h2).toHaveBeenCalledWith(msg);
  });

  it("closes WebSocket when last subscriber unsubscribes", () => {
    const h1: WsTriggerHandler = vi.fn();
    const h2: WsTriggerHandler = vi.fn();

    pool.subscribe("ws://test/events", h1);
    pool.subscribe("ws://test/events", h2);

    pool.unsubscribe("ws://test/events", h1);
    expect(MockWebSocket.instances[0]!.closed).toBe(false);

    pool.unsubscribe("ws://test/events", h2);
    expect(MockWebSocket.instances[0]!.closed).toBe(true);
  });

  it("reconnects with backoff on close and emits __reconnect__", () => {
    vi.useFakeTimers();
    const handler: WsTriggerHandler = vi.fn();
    pool.subscribe("ws://test/events", handler);

    const ws1 = MockWebSocket.instances[0]!;
    ws1.onclose?.();

    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances).toHaveLength(2);

    const ws2 = MockWebSocket.instances[1]!;
    ws2.onopen?.();

    expect(handler).toHaveBeenCalledWith({
      op: "reconnect",
      topic: "__reconnect__",
      payload: {},
    });
  });

  it("does not reconnect after all subscribers removed", () => {
    vi.useFakeTimers();
    const handler: WsTriggerHandler = vi.fn();
    pool.subscribe("ws://test/events", handler);
    pool.unsubscribe("ws://test/events", handler);

    vi.advanceTimersByTime(5000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("ignores non-JSON messages", () => {
    const handler: WsTriggerHandler = vi.fn();
    pool.subscribe("ws://test/events", handler);

    const ws = MockWebSocket.instances[0]!;
    ws.onmessage?.({ data: "not json" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("disconnectAll closes all connections", () => {
    pool.subscribe("ws://a/events", vi.fn());
    pool.subscribe("ws://b/events", vi.fn());

    pool.disconnectAll();

    expect(MockWebSocket.instances[0]!.closed).toBe(true);
    expect(MockWebSocket.instances[1]!.closed).toBe(true);
  });

  it("does not emit __reconnect__ on initial open", async () => {
    vi.useFakeTimers();
    const handler: WsTriggerHandler = vi.fn();
    pool.subscribe("ws://test/events", handler);

    const ws = MockWebSocket.instances[0]!;
    ws.onopen?.();

    expect(handler).not.toHaveBeenCalled();
  });
});
