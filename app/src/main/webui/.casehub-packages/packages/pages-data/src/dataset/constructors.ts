import type { DataSetId, ColumnId } from "./types.js";
import { DataSetError } from "./errors.js";

export function dataSetId(id: string): DataSetId {
  if (typeof id !== "string") {
    throw new DataSetError("INVALID_ARGUMENT", `dataSetId expects a string, got ${typeof id}`);
  }
  return id as DataSetId;
}

export function columnId(id: string): ColumnId {
  if (typeof id !== "string") {
    throw new DataSetError("INVALID_ARGUMENT", `columnId expects a string, got ${typeof id}`);
  }
  return id as ColumnId;
}
