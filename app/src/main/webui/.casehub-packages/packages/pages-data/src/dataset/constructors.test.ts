import { describe, it, expect } from "vitest";
import { dataSetId, columnId } from "./constructors.js";
import type { DataSetId, ColumnId } from "./types.js";
describe("branded type constructors", () => {
  it("dataSetId creates a DataSetId from a string", () => {
    const id: DataSetId = dataSetId("my-dataset");
    expect(id).toBe("my-dataset");
  });

  it("columnId creates a ColumnId from a string", () => {
    const id: ColumnId = columnId("col-1");
    expect(id).toBe("col-1");
  });

  it("DataSetId is assignable where DataSetId is expected", () => {
    const id = dataSetId("ds");
    const fn = (dsId: DataSetId) => dsId;
    expect(fn(id)).toBe("ds");
  });

  it("ColumnId is assignable where ColumnId is expected", () => {
    const id = columnId("c");
    const fn = (colId: ColumnId) => colId;
    expect(fn(id)).toBe("c");
  });

  it("columnId rejects non-string input (clinical#107)", () => {
    expect(() => columnId([] as unknown as string)).toThrow(/string/);
    expect(() => columnId(42 as unknown as string)).toThrow(/string/);
    expect(() => columnId(undefined as unknown as string)).toThrow(/string/);
  });

  it("dataSetId rejects non-string input", () => {
    expect(() => dataSetId([] as unknown as string)).toThrow(/string/);
  });
});
