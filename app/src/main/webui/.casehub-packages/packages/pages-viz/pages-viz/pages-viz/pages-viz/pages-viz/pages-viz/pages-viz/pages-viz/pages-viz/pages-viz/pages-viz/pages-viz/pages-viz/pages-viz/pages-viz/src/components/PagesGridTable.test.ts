import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { TypedDataSet, Column, ColumnId } from "@casehubio/pages-data";
import { ColumnType, toTypedDataSet } from "@casehubio/pages-data";
import "./PagesGridTable.js";
import type { PagesGridTable } from "./PagesGridTable.js";

const L = { dataSetId: "test" as any, operations: [] } as const;

function col(id: string, type: ColumnType = ColumnType.LABEL): Column {
  return { id: id as ColumnId, name: id, type };
}

function ds(cols: Column[], data: (string | null)[][]): TypedDataSet {
  return toTypedDataSet({ columns: cols, data });
}

describe("pages-grid-table", () => {
  let el: PagesGridTable;

  beforeEach(() => {
    el = document.createElement("pages-grid-table");
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  describe("column headers (default on)", () => {
    it("shows column headers by default", async () => {
      el.props = { lookup: L };
      el.dataSet = ds([col("name"), col("age")], [["Alice", "30"]]);
      await el.updateComplete;
      const ths = el.shadowRoot!.querySelectorAll("thead th");
      expect(ths.length).toBe(2);
      expect(ths[0]!.textContent).toBe("name");
      expect(ths[1]!.textContent).toBe("age");
    });

    it("hides column headers when columnHeaders: false", async () => {
      el.props = { lookup: L, columnHeaders: false };
      el.dataSet = ds([col("a"), col("b")], [["1", "2"]]);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector("thead")).toBeNull();
    });
  });

  describe("row headers", () => {
    it("first column becomes th[scope=row] when rowHeaders: true", async () => {
      el.props = { lookup: L, rowHeaders: true };
      el.dataSet = ds([col("label"), col("value")], [["Status", "Running"], ["Uptime", "48h"]]);
      await el.updateComplete;

      const rowThs = el.shadowRoot!.querySelectorAll("th[scope='row']");
      expect(rowThs.length).toBe(2);
      expect(rowThs[0]!.textContent).toBe("Status");
      expect(rowThs[1]!.textContent).toBe("Uptime");
      const tds = el.shadowRoot!.querySelectorAll("tbody td");
      expect(tds.length).toBe(2);
      expect(tds[0]!.textContent).toBe("Running");
    });

    it("no row headers by default", async () => {
      el.props = { lookup: L };
      el.dataSet = ds([col("a"), col("b")], [["1", "2"]]);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelectorAll("th[scope='row']").length).toBe(0);
    });
  });

  describe("cross-matrix — both headers on", () => {
    it("renders corner cell + column headers + row headers", async () => {
      el.props = { lookup: L, columnHeaders: true, rowHeaders: true };
      el.dataSet = ds(
        [col("product"), col("Q1"), col("Q2")],
        [["Widget", "100", "120"], ["Gadget", "80", "95"]],
      );
      await el.updateComplete;

      const headerCells = el.shadowRoot!.querySelectorAll("thead th");
      expect(headerCells.length).toBe(3);
      expect(headerCells[0]!.classList.contains("corner")).toBe(true);
      expect(headerCells[0]!.textContent).toBe("");
      expect(headerCells[1]!.textContent).toBe("Q1");
      expect(headerCells[2]!.textContent).toBe("Q2");

      const rowThs = el.shadowRoot!.querySelectorAll("th[scope='row']");
      expect(rowThs.length).toBe(2);
      expect(rowThs[0]!.textContent).toBe("Widget");

      const tds = el.shadowRoot!.querySelectorAll("tbody td");
      expect(tds.length).toBe(4);
      expect(tds[0]!.textContent).toBe("100");
    });
  });

  describe("no headers", () => {
    it("columnHeaders: false + rowHeaders: false — data only", async () => {
      el.props = { lookup: L, columnHeaders: false, rowHeaders: false };
      el.dataSet = ds([col("a"), col("b")], [["1", "2"]]);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector("thead")).toBeNull();
      expect(el.shadowRoot!.querySelectorAll("th").length).toBe(0);
      expect(el.shadowRoot!.querySelectorAll("td").length).toBe(2);
    });
  });

  describe("cell display modes", () => {
    it("boolean — true renders ✓, false renders ✗", async () => {
      el.props = { lookup: L, cellDisplay: { status: "boolean" } };
      el.dataSet = ds([col("name"), col("status")], [["A", "true"], ["B", "false"]]);
      await el.updateComplete;

      const boolCells = el.shadowRoot!.querySelectorAll(".cell-bool");
      expect(boolCells.length).toBe(2);
      expect(boolCells[0]!.textContent).toBe("✓");
      expect(boolCells[0]!.classList.contains("cell-bool-true")).toBe(true);
      expect(boolCells[1]!.textContent).toBe("✗");
      expect(boolCells[1]!.classList.contains("cell-bool-false")).toBe(true);
    });

    it("color — renders swatch with value", async () => {
      el.props = { lookup: L, cellDisplay: { bg: "color" } };
      el.dataSet = ds([col("name"), col("bg")], [["Error", "#ef4444"]]);
      await el.updateComplete;

      const swatch = el.shadowRoot!.querySelector(".color-swatch") as HTMLElement;
      expect(swatch).not.toBeNull();
      expect(swatch.style.background).toBe("rgb(239, 68, 68)");
    });

    it("badge — renders styled chip", async () => {
      el.props = { lookup: L, cellDisplay: { status: "badge" } };
      el.dataSet = ds([col("name"), col("status")], [["Service A", "Active"]]);
      await el.updateComplete;

      const badge = el.shadowRoot!.querySelector(".cell-badge");
      expect(badge).not.toBeNull();
      expect(badge!.textContent).toBe("Active");
    });

    it("number — right-aligned tabular nums", async () => {
      el.props = { lookup: L, cellDisplay: { value: "number" } };
      el.dataSet = ds([col("label"), col("value")], [["CPU", "85"]]);
      await el.updateComplete;

      const numCell = el.shadowRoot!.querySelector(".cell-number");
      expect(numCell).not.toBeNull();
      expect(numCell!.textContent).toBe("85");
    });

    it("text is default — plain rendering", async () => {
      el.props = { lookup: L };
      el.dataSet = ds([col("value")], [["hello"]]);
      await el.updateComplete;
      const td = el.shadowRoot!.querySelector("td");
      expect(td!.textContent).toBe("hello");
      expect(td!.querySelector(".cell-bool")).toBeNull();
      expect(td!.querySelector(".cell-color")).toBeNull();
    });
  });

  describe("empty state", () => {
    it("renders — when dataset has no rows", async () => {
      el.props = { lookup: L };
      el.dataSet = ds([col("name")], []);
      await el.updateComplete;
      const rows = el.shadowRoot!.querySelectorAll("tbody tr");
      expect(rows.length).toBe(1);
      expect(rows[0]!.textContent).toContain("—");
    });

    it("renders — when dataset has no columns", async () => {
      el.props = { lookup: L };
      el.dataSet = ds([], []);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector(".empty-cell")).not.toBeNull();
    });
  });

  describe("compact mode", () => {
    it("compact: true sets width auto and nowrap on cells", async () => {
      el.props = { lookup: L, compact: true };
      el.dataSet = ds([col("a"), col("b")], [["hello", "world"]]);
      await el.updateComplete;
      const table = el.shadowRoot!.querySelector("table");
      expect(table!.classList.contains("compact")).toBe(true);
    });

    it("compact: false (default) renders full width", async () => {
      el.props = { lookup: L };
      el.dataSet = ds([col("a")], [["x"]]);
      await el.updateComplete;
      const table = el.shadowRoot!.querySelector("table");
      expect(table!.classList.contains("compact")).toBe(false);
    });
  });

  describe("stripe", () => {
    it("stripe: rows adds stripe-rows class", async () => {
      el.props = { lookup: L, stripe: "rows" };
      el.dataSet = ds([col("a")], [["1"], ["2"]]);
      await el.updateComplete;
      const table = el.shadowRoot!.querySelector("table")!;
      expect(table.classList.contains("stripe-rows")).toBe(true);
      expect(table.classList.contains("stripe-cols")).toBe(false);
    });

    it("stripe: columns adds stripe-cols class", async () => {
      el.props = { lookup: L, stripe: "columns" };
      el.dataSet = ds([col("a"), col("b")], [["1", "2"]]);
      await el.updateComplete;
      const table = el.shadowRoot!.querySelector("table")!;
      expect(table.classList.contains("stripe-cols")).toBe(true);
      expect(table.classList.contains("stripe-rows")).toBe(false);
    });

    it("stripe: both adds both classes", async () => {
      el.props = { lookup: L, stripe: "both" };
      el.dataSet = ds([col("a"), col("b")], [["1", "2"]]);
      await el.updateComplete;
      const table = el.shadowRoot!.querySelector("table")!;
      expect(table.classList.contains("stripe-rows")).toBe(true);
      expect(table.classList.contains("stripe-cols")).toBe(true);
    });
  });

  describe("vertical lines", () => {
    it("verticalLines: true adds v-lines class", async () => {
      el.props = { lookup: L, verticalLines: true };
      el.dataSet = ds([col("a"), col("b")], [["1", "2"]]);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector("table")!.classList.contains("v-lines")).toBe(true);
    });

    it("no v-lines class by default", async () => {
      el.props = { lookup: L };
      el.dataSet = ds([col("a"), col("b")], [["1", "2"]]);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector("table")!.classList.contains("v-lines")).toBe(false);
    });
  });

  describe("boolean edge cases", () => {
    it("recognises yes/no/on/off/1/0 as truthy/falsy", async () => {
      el.props = { lookup: L, columnHeaders: false, cellDisplay: { v: "boolean" } };
      el.dataSet = ds([col("v")], [["yes"], ["no"], ["on"], ["off"], ["1"], ["0"]]);
      await el.updateComplete;
      const cells = el.shadowRoot!.querySelectorAll(".cell-bool");
      expect(cells.length).toBe(6);
      expect(cells[0]!.classList.contains("cell-bool-true")).toBe(true);
      expect(cells[1]!.classList.contains("cell-bool-false")).toBe(true);
      expect(cells[2]!.classList.contains("cell-bool-true")).toBe(true);
      expect(cells[3]!.classList.contains("cell-bool-false")).toBe(true);
      expect(cells[4]!.classList.contains("cell-bool-true")).toBe(true);
      expect(cells[5]!.classList.contains("cell-bool-false")).toBe(true);
    });

    it("unrecognised boolean value renders as plain text in cell-bool span", async () => {
      el.props = { lookup: L, columnHeaders: false, cellDisplay: { v: "boolean" } };
      el.dataSet = ds([col("v")], [["maybe"]]);
      await el.updateComplete;
      const cell = el.shadowRoot!.querySelector(".cell-bool")!;
      expect(cell.textContent).toBe("maybe");
      expect(cell.classList.contains("cell-bool-true")).toBe(false);
      expect(cell.classList.contains("cell-bool-false")).toBe(false);
    });
  });

  describe("null cells", () => {
    it("null cell renders as empty string", async () => {
      el.props = { lookup: L, columnHeaders: false };
      el.dataSet = ds([col("a"), col("b")], [["hello", null]]);
      await el.updateComplete;
      const tds = el.shadowRoot!.querySelectorAll("td");
      expect(tds[0]!.textContent).toBe("hello");
      expect(tds[1]!.textContent).toBe("");
    });
  });

  describe("row headers without column headers", () => {
    it("no corner cell when columnHeaders: false + rowHeaders: true", async () => {
      el.props = { lookup: L, columnHeaders: false, rowHeaders: true };
      el.dataSet = ds([col("label"), col("value")], [["CPU", "42%"]]);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector("thead")).toBeNull();
      expect(el.shadowRoot!.querySelector(".corner")).toBeNull();
      expect(el.shadowRoot!.querySelectorAll("th[scope='row']").length).toBe(1);
      expect(el.shadowRoot!.querySelector("th[scope='row']")!.textContent).toBe("CPU");
    });
  });

  describe("mixed cell display types in same grid", () => {
    it("different columns use different display modes", async () => {
      el.props = { lookup: L, cellDisplay: { active: "boolean", count: "number", status: "badge" } };
      el.dataSet = ds([col("active"), col("count"), col("status")], [["true", "42", "OK"]]);
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector(".cell-bool-true")).not.toBeNull();
      expect(el.shadowRoot!.querySelector(".cell-number")).not.toBeNull();
      expect(el.shadowRoot!.querySelector(".cell-badge")).not.toBeNull();
    });
  });

  describe("transpose", () => {
    it("single row becomes vertical key-value list", async () => {
      el.props = { lookup: L, transpose: true, rowHeaders: true, columnHeaders: false };
      el.dataSet = ds(
        [col("activeCases"), col("fleetSize"), col("openCommitments")],
        [["1", "0", "3"]],
      );
      await el.updateComplete;

      const rowThs = el.shadowRoot!.querySelectorAll("th[scope='row']");
      expect(rowThs.length).toBe(3);
      expect(rowThs[0]!.textContent).toBe("activeCases");
      expect(rowThs[1]!.textContent).toBe("fleetSize");
      expect(rowThs[2]!.textContent).toBe("openCommitments");

      const tds = el.shadowRoot!.querySelectorAll("tbody td");
      expect(tds.length).toBe(3);
      expect(tds[0]!.textContent).toBe("1");
      expect(tds[1]!.textContent).toBe("0");
      expect(tds[2]!.textContent).toBe("3");
    });

    it("multi-row transpose produces one value column per original row", async () => {
      el.props = { lookup: L, transpose: true, rowHeaders: true, columnHeaders: false };
      el.dataSet = ds(
        [col("cpu"), col("mem")],
        [["80", "60"], ["90", "70"]],
      );
      await el.updateComplete;

      const rowThs = el.shadowRoot!.querySelectorAll("th[scope='row']");
      expect(rowThs.length).toBe(2);
      expect(rowThs[0]!.textContent).toBe("cpu");
      expect(rowThs[1]!.textContent).toBe("mem");

      const tds = el.shadowRoot!.querySelectorAll("tbody td");
      expect(tds.length).toBe(4);
      expect(tds[0]!.textContent).toBe("80");
      expect(tds[1]!.textContent).toBe("90");
      expect(tds[2]!.textContent).toBe("60");
      expect(tds[3]!.textContent).toBe("70");
    });

    it("transpose with no rows produces empty cells", async () => {
      el.props = { lookup: L, transpose: true, columnHeaders: false };
      el.dataSet = ds([col("a"), col("b")], []);
      await el.updateComplete;
      const rows = el.shadowRoot!.querySelectorAll("tbody tr");
      expect(rows.length).toBe(2);
    });

    it("transpose: false (default) does not transpose", async () => {
      el.props = { lookup: L };
      el.dataSet = ds([col("a"), col("b")], [["1", "2"]]);
      await el.updateComplete;
      const ths = el.shadowRoot!.querySelectorAll("thead th");
      expect(ths.length).toBe(2);
      expect(ths[0]!.textContent).toBe("a");
    });
  });

  describe("combined options", () => {
    it("compact + stripe + verticalLines all apply together", async () => {
      el.props = { lookup: L, compact: true, stripe: "both", verticalLines: true };
      el.dataSet = ds([col("a"), col("b")], [["1", "2"]]);
      await el.updateComplete;
      const table = el.shadowRoot!.querySelector("table")!;
      expect(table.classList.contains("compact")).toBe(true);
      expect(table.classList.contains("stripe-rows")).toBe(true);
      expect(table.classList.contains("stripe-cols")).toBe(true);
      expect(table.classList.contains("v-lines")).toBe(true);
    });
  });
});
