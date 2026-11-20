import { describe, it, expect } from "vitest";
import { findSpatialTarget } from "./frame-spatial-nav.js";
import type { FrameLayout } from "@casehubio/pages-component";

function makeFrame(key: string, x: number, y: number, w = 400, h = 300): FrameLayout {
  return {
    key, order: 0, position: { x, y }, size: { width: w, height: h },
    zIndex: 1, pinned: false, hidden: false, tabs: [], activeTabKey: "",
  };
}

describe("findSpatialTarget", () => {
  it("finds frame to the right", () => {
    const frames = new Map([["a", makeFrame("a", 0, 0)], ["b", makeFrame("b", 500, 0)]]);
    expect(findSpatialTarget(frames, "a", "right")).toBe("b");
  });

  it("finds frame to the left", () => {
    const frames = new Map([["a", makeFrame("a", 500, 0)], ["b", makeFrame("b", 0, 0)]]);
    expect(findSpatialTarget(frames, "a", "left")).toBe("b");
  });

  it("finds frame below", () => {
    const frames = new Map([["a", makeFrame("a", 0, 0)], ["b", makeFrame("b", 0, 400)]]);
    expect(findSpatialTarget(frames, "a", "down")).toBe("b");
  });

  it("finds frame above", () => {
    const frames = new Map([["a", makeFrame("a", 0, 400)], ["b", makeFrame("b", 0, 0)]]);
    expect(findSpatialTarget(frames, "a", "up")).toBe("b");
  });

  it("returns null when no frame in direction", () => {
    const frames = new Map([["a", makeFrame("a", 0, 0)]]);
    expect(findSpatialTarget(frames, "a", "right")).toBeNull();
  });

  it("skips hidden frames", () => {
    const hidden = { ...makeFrame("b", 500, 0), hidden: true };
    const frames = new Map([["a", makeFrame("a", 0, 0)], ["b", hidden]]);
    expect(findSpatialTarget(frames, "a", "right")).toBeNull();
  });

  it("picks closest frame when multiple in direction", () => {
    const frames = new Map([
      ["a", makeFrame("a", 0, 0)],
      ["b", makeFrame("b", 500, 0)],
      ["c", makeFrame("c", 1000, 0)],
    ]);
    expect(findSpatialTarget(frames, "a", "right")).toBe("b");
  });

  it("returns null for unknown current key", () => {
    const frames = new Map([["a", makeFrame("a", 0, 0)]]);
    expect(findSpatialTarget(frames, "unknown", "right")).toBeNull();
  });
});
