import { PagesChartElement } from "../base/PagesChartElement.js";
import type { BarChartProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
export declare class PagesBarChart extends PagesChartElement<BarChartProps> {
    buildOption(props: BarChartProps, dataset: TypedDataSet): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=PagesBarChart.d.ts.map