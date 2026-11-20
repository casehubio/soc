import { PagesChartElement } from "../base/PagesChartElement.js";
import type { TreemapChartProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
export declare class PagesTreemapChart extends PagesChartElement<TreemapChartProps> {
    buildOption(props: TreemapChartProps, dataset: TypedDataSet): Record<string, unknown>;
    private buildFlat;
    private buildHierarchical;
    private collectColorValues;
}
//# sourceMappingURL=PagesTreemapChart.d.ts.map