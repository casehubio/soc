import { describe, it, expect } from "vitest";
import {
  validateLookup,
  DEFAULT_CONSTRAINTS,
  type DataSetLookupConstraints,
} from "./lookup-constraints.js";
import { createLookup } from "./lookup.js";
import { ColumnType, dataSetId, columnId} from "./types.js";
import type { Column, DataSetId } from "./types.js";
import type { GroupOp } from "./group.js";
import type { ResolvedFilterOp } from "./filter.js";

function dsId(id: string): DataSetId {
  return dataSetId(id);
}

function col(id: string, type: ColumnType): Column {
  return { id: columnId(id), name: id, type };
}

function groupingKey(id: string) {
  return {
    sourceId: columnId(id),
    columnId: columnId(id),
    strategy: { mode: "distinct" as const },
    maxIntervals: 15,
    emptyIntervals: false,
    ascendingOrder: true,
  };
}

function groupOp(keyId: string | null, ...columnIds: string[]): GroupOp {
  return {
    type: "group",
    groupingKey: keyId ? {
      sourceId: columnId(keyId),
      columnId: columnId(keyId),
      strategy: { mode: "distinct" },
      maxIntervals: 15,
      emptyIntervals: false,
      ascendingOrder: true,
    } : null,
    columns: columnIds.map((id) => ({
      kind: "aggregate",
      sourceId: columnId(id),
      columnId: columnId(id),
      fn: { fn: "COUNT" },
    })),
  };
}

