import type { SaveAdapter, SaveResult } from "../save-adapter.js";
import type { ColumnId, TypedDataSet, CellValue } from "@casehubio/pages-data";
import type { DataSetManager } from "@casehubio/pages-data";
import { createTypedRow } from "@casehubio/pages-data";
import { ColumnType } from "@casehubio/pages-data";

/** Stringify a record value that is known to be a non-null primitive at runtime. */
function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

export function createLocalAdapter(manager: DataSetManager): SaveAdapter {
  return {
    save(dataSetId, record, changedFields, idColumn, idValue): Promise<SaveResult> {
      const existing = manager.get(dataSetId);
      if (!existing) {
        return Promise.resolve({ success: false, error: `Dataset "${String(dataSetId)}" not found` });
      }

      const rowIndex = existing.rows.findIndex(row => {
        const cell = row.cell(idColumn as ColumnId);
        return cell.type !== "NULL" && String(cell.value) === String(idValue);
      });

      if (rowIndex === -1) {
        return Promise.resolve({ success: false, error: `Record with ${idColumn}=${String(idValue)} not found` });
      }

      const oldRow = existing.rows[rowIndex];
      if (!oldRow) {
        return Promise.resolve({ success: false, error: `Row at index ${String(rowIndex)} not found` });
      }
      const newCells: CellValue[] = oldRow.cells.map((cell, i) => {
        const col = existing.columns[i];
        if (!col) {
          return cell;
        }
        if (changedFields.includes(col.id)) {
          const newValue = record[col.id as string];
          if (newValue === null || newValue === undefined) {
            return { type: "NULL" as const };
          }
          // Preserve cell type, update value
          switch (cell.type) {
            case ColumnType.NUMBER: {
              const num = Number(newValue);
              if (Number.isNaN(num)) return { type: "NULL" as const };
              return { type: ColumnType.NUMBER, value: num } as const;
            }
            case ColumnType.DATE: {
              const date = new Date(stringifyValue(newValue));
              if (Number.isNaN(date.getTime())) return { type: "NULL" as const };
              return { type: ColumnType.DATE, value: date } as const;
            }
            case ColumnType.TEXT:
              return { type: ColumnType.TEXT, value: stringifyValue(newValue) } as const;
            case ColumnType.LABEL:
              return { type: ColumnType.LABEL, value: stringifyValue(newValue) } as const;
            default:
              return cell;
          }
        }
        return cell;
      });

      const newRow = createTypedRow(newCells, existing.columns);
      const newRows = [...existing.rows];
      newRows[rowIndex] = newRow;
      const newDataset: TypedDataSet = { columns: existing.columns, rows: newRows };
      manager.apply(dataSetId, { type: "snapshot", dataset: newDataset });

      return Promise.resolve({ success: true });
    },

    delete(dataSetId, idColumn, idValue): Promise<SaveResult> {
      const existing = manager.get(dataSetId);
      if (!existing) {
        return Promise.resolve({ success: false, error: `Dataset "${String(dataSetId)}" not found` });
      }

      const rowIndex = existing.rows.findIndex(row => {
        const cell = row.cell(idColumn as ColumnId);
        return cell.type !== "NULL" && String(cell.value) === String(idValue);
      });

      if (rowIndex === -1) {
        return Promise.resolve({ success: false, error: `Record with ${idColumn}=${String(idValue)} not found` });
      }

      const newRows = [...existing.rows];
      newRows.splice(rowIndex, 1);
      const newDataset: TypedDataSet = { columns: existing.columns, rows: newRows };
      manager.apply(dataSetId, { type: "snapshot", dataset: newDataset });

      return Promise.resolve({ success: true });
    },

    create(dataSetId, record): Promise<SaveResult> {
      const existing = manager.get(dataSetId);
      if (!existing) {
        return Promise.resolve({ success: false, error: `Dataset "${String(dataSetId)}" not found` });
      }

      const newCells: CellValue[] = existing.columns.map((col) => {
        const value = record[col.id as string];
        if (value === null || value === undefined) {
          return { type: "NULL" as const };
        }
        switch (col.type) {
          case ColumnType.NUMBER:
            return { type: ColumnType.NUMBER, value: Number(value) } as const;
          case ColumnType.DATE:
            return { type: ColumnType.DATE, value: new Date(stringifyValue(value)) } as const;
          case ColumnType.TEXT:
            return { type: ColumnType.TEXT, value: stringifyValue(value) } as const;
          case ColumnType.LABEL:
            return { type: ColumnType.LABEL, value: stringifyValue(value) } as const;
          default:
            return { type: "NULL" as const };
        }
      });

      const newRow = createTypedRow(newCells, existing.columns);
      const newDataset: TypedDataSet = { columns: existing.columns, rows: [...existing.rows, newRow] };
      manager.apply(dataSetId, { type: "snapshot", dataset: newDataset });

      return Promise.resolve({ success: true });
    },
  };
}
