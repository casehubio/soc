import type { DataSetLookup, ColumnSettings, ColumnId, CellValue, TypedRow, Column } from "@casehubio/pages-data";
import type { FilterSettings, RefreshSettings } from "./component-props.js";
import type { RowAccentConfig } from "./grouped-view-types.js";
import type { CasehubEChartsExtension } from "./echarts-extension.js";
import type { CasehubHeatmapExtension } from "./heatmap-extension.js";
import type { CasehubReactFlowExtension } from "./reactflow-extension.js";
import type { CasehubElkExtension } from "./elk-extension.js";

export interface DataComponentCommon {
  readonly title?: string;
  readonly visible?: boolean;
  readonly width?: string;
  readonly height?: string;
  readonly maxWidth?: number;
  readonly maxHeight?: number;
  readonly csvExport?: boolean;
  readonly lookup: DataSetLookup;
  readonly rowCount?: number;
  readonly rowOffset?: number;
  readonly columns?: readonly ColumnSettings[];
  readonly filter?: FilterSettings;
  readonly refresh?: RefreshSettings;
}

export interface ChartSettingsBase {
  readonly maxWidth?: number;
  readonly maxHeight?: number;
  readonly resizable?: boolean;
  readonly tooltip?: {
    readonly show?: boolean;
    readonly trigger?: "item" | "axis" | "none";
  };
  readonly animation?: boolean;
  readonly color?: readonly string[];
  readonly backgroundColor?: string;
  readonly legend?: {
    readonly show?: boolean;
    readonly position?: "top" | "bottom" | "left" | "right";
    readonly orient?: "horizontal" | "vertical";
    readonly selectedMode?: boolean | "single" | "multiple";
  };
  readonly margin?: {
    readonly top?: number;
    readonly right?: number;
    readonly bottom?: number;
    readonly left?: number;
  };
  readonly extra?: Readonly<Record<string, unknown>>;
  readonly echarts?: CasehubEChartsExtension;
}

export interface ChartSettings extends ChartSettingsBase {
  readonly zoom?: boolean | {
    readonly enabled?: boolean;
    readonly start?: number;
    readonly end?: number;
  };
  readonly xAxis?: {
    readonly title?: string;
    readonly showLabels?: boolean;
    readonly labelAngle?: number;
    readonly type?: "value" | "category" | "time" | "log";
    readonly min?: number | "dataMin";
    readonly max?: number | "dataMax";
    readonly inverse?: boolean;
  };
  readonly yAxis?: {
    readonly title?: string;
    readonly showLabels?: boolean;
    readonly labelAngle?: number;
    readonly type?: "value" | "category" | "time" | "log";
    readonly min?: number | "dataMin";
    readonly max?: number | "dataMax";
    readonly inverse?: boolean;
  };
  readonly grid?: { readonly x?: boolean; readonly y?: boolean };
}

export interface BarChartProps extends DataComponentCommon, ChartSettings {
  readonly subtype?: "column" | "column-stacked" | "bar" | "bar-stacked";
  readonly barWidth?: string | number;
  readonly barGap?: string;
}

export interface LineChartProps extends DataComponentCommon, ChartSettings {
  readonly subtype?: "line" | "smooth";
  readonly step?: false | "start" | "end" | "middle";
  readonly connectNulls?: boolean;
  readonly showSymbol?: boolean;
}

export interface AreaChartProps extends DataComponentCommon, ChartSettings {
  readonly subtype?: "area" | "area-stacked";
}

export interface PieChartProps extends DataComponentCommon, ChartSettingsBase {
  readonly subtype?: "pie" | "donut";
  readonly roseType?: "radius" | "area";
  readonly startAngle?: number;
  readonly clockwise?: boolean;
}

export interface ScatterChartProps extends DataComponentCommon, ChartSettings {
  readonly symbolSize?: number;
}

export interface BubbleChartProps extends DataComponentCommon, ChartSettings {
  readonly minRadius?: number;
  readonly maxRadius?: number;
}

export interface TimeseriesProps extends DataComponentCommon, ChartSettings {
  readonly connectNulls?: boolean;
}

export interface RowStyleRule {
  readonly condition: string;
  readonly className?: string;
  readonly style?: Record<string, string>;
}

