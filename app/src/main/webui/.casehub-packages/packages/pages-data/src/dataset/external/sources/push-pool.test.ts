import { describe, it, expect, vi } from "vitest";
import { createPushPool } from "./push-pool.js";
import type { PushSource, PushSourceConfig } from "./push-source.js";

function mockSource(): PushSource {
  return {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    close: vi.fn(),
  };
}

describe("createPushPool", () => {
  it("creates source on first acquire, reuses on second", () => {
    const factory = vi.fn(() => mockSource());
    const pool = createPushPool(factory);

    const s1 = pool.acquire("ws://host/a");
    const s2 = pool.acquire("ws://host/a");

    expect(factory).toHaveBeenCalledTimes(1);
    expect(s1).toBe(s2);
  });

  it("creates different sources for different baseUrls", () => {
    const factory = vi.fn(() => mockSource());
    const pool = createPushPool(factory);

    const s1 = pool.acquire("ws://host/a");
    const s2 = pool.acquire("ws://host/b");

    expect(factory).toHaveBeenCalledTimes(2);
    expect(s1).not.toBe(s2);
  });

  it("passes config to factory", () => {
    const factory = vi.fn(() => mockSource());
    const pool = createPushPool(factory);
    const config: PushSourceConfig = { auth: { type: "query-param", token: "t" } };

    pool.configure(config);
    pool.acquire("ws://host/a");

    expect(factory).toHaveBeenCalledWith("ws://host/a", config);
  });

  it("releaseAll closes all sources and clears pool", () => {
    const sources: PushSource[] = [];
    const factory = vi.fn(() => {
      const s = mockSource();
      sources.push(s);
      return s;
    });
    const pool = createPushPool(factory);

    pool.acquire("ws://host/a");
    pool.acquire("ws://host/b");
    pool.releaseAll();

    expect(sources[0]!.close).toHaveBeenCalled();
    expect(sources[1]!.close).toHaveBeenCalled();

    // After release, acquire creates new source
    pool.acquire("ws://host/a");
    expect(factory).toHaveBeenCalledTimes(3);
  });
});
