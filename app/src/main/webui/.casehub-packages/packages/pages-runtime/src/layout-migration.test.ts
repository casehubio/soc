import { describe, it, expect } from "vitest";
import { migrateFrameLayout } from "./layout-migration.js";
import type { FrameLayout, ContainerState } from "@casehubio/pages-component";
import type { FreeLayoutState } from "./frame-sandbox/types.js";

describe("migrateFrameLayout", () => {
  it("converts single frame to root free container with tabbed child", () => {
    const frames: FrameLayout[] = [
      {
        key: "f1",
        tabs: [{ key: "t1", label: "T1", content: { type: "html", props: {} } }],
        position: { x: 50, y: 50 },
        size: { width: 300, height: 200 },
        order: 0,
        zIndex: 1,
        pinned: false,
        hidden: false,
        activeTabKey: "t1",
      },
    ];
    const state = migrateFrameLayout(frames);

    expect(state.layout).toBe("free");
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0]!.key).toBe("f1");
    expect(state.tabs[0]!.children!.layout).toBe("tabbed");
    expect(state.tabs[0]!.children!.tabs).toHaveLength(1);
    expect(state.tabs[0]!.children!.tabs[0]!.key).toBe("t1");

    const layoutState = state.layoutState as FreeLayoutState;
    expect(layoutState.entries["f1"]!.position).toEqual({ x: 50, y: 50 });
    expect(layoutState.entries["f1"]!.size).toEqual({ width: 300, height: 200 });
  });

  it("preserves tab active key in child layout state", () => {
    const frames: FrameLayout[] = [
      {
        key: "f1",
        tabs: [
          { key: "t1", label: "T1", content: { type: "html", props: {} } },
          { key: "t2", label: "T2", content: { type: "html", props: {} } },
        ],
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        order: 0,
        zIndex: 1,
        pinned: false,
        hidden: false,
        activeTabKey: "t2",
      },
    ];
    const state = migrateFrameLayout(frames);
    const childState = state.tabs[0]!.children!;

    expect(childState.layoutState).toEqual({
      activeKey: "t2",
      order: ["t1", "t2"],
    });
  });

  it("sorts frames by order and zOrder by zIndex", () => {
    const frames: FrameLayout[] = [
      {
        key: "f2",
        tabs: [{ key: "t2", label: "T2", content: null }],
        position: { x: 400, y: 0 },
        size: { width: 300, height: 200 },
        order: 1,
        zIndex: 2,
        pinned: false,
        hidden: false,
        activeTabKey: "t2",
      },
      {
        key: "f1",
        tabs: [{ key: "t1", label: "T1", content: null }],
        position: { x: 0, y: 0 },
        size: { width: 300, height: 200 },
        order: 0,
        zIndex: 1,
        pinned: false,
        hidden: false,
        activeTabKey: "t1",
      },
    ];
    const state = migrateFrameLayout(frames);

    expect(state.tabs[0]!.key).toBe("f1");
    expect(state.tabs[1]!.key).toBe("f2");

    const layoutState = state.layoutState as FreeLayoutState;
    expect(layoutState.zOrder).toEqual(["f1", "f2"]);
  });

  it("preserves existing containerTree when present", () => {
    const containerTree: ContainerState = {
      layout: "splith",
      tabs: [
        { key: "left", label: "Left", content: { type: "html", props: {} } },
        { key: "right", label: "Right", content: { type: "html", props: {} } },
      ],
    };
    const frames: FrameLayout[] = [
      {
        key: "f1",
        tabs: [{ key: "t1", label: "T1", content: null }],
        position: { x: 0, y: 0 },
        size: { width: 600, height: 400 },
        order: 0,
        zIndex: 1,
        pinned: false,
        hidden: false,
        activeTabKey: "t1",
        containerTree,
      },
    ];
    const state = migrateFrameLayout(frames);

    expect(state.tabs[0]!.children).toBe(containerTree);
  });

  it("returns empty tabs and entries for empty input", () => {
    const state = migrateFrameLayout([]);

    expect(state.layout).toBe("free");
    expect(state.tabs).toHaveLength(0);

    const layoutState = state.layoutState as FreeLayoutState;
    expect(Object.keys(layoutState.entries)).toHaveLength(0);
    expect(layoutState.zOrder).toHaveLength(0);
  });

  it("uses first tab label as frame label", () => {
    const frames: FrameLayout[] = [
      {
        key: "f1",
        tabs: [
          { key: "t1", label: "My Panel", content: null },
          { key: "t2", label: "Second", content: null },
        ],
        position: { x: 0, y: 0 },
        size: { width: 300, height: 200 },
        order: 0,
        zIndex: 1,
        pinned: false,
        hidden: false,
        activeTabKey: "t1",
      },
    ];
    const state = migrateFrameLayout(frames);

    expect(state.tabs[0]!.label).toBe("My Panel");
  });
});

