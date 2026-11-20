import { describe, it, expect, afterEach } from "vitest";
import { loadSite } from "./site.js";
import type { LiveSite } from "./site.js";
import type { Component } from "@casehubio/pages-component";

describe.skip("dock-bar zone grouping (removed — renderDockBar deleted #441)", () => {
  afterEach(() => {
    history.replaceState(null, "", location.pathname);
  });

  it("renders buttons in two zone groups with spacer", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const workbench: Component = {
      type: "dock-bar",
      props: {
        orientation: "vertical",
        exclusive: true,
        side: "left",
        items: [
          { icon: "N", label: "Nav", panelId: "nav", zone: "top" },
          { icon: "F", label: "Files", panelId: "files", zone: "top" },
          { icon: "A", label: "Agent", panelId: "agent", zone: "bottom" },
        ],
      },
    };

    const site = await loadSite(target, workbench);

    const bar = target.querySelector('[data-component-type="dock-bar"]')!;
    const zoneGroups = bar.querySelectorAll(":scope > [data-dock-zone]");
    expect(zoneGroups).toHaveLength(3);
    expect(zoneGroups[0]!.getAttribute("data-dock-zone")).toBe("top");
    expect(zoneGroups[1]!.getAttribute("data-dock-zone")).toBe("middle");
    expect(zoneGroups[2]!.getAttribute("data-dock-zone")).toBe("bottom");

    // Top group: Nav + Files (zone=top)
    expect(zoneGroups[0]!.querySelectorAll("button")).toHaveLength(2);
    // Middle group: empty (no top-second items in this test)
    expect(zoneGroups[1]!.querySelectorAll("button")).toHaveLength(0);
    // Bottom group: Agent (zone=bottom)
    expect(zoneGroups[2]!.querySelectorAll("button")).toHaveLength(1);

    expect(bar.querySelector("[data-dock-spacer]")).not.toBeNull();

    site.dispose();
    document.body.removeChild(target);
  });

  it("exclusive scoping: clicking in top group does not close bottom group", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const workbench: Component = {
      type: "rows",
      slots: {
        default: [
          {
            type: "rows",
            slots: {
              default: [
                { type: "deferred", id: "nav", style: { display: "none" },
                  slots: { default: [{ type: "html", props: { content: "Nav" } }] } },
                { type: "deferred", id: "agent", style: { display: "none" },
                  slots: { default: [{ type: "html", props: { content: "Agent" } }] } },
              ],
            },
          },
          {
            type: "dock-bar",
            props: {
              orientation: "vertical",
              exclusive: true,
              side: "left",
              items: [
                { icon: "N", label: "Nav", panelId: "nav", defaultOpen: true, zone: "top" },
                { icon: "A", label: "Agent", panelId: "agent", defaultOpen: true, zone: "bottom" },
              ],
            },
          },
        ],
      },
    };

    const site = await loadSite(target, workbench);

    const navBtn = target.querySelector<HTMLElement>('button[data-dock-panel-id="nav"]')!;
    const agentBtn = target.querySelector<HTMLElement>('button[data-dock-panel-id="agent"]')!;

    // Both start active — zone-aware initialization activates one per zone group
    expect(navBtn.dataset.active).toBeDefined();
    expect(agentBtn.dataset.active).toBeDefined();

    // Close nav — agent should remain active (different zone group)
    navBtn.click();
    expect(navBtn.dataset.active).toBeUndefined();
    expect(agentBtn.dataset.active).toBeDefined();

    site.dispose();
    document.body.removeChild(target);
  });

  it("toolbar separator always visible regardless of button distribution", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const workbench: Component = {
      type: "dock-bar",
      props: {
        orientation: "vertical",
        exclusive: true,
        side: "left",
        items: [
          { icon: "N", label: "Nav", panelId: "nav", zone: "top" },
          { icon: "F", label: "Files", panelId: "files", zone: "top" },
        ],
      },
    };

    const site = await loadSite(target, workbench);

    const bar = target.querySelector('[data-component-type="dock-bar"]')!;
    const spacer = bar.querySelector("[data-dock-spacer]") as HTMLElement | null;
    expect(spacer).not.toBeNull();
    expect(spacer!.style.display).not.toBe("none");

    site.dispose();
    document.body.removeChild(target);
  });

  it("content split handle hidden when a zone has no visible panels", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const workbench: Component = {
      type: "rows",
      slots: {
        default: [
          {
            type: "split",
            props: { direction: "vertical" },
            slots: {
              "0": [{
                type: "rows", id: "__zone:left-top",
                slots: {
                  default: [
                    { type: "deferred", id: "nav", style: { display: "none" },
                      slots: { default: [{ type: "html", props: { content: "Nav" } }] } },
                  ],
                },
              }],
              "1": [{
                type: "rows", id: "__zone:left-bottom",
                slots: {
                  default: [
                    { type: "deferred", id: "bookmarks", style: { display: "none" },
                      slots: { default: [{ type: "html", props: { content: "Bookmarks" } }] } },
                  ],
                },
              }],
            },
          },
          {
            type: "dock-bar",
            props: {
              orientation: "vertical",
              exclusive: true,
              side: "left",
              items: [
                { icon: "N", label: "Nav", panelId: "nav", defaultOpen: true, zone: "top" },
                { icon: "B", label: "Bookmarks", panelId: "bookmarks", zone: "bottom" },
              ],
            },
          },
        ],
      },
    };

    const site = await loadSite(target, workbench);

    // Nav is open (top zone visible), Bookmarks is closed (bottom zone empty)
    // Split handle between zones should be hidden
    const splitHandle = target.querySelector("[data-split-handle]") as HTMLElement | null;
    expect(splitHandle).not.toBeNull();
    expect(splitHandle!.style.display).toBe("none");

    // Bottom zone slot should be collapsed
    const bottomZone = target.querySelector('[data-component-id="__zone:left-bottom"]') as HTMLElement | null;
    expect(bottomZone).not.toBeNull();
    expect(bottomZone!.style.display).toBe("none");

    site.dispose();
    document.body.removeChild(target);
  });

  it("three groups when side has 2 zones: side-top, side-bottom, bottom-zone", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const { createZoneLayoutEngine } = await import("./zone-layout-engine.js");

    const engine = createZoneLayoutEngine({
      centre: { type: "html" as const, props: { content: "Centre" } },
      left: {
        zones: 2,
        panels: [
          { key: "nav", label: "Nav", icon: "N", zone: "top" as const, content: { type: "html" as const, props: { content: "Nav" } } },
          { key: "bookmarks", label: "BM", icon: "B", zone: "bottom" as const, content: { type: "html" as const, props: { content: "BM" } } },
        ],
      },
      bottom: {
        zones: 1,
        panels: [
          { key: "console", label: "Console", icon: "C", content: { type: "html" as const, props: { content: "Console" } } },
        ],
      },
    });

    const tree = engine.buildTree();
    const site = await loadSite(target, tree, { zoneEngine: engine });

    const bar = target.querySelector('[data-component-type="dock-bar"]')!;
    const groups = bar.querySelectorAll(":scope > [data-dock-zone]");

    // Should have 3 groups: side-top, side-bottom, bottom-zone
    expect(groups).toHaveLength(3);

    const topBtns = Array.from(groups[0]!.querySelectorAll("button")).map(b => (b as HTMLElement).dataset.dockPanelId);
    const midBtns = Array.from(groups[1]!.querySelectorAll("button")).map(b => (b as HTMLElement).dataset.dockPanelId);
    const botBtns = Array.from(groups[2]!.querySelectorAll("button")).map(b => (b as HTMLElement).dataset.dockPanelId);

    expect(topBtns).toEqual(["nav"]);
    expect(midBtns).toEqual(["bookmarks"]);
    expect(botBtns).toEqual(["console"]);

    site.dispose();
    document.body.removeChild(target);
  });

  it("side panels in top group, bottom-zone panels in bottom group", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const { createZoneLayoutEngine } = await import("./zone-layout-engine.js");

    const engine = createZoneLayoutEngine({
      centre: { type: "html" as const, props: { content: "Centre" } },
      left: {
        zones: 2,
        panels: [
          { key: "nav", label: "Nav", icon: "N", zone: "top" as const, content: { type: "html" as const, props: { content: "Nav" } } },
          { key: "bookmarks", label: "Bookmarks", icon: "B", zone: "bottom" as const, content: { type: "html" as const, props: { content: "BM" } } },
        ],
      },
      bottom: {
        zones: 1,
        panels: [
          { key: "console", label: "Console", icon: "C", content: { type: "html" as const, props: { content: "Console" } } },
        ],
      },
    });

    const tree = engine.buildTree();
    const site = await loadSite(target, tree, { zoneEngine: engine });

    const bar = target.querySelector('[data-component-type="dock-bar"]')!;
    const groups = bar.querySelectorAll(":scope > [data-dock-zone]");
    expect(groups).toHaveLength(3);

    // Top group: left-top panels only
    const topButtons = Array.from(groups[0]!.querySelectorAll("button")).map(b => (b as HTMLElement).dataset.dockPanelId);
    expect(topButtons).toContain("nav");
    expect(topButtons).not.toContain("bookmarks");

    // Middle group: left-bottom panels
    const midButtons = Array.from(groups[1]!.querySelectorAll("button")).map(b => (b as HTMLElement).dataset.dockPanelId);
    expect(midButtons).toContain("bookmarks");

    // Bottom group: bottom-zone panels
    const bottomButtons = Array.from(groups[2]!.querySelectorAll("button")).map(b => (b as HTMLElement).dataset.dockPanelId);
    expect(bottomButtons).toContain("console");

    site.dispose();
    document.body.removeChild(target);
  });

  it("single-zone bar renders without zone groups", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const workbench: Component = {
      type: "dock-bar",
      props: {
        orientation: "vertical",
        exclusive: true,
        items: [
          { icon: "N", label: "Nav", panelId: "nav" },
          { icon: "F", label: "Files", panelId: "files" },
        ],
      },
    };

    const site = await loadSite(target, workbench);

    const bar = target.querySelector('[data-component-type="dock-bar"]')!;
    const zoneGroups = bar.querySelectorAll("[data-dock-zone]");
    expect(zoneGroups).toHaveLength(0);
    expect(bar.querySelectorAll("button")).toHaveLength(2);

    site.dispose();
    document.body.removeChild(target);
  });
});

