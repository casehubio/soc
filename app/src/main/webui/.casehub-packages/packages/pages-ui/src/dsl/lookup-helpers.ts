import type { DataSetId, ColumnId } from "@casehubio/pages-data";
import type { DataSetLookup } from "@casehubio/pages-data";
import { createLookup } from "@casehubio/pages-data";
import type { DataSetOp } from "@casehubio/pages-data";
import type { FilterOp, FilterExpression, CoreFunctionType } from "@casehubio/pages-data";
import type {
  GroupOp,
  ResultColumn,
  GroupingKey,
  Aggregation,
  FixedCalendarUnit,
} from "@casehubio/pages-data";
import type { SortOp, SortColumn, SortOrder } from "@casehubio/pages-data";

// Main lookup builder
export function lookup(dataSetId: string, ...ops: DataSetOp[]): DataSetLookup {
  return createLookup(dataSetId as DataSetId, ops);
}

// Group builders
export function groupBy(source: string | null, ...resultColumns: ResultColumn[]): GroupOp {
  if (source !== null && typeof source !== "string") {
    throw new Error(`groupBy source must be a string column name or null, got: ${typeof source}`);
  }
  if (source === null) {
    return Object.freeze({
      type: "group" as const,
      groupingKey: null,
      columns: Object.freeze(processResultColumns(null, resultColumns)),
    });
  }

  const groupingKey: GroupingKey = Object.freeze({
    sourceId: source as ColumnId,
    columnId: source as ColumnId,
    strategy: Object.freeze({ mode: "distinct" as const }),
    maxIntervals: 15,
    emptyIntervals: false,
    ascendingOrder: true,
  });

  return Object.freeze({
    type: "group" as const,
    groupingKey,
    columns: Object.freeze(processResultColumns(source, resultColumns)),
  });
}

export function groupByCalendar(
  source: string,
  unit: FixedCalendarUnit,
  ...resultColumns: ResultColumn[]
): GroupOp {
  const groupingKey: GroupingKey = Object.freeze({
    sourceId: source as ColumnId,
    columnId: source as ColumnId,
    strategy: Object.freeze({ mode: "fixedCalendar" as const, unit }),
    maxIntervals: 15,
    emptyIntervals: false,
    ascendingOrder: true,
  });

  return Object.freeze({
    type: "group" as const,
    groupingKey,
    columns: Object.freeze(processResultColumns(source, resultColumns)),
  });
}

// Process result columns to infer kind for col() helper
function processResultColumns(
  groupSource: string | null,
  columns: readonly ResultColumn[],
): readonly ResultColumn[] {
  const mapped = columns.map((col) => {
    if (col.kind === "select" && groupSource !== null && col.sourceId === (groupSource as ColumnId)) {
      return Object.freeze({
        ...col,
        kind: "key" as const,
      });
    }
    return col;
  });

  if (groupSource !== null && !mapped.some(c => c.sourceId === (groupSource as ColumnId))) {
    const keyCol: ResultColumn = Object.freeze({
      kind: "key" as const,
      sourceId: groupSource as ColumnId,
      columnId: groupSource as ColumnId,
    });
    return [keyCol, ...mapped];
  }

  return mapped;
}

// Filter builders
export function filterBy(
  column: string,
  fn: CoreFunctionType,
  ...args: readonly (string | number | Date)[]
): FilterOp {
  const serializedArgs = args.map((arg) => {
    if (arg instanceof Date) {
      return arg.toISOString();
    }
    return String(arg);
  });

  const expression: FilterExpression = Object.freeze({
    type: "unresolved" as const,
    columnId: column as ColumnId,
    fn,
    args: Object.freeze(serializedArgs),
  });

  return Object.freeze({
    type: "filter" as const,
    expressions: Object.freeze([expression]),
  });
}

export function and(...filters: FilterOp[]): FilterOp {
  const allExpressions = filters.flatMap((f) => f.expressions);
  const combinedExpression: FilterExpression = Object.freeze({
    type: "and" as const,
    children: Object.freeze(allExpressions),
  });

  return Object.freeze({
    type: "filter" as const,
    expressions: Object.freeze([combinedExpression]),
  });
}

