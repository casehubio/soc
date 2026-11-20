import { use } from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  DatasetComponent,
} from "echarts/components";
import { PagesChartElement } from "../base/PagesChartElement.js";
import type { BarChartProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import { datasetToSource, applyChartSettings } from "./option-pipeline.js";

import { customElement } from "lit/decorators.js";

// Register required ECharts components
use([BarChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, DatasetComponent]);

@customElement("pages-bar-chart")
export class PagesBarChart extends PagesChartElement<BarChartProps> {
  override async buildOption(
    props: BarChartProps,
    dataset: TypedDataSet,
  ): Promise<Record<string, unknown>> {
    // Stage 1: Convert dataset to source
    const source = await datasetToSource(dataset, props.columns);

    // Stage 2: Build base option
    const subtype = props.subtype || "column";
    const isHorizontal = subtype === "bar" || subtype === "bar-stacked";
    const isStacked = subtype === "column-stacked" || subtype === "bar-stacked";

    // Generate series for each data column (skip first column = category)
    const series: Record<string, unknown>[] = [];
    for (let i = 1; i < dataset.columns.length; i++) {
      const seriesEntry: Record<string, unknown> = {
        type: "bar",
        encode: isHorizontal ? { y: 0, x: i } : { x: 0, y: i },
      };
      if (isStacked) {
        seriesEntry.stack = "total";
      }
      if (props.barWidth !== undefined) seriesEntry.barWidth = props.barWidth;
      if (props.barGap !== undefined) seriesEntry.barGap = props.barGap;
      series.push(seriesEntry);
    }

    let option: Record<string, unknown> = {
      dataset: { source },
      xAxis: isHorizontal ? { type: "value" } : { type: "category" },
      yAxis: isHorizontal ? { type: "category" } : { type: "value" },
      series,
      tooltip: { trigger: "axis" },
    };

    // Stage 3: Apply ChartSettings + escape hatches
    option = applyChartSettings(option, props);

    return option;
  }
}

