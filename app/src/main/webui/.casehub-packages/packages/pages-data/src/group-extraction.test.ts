import { describe, it, expect } from "vitest";
import { extractGroupBoundaries, extractGroupTree } from "./group-extraction.js";
import type { DataSet, ColumnId } from "./dataset/types.js";
import { ColumnType } from "./dataset/types.js";
import { toTypedDataSet } from "./dataset/conversion.js";
import type { GroupingKey } from "./dataset/group.js";

function makeGroupedDataset(groups: { key: string; rows: string[][] }[]) {
  const keyCol = "group_key" as ColumnId;
  const allRows: (string | null)[][] = [];
  for (const g of groups) {
    for (const row of g.rows) {
      allRows.push([g.key, ...row]);
    }
  }

  const ds: DataSet = {
    columns: [
      { id: keyCol, name: "Group", type: ColumnType.LABEL },
      { id: "name" as ColumnId, name: "Name", type: ColumnType.LABEL },
      { id: "value" as ColumnId, name: "Value", type: ColumnType.LABEL },
    ],
    data: allRows,
  };

  return { dataset: toTypedDataSet(ds), keyCol, aggCols: [] as ColumnId[] };
}

describe("extractGroupBoundaries", () => {
  it("extracts groups from consecutive key values", () => {
    const { dataset, keyCol, aggCols } = makeGroupedDataset([
      { key: "Critical", rows: [["a", "1"], ["b", "2"]] },
      { key: "Warning", rows: [["c", "3"]] },
    ]);

    const boundaries = extractGroupBoundaries(dataset, keyCol, aggCols);
    expect(boundaries).toHaveLength(2);
    expect(boundaries[0]!.name).toBe("Critical");
    expect(boundaries[0]!.startRow).toBe(0);
    expect(boundaries[0]!.rowCount).toBe(2);
    expect(boundaries[1]!.name).toBe("Warning");
    expect(boundaries[1]!.startRow).toBe(2);
    expect(boundaries[1]!.rowCount).toBe(1);
  });

  it("handles single group", () => {
    const { dataset, keyCol, aggCols } = makeGroupedDataset([
      { key: "All", rows: [["a", "1"], ["b", "2"], ["c", "3"]] },
    ]);
    const boundaries = extractGroupBoundaries(dataset, keyCol, aggCols);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]!.rowCount).toBe(3);
  });

  it("handles empty dataset", () => {
    const ds: DataSet = {
      columns: [{ id: "k" as ColumnId, name: "Key", type: ColumnType.LABEL }],
      data: [],
    };
    const boundaries = extractGroupBoundaries(toTypedDataSet(ds), "k" as ColumnId, []);
    expect(boundaries).toHaveLength(0);
  });

  it("extracts aggregate values from aggregate columns", () => {
    const keyCol = "group_key" as ColumnId;
    const aggCol = "total" as ColumnId;
    const ds: DataSet = {
      columns: [
        { id: keyCol, name: "Group", type: ColumnType.LABEL },
        { id: "name" as ColumnId, name: "Name", type: ColumnType.LABEL },
        { id: aggCol, name: "Total", type: ColumnType.NUMBER },
      ],
      data: [
        ["Critical", "a", "100"],
        ["Critical", "b", "100"],
        ["Warning", "c", "50"],
      ],
    };
    const boundaries = extractGroupBoundaries(toTypedDataSet(ds), keyCol, [aggCol]);
    expect(boundaries[0]!.aggregates.get(aggCol)).toBe(100);
    expect(boundaries[1]!.aggregates.get(aggCol)).toBe(50);
  });

  it("handles three groups", () => {
    const { dataset, keyCol, aggCols } = makeGroupedDataset([
      { key: "A", rows: [["a1", "1"]] },
      { key: "B", rows: [["b1", "2"], ["b2", "3"]] },
      { key: "C", rows: [["c1", "4"]] },
    ]);
    const boundaries = extractGroupBoundaries(dataset, keyCol, aggCols);
    expect(boundaries).toHaveLength(3);
    expect(boundaries[0]!.name).toBe("A");
    expect(boundaries[0]!.rowCount).toBe(1);
    expect(boundaries[1]!.name).toBe("B");
    expect(boundaries[1]!.startRow).toBe(1);
    expect(boundaries[1]!.rowCount).toBe(2);
    expect(boundaries[2]!.name).toBe("C");
    expect(boundaries[2]!.startRow).toBe(3);
    expect(boundaries[2]!.rowCount).toBe(1);
  });
});

function makeKey(column: string): GroupingKey {
  return {
    sourceId: column as ColumnId,
    columnId: column as ColumnId,
    strategy: { mode: "distinct" },
    maxIntervals: 100,
    emptyIntervals: false,
    ascendingOrder: true,
  };
}

function makeMultiLevelDataset(rows: { phase: string; status: string; name: string }[]) {
  const ds: DataSet = {
    columns: [
      { id: "phase" as ColumnId, name: "Phase", type: ColumnType.LABEL },
      { id: "status" as ColumnId, name: "Status", type: ColumnType.LABEL },
      { id: "name" as ColumnId, name: "Name", type: ColumnType.LABEL },
    ],
    data: rows.map((r) => [r.phase, r.status, r.name]),
  };
  return toTypedDataSet(ds);
}

describe("extractGroupTree", () => {
  it("single key produces flat GroupNode list", () => {
    const { dataset } = makeGroupedDataset([
      { key: "A", rows: [["x", "1"], ["y", "2"]] },
      { key: "B", rows: [["z", "3"]] },
    ]);
    const nodes = extractGroupTree(dataset, [makeKey("group_key")], []);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]!.name).toBe("A");
    expect(nodes[0]!.depth).toBe(0);
    expect(nodes[0]!.children).toHaveLength(0);
    expect(nodes[0]!.rowCount).toBe(2);
    expect(nodes[1]!.name).toBe("B");
    expect(nodes[1]!.rowCount).toBe(1);
  });

  it("two keys produce nested GroupNode tree", () => {
    const dataset = makeMultiLevelDataset([
      { phase: "UI", status: "done", name: "a" },
      { phase: "UI", status: "done", name: "b" },
      { phase: "UI", status: "open", name: "c" },
      { phase: "API", status: "done", name: "d" },
    ]);
    const nodes = extractGroupTree(dataset, [makeKey("phase"), makeKey("status")], []);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]!.name).toBe("UI");
    expect(nodes[0]!.depth).toBe(0);
    expect(nodes[0]!.children).toHaveLength(2);
    expect(nodes[0]!.children[0]!.name).toBe("done");
    expect(nodes[0]!.children[0]!.depth).toBe(1);
    expect(nodes[0]!.children[0]!.rowCount).toBe(2);
    expect(nodes[0]!.children[1]!.name).toBe("open");
    expect(nodes[0]!.children[1]!.rowCount).toBe(1);
    expect(nodes[1]!.name).toBe("API");
    expect(nodes[1]!.children).toHaveLength(1);
  });

  it("empty dataset produces empty array", () => {
    const ds: DataSet = {
      columns: [{ id: "k" as ColumnId, name: "Key", type: ColumnType.LABEL }],
      data: [],
    };
    const nodes = extractGroupTree(toTypedDataSet(ds), [makeKey("k")], []);
    expect(nodes).toHaveLength(0);
  });

  it("no keys produces empty array", () => {
    const { dataset } = makeGroupedDataset([
      { key: "A", rows: [["x", "1"]] },
    ]);
    const nodes = extractGroupTree(dataset, [], []);
    expect(nodes).toHaveLength(0);
  });
});
