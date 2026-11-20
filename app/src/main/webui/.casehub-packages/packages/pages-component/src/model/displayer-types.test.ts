import { describe, it, expectTypeOf } from "vitest";
import type { ChartSettingsBase, ChartSettings, DataComponentCommon, PieChartProps, MapProps, GraphProps, MeterProps, TreemapChartProps } from "./displayer-types.js";

describe("ChartSettingsBase hierarchy", () => {
  it("ChartSettingsBase has resizable, legend, margin, extra", () => {
    expectTypeOf<ChartSettingsBase>().toHaveProperty("resizable");
    expectTypeOf<ChartSettingsBase>().toHaveProperty("legend");
    expectTypeOf<ChartSettingsBase>().toHaveProperty("margin");
    expectTypeOf<ChartSettingsBase>().toHaveProperty("extra");
  });

  it("ChartSettingsBase does NOT have xAxis, yAxis, grid, zoom", () => {
    expectTypeOf<ChartSettingsBase>().not.toHaveProperty("xAxis");
    expectTypeOf<ChartSettingsBase>().not.toHaveProperty("yAxis");
    expectTypeOf<ChartSettingsBase>().not.toHaveProperty("grid");
    expectTypeOf<ChartSettingsBase>().not.toHaveProperty("zoom");
  });

  it("ChartSettings extends ChartSettingsBase with xAxis, yAxis, grid, zoom", () => {
    expectTypeOf<ChartSettings>().toHaveProperty("xAxis");
    expectTypeOf<ChartSettings>().toHaveProperty("yAxis");
    expectTypeOf<ChartSettings>().toHaveProperty("grid");
    expectTypeOf<ChartSettings>().toHaveProperty("zoom");
    expectTypeOf<ChartSettings>().toHaveProperty("resizable");
  });

  it("DataComponentCommon has maxWidth and maxHeight", () => {
    expectTypeOf<DataComponentCommon>().toHaveProperty("maxWidth");
    expectTypeOf<DataComponentCommon>().toHaveProperty("maxHeight");
  });

  it("non-Cartesian charts extend ChartSettingsBase, not ChartSettings", () => {
    expectTypeOf<PieChartProps>().toHaveProperty("resizable");
    expectTypeOf<PieChartProps>().not.toHaveProperty("xAxis");
    expectTypeOf<MapProps>().not.toHaveProperty("xAxis");
    expectTypeOf<GraphProps>().not.toHaveProperty("xAxis");
    expectTypeOf<MeterProps>().not.toHaveProperty("xAxis");
    expectTypeOf<TreemapChartProps>().not.toHaveProperty("xAxis");
  });
});
