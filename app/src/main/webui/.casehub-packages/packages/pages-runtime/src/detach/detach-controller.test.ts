import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DetachController } from "./detach-controller.js";

function makeContainer(id: string): HTMLElement {
  const el = document.createElement("div");
  el.dataset.componentId = id;
  const title = document.createElement("div");
  title.dataset.panelTitle = "";
  title.textContent = "Panel";
  el.appendChild(title);
  return el;
}

function makeFakeWindow() {
  // Use the SAME document to avoid happy-dom's "Cannot redefine ownerDocument"
  // on re-adoption. In a real browser, adoptNode works across documents;
  // happy-dom can't handle the round-trip. Using the same document means
  // adoptNode is a no-op (element already belongs to this document),
  // which lets us test the controller's state management and placeholder logic.
  return {
    document,
    close: vi.fn(),
    focus: vi.fn(),
    closed: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe("DetachController", () => {
  let parent: HTMLElement;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.appendChild(parent);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    parent.remove();
  });

  it("inserts placeholder before container on detach", () => {
    const container = makeContainer("p1");
    parent.appendChild(container);

    const ctrl = new DetachController("p1", container, "Panel");
    vi.spyOn(globalThis, "open").mockReturnValue(makeFakeWindow() as unknown as Window);

    ctrl.detach();

    const placeholder = parent.querySelector("[data-detach-placeholder]");
    expect(placeholder).not.toBeNull();
    expect(placeholder!.getAttribute("data-detach-placeholder")).toBe("p1");
    expect(ctrl.isDetached).toBe(true);
  });

  it("removes data-detaching attribute after adoption", () => {
    const container = makeContainer("p1");
    parent.appendChild(container);

    const ctrl = new DetachController("p1", container, "Panel");
    vi.spyOn(globalThis, "open").mockReturnValue(makeFakeWindow() as unknown as Window);

    ctrl.detach();

    expect(container.hasAttribute("data-detaching")).toBe(false);
  });

  it("aborts when popup is blocked", () => {
    const container = makeContainer("p1");
    parent.appendChild(container);

    const ctrl = new DetachController("p1", container, "Panel");
    vi.spyOn(globalThis, "open").mockReturnValue(null);

    ctrl.detach();

    expect(ctrl.isDetached).toBe(false);
    expect(parent.querySelector("[data-detach-placeholder]")).toBeNull();
    expect(parent.contains(container)).toBe(true);
  });

  it("reattach restores container to original position", () => {
    const container = makeContainer("p1");
    const sibling = document.createElement("div");
    sibling.textContent = "sibling";
    parent.appendChild(container);
    parent.appendChild(sibling);

    const ctrl = new DetachController("p1", container, "Panel");
    vi.spyOn(globalThis, "open").mockReturnValue(makeFakeWindow() as unknown as Window);

    ctrl.detach();
    expect(parent.contains(container)).toBe(false);
    expect(parent.querySelector("[data-detach-placeholder]")).not.toBeNull();

    ctrl.reattach();
    expect(parent.contains(container)).toBe(true);
    expect(parent.querySelector("[data-detach-placeholder]")).toBeNull();
    expect(ctrl.isDetached).toBe(false);
  });

  it("reattach is idempotent", () => {
    const container = makeContainer("p1");
    parent.appendChild(container);

    const ctrl = new DetachController("p1", container, "Panel");
    vi.spyOn(globalThis, "open").mockReturnValue(makeFakeWindow() as unknown as Window);

    ctrl.detach();
    ctrl.reattach();
    ctrl.reattach();

    expect(parent.children.length).toBe(1);
    expect(parent.contains(container)).toBe(true);
  });

  it("double detach focuses existing window", () => {
    const container = makeContainer("p1");
    parent.appendChild(container);

    const ctrl = new DetachController("p1", container, "Panel");
    const fakeWindow = makeFakeWindow();
    vi.spyOn(globalThis, "open").mockReturnValue(fakeWindow as unknown as Window);

    ctrl.detach();
    ctrl.detach();

    expect(globalThis.open).toHaveBeenCalledTimes(1);
    expect(fakeWindow.focus).toHaveBeenCalledTimes(2);
  });

  it("dispose reattaches before closing window", () => {
    const container = makeContainer("p1");
    parent.appendChild(container);

    const ctrl = new DetachController("p1", container, "Panel");
    const fakeWindow = makeFakeWindow();
    vi.spyOn(globalThis, "open").mockReturnValue(fakeWindow as unknown as Window);

    ctrl.detach();
    expect(parent.contains(container)).toBe(false);

    ctrl.dispose();
    expect(parent.contains(container)).toBe(true);
    expect(ctrl.isDetached).toBe(false);
  });
});
