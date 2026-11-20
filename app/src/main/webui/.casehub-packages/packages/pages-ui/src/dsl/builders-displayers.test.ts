import { describe, it, expect } from "vitest";
import {
  barChart,
  lineChart,
  areaChart,
  pieChart,
  scatterChart,
  bubbleChart,
  timeseries,
  dataTable,
  gridTable,
  metric,
  meter,
  selector,
  mapChart,
  iframePlugin,
  schemaForm,
  actionButton,
  formScope,
  textInput,
  numberInput,
  columns,
} from "./builders.js";
import { lookup, groupBy, col, sum } from "./lookup-helpers.js";
import { isBarChart, isDataTable, isGridTable, isMetric } from "../model/type-guards.js";

describe("data component builders", () => {
  const salesLookup = lookup("sales", groupBy("product", col("product"), sum("revenue")));

  it("barChart()", () => {
    const c = barChart({ lookup: salesLookup, subtype: "bar-stacked", title: "Revenue" });
    expect(isBarChart(c)).toBe(true);
    expect(c.props!["subtype"]).toBe("bar-stacked");
    expect(c.props!["title"]).toBe("Revenue");
  });

  it("lineChart()", () => {
    const c = lineChart({ lookup: salesLookup, subtype: "smooth" });
    expect(c.type).toBe("line-chart");
    expect(c.props!["subtype"]).toBe("smooth");
  });

  it("areaChart()", () => {
    const c = areaChart({ lookup: salesLookup, subtype: "area-stacked" });
    expect(c.type).toBe("area-chart");
  });

  it("pieChart()", () => {
    const c = pieChart({ lookup: salesLookup, subtype: "donut" });
    expect(c.type).toBe("pie-chart");
    expect(c.props!["subtype"]).toBe("donut");
  });

  it("scatterChart()", () => {
    const c = scatterChart({ lookup: salesLookup });
    expect(c.type).toBe("scatter-chart");
  });

  it("bubbleChart() with radius", () => {
    const c = bubbleChart({ lookup: salesLookup, minRadius: 5, maxRadius: 50 });
    expect(c.type).toBe("bubble-chart");
    expect(c.props!["minRadius"]).toBe(5);
    expect(c.props!["maxRadius"]).toBe(50);
  });

  it("timeseries()", () => {
    const c = timeseries({ lookup: salesLookup });
    expect(c.type).toBe("timeseries");
  });

  it("dataTable()", () => {
    const c = dataTable({ lookup: salesLookup, pageSize: 10, sortable: true });
    expect(isDataTable(c)).toBe(true);
    expect(c.props!["pageSize"]).toBe(10);
    expect(c.props!["sortable"]).toBe(true);
  });

  it("gridTable()", () => {
    const c = gridTable({ lookup: salesLookup, columnHeaders: true, rowHeaders: true, compact: true });
    expect(isGridTable(c)).toBe(true);
    expect(c.type).toBe("grid-table");
    expect(c.props!["columnHeaders"]).toBe(true);
    expect(c.props!["rowHeaders"]).toBe(true);
    expect(c.props!["compact"]).toBe(true);
  });

  it("gridTable() with cellDisplay and stripe", () => {
    const c = gridTable({ lookup: salesLookup, cellDisplay: { status: "boolean" }, stripe: "rows", verticalLines: true });
    expect(isGridTable(c)).toBe(true);
    expect(c.props!["cellDisplay"]).toEqual({ status: "boolean" });
    expect(c.props!["stripe"]).toBe("rows");
    expect(c.props!["verticalLines"]).toBe(true);
  });

  it("metric() with subtype", () => {
    const c = metric({ lookup: salesLookup, subtype: "card" });
    expect(isMetric(c)).toBe(true);
    expect(c.props!["subtype"]).toBe("card");
  });

  it("meter()", () => {
    const c = meter({ lookup: salesLookup, end: 100, warning: 70, critical: 90 });
    expect(c.type).toBe("meter");
    expect(c.props!["end"]).toBe(100);
  });

  it("selector()", () => {
    const c = selector({ lookup: salesLookup, subtype: "labels" });
    expect(c.type).toBe("selector");
    expect(c.props!["subtype"]).toBe("labels");
  });

  it("mapChart()", () => {
    const c = mapChart({ lookup: salesLookup, subtype: "markers", colorScheme: "blues" });
    expect(c.type).toBe("map");
    expect(c.props!["colorScheme"]).toBe("blues");
  });

  it("iframePlugin() without lookup", () => {
    const c = iframePlugin({ componentId: "uniforms" });
    expect(c.type).toBe("iframe-plugin");
    expect(c.props!["componentId"]).toBe("uniforms");
    expect(c.props!["lookup"]).toBeUndefined();
  });

  it("iframePlugin() with lookup and refresh", () => {
    const c = iframePlugin({
      componentId: "echarts",
      lookup: salesLookup,
      refresh: { interval: 30 },
    });
    expect(c.props!["lookup"]).toBeDefined();
    expect(c.props!.refresh!.interval).toBe(30);
  });

  it("all builders return frozen components", () => {
    const c = barChart({ lookup: salesLookup });
    expect(Object.isFrozen(c)).toBe(true);
  });

  it("schemaForm()", () => {
    const c = schemaForm({
      schema: { properties: { name: { type: "string", minLength: 1 } }, required: ["name"] },
      excludeFields: ["id"],
      labels: { name: "Full Name" },
      fieldOrder: ["name"],
      validateOnBlur: true,
      forceCreate: true,
    });
    expect(c.type).toBe("schema-form");
    expect(c.props!["schema"]!.properties!["name"]!.type).toBe("string");
    expect(c.props!["excludeFields"]).toEqual(["id"]);
    expect(c.props!["forceCreate"]).toBe(true);
    expect(Object.isFrozen(c)).toBe(true);
  });

  it("actionButton()", () => {
    const c = actionButton({
      label: "Activate Trial",
      url: "/api/trials/{trialId}/activate",
      method: "POST",
      style: "primary",
      confirm: "Are you sure?",
      onSuccess: { message: "Trial activated", refresh: ["trial-summary"] },
      onError: { message: "Activation failed" },
    });
    expect(c.type).toBe("action-button");
    expect(c.props!["label"]).toBe("Activate Trial");
    expect(c.props!["method"]).toBe("POST");
    expect(c.props!["style"]).toBe("primary");
    expect(c.props!["confirm"]).toBe("Are you sure?");
    expect(Object.isFrozen(c)).toBe(true);
  });

  it("formScope() wraps children with validation context", () => {
    const c = formScope(
      {
        schema: { properties: { name: { type: "string" }, age: { type: "number" } }, required: ["name"] },
        validateOnBlur: true,
      },
      columns([6, 6],
        [textInput({ field: "name", label: "Name" })],
        [numberInput({ field: "age", label: "Age" })],
      ),
    );
    expect(c.type).toBe("form-scope");
    expect(c.props!["schema"]!.required).toEqual(["name"]);
    expect(c.props!["validateOnBlur"]).toBe(true);
    expect(c.slots!["default"]).toHaveLength(1);
    expect((c.slots!["default"]![0] as any).type).toBe("columns");
    expect(Object.isFrozen(c)).toBe(true);
  });
});
