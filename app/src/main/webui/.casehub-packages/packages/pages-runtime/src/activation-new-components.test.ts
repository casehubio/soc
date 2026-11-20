import { describe, it, expect } from "vitest";
import type { Component } from "@casehubio/pages-component";
import { createActivationCallback } from "./activation.js";
import type { ComponentRegistry } from "./registry.js";
import type { PagePathMap } from "./page-paths.js";

describe("activation - new component types", () => {
  function setup(component: Component) {
    const registry: ComponentRegistry = new Map();
    const pagePathMap: PagePathMap = new Map([[component, "TestPage"]]);
    const callback = createActivationCallback(registry, pagePathMap);
    const el = document.createElement("div");
    el.dataset.componentId = "test-id";
    el.dataset.componentType = component.type;
    callback(el, component);
    return { registry, el };
  }

  describe("data component types", () => {
    const DATA_TYPES = ["badge", "countdown", "timeline", "graph"];

    for (const type of DATA_TYPES) {
      it(`creates pages-${type} element for ${type}`, () => {
        const component: Component = {
          type,
          props: { lookup: { dataSetId: "ds", operations: [] } }
        };
        const { el } = setup(component);
        const child = el.firstElementChild;
        expect(child).toBeTruthy();
        const expectedTag = type === "badge" ? "pages-data-badge" : `pages-${type}`;
        expect(child!.localName).toBe(expectedTag);
      });

      it(`registers ${type} in ComponentRegistry with lookup`, () => {
        const component: Component = {
          type,
          props: { lookup: { dataSetId: "ds", operations: [] } },
        };
        const { registry } = setup(component);
        expect(registry.get("test-id")).toBeTruthy();
        expect(registry.get("test-id")!.pagePath).toBe("TestPage");
        expect(registry.get("test-id")!.originalLookup).toEqual({
          dataSetId: "ds",
          operations: []
        });
      });
    }
  });

  describe("content web component types", () => {
    it("creates pages-alert element", () => {
      const component: Component = {
        type: "alert",
        props: { type: "info", message: "Test alert" }
      };
      const { el, registry } = setup(component);
      const child = el.firstElementChild;
      expect(child).toBeTruthy();
      expect(child!.localName).toBe("pages-alert");
      // Content Web Components do NOT register in ComponentRegistry (no data binding)
      expect(registry.size).toBe(0);
    });

    it("creates pages-action-button element", () => {
      const component: Component = {
        type: "action-button",
        props: { label: "Click me" }
      };
      const { el, registry } = setup(component);
      const child = el.firstElementChild;
      expect(child).toBeTruthy();
      expect(child!.localName).toBe("pages-action-button");
      // Content Web Components do NOT register in ComponentRegistry (no data binding)
      expect(registry.size).toBe(0);
    });

    it("sets props on pages-alert element", () => {
      const props = { type: "warning", message: "Warning message" };
      const component: Component = { type: "alert", props };
      const { el } = setup(component);
      const child = el.firstElementChild as unknown as { props?: unknown };
      expect(child?.props).toEqual(props);
    });

    it("sets props on pages-action-button element", () => {
      const props = { label: "Submit", action: "submit-form" };
      const component: Component = { type: "action-button", props };
      const { el } = setup(component);
      const child = el.firstElementChild as unknown as { props?: unknown };
      expect(child?.props).toEqual(props);
    });
  });
});
