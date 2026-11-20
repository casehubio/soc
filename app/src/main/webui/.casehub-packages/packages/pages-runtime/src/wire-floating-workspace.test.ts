import { describe, it, expect, beforeEach } from "vitest";
import { wireFloatingWorkspace } from "./wire-floating-workspace.js";
import type { ContainerState, FrameLayout, FrameTabConfig } from "@casehubio/pages-component";

function makeTab(key: string): FrameTabConfig {
  return { key, label: key, content: { type: "html", props: { content: `<div>${key}</div>` } } };
}

function makeContainerState(): ContainerState {
  return {
    layout: "free",
    tabs: [
      {
        key: "f1", label: "Frame 1", content: null,
        children: { layout: "tabbed", tabs: [makeTab("t1"), makeTab("t2")] },
      },
      {
        key: "f2", label: "Frame 2", content: null,
        children: { layout: "tabbed", tabs: [makeTab("t3")] },
      },
    ],
    layoutState: {
      entries: {
        f1: { position: { x: 10, y: 20 }, size: { width: 400, height: 300 } },
        f2: { position: { x: 450, y: 20 }, size: { width: 300, height: 250 } },
      },
      zOrder: ["f1", "f2"],
    },
  };
}

describe("wireFloatingWorkspace", () => {
  let hostElement: HTMLElement;

  beforeEach(() => {
    hostElement = document.createElement("div");
  });

  it("creates a root Container and mounts it", () => {
    const handle = wireFloatingWorkspace(hostElement);
    expect(handle.rootContainer).toBeDefined();
    expect(handle.rootContainer.entries).toHaveLength(0);
    expect(handle.rootContainer.organiser.type).toBe("free");
    handle.dispose();
  });

  it("restores from ContainerState", () => {
    const state = makeContainerState();
    const handle = wireFloatingWorkspace(hostElement, state);
    expect(handle.rootContainer.entries).toHaveLength(2);
    expect(handle.rootContainer.entries[0]!.key).toBe("f1");
    expect(handle.rootContainer.entries[1]!.key).toBe("f2");
    handle.dispose();
  });

  it("restores child containers with correct layout", () => {
    const state = makeContainerState();
    const handle = wireFloatingWorkspace(hostElement, state);
    const firstEntry = handle.rootContainer.entries[0]!;
    expect(firstEntry.childContainer).toBeDefined();
    expect(firstEntry.childContainer!.organiser.type).toBe("tabbed");
    expect(firstEntry.childContainer!.entries).toHaveLength(2);
    handle.dispose();
  });

  it("migrates FrameLayout[] to ContainerState", () => {
    const frames: readonly FrameLayout[] = [{
      key: "f1", order: 0, position: { x: 10, y: 20 }, size: { width: 400, height: 300 },
      zIndex: 1, pinned: false, hidden: false, tabs: [makeTab("t1")], activeTabKey: "t1",
    }];
    const handle = wireFloatingWorkspace(hostElement, frames);
    expect(handle.rootContainer.entries).toHaveLength(1);
    expect(handle.rootContainer.entries[0]!.key).toBe("f1");
    handle.dispose();
  });

  it("captureState returns ContainerState", () => {
    const state = makeContainerState();
    const handle = wireFloatingWorkspace(hostElement, state);
    const captured = handle.captureState();
    expect(captured.layout).toBe("free");
    expect(captured.tabs).toHaveLength(2);
    expect(captured.tabs[0]!.key).toBe("f1");
    handle.dispose();
  });

  it("creates container toolbar", () => {
    const handle = wireFloatingWorkspace(hostElement);
    expect(handle.containerToolbar).toBeDefined();
    expect(handle.containerToolbar!.element).toBeDefined();
    handle.dispose();
  });

  it("reuses existing container on mount", () => {
    const state = makeContainerState();
    const handle1 = wireFloatingWorkspace(hostElement, state);
    const rootContainer = handle1.rootContainer;
    handle1.rootContainer.unmount();

    const host2 = document.createElement("div");
    const handle2 = wireFloatingWorkspace(host2, undefined, { existingContainer: rootContainer });
    expect(handle2.rootContainer).toBe(rootContainer);
    handle2.dispose();
  });

  it("dispose cleans up container and toolbar", () => {
    const handle = wireFloatingWorkspace(hostElement, makeContainerState());
    handle.dispose();
    expect(hostElement.children.length).toBe(0);
  });

  describe("mode switch — setLayout round-trip", () => {
    it("setLayout('tabbed') preserves all entries", () => {
      const state = makeContainerState();
      const handle = wireFloatingWorkspace(hostElement, state);
      expect(handle.rootContainer.organiser.type).toBe("free");
      expect(handle.rootContainer.entries).toHaveLength(2);

      handle.rootContainer.setLayout("tabbed");
      expect(handle.rootContainer.organiser.type).toBe("tabbed");
      expect(handle.rootContainer.entries).toHaveLength(2);
      expect(handle.rootContainer.entries[0]!.key).toBe("f1");
      expect(handle.rootContainer.entries[1]!.key).toBe("f2");

      handle.dispose();
    });

    it("setLayout('tabbed') preserves child containers", () => {
      const state = makeContainerState();
      const handle = wireFloatingWorkspace(hostElement, state);

      const childBefore = handle.rootContainer.entries[0]!.childContainer;
      expect(childBefore).toBeDefined();
      expect(childBefore!.entries).toHaveLength(2);

      handle.rootContainer.setLayout("tabbed");

      const childAfter = handle.rootContainer.entries[0]!.childContainer;
      expect(childAfter).toBeDefined();
      expect(childAfter!.entries).toHaveLength(2);
      expect(childAfter!.entries[0]!.key).toBe("t1");

      handle.dispose();
    });

    it("free → tabbed → free round-trip preserves entries and child containers", () => {
      const state = makeContainerState();
      const handle = wireFloatingWorkspace(hostElement, state);

      handle.rootContainer.setLayout("tabbed");
      handle.rootContainer.setLayout("free");

      expect(handle.rootContainer.organiser.type).toBe("free");
      expect(handle.rootContainer.entries).toHaveLength(2);
      expect(handle.rootContainer.entries[0]!.key).toBe("f1");
      expect(handle.rootContainer.entries[0]!.childContainer).toBeDefined();
      expect(handle.rootContainer.entries[0]!.childContainer!.entries).toHaveLength(2);

      handle.dispose();
    });

    it("setLayout('accordion') preserves entries", () => {
      const state = makeContainerState();
      const handle = wireFloatingWorkspace(hostElement, state);

      handle.rootContainer.setLayout("accordion");
      expect(handle.rootContainer.organiser.type).toBe("accordion");
      expect(handle.rootContainer.entries).toHaveLength(2);
      expect(handle.rootContainer.entries[0]!.childContainer).toBeDefined();

      handle.dispose();
    });

    it("captureState after mode switch reflects new layout", () => {
      const state = makeContainerState();
      const handle = wireFloatingWorkspace(hostElement, state);

      handle.rootContainer.setLayout("tabbed");
      const captured = handle.captureState();
      expect(captured.layout).toBe("tabbed");
      expect(captured.tabs).toHaveLength(2);
      expect(captured.tabs[0]!.children).toBeDefined();
      expect(captured.tabs[0]!.children!.layout).toBe("tabbed");

      handle.dispose();
    });
  });
});
