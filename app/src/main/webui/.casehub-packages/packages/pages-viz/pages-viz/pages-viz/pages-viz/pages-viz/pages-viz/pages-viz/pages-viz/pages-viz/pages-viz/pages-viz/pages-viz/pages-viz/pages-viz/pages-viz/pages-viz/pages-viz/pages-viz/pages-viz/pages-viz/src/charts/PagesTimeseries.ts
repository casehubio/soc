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
import type { TimeseriesProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import { ColumnType } from "@casehubio/pages-data";
import { datasetToSource, applyChartSettings } from "./option-pipeline.js";

import { customElement } from "lit/decorators.js";

// Register required ECharts components
use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, DatasetComponent]);

@customElement("pages-timeseries")
export class PagesTimeseries extends PagesChartElement<TimeseriesProps> {
  override async buildOption(
    props: TimeseriesProps,
    dataset: TypedDataSet,
  ): Promise<Record<string, unknown>> {
    // Stage 1: Convert dataset to source
    const source = await datasetToSource(dataset, props.columns);

    // Stage 2: Build base option
    // Determine time axis column: if column 0 is LABEL, use column 1 as time axis
    const col0Type = dataset.columns[0]?.type;
    const timeCol = col0Type === ColumnType.LABEL && dataset.columns.length > 2 ? 1 : 0;
    const series: Record<string, unknown>[] = [];
    for (let i = timeCol + 1; i < dataset.columns.length; i++) {
      const entry: Record<string, unknown> = {
        type: "line",
        encode: { x: timeCol, y: i },
      };
      if (props.connectNulls !== undefined) entry.connectNulls = props.connectNulls;
      series.push(entry);
    }

    let option: Record<string, unknown> = {
      dataset: { source },
      xAxis: { type: "time" },
      yAxis: { type: "value" },
      series,
      tooltip: { trigger: "axis" },
    };

    // Stage 3: Apply ChartSettings + escape hatches
    option = applyChartSettings(option, props);

    return option;
  }
}

