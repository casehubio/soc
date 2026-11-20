import { describe, it, expect } from "vitest";
import { applyPreset } from "./frame-organisers.js";
import type { FrameLayout } from "@casehubio/pages-component";

function makeFrame(key: string, order: number): FrameLayout {
  return {
    key, order, position: { x: 0, y: 0 }, size: { width: 400, height: 300 },
    zIndex: 1, pinned: false, hidden: false, tabs: [], activeTabKey: "",
  };
}

const canvas = { width: 1200, height: 800 };

describe("applyPreset", () => {
  it("side-by-side splits horizontally", () => {
    const result = applyPreset([makeFrame("a", 0), makeFrame("b", 1)], canvas, "side-by-side");
    expect(result[0]!.position.x).toBeLessThan(result[1]!.position.x);
    expect(result[0]!.size.width + result[1]!.size.width).toBeLessThanOrEqual(canvas.width);
  });

  it("stacked splits vertically", () => {
    const result = applyPreset([makeFrame("a", 0), makeFrame("b", 1)], canvas, "stacked");
    expect(result[0]!.position.y).toBeLessThan(result[1]!.position.y);
  });

  it("grid arranges in rows and columns", () => {
    const frames = [makeFrame("a", 0), makeFrame("b", 1), makeFrame("c", 2), makeFrame("d", 3)];
    const result = applyPreset(frames, canvas, "grid");
    expect(result).toHaveLength(4);
    const positions = new Set(result.map(f => `${f.position.x},${f.position.y}`));
    expect(positions.size).toBe(4);
  });

  it("main-sidebar gives first frame majority width", () => {
    const result = applyPreset([makeFrame("a", 0), makeFrame("b", 1)], canvas, "main-sidebar");
    expect(result[0]!.size.width).toBeGreaterThan(result[1]!.size.width);
  });

  it("focus maximizes first frame", () => {
    const result = applyPreset([makeFrame("a", 0), makeFrame("b", 1)], canvas, "focus");
    expect(result[0]!.size.width).toBeGreaterThan(result[1]!.size.width);
    expect(result[0]!.size.height).toBeGreaterThan(result[1]!.size.height);
  });

  it("returns empty for empty input", () => {
    expect(applyPreset([], canvas, "grid")).toEqual([]);
  });

  it("sorts by order before arranging", () => {
    const result = applyPreset([makeFrame("b", 1), makeFrame("a", 0)], canvas, "side-by-side");
    expect(result[0]!.key).toBe("a");
    expect(result[1]!.key).toBe("b");
  });

  it("main-sidebar handles single frame", () => {
    const result = applyPreset([makeFrame("a", 0)], canvas, "main-sidebar");
    expect(result[0]!.size.width).toBe(canvas.width);
    expect(result[0]!.size.height).toBe(canvas.height);
  });
});
