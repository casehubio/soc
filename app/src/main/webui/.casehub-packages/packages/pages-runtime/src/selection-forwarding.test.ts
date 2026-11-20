import { describe, it, expect } from "vitest";
import type { ComponentRegistry, ComponentEntry } from "./registry.js";
import { dispatchSelectionToHostPanels, dispatchSelectionClearAll } from "./selection-forwarding.js";

function makeHostPanelEntry(selectionSource?: string): ComponentEntry {
  const element = document.createElement("div");
  return {
    element,
    component: {
      type: "host-panel",
      props: {
        typeName: "test-panel",
        ...(selectionSource !== undefined && { selectionSource }),
      },
    },
    pagePath: "",
    hasExplicitId: false,
  };
}

function makeChartEntry(): ComponentEntry {
  return {
    element: document.createElement("div"),
    component: { type: "bar-chart", props: { lookup: { dataSetId: "ds", operations: [] } } },
    pagePath: "",
    hasExplicitId: false,
  };
}

describe("dispatchSelectionToHostPanels", () => {
  it("dispatches to host-panel with matching selectionSource", () => {
    const registry: ComponentRegistry = new Map();
    const entry = makeHostPanelEntry("adverse-events");
    registry.set("panel-1", entry);

    const received: CustomEvent[] = [];
    entry.element.addEventListener("pages-selection-changed", ((e: Event) => {
      received.push(e as CustomEvent);
    }));

    const row = { id: 42, name: "Test" };
    dispatchSelectionToHostPanels(registry, "adverse-events", row);

    expect(received).toHaveLength(1);
    expect(received[0]!.detail).toEqual({
      sourceDatasetId: "adverse-events",
      selectedRow: { id: 42, name: "Test" },
    });
  });

  it("does not dispatch to host-panel with different selectionSource", () => {
    const registry: ComponentRegistry = new Map();
    const entry = makeHostPanelEntry("other-dataset");
    registry.set("panel-1", entry);

    const received: Event[] = [];
    entry.element.addEventListener("pages-selection-changed", (e) => received.push(e));

    dispatchSelectionToHostPanels(registry, "adverse-events", { id: 1 });

    expect(received).toHaveLength(0);
  });

  it("does not dispatch to host-panel without selectionSource", () => {
    const registry: ComponentRegistry = new Map();
    const entry = makeHostPanelEntry();
    registry.set("panel-1", entry);

    const received: Event[] = [];
    entry.element.addEventListener("pages-selection-changed", (e) => received.push(e));

    dispatchSelectionToHostPanels(registry, "adverse-events", { id: 1 });

    expect(received).toHaveLength(0);
  });

  it("does not dispatch to non-host-panel components", () => {
    const registry: ComponentRegistry = new Map();
    const entry = makeChartEntry();
    registry.set("chart-1", entry);

    const received: Event[] = [];
    entry.element.addEventListener("pages-selection-changed", (e) => received.push(e));

    dispatchSelectionToHostPanels(registry, "ds", { id: 1 });

    expect(received).toHaveLength(0);
  });

  it("dispatches null selectedRow for deselection", () => {
    const registry: ComponentRegistry = new Map();
    const entry = makeHostPanelEntry("events");
    registry.set("panel-1", entry);

    const received: CustomEvent[] = [];
    entry.element.addEventListener("pages-selection-changed", ((e: Event) => {
      received.push(e as CustomEvent);
    }));

    dispatchSelectionToHostPanels(registry, "events", null);

    expect(received).toHaveLength(1);
    expect(received[0]!.detail.selectedRow).toBeNull();
  });

  it("dispatches to multiple panels with same selectionSource", () => {
    const registry: ComponentRegistry = new Map();
    const entry1 = makeHostPanelEntry("events");
    const entry2 = makeHostPanelEntry("events");
    registry.set("panel-1", entry1);
    registry.set("panel-2", entry2);

    const received1: Event[] = [];
    const received2: Event[] = [];
    entry1.element.addEventListener("pages-selection-changed", (e) => received1.push(e));
    entry2.element.addEventListener("pages-selection-changed", (e) => received2.push(e));

    dispatchSelectionToHostPanels(registry, "events", { id: 1 });

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
  });

  it("guards against re-entrant dispatch", () => {
    const registry: ComponentRegistry = new Map();
    const entry = makeHostPanelEntry("events");
    registry.set("panel-1", entry);

    const received: Event[] = [];
    entry.element.addEventListener("pages-selection-changed", () => {
      received.push(new Event("marker"));
      dispatchSelectionToHostPanels(registry, "events", { id: 99 });
    });

    dispatchSelectionToHostPanels(registry, "events", { id: 1 });

    expect(received).toHaveLength(1);
  });

  it("dispatches with bubbles and composed", () => {
    const registry: ComponentRegistry = new Map();
    const entry = makeHostPanelEntry("events");
    registry.set("panel-1", entry);

    const received: CustomEvent[] = [];
    entry.element.addEventListener("pages-selection-changed", ((e: Event) => {
      received.push(e as CustomEvent);
    }));

    dispatchSelectionToHostPanels(registry, "events", { id: 1 });

    expect(received[0]!.bubbles).toBe(true);
    expect(received[0]!.composed).toBe(true);
  });
});

describe("dispatchSelectionClearAll", () => {
  it("dispatches null to all host-panels with any selectionSource", () => {
    const registry: ComponentRegistry = new Map();
    const entry1 = makeHostPanelEntry("events");
    const entry2 = makeHostPanelEntry("orders");
    const entry3 = makeHostPanelEntry();
    registry.set("panel-1", entry1);
    registry.set("panel-2", entry2);
    registry.set("panel-3", entry3);

    const received1: CustomEvent[] = [];
    const received2: CustomEvent[] = [];
    const received3: CustomEvent[] = [];
    entry1.element.addEventListener("pages-selection-changed", ((e: Event) => received1.push(e as CustomEvent)));
    entry2.element.addEventListener("pages-selection-changed", ((e: Event) => received2.push(e as CustomEvent)));
    entry3.element.addEventListener("pages-selection-changed", ((e: Event) => received3.push(e as CustomEvent)));

    dispatchSelectionClearAll(registry);

    expect(received1).toHaveLength(1);
    expect(received1[0]!.detail).toEqual({ sourceDatasetId: "events", selectedRow: null });
    expect(received2).toHaveLength(1);
    expect(received2[0]!.detail).toEqual({ sourceDatasetId: "orders", selectedRow: null });
    expect(received3).toHaveLength(0);
  });
});