export function or(...filters: FilterOp[]): FilterOp {
  const allExpressions = filters.flatMap((f) => f.expressions);
  const combinedExpression: FilterExpression = Object.freeze({
    type: "or" as const,
    children: Object.freeze(allExpressions),
  });

  return Object.freeze({
    type: "filter" as const,
    expressions: Object.freeze([combinedExpression]),
  });
}

export function not(filter: FilterOp): FilterOp {
  const firstExpression = filter.expressions[0];
  if (!firstExpression) {
    throw new Error("Filter must have at least one expression");
  }
  const expression: FilterExpression = Object.freeze({
    type: "not" as const,
    child: firstExpression,
  });

  return Object.freeze({
    type: "filter" as const,
    expressions: Object.freeze([expression]),
  });
}

// Sort builder
export function sortBy(column: string, order: SortOrder = "ASCENDING"): SortOp {
  const sortColumn: SortColumn = Object.freeze({
    columnId: column as ColumnId,
    order,
  });

  return Object.freeze({
    type: "sort" as const,
    columns: Object.freeze([sortColumn]),
  });
}

// Result column helpers
export function col(source: string, alias?: string): ResultColumn {
  return Object.freeze({
    kind: "select" as const, // groupBy() promotes to "key" if sourceId matches the group source
    sourceId: source as ColumnId,
    columnId: (alias ?? source) as ColumnId,
  });
}

export function sum(source: string, alias?: string): ResultColumn {
  const fn: Aggregation = Object.freeze({ fn: "SUM" as const });
  return Object.freeze({
    kind: "aggregate" as const,
    sourceId: source as ColumnId,
    columnId: (alias ?? source) as ColumnId,
    fn,
  });
}

export function avg(source: string, alias?: string): ResultColumn {
  const fn: Aggregation = Object.freeze({ fn: "AVERAGE" as const });
  return Object.freeze({
    kind: "aggregate" as const,
    sourceId: source as ColumnId,
    columnId: (alias ?? source) as ColumnId,
    fn,
  });
}

export function count(source: string, alias?: string): ResultColumn {
  const fn: Aggregation = Object.freeze({ fn: "COUNT" as const });
  return Object.freeze({
    kind: "aggregate" as const,
    sourceId: source as ColumnId,
    columnId: (alias ?? source) as ColumnId,
    fn,
  });
}

export function min(source: string, alias?: string): ResultColumn {
  const fn: Aggregation = Object.freeze({ fn: "MIN" as const });
  return Object.freeze({
    kind: "aggregate" as const,
    sourceId: source as ColumnId,
    columnId: (alias ?? source) as ColumnId,
    fn,
  });
}

export function max(source: string, alias?: string): ResultColumn {
  const fn: Aggregation = Object.freeze({ fn: "MAX" as const });
  return Object.freeze({
    kind: "aggregate" as const,
    sourceId: source as ColumnId,
    columnId: (alias ?? source) as ColumnId,
    fn,
  });
}

export function distinct(source: string, alias?: string): ResultColumn {
  const fn: Aggregation = Object.freeze({ fn: "DISTINCT" as const });
  return Object.freeze({
    kind: "aggregate" as const,
    sourceId: source as ColumnId,
    columnId: (alias ?? source) as ColumnId,
    fn,
  });
}

export function join(source: string, separator: string = ", ", alias?: string): ResultColumn {
  const fn: Aggregation = Object.freeze({ fn: "JOIN" as const, separator });
  return Object.freeze({
    kind: "aggregate" as const,
    sourceId: source as ColumnId,
    columnId: (alias ?? source) as ColumnId,
    fn,
  });
}

export function distinctJoin(source: string, separator: string = ", ", alias?: string): ResultColumn {
  const fn: Aggregation = Object.freeze({ fn: "DISTINCTJOIN" as const, separator });
  return Object.freeze({
    kind: "aggregate" as const,
    sourceId: source as ColumnId,
    columnId: (alias ?? source) as ColumnId,
    fn,
  });
}