export interface ExpandableConfig {
  readonly idColumn: ColumnId;
  readonly parentColumn: ColumnId;
  readonly defaultExpanded?: boolean | number;
}

export type ColumnAlign = "start" | "center" | "end";

export interface TableColumnConfig {
  readonly id: ColumnId;
  readonly label?: string;
  readonly sortable?: boolean;
  readonly visible?: boolean;
  readonly width?: string;
  readonly minWidth?: string;
  readonly align?: ColumnAlign;
  readonly filterable?: boolean;
  readonly cellSpan?: (row: TypedRow, rowIndex: number) =>
    { colSpan?: number; rowSpan?: number } | undefined;
  readonly mergeRows?: boolean | ((valueA: CellValue, valueB: CellValue) => boolean);
}

export type SelectionMode = "none" | "single" | "multi";

export type ColumnRenderer = (cell: CellValue, row: TypedRow, column: Column) => unknown;

export interface RowDetailConfig {
  readonly mode?: "single" | "multi";
  readonly columns?: readonly { readonly id: string; readonly label?: string }[];
}

export interface DataTableProps extends DataComponentCommon {
  readonly pageSize?: number;
  readonly pageSizeOptions?: readonly number[];
  readonly sortable?: boolean;
  readonly resizable?: boolean;
  readonly rowStyle?: readonly RowStyleRule[];
  readonly rowAccent?: RowAccentConfig;
  readonly rowDetail?: RowDetailConfig;
  readonly rowHeight?: number | "auto";
  readonly expandable?: ExpandableConfig;
  readonly selection?: SelectionMode;
  readonly selectionKey?: string;
  readonly hiddenColumns?: readonly string[];
}

export type CellDisplay = "text" | "boolean" | "color" | "badge" | "number";

export type GridStripe = "rows" | "columns" | "both";

export interface GridTableProps extends DataComponentCommon {
  readonly columnHeaders?: boolean;
  readonly rowHeaders?: boolean;
  readonly cellDisplay?: Readonly<Record<string, CellDisplay>>;
  readonly compact?: boolean;
  readonly stripe?: GridStripe;
  readonly verticalLines?: boolean;
  readonly transpose?: boolean;
}

export interface MetricGridProps {
  readonly direction?: "row" | "grid";
}

export interface MetricProps extends DataComponentCommon {
  readonly label?: string;
  readonly text?: string;
  readonly value?: string;
  readonly subtype?: "card" | "card2" | "plain-text" | "quota";
  readonly pattern?: string;
  readonly html?: {
    readonly template?: string;
    readonly javascript?: string;
  };
  readonly sparklineData?: readonly number[];
  readonly trend?: "up" | "down" | "flat";
}

export interface MeterProps extends DataComponentCommon, ChartSettingsBase {
  readonly end?: number;
  readonly warning?: number;
  readonly critical?: number;
  readonly startAngle?: number;
  readonly endAngle?: number;
  readonly clockwise?: boolean;
}

export interface SelectorProps extends DataComponentCommon {
  readonly subtype?: "dropdown" | "slider" | "labels";
}

export interface MapProps extends DataComponentCommon, ChartSettingsBase {
  readonly subtype?: "regions" | "markers";
  readonly colorScheme?: string;
  readonly mapName?: string;
  readonly roam?: boolean | "pan" | "zoom";
  readonly center?: readonly [number, number];
  readonly zoom?: number;
  readonly scaleLimit?: { readonly min?: number; readonly max?: number };
  readonly showLabel?: boolean;
  readonly selectedMode?: "single" | "multiple" | boolean;
}

export interface IframePluginProps {
  readonly componentId: string;
  readonly settings?: Readonly<Record<string, unknown>>;
  readonly lookup?: DataSetLookup;
  readonly title?: string;
  readonly visible?: boolean;
  readonly width?: string;
  readonly height?: string;
  readonly filter?: FilterSettings;
  readonly refresh?: RefreshSettings;
}

export interface BadgeProps extends DataComponentCommon {
  readonly column?: ColumnId;
  readonly colorMap?: Record<string, string>;
}

