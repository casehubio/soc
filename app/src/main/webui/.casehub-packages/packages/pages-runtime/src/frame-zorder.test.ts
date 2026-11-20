import { describe, it, expect } from "vitest";
import { bringToFront, normalizeForSave } from "./frame-zorder.js";
import type { FrameLayout } from "@casehubio/pages-component";

function makeFrame(key: string, zIndex: number, pinned = false): FrameLayout {
  return {
    key, order: 0, position: { x: 0, y: 0 }, size: { width: 400, height: 300 },
    zIndex, pinned, hidden: false, tabs: [], activeTabKey: "",
  };
}

describe("bringToFront", () => {
  it("increments z-index in normal tier", () => {
    const frames = new Map([["a", makeFrame("a", 1)], ["b", makeFrame("b", 2)]]);
    const result = bringToFront(frames, "a");
    expect(result.get("a")!.zIndex).toBe(3);
    expect(result.get("b")!.zIndex).toBe(2);
  });

  it("increments z-index in pinned tier (10000+)", () => {
    const frames = new Map([["a", makeFrame("a", 10001, true)], ["b", makeFrame("b", 10002, true)]]);
    const result = bringToFront(frames, "a");
    expect(result.get("a")!.zIndex).toBe(10003);
  });

  it("compacts when counter exceeds threshold", () => {
    const frames = new Map([["a", makeFrame("a", 5001)], ["b", makeFrame("b", 5002)]]);
    const result = bringToFront(frames, "a");
    expect(result.get("b")!.zIndex).toBeLessThan(100);
    expect(result.get("a")!.zIndex).toBeGreaterThan(result.get("b")!.zIndex);
  });

  it("returns unchanged map for unknown key", () => {
    const frames = new Map([["a", makeFrame("a", 1)]]);
    const result = bringToFront(frames, "unknown");
    expect(result.get("a")!.zIndex).toBe(1);
  });

  it("keeps pinned frames above unpinned after bring to front", () => {
    const frames = new Map([
      ["a", makeFrame("a", 5, false)],
      ["b", makeFrame("b", 10001, true)],
    ]);
    const result = bringToFront(frames, "a");
    expect(result.get("a")!.zIndex).toBeLessThan(result.get("b")!.zIndex);
  });
});

describe("normalizeForSave", () => {
  it("compacts to sequential indices", () => {
    const frames = new Map([
      ["a", makeFrame("a", 500)],
      ["b", makeFrame("b", 1000)],
      ["c", makeFrame("c", 10500, true)],
    ]);
    const result = normalizeForSave(frames);
    expect(result.get("a")!.zIndex).toBe(1);
    expect(result.get("b")!.zIndex).toBe(2);
    expect(result.get("c")!.zIndex).toBe(10001);
  });

  it("handles empty map", () => {
    const result = normalizeForSave(new Map());
    expect(result.size).toBe(0);
  });

  it("preserves relative order", () => {
    const frames = new Map([
      ["a", makeFrame("a", 99)],
      ["b", makeFrame("b", 3)],
      ["c", makeFrame("c", 50)],
    ]);
    const result = normalizeForSave(frames);
    expect(result.get("b")!.zIndex).toBeLessThan(result.get("c")!.zIndex);
    expect(result.get("c")!.zIndex).toBeLessThan(result.get("a")!.zIndex);
  });
});
