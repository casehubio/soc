import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createFrameDetachHandler } from "./frame-detach-handler.js";
import type { ContentFactory } from "@casehubio/pages-component";
import type { Container, FreeLayoutState, LayoutStrategy, Entry } from "./frame-sandbox/types.js";

function mockContainer(keys: string[] = ["f1"]): Container {
  const entries: Entry[] = keys.map((key) => ({
    key, label: "Tab 1",
    component: { type: "html" as const, props: { content: "<div>test</div>" } },
  }));
  const freeState: FreeLayoutState = {
    entries: Object.fromEntries(keys.map((key) => [key, {
      position: { x: 0, y: 0 },
      size: { width: 400, height: 300 },
    }])),
    zOrder: [...keys],
  };
  const organiser = {
    type: "free" as const,
    mount: vi.fn(), unmount: vi.fn(), addEntry: vi.fn(), removeEntry: vi.fn(),
    getState: vi.fn(() => freeState), restoreState: vi.fn(), refreshEntry: vi.fn(),
    detachEntry: vi.fn(() => null), dispose: vi.fn(),
    hideEntry: vi.fn(), showEntry: vi.fn(),
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

describe("createFrameDetachHandler", () => {
  let rootContainer: Container;
  let container: HTMLElement;
  let factory: ContentFactory;
  let controller: AbortController;
  let mockWin: any;

  beforeEach(() => {
    rootContainer = mockContainer();
    container = document.createElement("div");
    factory = vi.fn(() => ({ element: document.createElement("div") }));
    controller = new AbortController();
    const mockBody = document.createElement("div");
    Object.defineProperty(mockBody, "style", {
      value: { margin: "", width: "", height: "", overflow: "" },
      writable: true,
    });
    const mockHead = document.createElement("head");
    const eventTarget = new EventTarget();
    const mockDoc = {
      title: "",
      body: mockBody,
      head: mockHead,
      createElement: (tag: string) => document.createElement(tag),
      adoptNode: (el: Node) => el,
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- mock exercises the deprecated shim
      querySelectorAll: document.querySelectorAll.bind(document),
      addEventListener: eventTarget.addEventListener.bind(eventTarget),
      removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    };
    mockWin = {
      document: mockDoc,
      addEventListener: vi.fn(),
      focus: vi.fn(),
      close: vi.fn(),
      closed: false,
    };
    vi.spyOn(globalThis, "open" as any).mockReturnValue(mockWin);
  });

  afterEach(() => {
    controller.abort();
    vi.restoreAllMocks();
  });

  it("hides entry and opens child window on detach", () => {
    const handler = createFrameDetachHandler(rootContainer, container, factory, controller.signal);
    handler.detach("f1");
    expect(rootContainer.organiser.hideEntry).toHaveBeenCalledWith("f1");
    expect(globalThis.open).toHaveBeenCalled();
  });

  it("renders content via factory in child window", () => {
    const handler = createFrameDetachHandler(rootContainer, container, factory, controller.signal);
    handler.detach("f1");
    expect(factory).toHaveBeenCalled();
  });

  it("dispatches pages-frame-detach event", () => {
    const listener = vi.fn();
    container.addEventListener("pages-frame-detach", listener);
    const handler = createFrameDetachHandler(rootContainer, container, factory, controller.signal);
    handler.detach("f1");
    expect(listener).toHaveBeenCalled();
    expect((listener.mock.calls[0]![0] as CustomEvent).detail.frameKey).toBe("f1");
  });

  it("shows entry on reattach", () => {
    const handler = createFrameDetachHandler(rootContainer, container, factory, controller.signal);
    handler.detach("f1");
    handler.reattach("f1");
    expect(rootContainer.organiser.showEntry).toHaveBeenCalledWith("f1");
  });

  it("closes child window on reattach", () => {
    const handler = createFrameDetachHandler(rootContainer, container, factory, controller.signal);
    handler.detach("f1");
    handler.reattach("f1");
    expect(mockWin.close).toHaveBeenCalled();
  });

  it("dispatches pages-frame-reattach event", () => {
    const listener = vi.fn();
    container.addEventListener("pages-frame-reattach", listener);
    const handler = createFrameDetachHandler(rootContainer, container, factory, controller.signal);
    handler.detach("f1");
    handler.reattach("f1");
    expect(listener).toHaveBeenCalled();
  });

  it("is no-op for unknown frame key", () => {
    const handler = createFrameDetachHandler(rootContainer, container, factory, controller.signal);
    handler.detach("unknown");
    expect(rootContainer.organiser.hideEntry).not.toHaveBeenCalled();
  });

  it("reattach is no-op if not detached", () => {
    const handler = createFrameDetachHandler(rootContainer, container, factory, controller.signal);
    handler.reattach("f1");
    expect(rootContainer.organiser.showEntry).not.toHaveBeenCalled();
  });

  it("handles popup blocked gracefully", () => {
    (globalThis.open as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const handler = createFrameDetachHandler(rootContainer, container, factory, controller.signal);
    handler.detach("f1");
    expect(rootContainer.organiser.hideEntry).toHaveBeenCalled();
    expect(rootContainer.organiser.showEntry).toHaveBeenCalledWith("f1");
  });

  it("dispose reattaches all detached frames", () => {
    const handler = createFrameDetachHandler(rootContainer, container, factory, controller.signal);
    handler.detach("f1");
    handler.dispose();
    expect(rootContainer.organiser.showEntry).toHaveBeenCalledWith("f1");
  });
});