export interface CountdownProps extends DataComponentCommon {
  readonly deadlineColumn?: ColumnId;
  readonly format?: "full" | "compact" | "days-only";
  readonly warningThreshold?: string;
  readonly criticalThreshold?: string;
}

export interface TimelineProps extends DataComponentCommon, ChartSettings {
  readonly startColumn?: ColumnId;
  readonly endColumn?: ColumnId;
  readonly labelColumn?: ColumnId;
  readonly categoryColumn?: ColumnId;
}

export interface HeatmapChartProps extends DataComponentCommon, ChartSettings {
  readonly minColor?: string;
  readonly maxColor?: string;
  readonly blurSize?: number;
  readonly minOpacity?: number;
  readonly maxOpacity?: number;
}

export interface TreemapChartProps extends DataComponentCommon, ChartSettingsBase {
  readonly parentColumn?: ColumnId;
  readonly colorColumn?: ColumnId;
  readonly sort?: boolean | "asc" | "desc";
  readonly leafDepth?: number;
  readonly nodeClick?: "zoomToNode" | "link" | false;
}

export interface DensityHeatmapProps extends DataComponentCommon {
  readonly xColumn?: ColumnId;
  readonly yColumn?: ColumnId;
  readonly valueColumn?: ColumnId;
  readonly gradient?: readonly { readonly offset: number; readonly color: string }[];
  readonly radius?: number;
  readonly aggregation?: "max" | "sum" | "mean" | "count";
  readonly showTooltip?: boolean;
  readonly showLegend?: boolean;
  readonly blur?: number;
  readonly maxOpacity?: number;
  readonly minOpacity?: number;
  readonly intensityExponent?: number;
  readonly valueMin?: number;
  readonly valueMax?: number;
  readonly extra?: Readonly<Record<string, unknown>>;
  readonly heatmapJs?: CasehubHeatmapExtension;
}

export interface GraphProps extends DataComponentCommon, ChartSettingsBase {
  readonly layout?: "force" | "circular" | "none";
  readonly sourceColumn?: ColumnId;
  readonly targetColumn?: ColumnId;
  readonly valueColumn?: ColumnId;
  readonly directed?: boolean;
  readonly nodeLabelColumn?: ColumnId;
  readonly nodeColorColumn?: ColumnId;
  readonly nodeColorMap?: Record<string, string>;
  readonly nodeSizeColumn?: ColumnId;
  readonly repulsion?: number;
  readonly edgeLabel?: boolean;
  readonly roam?: boolean | "pan" | "zoom";
  readonly symbol?: string;
}

export type {
  GroupDisplayMode,
  ContentDisplayMode,
  GroupedViewPreset,
  GroupedViewMode,
  AggregationBinding,
  GroupedViewProps,
  GroupNode,
  RowAccentConfig,
} from "./grouped-view-types.js";

export type EventTimelineLayout = "vertical" | "horizontal" | "compact";

export interface EventTimelineProps extends DataComponentCommon {
  readonly layout?: EventTimelineLayout;
  readonly pageSize?: number;
  readonly strategyKey?: string;
}

export interface GraphCanvasProps extends DataComponentCommon {
  readonly sourceColumn?: ColumnId;
  readonly targetColumn?: ColumnId;
  readonly nodeLabelColumn?: ColumnId;
  readonly nodeColorColumn?: ColumnId;
  readonly nodeColorMap?: Record<string, string>;
  readonly nodeSizeColumn?: ColumnId;
  readonly valueColumn?: ColumnId;
  readonly directed?: boolean;
  readonly direction?: "DOWN" | "RIGHT" | "LEFT" | "UP";
  readonly spacing?: number;
  readonly algorithm?: "layered" | "tree" | "radial" | "force" | "stress";
  readonly containerPadding?: number;
  readonly connectionsEnabled?: boolean;
  readonly fitView?: boolean;
  readonly nodesDraggable?: boolean;
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly edgeType?: "default" | "straight" | "step" | "smoothstep";
  readonly edgeAnimated?: boolean;
  readonly extra?: Readonly<Record<string, unknown>>;
  readonly reactFlow?: CasehubReactFlowExtension;
  readonly elk?: CasehubElkExtension;
}
