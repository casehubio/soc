import { describe, it, expect } from "vitest";
import { computeZonePreset, scaleProportionally } from "./layout-math.js";

describe("layout-math", () => {
  describe("computeZonePreset", () => {
    it("grid preset tiles entries evenly", () => {
      const result = computeZonePreset("grid", 4, { width: 800, height: 600 });
      expect(result).toHaveLength(4);
      expect(result[0]!.x).toBe(0);
      expect(result[0]!.y).toBe(0);
      expect(result[1]!.x).toBeGreaterThan(0);
      expect(result[2]!.y).toBeGreaterThan(0);
    });

    it("side-by-side splits horizontally", () => {
      const result = computeZonePreset("side-by-side", 2, { width: 800, height: 600 });
      expect(result).toHaveLength(2);
      expect(result[0]!.x).toBe(0);
      expect(result[1]!.x).toBeGreaterThan(0);
      expect(result[0]!.height).toBe(600);
      expect(result[1]!.height).toBe(600);
    });

    it("stacked splits vertically", () => {
      const result = computeZonePreset("stacked", 2, { width: 800, height: 600 });
      expect(result).toHaveLength(2);
      expect(result[0]!.y).toBe(0);
      expect(result[1]!.y).toBeGreaterThan(0);
      expect(result[0]!.width).toBe(800);
    });

    it("focus gives first entry most of the space", () => {
      const result = computeZonePreset("focus", 3, { width: 800, height: 600 });
      expect(result[0]!.width).toBeGreaterThan(600);
      expect(result[1]!.width).toBeLessThan(250);
    });

    it("main-sidebar gives first entry 65% width", () => {
      const result = computeZonePreset("main-sidebar", 2, { width: 800, height: 600 });
      expect(result[0]!.width).toBeGreaterThan(result[1]!.width);
      expect(result[0]!.width).toBeCloseTo(800 * 0.65, -1);
    });

    it("returns empty for zero entries", () => {
      const result = computeZonePreset("grid", 0, { width: 800, height: 600 });
      expect(result).toHaveLength(0);
    });

    it("single entry fills the canvas for all presets", () => {
      for (const preset of ["grid", "side-by-side", "stacked", "main-sidebar", "focus"] as const) {
        const result = computeZonePreset(preset, 1, { width: 800, height: 600 });
        expect(result).toHaveLength(1);
        expect(result[0]!.width).toBeGreaterThanOrEqual(600);
      }
    });
  });

  describe("scaleProportionally", () => {
    it("scales positions and sizes to new canvas", () => {
      const entries = [{ x: 100, y: 50, width: 200, height: 150 }];
      const result = scaleProportionally(entries, { width: 800, height: 600 }, { width: 400, height: 300 });
      expect(result[0]!.x).toBe(50);
      expect(result[0]!.y).toBe(25);
      expect(result[0]!.width).toBe(100);
      expect(result[0]!.height).toBe(75);
    });

    it("handles identity scale", () => {
      const entries = [{ x: 100, y: 50, width: 200, height: 150 }];
      const result = scaleProportionally(entries, { width: 800, height: 600 }, { width: 800, height: 600 });
      expect(result[0]).toEqual(entries[0]);
    });

    it("handles zero-size canvas gracefully", () => {
      const entries = [{ x: 100, y: 50, width: 200, height: 150 }];
      const result = scaleProportionally(entries, { width: 0, height: 0 }, { width: 400, height: 300 });
      expect(result).toHaveLength(1);
    });
  });
});