describe.skip("dock-toggle handler exclusivity (removed — renderDockBar deleted #441)", () => {
  let target: HTMLElement;
  let site: LiveSite;

  afterEach(() => {
    site?.dispose();
    if (target?.parentElement) target.parentElement.removeChild(target);
    history.replaceState(null, "", location.pathname);
  });

  it("showing panel-b hides panel-a in same exclusive zone via direct dispatch", async () => {
    target = document.createElement("div");
    document.body.appendChild(target);

    const workbench: Component = {
      type: "rows",
      slots: {
        default: [
          {
            type: "rows",
            slots: {
              default: [
                { type: "deferred", id: "panel-a", style: { display: "none" },
                  slots: { default: [{ type: "html", props: { content: "A" } }] } },
                { type: "deferred", id: "panel-b", style: { display: "none" },
                  slots: { default: [{ type: "html", props: { content: "B" } }] } },
              ],
            },
          },
          {
            type: "dock-bar",
            props: {
              orientation: "vertical",
              exclusive: true,
              side: "left",
              items: [
                { icon: "A", label: "A", panelId: "panel-a", defaultOpen: true, zone: "top" },
                { icon: "B", label: "B", panelId: "panel-b", zone: "top" },
              ],
            },
          },
        ],
      },
    };
    site = await loadSite(target, workbench);

    const panelA = target.querySelector<HTMLElement>('[data-component-id="panel-a"]')!;
    expect(panelA.style.display).not.toBe("none");

    target.dispatchEvent(new CustomEvent("pages-dock-toggle", {
      bubbles: true, composed: true,
      detail: { panelId: "panel-b", visible: true },
    }));

    const panelB = target.querySelector<HTMLElement>('[data-component-id="panel-b"]')!;
    expect(panelB.style.display).not.toBe("none");
    expect(panelA.style.display).toBe("none");
  });

  it("dock-bar button data-active syncs on direct dispatch", async () => {
    target = document.createElement("div");
    document.body.appendChild(target);

    const workbench: Component = {
      type: "rows",
      slots: {
        default: [
          {
            type: "rows",
            slots: {
              default: [
                { type: "deferred", id: "panel-a", style: { display: "none" },
                  slots: { default: [{ type: "html", props: { content: "A" } }] } },
                { type: "deferred", id: "panel-b", style: { display: "none" },
                  slots: { default: [{ type: "html", props: { content: "B" } }] } },
              ],
            },
          },
          {
            type: "dock-bar",
            props: {
              orientation: "vertical",
              exclusive: true,
              side: "left",
              items: [
                { icon: "A", label: "A", panelId: "panel-a", defaultOpen: true, zone: "top" },
                { icon: "B", label: "B", panelId: "panel-b", zone: "top" },
              ],
            },
          },
        ],
      },
    };
    site = await loadSite(target, workbench);

    const btnA = target.querySelector<HTMLElement>('button[data-dock-panel-id="panel-a"]')!;
    const btnB = target.querySelector<HTMLElement>('button[data-dock-panel-id="panel-b"]')!;
    expect(btnA.dataset.active).toBeDefined();
    expect(btnB.dataset.active).toBeUndefined();

    target.dispatchEvent(new CustomEvent("pages-dock-toggle", {
      bubbles: true, composed: true,
      detail: { panelId: "panel-b", visible: true },
    }));

    expect(btnA.dataset.active).toBeUndefined();
    expect(btnB.dataset.active).toBeDefined();
  });

  it("non-exclusive dock bar allows multiple visible panels", async () => {
    target = document.createElement("div");
    document.body.appendChild(target);

    const workbench: Component = {
      type: "rows",
      slots: {
        default: [
          {
            type: "rows",
            slots: {
              default: [
                { type: "deferred", id: "panel-a", style: { display: "none" },
                  slots: { default: [{ type: "html", props: { content: "A" } }] } },
                { type: "deferred", id: "panel-b", style: { display: "none" },
                  slots: { default: [{ type: "html", props: { content: "B" } }] } },
              ],
            },
          },
          {
            type: "dock-bar",
            props: {
              orientation: "vertical",
              items: [
                { icon: "A", label: "A", panelId: "panel-a", defaultOpen: true },
                { icon: "B", label: "B", panelId: "panel-b" },
              ],
            },
          },
        ],
      },
    };
    site = await loadSite(target, workbench);

    target.dispatchEvent(new CustomEvent("pages-dock-toggle", {
      bubbles: true, composed: true,
      detail: { panelId: "panel-b", visible: true },
    }));

    const panelA = target.querySelector<HTMLElement>('[data-component-id="panel-a"]')!;
    const panelB = target.querySelector<HTMLElement>('[data-component-id="panel-b"]')!;
    expect(panelA.style.display).not.toBe("none");
    expect(panelB.style.display).not.toBe("none");
  });
});
