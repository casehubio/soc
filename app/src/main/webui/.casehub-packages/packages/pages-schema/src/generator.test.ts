import { describe, it, expect } from "vitest";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { resolve } from "path";

describe("schema generator", () => {
  const generatedPath = resolve(__dirname, "component-schemas.generated.ts");

  it("generated file exists", () => {
    expect(existsSync(generatedPath)).toBe(true);
  });

  it("generated file has AUTO-GENERATED header", () => {
    const content = readFileSync(generatedPath, "utf-8");
    expect(content).toContain("AUTO-GENERATED");
  });

  it("exports a schema for every ComponentTypeRegistry entry", () => {
    const content = readFileSync(generatedPath, "utf-8");
    const expectedKeys = [
      "grid", "columns", "rows", "stack", "tabs", "pills", "sidebar",
      "tree", "menu", "accordion", "carousel", "split", "dockBar",
      "hostPanel", "floatingWorkspace", "panel", "html", "markdown",
      "title", "lazyPage", "page", "barChart", "lineChart", "areaChart",
      "pieChart", "scatterChart", "bubbleChart", "timeseries",
      "heatmapChart", "treemapChart", "densityHeatmap", "metricGrid",
      "dataTable", "gridTable", "metric", "meter", "selector", "map",
      "badge", "countdown", "timeline", "graph", "eventTimeline",
      "groupedView", "iframePlugin", "textInput", "numberInput", "dropdown",
      "checkbox", "datePicker", "textarea", "schemaForm", "actionButton",
      "formScope", "submitButton",
    ];
    for (const key of expectedKeys) {
      expect(content).toContain(`export const ${key}PropsSchema`);
    }
  });

  it("does not contain function-typed properties", () => {
    const content = readFileSync(generatedPath, "utf-8");
    expect(content).not.toContain("cellSpan:");
    expect(content).not.toContain("renderAfterHeader:");
  });

  it("uses lookupSchema for DataSetLookup fields", () => {
    const content = readFileSync(generatedPath, "utf-8");
    expect(content).toContain("lookupSchema");
  });

  it("generated schemas parse valid bar chart data", async () => {
    const { barChartPropsSchema } = await import("./component-schemas.generated.js");
    const result = barChartPropsSchema.safeParse({
      lookup: { uuid: "ds-1" },
      subtype: "column",
    });
    expect(result.success).toBe(true);
  });

  it("generated schemas parse valid metric data", async () => {
    const { metricPropsSchema } = await import("./component-schemas.generated.js");
    const result = metricPropsSchema.safeParse({
      lookup: { uuid: "ds-1" },
      subtype: "card",
    });
    expect(result.success).toBe(true);
  });

  it("generated schemas reject unknown properties in strict mode", async () => {
    const { metricPropsSchema } = await import("./component-schemas.generated.js");
    const strict = z.strictObject(metricPropsSchema.shape);
    const result = strict.safeParse({
      lookup: { uuid: "ds-1" },
      unknownProp: "should fail",
    });
    expect(result.success).toBe(false);
  });

  it("exports componentSchemaMap", () => {
    const content = readFileSync(generatedPath, "utf-8");
    expect(content).toContain("export const componentSchemaMap");
  });

  it("generated file is not stale", () => {
    const current = readFileSync(generatedPath, "utf-8");
    execSync("yarn workspace @casehubio/pages-schema run generate", { stdio: "pipe" });
    const regenerated = readFileSync(generatedPath, "utf-8");
    expect(regenerated).toBe(current);
  });
});
