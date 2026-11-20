import { PagesChartElement } from "../base/PagesChartElement.js";
import type { TimeseriesProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
export declare class PagesTimeseries extends PagesChartElement<TimeseriesProps> {
    buildOption(props: TimeseriesProps, dataset: TypedDataSet): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=PagesTimeseries.d.ts.map