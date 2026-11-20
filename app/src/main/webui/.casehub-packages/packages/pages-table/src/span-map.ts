import type { TypedRow, Column, CellValue } from '@casehubio/pages-data';
import type { TableColumnConfig } from './types.js';

export interface CellSpan {
  readonly colSpan: number;
  readonly rowSpan: number;
}

export interface SuppressedCell {
  readonly originRow: number;
  readonly originCol: string;
}

export type SpanEntry = CellSpan | SuppressedCell;
export type SpanMap = Map<number, Map<string, SpanEntry>>;

export function isSuppressed(entry: SpanEntry): entry is SuppressedCell {
  return 'originRow' in entry;
}

export function isOrigin(entry: SpanEntry): entry is CellSpan {
  return 'colSpan' in entry;
}

function getOrCreateRow(map: SpanMap, rowIndex: number): Map<string, SpanEntry> {
  let row = map.get(rowIndex);
  if (!row) {
    row = new Map();
    map.set(rowIndex, row);
  }
  return row;
}

export function computeSpanMap(
  rows: readonly TypedRow[],
  _columns: readonly Column[],
  config: readonly TableColumnConfig[],
  visibleColIds: Set<string>,
): SpanMap {
  const map: SpanMap = new Map();
  const visibleColOrder = [...visibleColIds];

  for (const cfg of config) {
    const colId = String(cfg.id);
    if (!visibleColIds.has(colId)) continue;

    if (cfg.mergeRows) {
      const comparator = typeof cfg.mergeRows === 'function'
        ? cfg.mergeRows
        : (a: CellValue, b: CellValue) => {
            if (a.type === 'NULL' && b.type === 'NULL') return true;
            if (a.type === 'NULL' || b.type === 'NULL') return false;
            return a.value === b.value;
          };

      let runStart = 0;
      for (let i = 1; i <= rows.length; i++) {
        const shouldMerge = i < rows.length &&
          comparator(rows[i]!.cell(cfg.id), rows[runStart]!.cell(cfg.id));

        if (!shouldMerge) {
          const runLength = i - runStart;
          if (runLength > 1) {
            getOrCreateRow(map, runStart).set(colId, { colSpan: 1, rowSpan: runLength });
            for (let j = runStart + 1; j < i; j++) {
              getOrCreateRow(map, j).set(colId, { originRow: runStart, originCol: colId });
            }
          }
          runStart = i;
        }
      }
    }

    if (cfg.cellSpan) {
      for (let i = 0; i < rows.length; i++) {
        const existing = map.get(i)?.get(colId);
        if (existing && isSuppressed(existing)) continue;

        const span = cfg.cellSpan(rows[i]!, i);
        if (span === undefined) continue;

        const rawColSpan = span.colSpan ?? 1;
        const rawRowSpan = span.rowSpan ?? 1;
        if (rawColSpan <= 1 && rawRowSpan <= 1) continue;

        const clampedRowSpan = Math.min(rawRowSpan, rows.length - i);
        const colIndex = visibleColOrder.indexOf(colId);
        const clampedColSpan = Math.min(rawColSpan, visibleColOrder.length - colIndex);

        getOrCreateRow(map, i).set(colId, { colSpan: clampedColSpan, rowSpan: clampedRowSpan });

        for (let r = i; r < i + clampedRowSpan; r++) {
          for (let c = colIndex; c < colIndex + clampedColSpan; c++) {
            if (r === i && c === colIndex) continue;
            const suppColId = visibleColOrder[c]!;
            const row = getOrCreateRow(map, r);
            if (!row.has(suppColId)) {
              row.set(suppColId, { originRow: i, originCol: colId });
            }
          }
        }
      }
    }
  }

  return map;
}
