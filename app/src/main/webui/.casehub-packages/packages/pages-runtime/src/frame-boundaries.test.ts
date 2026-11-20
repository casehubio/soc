import { describe, it, expect } from "vitest";
import { clampPosition, nextFramePosition, snapToZone, zoneToRect, detectEdgeZone, splitGeometry, edgeToDirection } from "./frame-boundaries.js";

describe("clampPosition", () => {
  it("clamps negative to zero", () => {
    const pos = clampPosition({ x: -50, y: -20 }, { width: 400, height: 300 }, { width: 1200, height: 800 });
    expect(pos).toEqual({ x: 0, y: 0 });
  });

  it("clamps right/bottom overflow", () => {
    const pos = clampPosition({ x: 1000, y: 700 }, { width: 400, height: 300 }, { width: 1200, height: 800 });
    expect(pos).toEqual({ x: 800, y: 500 });
  });

  it("passes through valid positions", () => {
    const pos = clampPosition({ x: 100, y: 100 }, { width: 400, height: 300 }, { width: 1200, height: 800 });
    expect(pos).toEqual({ x: 100, y: 100 });
  });

  it("handles frame larger than container", () => {
    const pos = clampPosition({ x: 100, y: 100 }, { width: 1400, height: 900 }, { width: 1200, height: 800 });
    expect(pos).toEqual({ x: 0, y: 0 });
  });
});

describe("nextFramePosition", () => {
  it("centers first frame", () => {
    const pos = nextFramePosition({ width: 1200, height: 800 }, { width: 400, height: 300 }, []);
    expect(pos).toEqual({ x: 400, y: 250 });
  });

  it("offsets subsequent frames", () => {
    const existing = [{ x: 400, y: 250 }];
    const pos = nextFramePosition({ width: 1200, height: 800 }, { width: 400, height: 300 }, existing);
    expect(pos.x).not.toBe(400);
    expect(pos.y).not.toBe(250);
  });

  it("avoids collision with existing positions", () => {
    const existing = [{ x: 400, y: 250 }, { x: 430, y: 280 }];
    const pos = nextFramePosition({ width: 1200, height: 800 }, { width: 400, height: 300 }, existing);
    const collides = existing.some(e => Math.abs(e.x - pos.x) < 10 && Math.abs(e.y - pos.y) < 10);
    expect(collides).toBe(false);
  });

  it("clamps to container bounds", () => {
    const existing = [{ x: 750, y: 450 }];
    const pos = nextFramePosition({ width: 1200, height: 800 }, { width: 400, height: 300 }, existing);
    expect(pos.x).toBeLessThanOrEqual(800);
    expect(pos.y).toBeLessThanOrEqual(500);
  });
});

describe("snapToZone", () => {
  const container = { width: 1000, height: 800 };

  it("returns null when far from edges", () => {
    expect(snapToZone({ x: 500, y: 400 }, container)).toBeNull();
  });

  it("detects left edge", () => {
    expect(snapToZone({ x: 10, y: 400 }, container)).toBe("left");
  });

  it("detects right edge", () => {
    expect(snapToZone({ x: 990, y: 400 }, container)).toBe("right");
  });

  it("detects top edge", () => {
    expect(snapToZone({ x: 500, y: 10 }, container)).toBe("top");
  });

  it("detects bottom edge", () => {
    expect(snapToZone({ x: 500, y: 790 }, container)).toBe("bottom");
  });

  it("detects top-left corner (corner priority over edge)", () => {
    expect(snapToZone({ x: 10, y: 10 }, container)).toBe("top-left");
  });

  it("detects top-right corner", () => {
    expect(snapToZone({ x: 990, y: 10 }, container)).toBe("top-right");
  });

  it("detects bottom-left corner", () => {
    expect(snapToZone({ x: 10, y: 790 }, container)).toBe("bottom-left");
  });

  it("detects bottom-right corner", () => {
    expect(snapToZone({ x: 990, y: 790 }, container)).toBe("bottom-right");
  });

  it("respects custom threshold", () => {
    expect(snapToZone({ x: 50, y: 400 }, container, 20)).toBeNull();
    expect(snapToZone({ x: 10, y: 400 }, container, 20)).toBe("left");
  });
});

