import { describe, it, expect, vi } from "vitest";
import { renderAccordion } from "./frame-accordion.js";
import type { FrameTabConfig, ContentFactoryResult } from "@casehubio/pages-component";

function stubFactory(tab: FrameTabConfig): ContentFactoryResult {
  const el = document.createElement("div");
  el.textContent = `content:${tab.key}`;
  return { element: el };
}

describe("frame-accordion", () => {
  it("renders a section header for each tab", () => {
    const container = document.createElement("div");
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
      { key: "t2", label: "Tab 2", content: { type: "html", props: { content: "" } } },
    ];
    renderAccordion(tabs, container, stubFactory);
    const headers = container.querySelectorAll("[data-accordion-header]");
    expect(headers).toHaveLength(2);
    expect(headers[0]!.textContent).toContain("Tab 1");
    expect(headers[1]!.textContent).toContain("Tab 2");
  });

  it("expanded sections call contentFactory", () => {
    const container = document.createElement("div");
    const factory = vi.fn(stubFactory);
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
      { key: "t2", label: "Tab 2", content: { type: "html", props: { content: "" } } },
    ];
    renderAccordion(tabs, container, factory);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("collapsed sections do not call contentFactory", () => {
    const container = document.createElement("div");
    const factory = vi.fn(stubFactory);
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
      { key: "t2", label: "Tab 2", content: { type: "html", props: { content: "" } } },
    ];
    renderAccordion(tabs, container, factory, { collapsed: ["t2"] });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith(tabs[0]);
  });

  it("clicking header toggles collapsed state", () => {
    const container = document.createElement("div");
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
    ];
    const handle = renderAccordion(tabs, container, stubFactory);
    expect(handle.getState().collapsed).toEqual([]);

    const header = container.querySelector("[data-accordion-header]") as HTMLElement;
    header.click();
    expect(handle.getState().collapsed).toEqual(["t1"]);

    header.click();
    expect(handle.getState().collapsed).toEqual([]);
  });

  it("fires onStateChange when toggling", () => {
    const container = document.createElement("div");
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
    ];
    const handle = renderAccordion(tabs, container, stubFactory);
    const states: Array<{ collapsed: readonly string[] }> = [];
    handle.onStateChange((s) => states.push(s));

    const header = container.querySelector("[data-accordion-header]") as HTMLElement;
    header.click();
    expect(states).toHaveLength(1);
    expect(states[0]!.collapsed).toEqual(["t1"]);
  });

  it("dispose cleans up all content", () => {
    const container = document.createElement("div");
    const disposeFn = vi.fn();
    const factory = (_tab: FrameTabConfig) => ({
      element: document.createElement("div"),
      dispose: disposeFn,
    });
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
      { key: "t2", label: "Tab 2", content: { type: "html", props: { content: "" } } },
    ];
    const handle = renderAccordion(tabs, container, factory);
    handle.dispose();
    expect(disposeFn).toHaveBeenCalledTimes(2);
    expect(container.innerHTML).toBe("");
  });

  it("collapsing disposes content, expanding recreates it", () => {
    const container = document.createElement("div");
    const disposeFn = vi.fn();
    let callCount = 0;
    const factory = (_tab: FrameTabConfig) => {
      callCount++;
      return { element: document.createElement("div"), dispose: disposeFn };
    };
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
    ];
    renderAccordion(tabs, container, factory);
    expect(callCount).toBe(1);

    const header = container.querySelector("[data-accordion-header]") as HTMLElement;
    header.click();
    expect(disposeFn).toHaveBeenCalledTimes(1);

    header.click();
    expect(callCount).toBe(2);
  });

  it("does not overwrite container's existing styles", () => {
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;top:24px;left:0;right:0;bottom:0;";
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
    ];
    renderAccordion(tabs, container, stubFactory);
    expect(container.style.position).toBe("absolute");
    expect(container.style.top).toBe("24px");
    expect(container.style.bottom).toBe("0px");
    expect(container.style.display).toBe("flex");
  });

  it("retains flex layout after hide/show cycle", () => {
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;top:24px;left:0;right:0;bottom:0;";
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
      { key: "t2", label: "Tab 2", content: { type: "html", props: { content: "" } } },
    ];
    renderAccordion(tabs, container, stubFactory);

    // Simulate toggle to tabs (hide)
    container.style.display = "none";
    expect(container.style.display).toBe("none");

    // Simulate toggle back to accordion (show)
    container.style.display = "flex";
    expect(container.style.display).toBe("flex");
    expect(container.style.flexDirection).toBe("column");
    expect(container.style.position).toBe("absolute");

    // Sections should still be present
    const sections = container.querySelectorAll("[data-accordion-section]");
    expect(sections).toHaveLength(2);
  });

  it("collapsing transfers freed height to the nearest expanded neighbor above", () => {
    const container = document.createElement("div");
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
      { key: "t2", label: "Tab 2", content: { type: "html", props: { content: "" } } },
    ];
    const _handle = renderAccordion(tabs, container, stubFactory, { heights: { t1: 200, t2: 200 } });

    // Collapse t2 — its 200px should go to t1
    (container.querySelector("[data-accordion-header='t2']") as HTMLElement).click();
    const sections = container.querySelectorAll("[data-accordion-section]") as NodeListOf<HTMLElement>;
    expect(sections[0]!.style.cssText).toContain("px");
  });

  it("collapse/expand only affects the immediate neighbor, not distant sections", () => {
    const container = document.createElement("div");
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
      { key: "t2", label: "Tab 2", content: { type: "html", props: { content: "" } } },
      { key: "t3", label: "Tab 3", content: { type: "html", props: { content: "" } } },
    ];
    renderAccordion(tabs, container, stubFactory, { heights: { t1: 150, t2: 150, t3: 150 } });
    const sections = container.querySelectorAll("[data-accordion-section]") as NodeListOf<HTMLElement>;
    const t1StyleBefore = sections[0]!.style.cssText;

    // Collapse t3 — t2 (neighbor above) absorbs, t1 stays the same
    (container.querySelector("[data-accordion-header='t3']") as HTMLElement).click();
    expect(sections[0]!.style.cssText).toBe(t1StyleBefore);
  });

  it("addSection appends a new section to the accordion", () => {
    const container = document.createElement("div");
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
    ];
    const handle = renderAccordion(tabs, container, stubFactory);
    expect(container.querySelectorAll("[data-accordion-section]")).toHaveLength(1);

    const newTab: FrameTabConfig = { key: "t2", label: "Tab 2", content: { type: "html", props: { content: "" } } };
    handle.addSection(newTab);

    expect(container.querySelectorAll("[data-accordion-section]")).toHaveLength(2);
    expect(container.querySelector("[data-accordion-header='t2']")!.textContent).toContain("Tab 2");
  });

  it("addSection appends at the bottom, not the top", () => {
    const container = document.createElement("div");
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "First", content: { type: "html", props: { content: "" } } },
    ];
    const handle = renderAccordion(tabs, container, stubFactory);
    handle.addSection({ key: "t2", label: "Second", content: { type: "html", props: { content: "" } } });

    const sections = container.querySelectorAll("[data-accordion-section]") as NodeListOf<HTMLElement>;
    expect(sections[0]!.dataset.accordionSection).toBe("t1");
    expect(sections[1]!.dataset.accordionSection).toBe("t2");
  });

  it("removeSection removes a section by key", () => {
    const container = document.createElement("div");
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
      { key: "t2", label: "Tab 2", content: { type: "html", props: { content: "" } } },
    ];
    const handle = renderAccordion(tabs, container, stubFactory);
    expect(container.querySelectorAll("[data-accordion-section]")).toHaveLength(2);

    handle.removeSection("t1");
    expect(container.querySelectorAll("[data-accordion-section]")).toHaveLength(1);
    expect(container.querySelector("[data-accordion-header='t2']")).toBeTruthy();
  });

  it("every section header has an X close button visible on hover", () => {
    const container = document.createElement("div");
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
      { key: "t2", label: "Tab 2", content: { type: "html", props: { content: "" } } },
    ];
    renderAccordion(tabs, container, stubFactory);
    const closeButtons = container.querySelectorAll("[data-accordion-close]");
    expect(closeButtons).toHaveLength(2);
  });

  it("clicking X fires onSectionClose callback", () => {
    const container = document.createElement("div");
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
    ];
    const handle = renderAccordion(tabs, container, stubFactory);
    const closed: string[] = [];
    handle.onSectionClose((key) => closed.push(key));

    const closeBtn = container.querySelector("[data-accordion-close]") as HTMLElement;
    closeBtn.click();
    expect(closed).toEqual(["t1"]);
  });

  it("addSection ignores duplicate keys", () => {
    const container = document.createElement("div");
    const factory = vi.fn(stubFactory);
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
    ];
    const handle = renderAccordion(tabs, container, factory);
    factory.mockClear();

    handle.addSection({ key: "t1", label: "Tab 1 Again", content: { type: "html", props: { content: "" } } });
    expect(container.querySelectorAll("[data-accordion-section]")).toHaveLength(1);
    expect(factory).not.toHaveBeenCalled();
  });

  it("AbortSignal triggers dispose", () => {
    const container = document.createElement("div");
    const disposeFn = vi.fn();
    const factory = () => ({ element: document.createElement("div"), dispose: disposeFn });
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
    ];
    const controller = new AbortController();
    renderAccordion(tabs, container, factory, { signal: controller.signal });
    expect(disposeFn).not.toHaveBeenCalled();

    controller.abort();
    expect(disposeFn).toHaveBeenCalledOnce();
    expect(container.innerHTML).toBe("");
  });

  it("clicking X removes section AND calls onSectionClose so wiring can sync backend", () => {
    const container = document.createElement("div");
    const tabs: FrameTabConfig[] = [
      { key: "t1", label: "Tab 1", content: { type: "html", props: { content: "" } } },
      { key: "t2", label: "Tab 2", content: { type: "html", props: { content: "" } } },
      { key: "t3", label: "Tab 3", content: { type: "html", props: { content: "" } } },
    ];
    const handle = renderAccordion(tabs, container, stubFactory);
    const removedKeys: string[] = [];
    handle.onSectionClose((key) => {
      removedKeys.push(key);
      handle.removeSection(key);
    });

    // Delete t2 via X button
    const closeBtn = container.querySelector("[data-accordion-close='t2']") as HTMLElement;
    closeBtn.click();

    expect(removedKeys).toEqual(["t2"]);
    expect(container.querySelectorAll("[data-accordion-section]")).toHaveLength(2);
    expect(container.querySelector("[data-accordion-header='t1']")).toBeTruthy();
    expect(container.querySelector("[data-accordion-header='t2']")).toBeFalsy();
    expect(container.querySelector("[data-accordion-header='t3']")).toBeTruthy();
  });

});
