import type { TypedDataSet, ColumnSettings } from "@casehubio/pages-data";
import type { ChartSettingsBase } from "@casehubio/pages-component";
/**
 * Stage 1: Convert TypedDataSet to ECharts dataset.source format.
 *
 * Returns an array-of-arrays where:
 * - First row contains display names (resolved via resolveColumnName)
 * - Subsequent rows contain raw values (via cellToRaw)
 */
export declare function datasetToSource(dataset: TypedDataSet, propsColumns?: readonly ColumnSettings[]): Promise<(string | number | Date | null)[][]>;
/**
 * Stage 3: Apply typed ChartSettingsBase fields to ECharts option.
 *
 * Handles both ChartSettingsBase (all charts) and ChartSettings (Cartesian)
 * properties via structural access. Centralises escape hatch merging.
 */
export declare function applyChartSettings(option: Record<string, unknown>, props: {
    title?: string;
} & ChartSettingsBase): Record<string, unknown>;
//# sourceMappingURL=option-pipeline.d.ts.map