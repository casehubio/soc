import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { attachDockDrag, DRAG_THRESHOLD } from "./dock-drag.js";
import type { ZoneLayoutEngine } from "./zone-layout-engine.js";
import type { DockZone } from "@casehubio/pages-component";

function createMockEngine(
  panelId: string,
  currentZone: DockZone,
  validZones: DockZone[],
  fixed = false,
): ZoneLayoutEngine {
  const zoneMap = new Map<string, DockZone>([[panelId, currentZone]]);
  return {
    config: {} as any,
    get zoneMap() { return new Map(zoneMap); },
    buildTree: vi.fn(() => ({ type: "rows" as const })),
    movePanel: vi.fn(() => ({ type: "rows" as const })),
    getConstraints: vi.fn(() => ({
      allowedZones: validZones,
      fixed,
    })),
    getValidDropZones: vi.fn(() => fixed ? [] : validZones.filter(z => z !== currentZone)),
    getZoneOrder: vi.fn(() => []),
  };
}

describe("dock drag", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    const ghost = document.querySelector("[data-drag-ghost]");
    if (ghost) ghost.remove();
    const indicator = document.querySelector("[data-drop-indicator]");
    if (indicator) indicator.remove();
  });

  it("does not start drag on click without movement", () => {
    const button = document.createElement("button");
    button.dataset.dockPanelId = "test-panel";
    container.appendChild(button);

    const engine = createMockEngine("test-panel", "left-top", ["left-top", "right-top"]);
    attachDockDrag(button, engine, container);

    button.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mouseup", { clientX: 100, clientY: 100, bubbles: true }));

    expect(document.querySelector("[data-drag-ghost]")).toBeNull();
  });

  it("starts drag after exceeding threshold", () => {
    const button = document.createElement("button");
    button.dataset.dockPanelId = "test-panel";
    container.appendChild(button);

    // Create a dock-bar with zone group as drop target
    const bar = document.createElement("div");
    bar.dataset.componentType = "dock-bar";
    bar.dataset.componentProps = JSON.stringify({ side: "right" });
    const zoneGroup = document.createElement("div");
    zoneGroup.dataset.dockZone = "top";
    bar.appendChild(zoneGroup);
    container.appendChild(bar);

    const engine = createMockEngine("test-panel", "left-top", ["left-top", "right-top"]);
    attachDockDrag(button, engine, container);

    button.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 100 + DRAG_THRESHOLD + 1, clientY: 100, bubbles: true }));

    const ghost = document.querySelector("[data-drag-ghost]");
    expect(ghost).not.toBeNull();

    document.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 100, bubbles: true }));
  });

  it("does not attach drag to fixed panels", () => {
    const button = document.createElement("button");
    button.dataset.dockPanelId = "fixed-panel";
    container.appendChild(button);

    const engine = createMockEngine("fixed-panel", "left-top", [], true);
    attachDockDrag(button, engine, container);

    button.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 100, bubbles: true }));

    expect(document.querySelector("[data-drag-ghost]")).toBeNull();
    document.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 100, bubbles: true }));
  });

  it("cleans up ghost and button opacity on cancel", () => {
    const button = document.createElement("button");
    button.dataset.dockPanelId = "test-panel";
    container.appendChild(button);

    const bar = document.createElement("div");
    bar.dataset.componentType = "dock-bar";
    bar.dataset.componentProps = JSON.stringify({ side: "right" });
    const zoneGroup = document.createElement("div");
    zoneGroup.dataset.dockZone = "top";
    bar.appendChild(zoneGroup);
    container.appendChild(bar);

    const engine = createMockEngine("test-panel", "left-top", ["left-top", "right-top"]);
    attachDockDrag(button, engine, container);

    button.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 100, bubbles: true }));
    expect(button.style.opacity).toBe("0.3");

    // Drop on empty area (no zone hit)
    document.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 100, bubbles: true }));

    expect(document.querySelector("[data-drag-ghost]")).toBeNull();
    expect(button.style.opacity).toBe("");
  });

  it("dispatches pages-dock-rearrange on valid drop", () => {
    const button = document.createElement("button");
    button.dataset.dockPanelId = "test-panel";
    container.appendChild(button);

    // Create a dock-bar with zone group as drop target
    const bar = document.createElement("div");
    bar.dataset.componentType = "dock-bar";
    bar.dataset.componentProps = JSON.stringify({ side: "right" });
    const zoneGroup = document.createElement("div");
    zoneGroup.dataset.dockZone = "top";
    Object.defineProperty(zoneGroup, "getBoundingClientRect", {
      value: () => ({ left: 300, right: 500, top: 50, bottom: 200, width: 200, height: 150 }),
    });
    bar.appendChild(zoneGroup);
    container.appendChild(bar);

    const engine = createMockEngine("test-panel", "left-top", ["left-top", "right-top"]);
    attachDockDrag(button, engine, container);

    const events: CustomEvent[] = [];
    container.addEventListener("pages-dock-rearrange", ((e: Event) => {
      events.push(e as CustomEvent);
    }));

    button.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 400, clientY: 125, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mouseup", { clientX: 400, clientY: 125, bubbles: true }));

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.panelKey).toBe("test-panel");
    expect(events[0]!.detail.fromZone).toBe("left-top");
    expect(events[0]!.detail.toZone).toBe("right-top");
  });

  it("shows horizontal insert indicator in vertical dock bar", () => {
    const button = document.createElement("button");
    button.dataset.dockPanelId = "files";
    container.appendChild(button);

    const bar = document.createElement("div");
    bar.dataset.componentType = "dock-bar";
    bar.dataset.componentProps = JSON.stringify({ side: "right" });
    bar.setAttribute("aria-orientation", "vertical");
    const zoneGroup = document.createElement("div");
    zoneGroup.dataset.dockZone = "top";
    zoneGroup.style.display = "flex";
    const existingBtn = document.createElement("button");
    existingBtn.dataset.dockPanelId = "agent";
    existingBtn.textContent = "Agent";
    Object.defineProperty(existingBtn, "getBoundingClientRect", {
      value: () => ({ left: 10, right: 40, top: 50, bottom: 80, width: 30, height: 30 }),
    });
    zoneGroup.appendChild(existingBtn);
    Object.defineProperty(zoneGroup, "getBoundingClientRect", {
      value: () => ({ left: 10, right: 40, top: 50, bottom: 200, width: 30, height: 150 }),
    });
    bar.appendChild(zoneGroup);
    container.appendChild(bar);

    const engine = createMockEngine("files", "left-top", ["left-top", "right-top"]);
    attachDockDrag(button, engine, container);

    button.dispatchEvent(new MouseEvent("mousedown", { clientX: 20, clientY: 60, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 25, clientY: 120, bubbles: true }));

    const indicator = document.querySelector("[data-drop-indicator]") as HTMLElement;
    expect(indicator).not.toBeNull();
    expect(indicator!.style.height).toBe("2px");
    expect(indicator!.style.width).toBe("100%");

    document.dispatchEvent(new MouseEvent("mouseup", { clientX: 25, clientY: 120, bubbles: true }));
  });

  it("does not dispatch event when no valid zone is hit", () => {
    const button = document.createElement("button");
    button.dataset.dockPanelId = "test-panel";
    container.appendChild(button);

    const engine = createMockEngine("test-panel", "left-top", ["left-top", "right-top"]);
    attachDockDrag(button, engine, container);

    const events: Event[] = [];
    container.addEventListener("pages-dock-rearrange", (e) => { events.push(e); });

    button.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 100, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 100, bubbles: true }));

    expect(events).toHaveLength(0);
  });
});