describe("zoneToRect", () => {
  const container = { width: 1000, height: 800 };

  it("computes left half", () => {
    const r = zoneToRect("left", container);
    expect(r.position).toEqual({ x: 0, y: 0 });
    expect(r.size).toEqual({ width: 496, height: 800 });
  });

  it("computes right half", () => {
    const r = zoneToRect("right", container);
    expect(r.position).toEqual({ x: 504, y: 0 });
    expect(r.size).toEqual({ width: 496, height: 800 });
  });

  it("computes top half", () => {
    const r = zoneToRect("top", container);
    expect(r.position).toEqual({ x: 0, y: 0 });
    expect(r.size).toEqual({ width: 1000, height: 396 });
  });

  it("computes bottom half", () => {
    const r = zoneToRect("bottom", container);
    expect(r.position).toEqual({ x: 0, y: 404 });
    expect(r.size).toEqual({ width: 1000, height: 396 });
  });

  it("computes full", () => {
    const r = zoneToRect("full", container);
    expect(r.position).toEqual({ x: 0, y: 0 });
    expect(r.size).toEqual({ width: 1000, height: 800 });
  });

  it("computes top-left quarter", () => {
    const r = zoneToRect("top-left", container);
    expect(r.position).toEqual({ x: 0, y: 0 });
    expect(r.size).toEqual({ width: 496, height: 396 });
  });

  it("computes bottom-right quarter", () => {
    const r = zoneToRect("bottom-right", container);
    expect(r.position).toEqual({ x: 504, y: 404 });
    expect(r.size).toEqual({ width: 496, height: 396 });
  });

  it("respects custom gap", () => {
    const r = zoneToRect("left", container, 16);
    expect(r.size).toEqual({ width: 492, height: 800 });
  });
});

describe("detectEdgeZone", () => {
  const rect = { x: 100, y: 100, width: 400, height: 300 };
  const threshold = 40;

  it("returns null when cursor is in center", () => {
    expect(detectEdgeZone({ x: 300, y: 250 }, rect, threshold)).toBeNull();
  });

  it("detects left edge", () => {
    expect(detectEdgeZone({ x: 110, y: 250 }, rect, threshold)).toBe("left");
  });

  it("detects right edge", () => {
    expect(detectEdgeZone({ x: 490, y: 250 }, rect, threshold)).toBe("right");
  });

  it("detects top edge", () => {
    expect(detectEdgeZone({ x: 300, y: 110 }, rect, threshold)).toBe("top");
  });

  it("detects bottom edge", () => {
    expect(detectEdgeZone({ x: 300, y: 390 }, rect, threshold)).toBe("bottom");
  });

  it("returns null when cursor is outside rect", () => {
    expect(detectEdgeZone({ x: 50, y: 250 }, rect, threshold)).toBeNull();
  });

  it("left takes priority over top in corner", () => {
    expect(detectEdgeZone({ x: 110, y: 110 }, rect, threshold)).toBe("left");
  });
});

describe("splitGeometry", () => {
  const rect = { x: 100, y: 100, width: 400, height: 300 };

  it("splits left — new frame gets left half, target slides right", () => {
    const r = splitGeometry("left", rect);
    expect(r.newFrame.position).toEqual({ x: 100, y: 100 });
    expect(r.newFrame.size).toEqual({ width: 196, height: 300 });
    expect(r.target.position).toEqual({ x: 304, y: 100 });
    expect(r.target.size).toEqual({ width: 196, height: 300 });
  });

  it("splits right — target keeps left, new frame gets right half", () => {
    const r = splitGeometry("right", rect);
    expect(r.target.position).toEqual({ x: 100, y: 100 });
    expect(r.target.size).toEqual({ width: 196, height: 300 });
    expect(r.newFrame.position).toEqual({ x: 304, y: 100 });
    expect(r.newFrame.size).toEqual({ width: 196, height: 300 });
  });

  it("splits top — new frame gets top half, target slides down", () => {
    const r = splitGeometry("top", rect);
    expect(r.newFrame.position).toEqual({ x: 100, y: 100 });
    expect(r.newFrame.size).toEqual({ width: 400, height: 146 });
    expect(r.target.position).toEqual({ x: 100, y: 254 });
    expect(r.target.size).toEqual({ width: 400, height: 146 });
  });

  it("splits bottom — target keeps top, new frame gets bottom half", () => {
    const r = splitGeometry("bottom", rect);
    expect(r.target.position).toEqual({ x: 100, y: 100 });
    expect(r.target.size).toEqual({ width: 400, height: 146 });
    expect(r.newFrame.position).toEqual({ x: 100, y: 254 });
    expect(r.newFrame.size).toEqual({ width: 400, height: 146 });
  });

  it("respects custom gap", () => {
    const r = splitGeometry("left", rect, 16);
    expect(r.newFrame.size.width).toBe(192);
    expect(r.target.size.width).toBe(192);
    expect(r.target.position.x).toBe(308);
  });
});

describe("edgeToDirection", () => {
  it("left → v", () => { expect(edgeToDirection("left")).toBe("v"); });
  it("right → v", () => { expect(edgeToDirection("right")).toBe("v"); });
  it("top → h", () => { expect(edgeToDirection("top")).toBe("h"); });
  it("bottom → h", () => { expect(edgeToDirection("bottom")).toBe("h"); });
});
