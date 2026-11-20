import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  DatasetComponent,
} from "echarts/components";
import { PagesChartElement } from "../base/PagesChartElement.js";
import type { LineChartProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import { datasetToSource, applyChartSettings } from "./option-pipeline.js";

import { customElement } from "lit/decorators.js";

// Register required ECharts components
use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, DatasetComponent]);

@customElement("pages-line-chart")
export class PagesLineChart extends PagesChartElement<LineChartProps> {
  override async buildOption(
    props: LineChartProps,
    dataset: TypedDataSet,
  ): Promise<Record<string, unknown>> {
    // Stage 1: Convert dataset to source
    const source = await datasetToSource(dataset, props.columns);

    // Stage 2: Build base option
    const subtype = props.subtype || "line";
    const isSmooth = subtype === "smooth";

    // Generate series for each data column (skip first column = category)
    const series: Record<string, unknown>[] = [];
    for (let i = 1; i < dataset.columns.length; i++) {
      const seriesEntry: Record<string, unknown> = {
        type: "line",
        encode: { x: 0, y: i },
      };
      if (isSmooth) {
        seriesEntry.smooth = true;
      }
      if (props.step !== undefined && props.step !== false) seriesEntry.step = props.step;
      if (props.connectNulls !== undefined) seriesEntry.connectNulls = props.connectNulls;
      if (props.showSymbol !== undefined) seriesEntry.showSymbol = props.showSymbol;
      series.push(seriesEntry);
    }

    let option: Record<string, unknown> = {
      dataset: { source },
      xAxis: { type: "category" },
      yAxis: { type: "value" },
      series,
      tooltip: { trigger: "axis" },
    };

    // Stage 3: Apply ChartSettings + escape hatches
    option = applyChartSettings(option, props);

    return option;
  }
}

