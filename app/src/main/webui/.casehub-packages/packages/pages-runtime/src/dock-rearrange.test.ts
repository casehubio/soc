import { describe, it, expect, afterEach } from "vitest";
import { loadSite } from "./site.js";
import { createZoneLayoutEngine } from "./zone-layout-engine.js";
import type { Component } from "@casehubio/pages-component";

function h(content: string): Component {
  return { type: "html" as const, props: { content } };
}

describe("zone engine site integration", () => {
  afterEach(() => {
    history.replaceState(null, "", location.pathname);
  });

  it("captureLayout includes zones when zone engine is provided", async () => {
    const engine = createZoneLayoutEngine({
      centre: h("Centre"),
      left: {
        zones: 2,
        panels: [
          { key: "nav", label: "Nav", icon: "N", zone: "top", defaultOpen: true, content: h("Nav") },
          { key: "files", label: "Files", icon: "F", zone: "bottom", content: h("Files") },
        ],
      },
    });

    const tree = engine.buildTree();
    const target = document.createElement("div");
    document.body.appendChild(target);
    const site = await loadSite(target, tree, { zoneEngine: engine });

    const layout = site.layout;
    expect(layout.zones).toBeDefined();
    expect(layout.zones!["nav"]).toBe("left-top");
    expect(layout.zones!["files"]).toBe("left-bottom");

    site.dispose();
    document.body.removeChild(target);
  });

  it("captureLayout omits zones when no engine provided", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const site = await loadSite(target, h("Simple"));

    expect(site.layout.zones).toBeUndefined();

    site.dispose();
    document.body.removeChild(target);
  });

  it("pages-dock-rearrange triggers re-render with panel in new zone", async () => {
    const engine = createZoneLayoutEngine({
      centre: h("Centre"),
      left: {
        zones: 2,
        panels: [
          { key: "nav", label: "Nav", icon: "N", zone: "top", defaultOpen: true, content: h("Nav content") },
          { key: "files", label: "Files", icon: "F", zone: "bottom", content: h("Files content") },
        ],
      },
    });

    const tree = engine.buildTree();
    const target = document.createElement("div");
    document.body.appendChild(target);
    const site = await loadSite(target, tree, { zoneEngine: engine });

    const navBefore = target.querySelector('[data-component-id="nav"]');
    expect(navBefore).not.toBeNull();

    target.dispatchEvent(new CustomEvent("pages-dock-rearrange", {
      bubbles: true, composed: true,
      detail: { panelKey: "nav", fromZone: "left-top", toZone: "left-bottom" },
    }));

    // Panel should still exist after re-render
    const navAfter = target.querySelector('[data-component-id="nav"]');
    expect(navAfter).not.toBeNull();

    // Zone map should be updated
    expect(engine.zoneMap.get("nav")).toBe("left-bottom");

    // Layout should reflect new zone
    expect(site.layout.zones!["nav"]).toBe("left-bottom");

    site.dispose();
    document.body.removeChild(target);
  });

  it("re-render preserves dock visibility state", async () => {
    const engine = createZoneLayoutEngine({
      centre: h("Centre"),
      left: [
        { key: "nav", label: "Nav", icon: "N", defaultOpen: true, content: h("Nav") },
      ],
      right: [
        { key: "agent", label: "Agent", icon: "A", content: h("Agent") },
      ],
    });

    const tree = engine.buildTree();
    const target = document.createElement("div");
    document.body.appendChild(target);
    const site = await loadSite(target, tree, { zoneEngine: engine });

    // Nav should be visible (defaultOpen)
    const navPanel = target.querySelector('[data-component-id="nav"]') as HTMLElement;
    expect(navPanel).not.toBeNull();

    // Move nav to right side — should re-render
    target.dispatchEvent(new CustomEvent("pages-dock-rearrange", {
      bubbles: true, composed: true,
      detail: { panelKey: "nav", fromZone: "left-top", toZone: "right-top" },
    }));

    // Nav should still exist after re-render
    expect(target.querySelector('[data-component-id="nav"]')).not.toBeNull();

    site.dispose();
    document.body.removeChild(target);
  });
});
