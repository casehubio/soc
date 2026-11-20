import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFreeLayoutDnd } from "./free-layout-dnd.js";
import type { Container, Entry, FreeLayoutEntry } from "./types.js";

function mockContainer(entryKeys: string[]): Container {
  const entries: Entry[] = entryKeys.map(k => ({ key: k, label: k.toUpperCase() }));
  return {
    get entries() { return entries; },
    organiser: { type: "tabbed" } as never,
    policy: { allowedLayouts: ["tabbed"], maxDepth: 5 },
    depth: 2,
    addEntry: vi.fn((entry: Entry) => { entries.push(entry); }),
    removeEntry: vi.fn(),
    replaceChild: vi.fn(),
    refreshEntry: vi.fn(),
    detachEntry: vi.fn((key: string) => {
      const idx = entries.findIndex(e => e.key === key);
      if (idx === -1) return null;
      return entries.splice(idx, 1)[0]!;
    }),
    setLayout: vi.fn(),
    mount: vi.fn(),
    unmount: vi.fn(),
    dispose: vi.fn(),
  };
}

function fireTabDragStart(
  target: HTMLElement,
  tabKey: string,
  sourceContainer: Container,
): void {
  target.dispatchEvent(new CustomEvent("pages-tab-drag-start", {
    bubbles: true,
    detail: {
      tabKey,
      ghost: document.createElement("div"),
      sourceContainer,
    },
  }));
}

