import { PagesChartElement } from "../base/PagesChartElement.js";
import type { LineChartProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
export declare class PagesLineChart extends PagesChartElement<LineChartProps> {
    buildOption(props: LineChartProps, dataset: TypedDataSet): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=PagesLineChart.d.ts.map