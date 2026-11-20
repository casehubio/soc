import { describe, it, expect } from "vitest";
import { desugarGroupedView } from "./grouped-view-desugar.js";

describe("desugarGroupedView", () => {
  it("desugars minimal grouped-view YAML", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "status", strategy: "distinct" },
    });
    expect(result.type).toBe("grouped-view");
    expect(result.props).toBeDefined();
    const props = result.props as Record<string, unknown>;
    expect(props.groupBy).toBeDefined();
    const groupBy = props.groupBy as Record<string, unknown>;
    expect(groupBy.strategy).toEqual({ mode: "distinct" });
  });

  it("desugars fixedCalendar strategy with unit", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "date", strategy: "fixedCalendar", unit: "MONTH" },
    });
    const groupBy = (result.props as Record<string, unknown>).groupBy as Record<string, unknown>;
    expect(groupBy.strategy).toEqual({ mode: "fixedCalendar", unit: "MONTH" });
  });

  it("rejects fixedCalendar without unit", () => {
    expect(() => desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "date", strategy: "fixedCalendar" },
    })).toThrow(/unit.*required/i);
  });

  it("desugars dynamicRange strategy", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "ts", strategy: "dynamicRange", preferredUnit: "MONTH" },
    });
    const groupBy = (result.props as Record<string, unknown>).groupBy as Record<string, unknown>;
    expect(groupBy.strategy).toEqual({ mode: "dynamicRange", preferredUnit: "MONTH" });
  });

  it("desugars aggregations", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "status", strategy: "distinct" },
      aggregations: [{ column: "amount", fn: "SUM" }],
    });
    const props = result.props as Record<string, unknown>;
    const aggs = props.aggregations as Array<Record<string, unknown>>;
    expect(aggs).toHaveLength(1);
    expect(aggs[0]!.column).toBe("amount");
    expect(aggs[0]!.fn).toEqual({ fn: "SUM" });
  });

  it("maps preset field through", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "status", strategy: "distinct" },
      preset: "spreadsheet",
    });
    expect((result.props as Record<string, unknown>).preset).toBe("spreadsheet");
  });

  it("maps order field to ascendingOrder", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "status", strategy: "distinct" },
      order: "desc",
    });
    const groupBy = (result.props as Record<string, unknown>).groupBy as Record<string, unknown>;
    expect(groupBy.ascendingOrder).toBe(false);
  });

  it("defaults to ascending order", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "status", strategy: "distinct" },
    });
    const groupBy = (result.props as Record<string, unknown>).groupBy as Record<string, unknown>;
    expect(groupBy.ascendingOrder).toBe(true);
  });

  it("rejects table-row + list combination", () => {
    expect(() => desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "status", strategy: "distinct" },
      groupDisplay: "table-row",
      contentDisplay: "list",
    })).toThrow(/invalid.*combination/i);
  });

  it("rejects unknown strategy", () => {
    expect(() => desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "status", strategy: "bogus" },
    })).toThrow(/unknown.*strategy/i);
  });

  it("maps emptyGroups to emptyIntervals", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "status", strategy: "distinct" },
      emptyGroups: true,
    });
    const groupBy = (result.props as Record<string, unknown>).groupBy as Record<string, unknown>;
    expect(groupBy.emptyIntervals).toBe(true);
  });

  it("defaults strategy to distinct when not specified", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "department" },
    });
    const groupBy = (result.props as Record<string, unknown>).groupBy as Record<string, unknown>;
    expect(groupBy.strategy).toEqual({ mode: "distinct" });
    expect(groupBy.columnId).toBe("department");
  });

  it("parses lookup with uuid normalization", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "dept" },
      lookup: { uuid: "team-data" },
    });
    const lookup = (result.props as Record<string, unknown>).lookup as { dataSetId: string };
    expect(lookup.dataSetId).toBe("team-data");
  });

  it("accepts AVG as alias for AVERAGE in aggregations", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "dept" },
      aggregations: [{ column: "salary", fn: "AVG" }],
    });
    const aggs = (result.props as Record<string, unknown>).aggregations as Array<{ fn: { fn: string } }>;
    expect(aggs[0]!.fn).toEqual({ fn: "AVERAGE" });
  });

  it("preserves preset and display options", () => {
    const result = desugarGroupedView({
      type: "GROUPED_VIEW",
      groupBy: { column: "dept" },
      preset: "spreadsheet",
      defaultExpanded: true,
      showGroupSummary: true,
    });
    const props = result.props as Record<string, unknown>;
    expect(props.preset).toBe("spreadsheet");
    expect(props.defaultExpanded).toBe(true);
    expect(props.showGroupSummary).toBe(true);
  });

  it("passes through columnConfig", () => {
    const result = desugarGroupedView({
      groupBy: { column: "status" },
      lookup: { uuid: "test" },
      columnConfig: [
        { id: "name", width: "2fr", sortable: true },
        { id: "age", width: "1fr", align: "center" },
      ],
    });
    expect((result.props as any).columnConfig).toEqual([
      { id: "name", width: "2fr", sortable: true },
      { id: "age", width: "1fr", align: "center" },
    ]);
  });

  it("passes through rowStyle", () => {
    const result = desugarGroupedView({
      groupBy: { column: "status" },
      lookup: { uuid: "test" },
      rowStyle: [{ condition: "true", className: "highlight" }],
    });
    expect((result.props as any).rowStyle).toEqual([
      { condition: "true", className: "highlight" },
    ]);
  });

  it("passes through selection", () => {
    const result = desugarGroupedView({
      groupBy: { column: "status" },
      lookup: { uuid: "test" },
      selection: "multi",
    });
    expect((result.props as any).selection).toBe("multi");
  });

  it("passes through sortable", () => {
    const result = desugarGroupedView({
      groupBy: { column: "status" },
      lookup: { uuid: "test" },
      sortable: true,
    });
    expect((result.props as any).sortable).toBe(true);
  });

  it("parses array groupBy into multiple GroupingKeys", () => {
    const result = desugarGroupedView({
      groupBy: [{ column: "phase" }, { column: "status" }],
      lookup: { uuid: "data" },
    });
    const gb = (result.props as any).groupBy;
    expect(Array.isArray(gb)).toBe(true);
    expect(gb.length).toBe(2);
    expect(gb[0].columnId).toBe("phase");
    expect(gb[1].columnId).toBe("status");
  });

  it("parses single object groupBy as before (not array)", () => {
    const result = desugarGroupedView({
      groupBy: { column: "dept" },
      lookup: { uuid: "data" },
    });
    const gb = (result.props as any).groupBy;
    expect(Array.isArray(gb)).toBe(false);
    expect(gb.columnId).toBe("dept");
  });

  it("passes through rowAccent config", () => {
    const result = desugarGroupedView({
      groupBy: { column: "dept" },
      lookup: { uuid: "data" },
      rowAccent: { column: "status", colorMap: { done: "#2e7d32" } },
    });
    expect((result.props as any).rowAccent).toEqual({
      column: "status",
      colorMap: { done: "#2e7d32" },
    });
  });

  it("passes through clientSort", () => {
    const result = desugarGroupedView({
      groupBy: { column: "dept" },
      lookup: { uuid: "data" },
      clientSort: true,
    });
    expect((result.props as any).clientSort).toBe(true);
  });
});
