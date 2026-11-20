import { describe, it, expect } from "vitest";
import { findColumn, findColumnIndex } from "./column-lookup.js";
import type { Column } from "./types.js";
import { ColumnType, columnId } from "./types.js";

function col(id: string, type: ColumnType = ColumnType.TEXT): Column {
  return { id: columnId(id), name: id, type };
}

describe("findColumn", () => {
  const columns = [col("name"), col("age", ColumnType.NUMBER), col("dept")];

  it("finds by exact match", () => {
    expect(findColumn(columns, columnId("age"))).toBe(columns[1]);
  });

  it("finds by case-insensitive match", () => {
    expect(findColumn(columns, columnId("NAME"))).toBe(columns[0]);
  });

  it("returns undefined for missing column", () => {
    expect(findColumn(columns, columnId("missing"))).toBeUndefined();
  });

  it("returns undefined (not TypeError) for non-string id (clinical#107)", () => {
    const badId = [] as unknown as ReturnType<typeof columnId>;
    expect(findColumn(columns, badId)).toBeUndefined();
  });
});

describe("findColumnIndex", () => {
  const columns = [col("name"), col("age", ColumnType.NUMBER), col("dept")];

  it("finds index by exact match", () => {
    expect(findColumnIndex(columns, columnId("dept"))).toBe(2);
  });

  it("finds index by case-insensitive match", () => {
    expect(findColumnIndex(columns, columnId("DEPT"))).toBe(2);
  });

  it("returns -1 for missing column", () => {
    expect(findColumnIndex(columns, columnId("missing"))).toBe(-1);
  });

  it("returns -1 (not TypeError) for non-string id (clinical#107)", () => {
    const badId = [] as unknown as ReturnType<typeof columnId>;
    expect(findColumnIndex(columns, badId)).toBe(-1);
  });
});
