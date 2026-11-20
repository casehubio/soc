import type { Column, ColumnId } from "./types.js";

export function findColumn(columns: readonly Column[], id: ColumnId): Column | undefined {
  return columns.find((c) => c.id === id)
    ?? (typeof id === "string"
      ? columns.find((c) => typeof c.id === "string" && c.id.toLowerCase() === id.toLowerCase())
      : undefined);
}

export function findColumnIndex(columns: readonly Column[], id: ColumnId): number {
  let idx = columns.findIndex((c) => c.id === id);
  if (idx === -1 && typeof id === "string") {
    idx = columns.findIndex((c) => typeof c.id === "string" && c.id.toLowerCase() === id.toLowerCase());
  }
  return idx;
}