describe("free-layout-dnd", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    vi.spyOn(host, "getBoundingClientRect").mockReturnValue({
      left: 0, right: 800, top: 0, bottom: 600,
      width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}),
    });
  });

  afterEach(() => {
    document.body.removeChild(host);
  });

  it("calls onDrop with target frame key on drop over a frame", () => {
    const entryState = new Map<string, FreeLayoutEntry>([
      ["frame-a", { position: { x: 0, y: 0 }, size: { width: 300, height: 200 } }],
      ["frame-b", { position: { x: 400, y: 0 }, size: { width: 300, height: 200 } }],
    ]);
    const frameElements = new Map([
      ["frame-a", document.createElement("div")],
      ["frame-b", document.createElement("div")],
    ]);
    const sourceContainer = mockContainer(["tab1"]);
    const onDrop = vi.fn();

    const dnd = createFreeLayoutDnd(host, entryState, frameElements, { onDrop });

    fireTabDragStart(host, "tab1", sourceContainer);
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: 500, clientY: 100 }));
    document.dispatchEvent(new PointerEvent("pointerup", { clientX: 500, clientY: 100 }));

    expect(onDrop).toHaveBeenCalledWith(sourceContainer, "tab1", "frame-b", 500, 100);
    dnd.dispose();
  });

  it("calls onDrop with null when dropped in empty space", () => {
    const entryState = new Map<string, FreeLayoutEntry>([
      ["frame-a", { position: { x: 0, y: 0 }, size: { width: 200, height: 200 } }],
    ]);
    const frameElements = new Map([["frame-a", document.createElement("div")]]);
    const sourceContainer = mockContainer(["tab1"]);
    const onDrop = vi.fn();

    const dnd = createFreeLayoutDnd(host, entryState, frameElements, { onDrop });

    fireTabDragStart(host, "tab1", sourceContainer);
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: 600, clientY: 400 }));
    document.dispatchEvent(new PointerEvent("pointerup", { clientX: 600, clientY: 400 }));

    expect(onDrop).toHaveBeenCalledWith(sourceContainer, "tab1", null, 600, 400);
    dnd.dispose();
  });

  it("stops propagation to prevent parent handlers", () => {
    const onDrop = vi.fn();
    const dnd = createFreeLayoutDnd(host, new Map(), new Map(), { onDrop });

    const parentSpy = vi.fn();
    document.body.addEventListener("pages-tab-drag-start", parentSpy);

    fireTabDragStart(host, "tab1", mockContainer([]));

    expect(parentSpy).not.toHaveBeenCalled();

    document.dispatchEvent(new PointerEvent("pointerup"));
    document.body.removeEventListener("pages-tab-drag-start", parentSpy);
    dnd.dispose();
  });

  it("shows drop highlight on target frame", () => {
    const entryState = new Map<string, FreeLayoutEntry>([
      ["frame-a", { position: { x: 0, y: 0 }, size: { width: 300, height: 200 } }],
    ]);
    const frameA = document.createElement("div");
    host.appendChild(frameA);
    const frameElements = new Map([["frame-a", frameA]]);
    const onDrop = vi.fn();

    const dnd = createFreeLayoutDnd(host, entryState, frameElements, { onDrop });

    fireTabDragStart(host, "tab1", mockContainer([]));
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: 100, clientY: 100 }));

    expect(frameA.querySelector("[data-drop-highlight]")).not.toBeNull();

    document.dispatchEvent(new PointerEvent("pointerup", { clientX: 100, clientY: 100 }));
    dnd.dispose();
  });

  it("removes highlight when pointer leaves target", () => {
    const entryState = new Map<string, FreeLayoutEntry>([
      ["frame-a", { position: { x: 0, y: 0 }, size: { width: 300, height: 200 } }],
    ]);
    const frameA = document.createElement("div");
    host.appendChild(frameA);
    const frameElements = new Map([["frame-a", frameA]]);
    const onDrop = vi.fn();

    const dnd = createFreeLayoutDnd(host, entryState, frameElements, { onDrop });

    fireTabDragStart(host, "tab1", mockContainer([]));
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: 100, clientY: 100 }));
    expect(frameA.querySelector("[data-drop-highlight]")).not.toBeNull();

    document.dispatchEvent(new PointerEvent("pointermove", { clientX: 600, clientY: 400 }));
    expect(frameA.querySelector("[data-drop-highlight]")).toBeNull();

    document.dispatchEvent(new PointerEvent("pointerup", { clientX: 600, clientY: 400 }));
    dnd.dispose();
  });

  it("cleans up highlight on drop", () => {
    const entryState = new Map<string, FreeLayoutEntry>([
      ["frame-a", { position: { x: 0, y: 0 }, size: { width: 300, height: 200 } }],
    ]);
    const frameA = document.createElement("div");
    host.appendChild(frameA);
    const frameElements = new Map([["frame-a", frameA]]);
    const onDrop = vi.fn();

    const dnd = createFreeLayoutDnd(host, entryState, frameElements, { onDrop });

    fireTabDragStart(host, "tab1", mockContainer([]));
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: 100, clientY: 100 }));
    document.dispatchEvent(new PointerEvent("pointerup", { clientX: 100, clientY: 100 }));

    expect(frameA.querySelector("[data-drop-highlight]")).toBeNull();
    dnd.dispose();
  });

  it("shows split preview when pointer is at frame edge", () => {
    const entryState = new Map<string, FreeLayoutEntry>([
      ["frame-a", { position: { x: 0, y: 0 }, size: { width: 300, height: 200 } }],
    ]);
    const frameA = document.createElement("div");
    host.appendChild(frameA);
    const frameElements = new Map([["frame-a", frameA]]);
    const onDrop = vi.fn();

    const dnd = createFreeLayoutDnd(host, entryState, frameElements, { onDrop });

    fireTabDragStart(host, "tab1", mockContainer([]));
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 100 }));

    const preview = frameA.querySelector("[data-split-preview]");
    expect(preview).not.toBeNull();
    expect(preview!.getAttribute("data-split-preview")).toBe("left");

    document.dispatchEvent(new PointerEvent("pointerup", { clientX: 10, clientY: 100 }));
    dnd.dispose();
  });

  it("calls onEdgeSplit instead of onDrop when dropping on frame edge", () => {
    const entryState = new Map<string, FreeLayoutEntry>([
      ["frame-a", { position: { x: 0, y: 0 }, size: { width: 300, height: 200 } }],
    ]);
    const frameElements = new Map([["frame-a", document.createElement("div")]]);
    const sourceContainer = mockContainer(["tab1"]);
    const onDrop = vi.fn();
    const onEdgeSplit = vi.fn();

    const dnd = createFreeLayoutDnd(host, entryState, frameElements, { onDrop, onEdgeSplit });

    fireTabDragStart(host, "tab1", sourceContainer);
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 100 }));
    document.dispatchEvent(new PointerEvent("pointerup", { clientX: 10, clientY: 100 }));

    expect(onEdgeSplit).toHaveBeenCalledWith(sourceContainer, "tab1", "frame-a", "left");
    expect(onDrop).not.toHaveBeenCalled();

    dnd.dispose();
  });

  it("fires pages-tab-escaped when pointer exits host bounds", () => {
    const sourceContainer = mockContainer(["tab1"]);
    const onDrop = vi.fn();

    const dnd = createFreeLayoutDnd(host, new Map(), new Map(), { onDrop });

    let escaped: CustomEvent | null = null;
    host.addEventListener("pages-tab-escaped", (e) => { escaped = e as CustomEvent; });

    fireTabDragStart(host, "tab1", sourceContainer);
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: -10, clientY: 300 }));

    expect(escaped).not.toBeNull();
    expect(escaped!.detail.tabKey).toBe("tab1");
    expect(escaped!.detail.sourceContainer).toBe(sourceContainer);

    document.dispatchEvent(new PointerEvent("pointerup", { clientX: -10, clientY: 300 }));
    expect(onDrop).not.toHaveBeenCalled();

    dnd.dispose();
  });

  it("does not respond after dispose", () => {
    const onDrop = vi.fn();
    const dnd = createFreeLayoutDnd(host, new Map(), new Map(), { onDrop });
    dnd.dispose();

    fireTabDragStart(host, "tab1", mockContainer([]));
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: 100, clientY: 100 }));
    document.dispatchEvent(new PointerEvent("pointerup", { clientX: 100, clientY: 100 }));

    expect(onDrop).not.toHaveBeenCalled();
  });
});
