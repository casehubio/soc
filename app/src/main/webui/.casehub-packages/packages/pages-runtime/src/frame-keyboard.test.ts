import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createFrameKeyboardHandler } from "./frame-keyboard.js";
import type { Container, FreeLayoutState, LayoutStrategy, Entry } from "./frame-sandbox/types.js";

function mockContainer(keys: string[] = ["f1", "f2"]): Container {
  const entries: Entry[] = keys.map((key) => ({ key, label: key }));
  const freeState: FreeLayoutState = {
    entries: Object.fromEntries(keys.map((key, i) => [key, {
      position: { x: i * 200, y: 0 },
      size: { width: 100, height: 100 },
    }])),
    zOrder: [...keys],
  };
  const organiser = {
    type: "free" as const,
    mount: vi.fn(), unmount: vi.fn(), addEntry: vi.fn(), removeEntry: vi.fn(),
    getState: vi.fn(() => freeState), restoreState: vi.fn(), refreshEntry: vi.fn(),
    detachEntry: vi.fn(() => null), dispose: vi.fn(),
    bringToFront: vi.fn(), togglePin: vi.fn(),
  } as unknown as LayoutStrategy;
  return {
    entries, organiser,
    policy: { allowedLayouts: ["free"], maxDepth: 5 }, depth: 1,
    addEntry: vi.fn(), removeEntry: vi.fn(), replaceChild: vi.fn(),
    refreshEntry: vi.fn(), detachEntry: vi.fn(() => null),
    setLayout: vi.fn(), mount: vi.fn(), unmount: vi.fn(), dispose: vi.fn(),
  };
}

describe("createFrameKeyboardHandler", () => {
  let rootContainer: Container;
  let container: HTMLElement;
  let controller: AbortController;

  beforeEach(() => {
    rootContainer = mockContainer();
    container = document.createElement("div");
    controller = new AbortController();
    createFrameKeyboardHandler(rootContainer, container, controller.signal);
  });

  afterEach(() => { controller.abort(); });

  it("Alt+ArrowRight triggers spatial navigation and bringToFront", () => {
    container.dispatchEvent(new CustomEvent("pages-frame-focus", { detail: { frameKey: "f1" } }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true }));
    expect(rootContainer.organiser.getState).toHaveBeenCalled();
    expect(rootContainer.organiser.bringToFront).toHaveBeenCalledWith("f2");
  });

  it("Alt+ArrowLeft navigates left", () => {
    container.dispatchEvent(new CustomEvent("pages-frame-focus", { detail: { frameKey: "f2" } }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", altKey: true }));
    expect(rootContainer.organiser.bringToFront).toHaveBeenCalledWith("f1");
  });

  it("no-op when no target in direction", () => {
    container.dispatchEvent(new CustomEvent("pages-frame-focus", { detail: { frameKey: "f2" } }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true }));
    expect(rootContainer.organiser.bringToFront).not.toHaveBeenCalled();
  });

  it("Alt+W closes focused frame", () => {
    container.dispatchEvent(new CustomEvent("pages-frame-focus", { detail: { frameKey: "f1" } }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "w", altKey: true }));
    expect(rootContainer.removeEntry).toHaveBeenCalledWith("f1");
  });

  it("Alt+W is no-op when no frame is focused", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "w", altKey: true }));
    expect(rootContainer.removeEntry).not.toHaveBeenCalled();
  });

  it("Alt+P toggles pin on focused frame", () => {
    container.dispatchEvent(new CustomEvent("pages-frame-focus", { detail: { frameKey: "f1" } }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "p", altKey: true }));
    expect(rootContainer.organiser.togglePin).toHaveBeenCalledWith("f1");
  });

  it("Alt+1 focuses first entry", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1", altKey: true }));
    expect(rootContainer.organiser.bringToFront).toHaveBeenCalledWith("f1");
  });

  it("Alt+2 focuses second entry", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "2", altKey: true }));
    expect(rootContainer.organiser.bringToFront).toHaveBeenCalledWith("f2");
  });

  it("Alt+] cycles forward", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1", altKey: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "]", altKey: true }));
    expect(rootContainer.organiser.bringToFront).toHaveBeenCalledWith("f2");
  });

  it("Alt+[ cycles backward with wrap", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1", altKey: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "[", altKey: true }));
    expect(rootContainer.organiser.bringToFront).toHaveBeenCalledWith("f2");
  });

  it("cleans up on abort", () => {
    controller.abort();
    container.dispatchEvent(new CustomEvent("pages-frame-focus", { detail: { frameKey: "f1" } }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true }));
    expect(rootContainer.organiser.bringToFront).not.toHaveBeenCalled();
  });

  it("ignores non-alt shortcuts", () => {
    container.dispatchEvent(new CustomEvent("pages-frame-focus", { detail: { frameKey: "f1" } }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(rootContainer.organiser.getState).not.toHaveBeenCalled();
  });

  it("ignores shortcuts when in text input", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    container.dispatchEvent(new CustomEvent("pages-frame-focus", { detail: { frameKey: "f1" } }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true }));
    expect(rootContainer.organiser.getState).not.toHaveBeenCalled();
    input.remove();
  });
});
