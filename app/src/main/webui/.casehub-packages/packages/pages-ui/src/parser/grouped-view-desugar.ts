import type {Component} from "../model/types.js";
import type {ColumnId} from "@casehubio/pages-data";
import type {Aggregation, GroupingKey, GroupStrategy} from "@casehubio/pages-data";
import type {AggregationBinding} from "@casehubio/pages-component";
import { parseLookup } from "@casehubio/pages-data";

function parseStrategy(raw: Record<string, unknown>): GroupStrategy {
  const strategy = (raw.strategy as string | undefined) ?? "distinct";
  switch (strategy) {
    case "distinct":
      return { mode: "distinct" };
    case "fixedCalendar": {
      const unit = raw.unit as string | undefined;
      if (!unit) throw new Error("Unit is required when strategy is fixedCalendar");
      return { mode: "fixedCalendar", unit: unit as "QUARTER" | "MONTH" | "DAY_OF_WEEK" | "HOUR" | "MINUTE" | "SECOND" };
    }
    case "dynamicRange":
      return { mode: "dynamicRange", preferredUnit: raw.preferredUnit as string | undefined } as GroupStrategy;
    case "dynamic":
      return { mode: "dynamic", preferredUnit: raw.preferredUnit as string | undefined } as GroupStrategy;
    default:
      throw new Error(`Unknown group strategy: ${strategy}`);
  }
}

function parseAggregation(fnStr: string): Aggregation {
  switch (fnStr) {
    case "SUM": return { fn: "SUM" };
    case "AVERAGE": case "AVG": return { fn: "AVERAGE" };
    case "MEDIAN": return { fn: "MEDIAN" };
    case "COUNT": return { fn: "COUNT" };
    case "DISTINCT": return { fn: "DISTINCT" };
    case "MIN": return { fn: "MIN" };
    case "MAX": return { fn: "MAX" };
    case "JOIN": return { fn: "JOIN", separator: ", " };
    case "DISTINCTJOIN": return { fn: "DISTINCTJOIN", separator: ", " };
    default:
      throw new Error(`Unknown aggregation function: ${fnStr}`);
  }
}

export function desugarGroupedView(raw: Record<string, unknown>): Component {
  const groupByRaw = raw.groupBy;
  if (!groupByRaw) throw new Error("grouped-view requires a groupBy field");

  const order = raw.order as string | undefined;

  function parseSingleGroupBy(g: Record<string, unknown>): GroupingKey {
    const column = g.column as string;
    return {
      sourceId: column as ColumnId,
      columnId: column as ColumnId,
      strategy: parseStrategy(g),
      maxIntervals: (g.maxIntervals as number) ?? 100,
      emptyIntervals: (raw.emptyGroups as boolean) ?? false,
      ascendingOrder: order === "desc" ? false : true,
    };
  }

  const groupBy: GroupingKey | GroupingKey[] = Array.isArray(groupByRaw)
    ? (groupByRaw as Record<string, unknown>[]).map(parseSingleGroupBy)
    : parseSingleGroupBy(groupByRaw as Record<string, unknown>);

  const aggregations: AggregationBinding[] = ((raw.aggregations as Array<Record<string, unknown>>) ?? []).map((a) => ({
    column: a.column as ColumnId,
    fn: parseAggregation(a.fn as string),
  }));

  const groupDisplay = raw.groupDisplay as string | undefined;
  const contentDisplay = raw.contentDisplay as string | undefined;
  if (groupDisplay === "table-row" && contentDisplay === "list") {
    throw new Error(
      "Invalid combination: groupDisplay 'table-row' + contentDisplay 'list'. " +
      "<dl> content cannot render inside table rows.",
    );
  }

  const props: Record<string, unknown> = { groupBy };

  if (raw.preset != null) props.preset = raw.preset;
  if (groupDisplay != null) props.groupDisplay = groupDisplay;
  if (contentDisplay != null) props.contentDisplay = contentDisplay;
  if (raw.defaultExpanded != null) props.defaultExpanded = raw.defaultExpanded;
  if (raw.showGroupSummary != null) props.showGroupSummary = raw.showGroupSummary;
  if (aggregations.length > 0) props.aggregations = aggregations;
  if (order != null) props.order = order;
  if (raw.emptyGroups != null) props.emptyGroups = raw.emptyGroups;
  if (raw.columnConfig != null) props.columnConfig = raw.columnConfig;
  if (raw.rowStyle != null) props.rowStyle = raw.rowStyle;
  if (raw.selection != null) props.selection = raw.selection;
  if (raw.sortable != null) props.sortable = raw.sortable;
  if (raw.clientSort != null) props.clientSort = raw.clientSort;
  if (raw.rowAccent != null) props.rowAccent = raw.rowAccent;

  if (raw.lookup != null) {
    props.lookup = parseLookup(raw.lookup);
  }

  return { type: "grouped-view", props };
}
