import { describe, it, expect, beforeEach, vi } from "vitest";
import { createOrganiserToolbar } from "./organiser-toolbar.js";
import type { FloatingFrameEngine } from "./floating-frame-engine.js";
import type { FrameLayout } from "@casehubio/pages-component";

function makeMockFrames(...keys: string[]): ReadonlyMap<string, FrameLayout> {
  const map = new Map<string, FrameLayout>();
  keys.forEach((key, i) => {
    map.set(key, {
      key, order: i, position: { x: 0, y: 0 }, size: { width: 400, height: 300 },
      zIndex: 1, pinned: false, hidden: false, tabs: [], activeTabKey: "",
    });
  });
  return map;
}

function mockEngine(frameKeys: string[] = []): FloatingFrameEngine {
  return {
    frames: makeMockFrames(...frameKeys),
    applyOrganiser: vi.fn(),
    focusDirection: vi.fn(), removeFrame: vi.fn(), togglePin: vi.fn(),
    bringToFront: vi.fn(), createFrame: vi.fn(), hideFrame: vi.fn(), showFrame: vi.fn(),
    addTab: vi.fn(), removeTab: vi.fn(), moveTab: vi.fn(), setActiveTab: vi.fn(),
    updatePosition: vi.fn(), updateSize: vi.fn(),
    setDetached: vi.fn(), snapFrame: vi.fn(), unsnapFrame: vi.fn(), recomputeSnappedFrames: vi.fn(),
    captureLayout: vi.fn(() => []), restoreLayout: vi.fn(), dispose: vi.fn(),
  } as unknown as FloatingFrameEngine;
}

describe("createOrganiserToolbar", () => {
  let engine: FloatingFrameEngine;
  let overlay: HTMLElement;
  let parent: HTMLElement;
  let controller: AbortController;
  let toolbar: HTMLElement;

  beforeEach(() => {
    engine = mockEngine();
    overlay = document.createElement("div");
    Object.defineProperty(overlay, "clientWidth", { value: 1000, configurable: true });
    Object.defineProperty(overlay, "clientHeight", { value: 800, configurable: true });
    parent = document.createElement("div");
    controller = new AbortController();
    toolbar = createOrganiserToolbar(engine, overlay, parent, controller.signal);
  });

  it("creates toolbar with 5 preset buttons", () => {
    expect(toolbar.querySelectorAll("button").length).toBe(5);
  });

  it("starts hidden", () => {
    expect(toolbar.style.display).toBe("none");
  });

  it("has data attribute for identification", () => {
    expect(toolbar.dataset.floatingWorkspaceToolbar).toBeDefined();
  });

  it("calls applyOrganiser on button click", () => {
    const gridBtn = toolbar.querySelector("[data-preset='grid']") as HTMLButtonElement;
    gridBtn.click();
    expect(engine.applyOrganiser).toHaveBeenCalledWith("grid", { width: 1000, height: 800 });
  });

  it("dispatches pages-frame-organise event on button click", () => {
    const listener = vi.fn();
    parent.addEventListener("pages-frame-organise", listener);
    const gridBtn = toolbar.querySelector("[data-preset='grid']") as HTMLButtonElement;
    gridBtn.click();
    expect(listener).toHaveBeenCalled();
    const detail = (listener.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.preset).toBe("grid");
  });

  it("shows toolbar when >1 visible frame after frame-create", () => {
    (engine as any).frames = makeMockFrames("f1", "f2");
    parent.dispatchEvent(new CustomEvent("pages-frame-create", { bubbles: true }));
    expect(toolbar.style.display).toBe("flex");
  });

  it("hides toolbar when <=1 frame after frame-close", () => {
    (engine as any).frames = makeMockFrames("f1");
    parent.dispatchEvent(new CustomEvent("pages-frame-close", { bubbles: true }));
    expect(toolbar.style.display).toBe("none");
  });

  it("each preset button has correct data-preset attribute", () => {
    const presets = [...toolbar.querySelectorAll("button")].map(b => b.dataset.preset);
    expect(presets).toEqual(["side-by-side", "stacked", "grid", "main-sidebar", "focus"]);
  });
});