describe("validateLookup", () => {
  it("returns no violations for valid lookup", () => {
    const lookup = createLookup(dsId("test"), [groupOp("x", "y")]);
    const violations = validateLookup(lookup, DEFAULT_CONSTRAINTS);
    expect(violations).toHaveLength(0);
  });

  it("returns no violations for empty ops with no group required", () => {
    const lookup = createLookup(dsId("test"), []);
    const violations = validateLookup(lookup, DEFAULT_CONSTRAINTS);
    expect(violations).toHaveLength(0);
  });

  describe("FILTER_NOT_ALLOWED", () => {
    it("detects filter when not allowed", () => {
      const filter: ResolvedFilterOp = {
        type: "filter",
        expressions: [{ type: "numeric", columnId: columnId("x"), filter: { fn: "IS_NULL" } }],
      };
      const lookup = createLookup(dsId("test"), [filter]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, filterAllowed: false };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("FILTER_NOT_ALLOWED");
    });

    it("allows filter when filterAllowed is true", () => {
      const filter: ResolvedFilterOp = {
        type: "filter",
        expressions: [{ type: "numeric", columnId: columnId("x"), filter: { fn: "IS_NULL" } }],
      };
      const lookup = createLookup(dsId("test"), [filter, groupOp("x")]);
      const violations = validateLookup(lookup, DEFAULT_CONSTRAINTS);
      expect(violations).toHaveLength(0);
    });
  });

  describe("GROUP_NOT_ALLOWED", () => {
    it("detects group when not allowed", () => {
      const lookup = createLookup(dsId("test"), [groupOp("x")]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, groupAllowed: false };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("GROUP_NOT_ALLOWED");
    });
  });

  describe("GROUP_REQUIRED", () => {
    it("detects missing group when required", () => {
      const lookup = createLookup(dsId("test"), []);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, groupRequired: true };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("GROUP_REQUIRED");
    });

    it("allows group when required", () => {
      const lookup = createLookup(dsId("test"), [groupOp("x")]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, groupRequired: true };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });
  });

  describe("TOO_MANY_GROUPS", () => {
    it("detects too many groups (key + select)", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: groupingKey("x"),
        columns: [
          { kind: "select", sourceId: columnId("y"), columnId: columnId("y") },
          { kind: "aggregate", sourceId: columnId("z"), columnId: columnId("z"), fn: { fn: "COUNT" } },
        ],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, maxGroups: 1 };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("TOO_MANY_GROUPS");
    });

    it("allows maxGroups groups exactly", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: groupingKey("x"),
        columns: [
          { kind: "select", sourceId: columnId("y"), columnId: columnId("y") },
          { kind: "aggregate", sourceId: columnId("z"), columnId: columnId("z"), fn: { fn: "COUNT" } },
        ],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, maxGroups: 2 };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });

    it("no violation when maxGroups is undefined", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: groupingKey("x"),
        columns: [
          { kind: "select", sourceId: columnId("y"), columnId: columnId("y") },
          { kind: "select", sourceId: columnId("z"), columnId: columnId("z") },
          { kind: "aggregate", sourceId: columnId("w"), columnId: columnId("w"), fn: { fn: "COUNT" } },
        ],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const violations = validateLookup(lookup, DEFAULT_CONSTRAINTS);
      expect(violations).toHaveLength(0);
    });
  });

  describe("TOO_FEW_COLUMNS", () => {
    it("detects too few columns", () => {
      const lookup = createLookup(dsId("test"), [groupOp("x")]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, minColumns: 3 };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("TOO_FEW_COLUMNS");
    });

    it("allows minColumns columns exactly", () => {
      const lookup = createLookup(dsId("test"), [groupOp("x", "y")]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, minColumns: 2 };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });
  });

  describe("TOO_MANY_COLUMNS", () => {
    it("detects too many columns", () => {
      const lookup = createLookup(dsId("test"), [groupOp("x", "y", "z")]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, maxColumns: 2 };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("TOO_MANY_COLUMNS");
    });

    it("allows maxColumns columns exactly", () => {
      const lookup = createLookup(dsId("test"), [groupOp("x", "y")]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, maxColumns: 2 };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });
  });

  describe("COLUMN_TYPE_MISMATCH", () => {
    it("detects type mismatch for key column (always LABEL)", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: groupingKey("x"),
        columns: [{ kind: "aggregate", sourceId: columnId("y"), columnId: columnId("y"), fn: { fn: "COUNT" } }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.NUMBER]],
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("COLUMN_TYPE_MISMATCH");
      expect(violations[0]!.position).toBe(0);
    });

    it("accepts key column when LABEL expected", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: groupingKey("x"),
        columns: [{ kind: "aggregate", sourceId: columnId("y"), columnId: columnId("y"), fn: { fn: "COUNT" } }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.LABEL], [ColumnType.NUMBER]],
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });

    it("detects type mismatch for COUNT (always NUMBER)", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [{ kind: "aggregate", sourceId: columnId("x"), columnId: columnId("x"), fn: { fn: "COUNT" } }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.LABEL]],
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("COLUMN_TYPE_MISMATCH");
    });

    it("accepts COUNT when NUMBER expected", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [{ kind: "aggregate", sourceId: columnId("x"), columnId: columnId("x"), fn: { fn: "COUNT" } }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.NUMBER]],
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });

    it("accepts DISTINCT/SUM/AVERAGE/MEDIAN when NUMBER expected", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [
          { kind: "aggregate", sourceId: columnId("a"), columnId: columnId("a"), fn: { fn: "DISTINCT" } },
          { kind: "aggregate", sourceId: columnId("b"), columnId: columnId("b"), fn: { fn: "SUM" } },
          { kind: "aggregate", sourceId: columnId("c"), columnId: columnId("c"), fn: { fn: "AVERAGE" } },
          { kind: "aggregate", sourceId: columnId("d"), columnId: columnId("d"), fn: { fn: "MEDIAN" } },
        ],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.NUMBER], [ColumnType.NUMBER], [ColumnType.NUMBER], [ColumnType.NUMBER]],
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });

    it("accepts JOIN when TEXT expected", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [{ kind: "aggregate", sourceId: columnId("x"), columnId: columnId("x"), fn: { fn: "JOIN", separator: "," } }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.TEXT]],
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });

    it("detects type mismatch for JOIN (always TEXT)", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [{ kind: "aggregate", sourceId: columnId("x"), columnId: columnId("x"), fn: { fn: "JOIN", separator: "," } }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.NUMBER]],
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("COLUMN_TYPE_MISMATCH");
    });

    it("validates MIN/MAX with source column type", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [
          { kind: "aggregate", sourceId: columnId("x"), columnId: columnId("x"), fn: { fn: "MIN" } },
          { kind: "aggregate", sourceId: columnId("y"), columnId: columnId("y"), fn: { fn: "MAX" } },
        ],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const cols = [col("x", ColumnType.DATE), col("y", ColumnType.NUMBER)];
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.DATE], [ColumnType.NUMBER]],
      };

      const violations = validateLookup(lookup, constraints, cols);
      expect(violations).toHaveLength(0);
    });

    it("detects MIN/MAX type mismatch", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [{ kind: "aggregate", sourceId: columnId("x"), columnId: columnId("x"), fn: { fn: "MIN" } }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const cols = [col("x", ColumnType.DATE)];
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.NUMBER]],
      };

      const violations = validateLookup(lookup, constraints, cols);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("COLUMN_TYPE_MISMATCH");
    });

    it("skips MIN/MAX validation when columns absent", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [{ kind: "aggregate", sourceId: columnId("x"), columnId: columnId("x"), fn: { fn: "MIN" } }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.NUMBER]],
      };

      const violations = validateLookup(lookup, constraints); // no columns param
      expect(violations).toHaveLength(0); // skipped because source-dependent
    });

    it("validates select with source column type", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: groupingKey("x"),
        columns: [{ kind: "select", sourceId: columnId("y"), columnId: columnId("y") }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const cols = [col("x", ColumnType.LABEL), col("y", ColumnType.TEXT)];
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.LABEL], [ColumnType.TEXT]],
      };

      const violations = validateLookup(lookup, constraints, cols);
      expect(violations).toHaveLength(0);
    });

    it("detects select type mismatch", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: groupingKey("x"),
        columns: [{ kind: "select", sourceId: columnId("y"), columnId: columnId("y") }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const cols = [col("x", ColumnType.LABEL), col("y", ColumnType.DATE)];
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.LABEL], [ColumnType.NUMBER]],
      };

      const violations = validateLookup(lookup, constraints, cols);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("COLUMN_TYPE_MISMATCH");
    });

    it("skips select validation when columns absent", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: groupingKey("x"),
        columns: [{ kind: "select", sourceId: columnId("y"), columnId: columnId("y") }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.LABEL], [ColumnType.NUMBER]],
      };

      const violations = validateLookup(lookup, constraints); // no columns param
      expect(violations).toHaveLength(0); // skipped
    });

    it("accepts type from union", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [{ kind: "aggregate", sourceId: columnId("x"), columnId: columnId("x"), fn: { fn: "COUNT" } }],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.LABEL, ColumnType.NUMBER, ColumnType.TEXT]],
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });
  });

  describe("DUPLICATE_COLUMN_IDS", () => {
    it("detects duplicate column IDs", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [
          { kind: "aggregate", sourceId: columnId("x"), columnId: columnId("dup"), fn: { fn: "COUNT" } },
          { kind: "aggregate", sourceId: columnId("y"), columnId: columnId("dup"), fn: { fn: "SUM" } },
        ],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, uniqueColumnIds: true };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("DUPLICATE_COLUMN_IDS");
      expect(violations[0]!.message).toContain("dup");
    });

    it("allows duplicate IDs when uniqueColumnIds is false", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [
          { kind: "aggregate", sourceId: columnId("x"), columnId: columnId("dup"), fn: { fn: "COUNT" } },
          { kind: "aggregate", sourceId: columnId("y"), columnId: columnId("dup"), fn: { fn: "SUM" } },
        ],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, uniqueColumnIds: false };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });

    it("detects multiple duplicate IDs", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [
          { kind: "aggregate", sourceId: columnId("a"), columnId: columnId("dup1"), fn: { fn: "COUNT" } },
          { kind: "aggregate", sourceId: columnId("b"), columnId: columnId("dup1"), fn: { fn: "SUM" } },
          { kind: "aggregate", sourceId: columnId("c"), columnId: columnId("dup2"), fn: { fn: "COUNT" } },
          { kind: "aggregate", sourceId: columnId("d"), columnId: columnId("dup2"), fn: { fn: "SUM" } },
        ],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = { ...DEFAULT_CONSTRAINTS, uniqueColumnIds: true };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("DUPLICATE_COLUMN_IDS");
      expect(violations[0]!.message).toContain("dup1");
      expect(violations[0]!.message).toContain("dup2");
    });
  });

  describe("EXTRA_COLUMNS_NOT_ALLOWED", () => {
    it("detects extra columns when not allowed", () => {
      const lookup = createLookup(dsId("test"), [groupOp("x", "y", "z")]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.LABEL], [ColumnType.NUMBER]],
        extraColumnsAllowed: false,
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("EXTRA_COLUMNS_NOT_ALLOWED");
    });

    it("allows extra columns when extraColumnsAllowed is true", () => {
      const lookup = createLookup(dsId("test"), [groupOp("x", "y", "z")]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.LABEL], [ColumnType.NUMBER]],
        extraColumnsAllowed: true,
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });
  });

  describe("EXTRA_COLUMN_TYPE_MISMATCH", () => {
    it("detects extra column type mismatch", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: groupingKey("x"),
        columns: [
          { kind: "aggregate", sourceId: columnId("y"), columnId: columnId("y"), fn: { fn: "COUNT" } },
          { kind: "aggregate", sourceId: columnId("z"), columnId: columnId("z"), fn: { fn: "JOIN", separator: "," } },
        ],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.LABEL]],
        extraColumnsAllowed: true,
        extraColumnsType: ColumnType.NUMBER,
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.code).toBe("EXTRA_COLUMN_TYPE_MISMATCH");
      expect(violations[0]!.position).toBe(2); // third column (index 2)
    });

    it("allows extra columns with correct type", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: groupingKey("x"),
        columns: [
          { kind: "aggregate", sourceId: columnId("y"), columnId: columnId("y"), fn: { fn: "COUNT" } },
          { kind: "aggregate", sourceId: columnId("z"), columnId: columnId("z"), fn: { fn: "SUM" } },
        ],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.LABEL]],
        extraColumnsAllowed: true,
        extraColumnsType: ColumnType.NUMBER,
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });

    it("skips extra column type check when extraColumnsType is undefined", () => {
      const group: GroupOp = {
        type: "group",
        groupingKey: groupingKey("x"),
        columns: [
          { kind: "aggregate", sourceId: columnId("y"), columnId: columnId("y"), fn: { fn: "COUNT" } },
          { kind: "aggregate", sourceId: columnId("z"), columnId: columnId("z"), fn: { fn: "JOIN", separator: "," } },
        ],
      };
      const lookup = createLookup(dsId("test"), [group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        columnTypes: [[ColumnType.LABEL]],
        extraColumnsAllowed: true,
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations).toHaveLength(0);
    });
  });

  describe("Multiple violations", () => {
    it("returns all violations for a single lookup", () => {
      const filter: ResolvedFilterOp = {
        type: "filter",
        expressions: [{ type: "numeric", columnId: columnId("x"), filter: { fn: "IS_NULL" } }],
      };
      const group: GroupOp = {
        type: "group",
        groupingKey: null,
        columns: [{ kind: "aggregate", sourceId: columnId("x"), columnId: columnId("x"), fn: { fn: "COUNT" } }],
      };
      const lookup = createLookup(dsId("test"), [filter, group]);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        filterAllowed: false,
        minColumns: 3,
        columnTypes: [[ColumnType.LABEL]], // expect LABEL, got NUMBER
      };

      const violations = validateLookup(lookup, constraints);
      expect(violations.length).toBeGreaterThanOrEqual(3);
      const codes = violations.map((v) => v.code);
      expect(codes).toContain("FILTER_NOT_ALLOWED");
      expect(codes).toContain("TOO_FEW_COLUMNS");
      expect(codes).toContain("COLUMN_TYPE_MISMATCH");
    });
  });

  describe("No group ops", () => {
    it("skips column validation when no group ops present", () => {
      const lookup = createLookup(dsId("test"), []);
      const constraints: DataSetLookupConstraints = {
        ...DEFAULT_CONSTRAINTS,
        minColumns: 3,
        maxColumns: 5,
        columnTypes: [[ColumnType.LABEL]],
        uniqueColumnIds: true,
      };

      const violations = validateLookup(lookup, constraints);
      // Only GROUP_REQUIRED violation possible, no column count/type violations
      expect(violations.every((v) => v.code === "GROUP_REQUIRED")).toBe(true);
    });
  });
});