describe("migrateFrameLayout — edge cases", () => {
  it("preserves hidden frame positions and sizes", () => {
    const frames: FrameLayout[] = [
      {
        key: "f1",
        tabs: [{ key: "t1", label: "T1", content: null }],
        position: { x: 100, y: 200 },
        size: { width: 500, height: 400 },
        order: 0,
        zIndex: 1,
        pinned: false,
        hidden: true,
        activeTabKey: "t1",
      },
    ];
    const state = migrateFrameLayout(frames);
    const layoutState = state.layoutState as FreeLayoutState;

    expect(state.tabs).toHaveLength(1);
    expect(layoutState.entries["f1"]!.position).toEqual({ x: 100, y: 200 });
    expect(layoutState.entries["f1"]!.size).toEqual({ width: 500, height: 400 });
  });

  it("handles nested containerTree with split layout", () => {
    const nestedTree: ContainerState = {
      layout: "splith",
      tabs: [
        {
          key: "left",
          label: "Left",
          content: null,
          children: {
            layout: "tabbed",
            tabs: [{ key: "lt1", label: "LT1", content: { type: "html", props: {} } }],
          },
        },
        {
          key: "right",
          label: "Right",
          content: null,
          children: {
            layout: "tabbed",
            tabs: [{ key: "rt1", label: "RT1", content: { type: "html", props: {} } }],
          },
        },
      ],
    };
    const frames: FrameLayout[] = [
      {
        key: "f1",
        tabs: [{ key: "t1", label: "T1", content: null }],
        position: { x: 0, y: 0 },
        size: { width: 800, height: 600 },
        order: 0,
        zIndex: 1,
        pinned: false,
        hidden: false,
        activeTabKey: "t1",
        containerTree: nestedTree,
      },
    ];
    const state = migrateFrameLayout(frames);

    expect(state.tabs[0]!.children).toBe(nestedTree);
    expect(state.tabs[0]!.children!.layout).toBe("splith");
    expect(state.tabs[0]!.children!.tabs).toHaveLength(2);
    expect(state.tabs[0]!.children!.tabs[0]!.children!.tabs[0]!.key).toBe("lt1");
  });

  it("handles many frames with varying zIndex order", () => {
    const frames: FrameLayout[] = [
      {
        key: "f3", tabs: [{ key: "t3", label: "T3", content: null }],
        position: { x: 0, y: 0 }, size: { width: 200, height: 200 },
        order: 2, zIndex: 5, pinned: false, hidden: false, activeTabKey: "t3",
      },
      {
        key: "f1", tabs: [{ key: "t1", label: "T1", content: null }],
        position: { x: 200, y: 0 }, size: { width: 200, height: 200 },
        order: 0, zIndex: 1, pinned: false, hidden: false, activeTabKey: "t1",
      },
      {
        key: "f2", tabs: [{ key: "t2", label: "T2", content: null }],
        position: { x: 400, y: 0 }, size: { width: 200, height: 200 },
        order: 1, zIndex: 3, pinned: false, hidden: false, activeTabKey: "t2",
      },
    ];
    const state = migrateFrameLayout(frames);
    const layoutState = state.layoutState as FreeLayoutState;

    expect(state.tabs.map(t => t.key)).toEqual(["f1", "f2", "f3"]);
    expect(layoutState.zOrder).toEqual(["f1", "f2", "f3"]);
  });

  it("round-trip: migrate → wireFloatingWorkspace → captureState preserves structure", () => {
    const frames: FrameLayout[] = [
      {
        key: "f1",
        tabs: [
          { key: "t1", label: "Tab One", content: { type: "html", props: { content: "hello" } } },
          { key: "t2", label: "Tab Two", content: { type: "html", props: { content: "world" } } },
        ],
        position: { x: 10, y: 20 },
        size: { width: 400, height: 300 },
        order: 0,
        zIndex: 1,
        pinned: false,
        hidden: false,
        activeTabKey: "t2",
      },
      {
        key: "f2",
        tabs: [{ key: "t3", label: "Tab Three", content: { type: "html", props: {} } }],
        position: { x: 450, y: 20 },
        size: { width: 300, height: 250 },
        order: 1,
        zIndex: 2,
        pinned: false,
        hidden: false,
        activeTabKey: "t3",
      },
    ];

    const migrated = migrateFrameLayout(frames);

    expect(migrated.layout).toBe("free");
    expect(migrated.tabs).toHaveLength(2);

    expect(migrated.tabs[0]!.key).toBe("f1");
    expect(migrated.tabs[0]!.children!.layout).toBe("tabbed");
    expect(migrated.tabs[0]!.children!.tabs).toHaveLength(2);
    expect(migrated.tabs[0]!.children!.tabs[0]!.key).toBe("t1");
    expect(migrated.tabs[0]!.children!.tabs[1]!.key).toBe("t2");
    expect(migrated.tabs[0]!.children!.layoutState).toEqual({ activeKey: "t2", order: ["t1", "t2"] });

    expect(migrated.tabs[1]!.key).toBe("f2");
    expect(migrated.tabs[1]!.children!.tabs).toHaveLength(1);

    const layoutState = migrated.layoutState as FreeLayoutState;
    expect(layoutState.entries["f1"]!.position).toEqual({ x: 10, y: 20 });
    expect(layoutState.entries["f1"]!.size).toEqual({ width: 400, height: 300 });
    expect(layoutState.entries["f2"]!.position).toEqual({ x: 450, y: 20 });
    expect(layoutState.zOrder).toEqual(["f1", "f2"]);
  });

  it("handles frame with single tab", () => {
    const frames: FrameLayout[] = [
      {
        key: "solo",
        tabs: [{ key: "only", label: "Only Tab", content: { type: "html", props: {} } }],
        position: { x: 0, y: 0 },
        size: { width: 300, height: 200 },
        order: 0,
        zIndex: 1,
        pinned: true,
        hidden: false,
        activeTabKey: "only",
      },
    ];
    const state = migrateFrameLayout(frames);

    expect(state.tabs[0]!.children!.tabs).toHaveLength(1);
    expect(state.tabs[0]!.children!.layoutState).toEqual({ activeKey: "only", order: ["only"] });
    expect(state.tabs[0]!.label).toBe("Only Tab");
  });
});
