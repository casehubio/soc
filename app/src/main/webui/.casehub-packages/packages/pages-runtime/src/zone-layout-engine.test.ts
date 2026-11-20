import { describe, it, expect } from "vitest";
import { createZoneLayoutEngine } from "./zone-layout-engine.js";
import type { Component } from "@casehubio/pages-component";

function h(content: string): Component {
  return { type: "html" as const, props: { content } };
}

function findById(node: Component, id: string): Component | null {
  if (node.id === id) return node;
  if (node.slots) {
    for (const children of Object.values(node.slots)) {
      for (const child of children) {
        const found = findById(child, id);
        if (found) return found;
      }
    }
  }
  return null;
}

describe("ZoneLayoutEngine", () => {
  describe("config normalization", () => {
    it("normalizes flat array to single zone", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: [
          { key: "nav", label: "Nav", icon: "N", content: h("Nav") },
        ],
      });
      expect(engine.zoneMap.get("nav")).toBe("left-top");
    });

    it("respects explicit zone assignment", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: {
          zones: 2,
          panels: [
            { key: "nav", label: "Nav", icon: "N", zone: "top", content: h("Nav") },
            { key: "files", label: "Files", icon: "F", zone: "bottom", content: h("Files") },
          ],
        },
      });
      expect(engine.zoneMap.get("nav")).toBe("left-top");
      expect(engine.zoneMap.get("files")).toBe("left-bottom");
    });

    it("defaults zone to first position when omitted", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        right: {
          zones: 2,
          panels: [
            { key: "agent", label: "Agent", icon: "A", content: h("Agent") },
          ],
        },
      });
      expect(engine.zoneMap.get("agent")).toBe("right-top");
    });

    it("maps bottom side panels to left/right positions", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        bottom: {
          zones: 2,
          panels: [
            { key: "console", label: "Console", icon: "C", zone: "left", content: h("Console") },
            { key: "output", label: "Output", icon: "O", zone: "right", content: h("Output") },
          ],
        },
      });
      expect(engine.zoneMap.get("console")).toBe("bottom-left");
      expect(engine.zoneMap.get("output")).toBe("bottom-right");
    });
  });

  describe("constraints", () => {
    it("returns all zones when no allowedZones set", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: [{ key: "nav", label: "Nav", icon: "N", content: h("Nav") }],
      });
      const constraints = engine.getConstraints("nav");
      expect(constraints.fixed).toBe(false);
      expect(constraints.allowedZones).toHaveLength(6);
    });

    it("returns configured allowedZones", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        right: [{
          key: "agent", label: "Agent", icon: "A",
          allowedZones: ["right-top", "bottom-left", "bottom-right"],
          content: h("Agent"),
        }],
      });
      expect(engine.getConstraints("agent").allowedZones).toEqual(
        ["right-top", "bottom-left", "bottom-right"],
      );
    });

    it("returns fixed: true for fixed panels", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: [{ key: "nav", label: "Nav", icon: "N", fixed: true, content: h("Nav") }],
      });
      expect(engine.getConstraints("nav").fixed).toBe(true);
    });

    it("getValidDropZones includes current zone for reordering", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: [{ key: "nav", label: "Nav", icon: "N", content: h("Nav") }],
      });
      const valid = engine.getValidDropZones("nav");
      expect(valid).toContain("left-top");
      expect(valid).toContain("left-bottom");
      expect(valid).toContain("right-top");
    });

    it("getValidDropZones returns empty for fixed panels", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: [{ key: "nav", label: "Nav", icon: "N", fixed: true, content: h("Nav") }],
      });
      expect(engine.getValidDropZones("nav")).toEqual([]);
    });
  });

  describe("movePanel", () => {
    it("updates zone map after move", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: [{ key: "nav", label: "Nav", icon: "N", content: h("Nav") }],
      });
      expect(engine.zoneMap.get("nav")).toBe("left-top");
      engine.movePanel("nav", "right-top");
      expect(engine.zoneMap.get("nav")).toBe("right-top");
    });

    it("no-op when target is current zone", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: [{ key: "nav", label: "Nav", icon: "N", content: h("Nav") }],
      });
      const _tree1 = engine.buildTree();
      const tree2 = engine.movePanel("nav", "left-top");
      expect(engine.zoneMap.get("nav")).toBe("left-top");
      expect(tree2).toBeDefined();
    });
  });

  describe("saved zone overrides", () => {
    it("applies saved zone overrides", () => {
      const engine = createZoneLayoutEngine(
        {
          centre: h("Centre"),
          left: [{ key: "nav", label: "Nav", icon: "N", content: h("Nav") }],
        },
        { nav: "right-bottom" },
      );
      expect(engine.zoneMap.get("nav")).toBe("right-bottom");
    });

    it("ignores saved zone that violates allowedZones", () => {
      const engine = createZoneLayoutEngine(
        {
          centre: h("Centre"),
          left: [{
            key: "nav", label: "Nav", icon: "N",
            allowedZones: ["left-top", "left-bottom"],
            content: h("Nav"),
          }],
        },
        { nav: "right-top" },
      );
      expect(engine.zoneMap.get("nav")).toBe("left-top");
    });

    it("drops saved zone for unknown panel key", () => {
      const engine = createZoneLayoutEngine(
        { centre: h("Centre"), left: [{ key: "nav", label: "Nav", icon: "N", content: h("Nav") }] },
        { unknown: "right-top" },
      );
      expect(engine.zoneMap.has("unknown")).toBe(false);
    });
  });

  describe("tree generation", () => {
    it("single-zone side produces one zone container", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: [{ key: "nav", label: "Nav", icon: "N", content: h("Nav") }],
      });
      const tree = engine.buildTree();
      expect(findById(tree, "__zone:left-top")).not.toBeNull();
      expect(findById(tree, "__zone:left-bottom")).toBeNull();
    });

    it("two-zone side produces two zone containers", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: {
          zones: 2,
          panels: [
            { key: "nav", label: "Nav", icon: "N", zone: "top", content: h("Nav") },
            { key: "files", label: "Files", icon: "F", zone: "bottom", content: h("Files") },
          ],
        },
      });
      const tree = engine.buildTree();
      expect(findById(tree, "__zone:left-top")).not.toBeNull();
      expect(findById(tree, "__zone:left-bottom")).not.toBeNull();
    });

    it("wraps panels in deferred with display:none and withId", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: [{ key: "nav", label: "Nav", icon: "N", content: h("Nav") }],
      });
      const tree = engine.buildTree();
      const navPanel = findById(tree, "nav");
      expect(navPanel).not.toBeNull();
      expect(navPanel!.style?.display).toBe("none");
      expect(navPanel!.type).toBe("deferred");
    });

    it("movePanel to second zone creates two-zone structure", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: [
          { key: "nav", label: "Nav", icon: "N", content: h("Nav") },
          { key: "files", label: "Files", icon: "F", content: h("Files") },
        ],
      });
      expect(findById(engine.buildTree(), "__zone:left-bottom")).toBeNull();
      engine.movePanel("files", "left-bottom");
      const tree = engine.buildTree();
      expect(findById(tree, "__zone:left-top")).not.toBeNull();
      expect(findById(tree, "__zone:left-bottom")).not.toBeNull();
    });

    it("movePanel out of zone collapses it when empty", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: {
          zones: 2,
          panels: [
            { key: "nav", label: "Nav", icon: "N", zone: "top", content: h("Nav") },
            { key: "files", label: "Files", icon: "F", zone: "bottom", content: h("Files") },
          ],
        },
      });
      engine.movePanel("files", "left-top");
      const tree = engine.buildTree();
      expect(findById(tree, "__zone:left-top")).not.toBeNull();
      expect(findById(tree, "__zone:left-bottom")).toBeNull();
    });

    it("all side panels in top group, bottom-zone panels in bottom group", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: {
          zones: 2,
          panels: [
            { key: "nav", label: "Nav", icon: "N", zone: "top", content: h("Nav") },
            { key: "files", label: "Files", icon: "F", zone: "bottom", content: h("Files") },
          ],
        },
        bottom: {
          zones: 1,
          panels: [
            { key: "term", label: "Terminal", icon: "T", content: h("Term") },
          ],
        },
      });
      const tree = engine.buildTree();

      function findDockBar(node: Component): Component | null {
        if (node.type === "dock-bar") return node;
        if (node.slots) {
          for (const children of Object.values(node.slots)) {
            for (const child of children) {
              const found = findDockBar(child);
              if (found) return found;
            }
          }
        }
        return null;
      }

      const bar = findDockBar(tree);
      expect(bar).not.toBeNull();
      const items = (bar!.props as { items: Array<{ zone: string; panelId: string }> }).items;
      // Left-top panel in top group
      expect(items.find(i => i.panelId === "nav")?.zone).toBe("top");
      // Left-bottom panel in top-second group
      expect(items.find(i => i.panelId === "files")?.zone).toBe("top-second");
      // Bottom-zone panel in bottom group
      expect(items.find(i => i.panelId === "term")?.zone).toBe("bottom");
    });

    it("backward compat: flat array produces same structure as original builder", () => {
      const engine = createZoneLayoutEngine({
        centre: h("Centre"),
        left: [
          { key: "nav", label: "Nav", icon: "N", defaultOpen: true, content: h("Nav") },
        ],
        bottom: [
          { key: "console", label: "Console", icon: "C", content: h("Console") },
        ],
      });
      const tree = engine.buildTree();
      // Should have a dock-bar, a split, and zone containers
      expect(tree.type).toBeDefined();
      expect(findById(tree, "nav")).not.toBeNull();
      expect(findById(tree, "console")).not.toBeNull();
    });
  });
});
