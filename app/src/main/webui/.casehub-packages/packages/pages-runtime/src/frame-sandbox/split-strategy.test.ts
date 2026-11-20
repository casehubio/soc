import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createSplitStrategy } from "./split-strategy.js";
import type { Entry, ContentFactory, SplitState } from "./types.js";

function testFactory(): ContentFactory {
  return (entry) => {
    const el = document.createElement("div");
    el.textContent = `Content: ${entry.key}`;
    el.dataset.testKey = entry.key;
    return { element: el, dispose: () => { el.remove(); } };
  };
}

function makeEntries(...keys: string[]): Entry[] {
  return keys.map((key) => ({ key, label: key.toUpperCase() }));
}

describe("SplitStrategy", () => {
  let host: HTMLElement;
  const factory = testFactory();

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    document.body.removeChild(host);
  });

  describe("horizontal split", () => {
    it("mounts children as side-by-side panes", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      const panes = host.querySelectorAll("[data-split-pane]");
      expect(panes).toHaveLength(2);
      expect(panes[0]!.getAttribute("data-split-pane")).toBe("a");
      expect(panes[1]!.getAttribute("data-split-pane")).toBe("b");
    });

    it("renders a divider between panes", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      expect(host.querySelector("[data-split-divider]")).not.toBeNull();
    });

    it("uses row flex direction", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      const container = host.querySelector("[data-split-container]") as HTMLElement;
      expect(container.style.flexDirection).toBe("row");
    });

    it("has type splith", () => {
      const strategy = createSplitStrategy("horizontal", {});
      expect(strategy.type).toBe("splith");
    });
  });

  describe("vertical split", () => {
    it("mounts children as stacked panes", () => {
      const strategy = createSplitStrategy("vertical", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      const container = host.querySelector("[data-split-container]") as HTMLElement;
      expect(container.style.flexDirection).toBe("column");
    });

    it("has type splitv", () => {
      const strategy = createSplitStrategy("vertical", {});
      expect(strategy.type).toBe("splitv");
    });
  });

  describe("content rendering", () => {
    it("creates content via factory for each pane", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      expect(host.querySelector("[data-test-key='a']")).not.toBeNull();
      expect(host.querySelector("[data-test-key='b']")).not.toBeNull();
    });

    it("preserves existing contentElement on mount", () => {
      const entries = makeEntries("a");
      const existingEl = document.createElement("div");
      existingEl.dataset.testKey = "existing";
      entries[0]!.contentElement = existingEl;

      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, entries, factory);

      expect(host.querySelector("[data-test-key='existing']")).not.toBeNull();
    });
  });

  describe("addEntry", () => {
    it("appends a new pane", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      strategy.addEntry({ key: "c", label: "C" });
      const panes = host.querySelectorAll("[data-split-pane]");
      expect(panes).toHaveLength(3);
      expect(panes[2]!.getAttribute("data-split-pane")).toBe("c");
    });

    it("inserts at position when atIndex is provided", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      strategy.addEntry({ key: "c", label: "C" }, 0);
      const panes = host.querySelectorAll("[data-split-pane]");
      expect(panes).toHaveLength(3);
      expect(panes[0]!.getAttribute("data-split-pane")).toBe("c");
    });

    it("adds dividers for new panes", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      strategy.addEntry({ key: "c", label: "C" });
      const dividers = host.querySelectorAll("[data-split-divider]");
      expect(dividers).toHaveLength(2);
    });

    it("recalculates ratios evenly", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      strategy.addEntry({ key: "c", label: "C" });
      const state = strategy.getState() as SplitState;
      expect(state.ratios).toHaveLength(3);
      for (const r of state.ratios) {
        expect(r).toBeCloseTo(1 / 3);
      }
    });
  });

  describe("removeEntry", () => {
    it("removes a pane", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b", "c"), factory);

      strategy.removeEntry("b");
      const panes = host.querySelectorAll("[data-split-pane]");
      expect(panes).toHaveLength(2);
      expect(panes[0]!.getAttribute("data-split-pane")).toBe("a");
      expect(panes[1]!.getAttribute("data-split-pane")).toBe("c");
    });

    it("fires onCollapse when 1 child remains", () => {
      let collapsed: string | undefined;
      const strategy = createSplitStrategy("horizontal", {
        onCollapse: (remaining) => {
          collapsed = remaining.key;
        },
      });
      strategy.mount(host, makeEntries("a", "b"), factory);

      strategy.removeEntry("a");
      expect(collapsed).toBe("b");
    });

    it("fires onEntryClose callback", () => {
      let closedKey: string | undefined;
      const strategy = createSplitStrategy("horizontal", {
        onEntryClose: (key) => {
          closedKey = key;
        },
      });
      strategy.mount(host, makeEntries("a", "b", "c"), factory);

      strategy.removeEntry("b");
      expect(closedKey).toBe("b");
    });

    it("does not collapse when 2+ children remain", () => {
      let collapsed = false;
      const strategy = createSplitStrategy("horizontal", {
        onCollapse: () => {
          collapsed = true;
        },
      });
      strategy.mount(host, makeEntries("a", "b", "c"), factory);

      strategy.removeEntry("b");
      expect(collapsed).toBe(false);
    });
  });

  describe("state", () => {
    it("returns equal ratios by default", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      const state = strategy.getState() as SplitState;
      expect(state.ratios).toEqual([0.5, 0.5]);
    });

    it("restores ratios from saved state", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      strategy.restoreState({ ratios: [0.3, 0.7] });
      const state = strategy.getState() as SplitState;
      expect(state.ratios).toEqual([0.3, 0.7]);
    });
  });

  describe("unmount and dispose", () => {
    it("unmount detaches content without destroying it", () => {
      const entries = makeEntries("a", "b");
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, entries, factory);

      const contentA = host.querySelector("[data-test-key='a']")!;
      expect(contentA).not.toBeNull();

      strategy.unmount();
      expect(host.querySelector("[data-split-container]")).toBeNull();
      expect(entries[0]!.contentElement).toBe(contentA);
    });

    it("dispose cleans up everything", () => {
      const strategy = createSplitStrategy("horizontal", {});
      strategy.mount(host, makeEntries("a", "b"), factory);

      strategy.dispose();
      expect(host.querySelector("[data-split-container]")).toBeNull();
    });
  });
});
