import type { DataSetOp } from "./ops.js";
import type { GroupOp, ResultColumn } from "./group.js";
import type { FilterOp } from "./filter.js";
import type { SortOp } from "./sort.js";
import { expect } from "vitest";

export function expectGroupOp(op: DataSetOp): GroupOp {
  expect(op.type).toBe("group");
  return op as GroupOp;
}

export function expectFilterOp(op: DataSetOp): FilterOp {
  expect(op.type).toBe("filter");
  return op as FilterOp;
}

export function expectSortOp(op: DataSetOp): SortOp {
  expect(op.type).toBe("sort");
  return op as SortOp;
}

export function expectAggregateColumn(
  col: ResultColumn,
): ResultColumn & { kind: "aggregate" } {
  expect(col.kind).toBe("aggregate");
  return col as ResultColumn & { kind: "aggregate" };
}
