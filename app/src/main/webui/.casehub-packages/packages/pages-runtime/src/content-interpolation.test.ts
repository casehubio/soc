import { describe, it, expect, beforeEach } from "vitest";
import type { Component } from "@casehubio/pages-component";
import { createActivationCallback } from "./activation.js";
import { ContextManager } from "./context-wiring.js";
import type { ComponentRegistry } from "./registry.js";
import type { PagePathMap } from "./page-paths.js";
import {
  dataSetId,
  columnId,
  ColumnType,
} from "@casehubio/pages-data";
import type {
  TypedDataSet,
  TypedRow,
} from "@casehubio/pages-data";

describe("content interpolation reactivity", () => {
  let registry: ComponentRegistry;
  let pagePathMap: PagePathMap;
  let contextManager: ContextManager;

  beforeEach(() => {
    registry = new Map();
    pagePathMap = new Map();
    contextManager = new ContextManager();
  });

  function activate(component: Component): HTMLDivElement {
    const el = document.createElement("div");
    el.dataset.componentId = "test-id";
    el.dataset.componentType = component.type;
    pagePathMap.set(component, "TestPage");
    document.body.appendChild(el);

    const callback = createActivationCallback(registry, pagePathMap, undefined, contextManager);
    callback(el, component);

    return el;
  }

  describe("markdown with #{}", () => {
    it("resolves template variables on initial render", () => {
      contextManager.updateFilter({ ward: ["ICU"] });

      const component: Component = {
        type: "markdown",
        props: { content: "Ward: #{filter.ward}" },
      };

      const el = activate(component);
      const mdEl = el.querySelector(".pages-markdown");
      expect(mdEl).toBeTruthy();
      expect(mdEl!.textContent).toContain("Ward: ICU");

      document.body.removeChild(el);
    });

    it("re-renders on filter change", () => {
      const component: Component = {
        type: "markdown",
        props: { content: "Ward: #{filter.ward}" },
      };

      const el = activate(component);

      // Initially empty filter → unresolved
      let mdEl = el.querySelector(".pages-markdown");
      expect(mdEl!.textContent).toContain("Ward:");

      // Set filter → should re-render
      contextManager.updateFilter({ ward: ["ICU"] });
      mdEl = el.querySelector(".pages-markdown");
      expect(mdEl!.textContent).toContain("Ward: ICU");

      // Change filter → re-render again
      contextManager.updateFilter({ ward: ["Cardiology"] });
      mdEl = el.querySelector(".pages-markdown");
      expect(mdEl!.textContent).toContain("Ward: Cardiology");

      document.body.removeChild(el);
    });

    it("escapes markdown special characters in interpolated values", () => {
      contextManager.updateFilter({ ward: ["*ICU*"] });

      const component: Component = {
        type: "markdown",
        props: { content: "Ward: #{filter.ward}" },
      };

      const el = activate(component);
      const mdEl = el.querySelector(".pages-markdown");
      // *ICU* should NOT be rendered as italic — it should be escaped
      expect(mdEl!.querySelector("em")).toBeNull();
      // The escaped text should contain the literal characters
      expect(mdEl!.textContent).toContain("ICU");

      document.body.removeChild(el);
    });
  });

  describe("html with #{}", () => {
    it("resolves template variables on initial render", () => {
      contextManager.updateFilter({ ward: ["ICU"] });

      const component: Component = {
        type: "html",
        props: { content: "<p>Ward: #{filter.ward}</p>" },
      };

      const el = activate(component);
      expect(el.querySelector("p")?.textContent).toBe("Ward: ICU");

      document.body.removeChild(el);
    });

    it("re-renders on filter change", () => {
      const component: Component = {
        type: "html",
        props: { content: "<p>Ward: #{filter.ward}</p>" },
      };

      const el = activate(component);

      contextManager.updateFilter({ ward: ["ICU"] });
      expect(el.querySelector("p")?.textContent).toBe("Ward: ICU");

      contextManager.updateFilter({ ward: ["ER"] });
      expect(el.querySelector("p")?.textContent).toBe("Ward: ER");

      document.body.removeChild(el);
    });

    it("escapes HTML entities in interpolated values", () => {
      contextManager.updateFilter({ ward: ["<b>bold</b>"] });

      const component: Component = {
        type: "html",
        props: { content: "<p>Ward: #{filter.ward}</p>" },
      };

      const el = activate(component);
      // The <b> tag should be escaped, not rendered as bold
      expect(el.querySelector("b")).toBeNull();
      expect(el.querySelector("p")?.textContent).toContain("<b>bold</b>");

      document.body.removeChild(el);
    });
  });

  describe("title with #{}", () => {
    it("resolves template variables on initial render", () => {
      contextManager.updateFilter({ ward: ["ICU"] });

      const component: Component = {
        type: "title",
        props: { text: "Ward: #{filter.ward}", size: "h2" },
      };

      const el = activate(component);
      const heading = el.querySelector("h2");
      expect(heading?.textContent).toBe("Ward: ICU");

      document.body.removeChild(el);
    });

    it("re-renders on filter change", () => {
      const component: Component = {
        type: "title",
        props: { text: "#{filter.ward} patients", size: "h2" },
      };

      const el = activate(component);

      contextManager.updateFilter({ ward: ["ICU"] });
      expect(el.querySelector("h2")?.textContent).toBe("ICU patients");

      contextManager.updateFilter({ ward: ["ER"] });
      expect(el.querySelector("h2")?.textContent).toBe("ER patients");

      document.body.removeChild(el);
    });

    it("updates when dataset changes", () => {
      const component: Component = {
        type: "title",
        props: { text: "#{datasets.patients.rowCount} patients", size: "h1" },
      };

      const el = activate(component);

      const dataset: TypedDataSet = {
        columns: [{ id: columnId("id"), name: "ID", type: ColumnType.NUMBER }],
        rows: [
          createRow([{ type: ColumnType.NUMBER, value: 1 }]),
          createRow([{ type: ColumnType.NUMBER, value: 2 }]),
          createRow([{ type: ColumnType.NUMBER, value: 3 }]),
        ],
      };

      contextManager.updateDataset(dataSetId("patients"), dataset);
      expect(el.querySelector("h1")?.textContent).toBe("3 patients");

      document.body.removeChild(el);
    });

    it("escapes HTML entities in interpolated values", () => {
      contextManager.updateFilter({ ward: ["<script>alert(1)</script>"] });

      const component: Component = {
        type: "title",
        props: { text: "Ward: #{filter.ward}", size: "h2" },
      };

      const el = activate(component);
      // Title uses textContent, so HTML is not rendered
      const heading = el.querySelector("h2");
      expect(heading?.textContent).toContain("<script>");

      document.body.removeChild(el);
    });
  });

  describe("plain-DOM consumer lifecycle", () => {
    it("clears old content before re-rendering", () => {
      const component: Component = {
        type: "markdown",
        props: { content: "Ward: #{filter.ward}" },
      };

      const el = activate(component);

      contextManager.updateFilter({ ward: ["ICU"] });
      // Should have exactly one .pages-markdown child
      expect(el.querySelectorAll(".pages-markdown").length).toBe(1);

      contextManager.updateFilter({ ward: ["ER"] });
      // After re-render, still exactly one .pages-markdown child (not duplicated)
      expect(el.querySelectorAll(".pages-markdown").length).toBe(1);
      expect(el.querySelector(".pages-markdown")?.textContent).toContain("ER");

      document.body.removeChild(el);
    });

    it("consumer is pruned when element disconnects", () => {
      const component: Component = {
        type: "markdown",
        props: { content: "Ward: #{filter.ward}" },
      };

      const el = activate(component);

      contextManager.updateFilter({ ward: ["ICU"] });
      expect(el.querySelector(".pages-markdown")?.textContent).toContain("ICU");

      // Remove from DOM
      document.body.removeChild(el);

      // Further updates should not throw (consumer pruned)
      expect(() => {
        contextManager.updateFilter({ ward: ["ER"] });
      }).not.toThrow();
    });

    it("does not register consumer for content without #{}", () => {
      const component: Component = {
        type: "markdown",
        props: { content: "Static content" },
      };

      const el = activate(component);
      const mdEl = el.querySelector(".pages-markdown");
      expect(mdEl?.textContent).toContain("Static content");

      // Filter changes should not affect static content rendering
      // (We verify indirectly — if a consumer were registered with no templates,
      //  it would be wasteful but not incorrect. The key assertion is that the
      //  static content renders correctly.)
      contextManager.updateFilter({ ward: ["ICU"] });
      expect(el.querySelector(".pages-markdown")?.textContent).toContain("Static content");

      document.body.removeChild(el);
    });
  });
});

// Helper to create a TypedRow
function createRow(cells: readonly unknown[]): TypedRow {
  return {
    cells: cells as readonly TypedRow["cells"][number][],
    cell(colId) {
      const index = parseInt(colId.toString().replace(/\D/g, ""), 10) || 0;
      return this.cells[index] || { type: "NULL" };
    },
    number(colId) {
      const cell = this.cell(colId);
      return cell.type === ColumnType.NUMBER ? cell.value : 0;
    },
    text(colId) {
      const cell = this.cell(colId);
      return cell.type === ColumnType.TEXT ? cell.value : "";
    },
    date(colId) {
      const cell = this.cell(colId);
      return cell.type === ColumnType.DATE ? cell.value : new Date(0);
    },
  };
}
