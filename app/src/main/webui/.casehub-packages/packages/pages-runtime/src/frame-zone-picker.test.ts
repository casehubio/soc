import { describe, it, expect, vi } from "vitest";
import { createZoneGrid, ZONES } from "./frame-zone-picker.js";

describe("createZoneGrid", () => {
  it("creates a 3x3 grid of zone buttons", () => {
    const grid = createZoneGrid(vi.fn());
    const buttons = grid.querySelectorAll("button");
    expect(buttons.length).toBe(9);
  });

  it("calls onSnap with the selected zone", () => {
    const onSnap = vi.fn();
    const grid = createZoneGrid(onSnap);
    const leftBtn = grid.querySelector("button[title='left']") as HTMLButtonElement;
    leftBtn.click();
    expect(onSnap).toHaveBeenCalledWith("left");
  });

  it("ZONES has 9 entries covering the grid", () => {
    expect(ZONES).toHaveLength(9);
    const zones = ZONES.map(z => z.zone);
    expect(zones).toContain("full");
    expect(zones).toContain("left");
    expect(zones).toContain("right");
    expect(zones).toContain("top");
    expect(zones).toContain("bottom");
  });

  it("highlights active zone", () => {
    const grid = createZoneGrid(vi.fn(), "full");
    const fullBtn = grid.querySelector("button[title='full']") as HTMLButtonElement;
    expect(fullBtn.style.background).toContain("accent");
  });
});
