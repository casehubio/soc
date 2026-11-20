import type { Component } from "./types.js";
import type {
  GridProps,
  ColumnsProps,
  RowsProps,
  StackProps,
  TabsProps,
  PillsProps,
  SidebarProps,
  TreeProps,
  MenuProps,
  AccordionProps,
  CarouselProps,
  SplitProps,
  DockBarProps,
  HostPanelProps,
  PanelProps,
  HtmlProps,
  MarkdownProps,
  TitleProps,
  LazyPageProps,
  FloatingWorkspaceProps,
  DockWorkbenchComponentProps,
} from "./component-props.js";
import type {
  BarChartProps,
  LineChartProps,
  AreaChartProps,
  PieChartProps,
  ScatterChartProps,
  BubbleChartProps,
  TimeseriesProps,
  DataTableProps,
  GridTableProps,
  MetricProps,
  MeterProps,
  SelectorProps,
  MapProps,
  HeatmapChartProps,
  TreemapChartProps,
  DensityHeatmapProps,
  BadgeProps,
  CountdownProps,
  TimelineProps,
  GraphProps,
  GraphCanvasProps,
  EventTimelineProps,
  MetricGridProps,
  IframePluginProps,
  GroupedViewProps,
} from "./displayer-types.js";
import type { ActionButtonProps } from "./action-types.js";
import type {
  TextInputProps,
  NumberInputProps,
  DropdownProps,
  CheckboxProps,
  DatePickerProps,
  TextareaProps,
  SchemaFormProps,
} from "./form-input-types.js";
import type { FormScopeProps } from "./form-scope-types.js";
import type { SubmitButtonProps } from "./submit-button-types.js";
import type { PageProps } from "./page-props.js";

export interface ComponentTypeRegistry {
  // Layout components
  grid: GridProps;
  columns: ColumnsProps;
  rows: RowsProps;
  stack: StackProps;
  tabs: TabsProps;
  pills: PillsProps;
  sidebar: SidebarProps;
  tree: TreeProps;
  menu: MenuProps;
  accordion: AccordionProps;
  carousel: CarouselProps;
  // Workbench components
  split: SplitProps;
  "dock-bar": DockBarProps;
  "host-panel": HostPanelProps;
  "floating-workspace": FloatingWorkspaceProps;
  "dock-workbench": DockWorkbenchComponentProps;
  // Wrapper components
  panel: PanelProps;
  // Content components
  html: HtmlProps;
  markdown: MarkdownProps;
  title: TitleProps;
  // Page components
  "lazy-page": LazyPageProps;
  page: PageProps;
  // Chart components
  "bar-chart": BarChartProps;
  "line-chart": LineChartProps;
  "area-chart": AreaChartProps;
  "pie-chart": PieChartProps;
  "scatter-chart": ScatterChartProps;
  "bubble-chart": BubbleChartProps;
  timeseries: TimeseriesProps;
  "heatmap-chart": HeatmapChartProps;
  "treemap-chart": TreemapChartProps;
  "density-heatmap": DensityHeatmapProps;
  "metric-grid": MetricGridProps;
  // Data components
  "data-table": DataTableProps;
  "grid-table": GridTableProps;
  metric: MetricProps;
  meter: MeterProps;
  selector: SelectorProps;
  map: MapProps;
  badge: BadgeProps;
  countdown: CountdownProps;
  timeline: TimelineProps;
  graph: GraphProps;
  "graph-canvas": GraphCanvasProps;
  "event-timeline": EventTimelineProps;
  // Grouped data components
  "grouped-view": GroupedViewProps;
  // Plugin component
  "iframe-plugin": IframePluginProps;
  // Form input components
  input: TextInputProps;
  "number-input": NumberInputProps;
  select: DropdownProps;
  checkbox: CheckboxProps;
  "date-picker": DatePickerProps;
  textarea: TextareaProps;
  // Schema form
  "schema-form": SchemaFormProps;
  // Action component
  "action-button": ActionButtonProps;
  // Form scope
  "form-scope": FormScopeProps;
  // Submit button
  "submit-button": SubmitButtonProps;
}

export type ComponentType = keyof ComponentTypeRegistry;
export type TypedComponent<T extends ComponentType> = Component<T, ComponentTypeRegistry[T]>;

export function getProps<T extends ComponentType>(
  component: Component,
  type: T,
): ComponentTypeRegistry[T] {
  if (component.type !== type) {
    throw new Error(`Expected ${type}, got ${component.type}`);
  }
  return component.props as unknown as ComponentTypeRegistry[T];
}

export function isComponentType<T extends ComponentType>(
  c: Component,
  type: T,
): c is TypedComponent<T> {
  return c.type === type;
}

// Layout components
export function isGrid(c: Component): c is TypedComponent<"grid"> {
  return c.type === "grid";
}

export function isColumns(c: Component): c is TypedComponent<"columns"> {
  return c.type === "columns";
}

export function isRows(c: Component): c is TypedComponent<"rows"> {
  return c.type === "rows";
}

export function isStack(c: Component): c is TypedComponent<"stack"> {
  return c.type === "stack";
}

export function isTabs(c: Component): c is TypedComponent<"tabs"> {
  return c.type === "tabs";
}

export function isPills(c: Component): c is TypedComponent<"pills"> {
  return c.type === "pills";
}

export function isSidebar(c: Component): c is TypedComponent<"sidebar"> {
  return c.type === "sidebar";
}

export function isTree(c: Component): c is TypedComponent<"tree"> {
  return c.type === "tree";
}

export function isMenu(c: Component): c is TypedComponent<"menu"> {
  return c.type === "menu";
}

export function isAccordion(c: Component): c is TypedComponent<"accordion"> {
  return c.type === "accordion";
}

export function isCarousel(c: Component): c is TypedComponent<"carousel"> {
  return c.type === "carousel";
}

export function isMetricGrid(c: Component): c is TypedComponent<"metric-grid"> {
  return c.type === "metric-grid";
}

// Workbench components
export function isSplit(c: Component): c is TypedComponent<"split"> {
  return c.type === "split";
}

export function isDockBar(c: Component): c is TypedComponent<"dock-bar"> {
  return c.type === "dock-bar";
}

export function isHostPanel(c: Component): c is TypedComponent<"host-panel"> {
  return c.type === "host-panel";
}

export function isFloatingWorkspace(c: Component): c is TypedComponent<"floating-workspace"> {
  return c.type === "floating-workspace";
}
export function isDockWorkbench(c: Component): c is TypedComponent<"dock-workbench"> {
  return c.type === "dock-workbench";
}

// Wrapper components
export function isPanel(c: Component): c is TypedComponent<"panel"> {
  return c.type === "panel";
}

// Content components
export function isHtml(c: Component): c is TypedComponent<"html"> {
  return c.type === "html";
}

export function isMarkdown(c: Component): c is TypedComponent<"markdown"> {
  return c.type === "markdown";
}

export function isTitle(c: Component): c is TypedComponent<"title"> {
  return c.type === "title";
}

// Page components
export function isLazyPage(c: Component): c is TypedComponent<"lazy-page"> {
  return c.type === "lazy-page";
}

// Chart components
export function isBarChart(c: Component): c is TypedComponent<"bar-chart"> {
  return c.type === "bar-chart";
}

export function isLineChart(c: Component): c is TypedComponent<"line-chart"> {
  return c.type === "line-chart";
}

export function isAreaChart(c: Component): c is TypedComponent<"area-chart"> {
  return c.type === "area-chart";
}

export function isPieChart(c: Component): c is TypedComponent<"pie-chart"> {
  return c.type === "pie-chart";
}

export function isScatterChart(c: Component): c is TypedComponent<"scatter-chart"> {
  return c.type === "scatter-chart";
}

export function isBubbleChart(c: Component): c is TypedComponent<"bubble-chart"> {
  return c.type === "bubble-chart";
}

export function isTimeseries(c: Component): c is TypedComponent<"timeseries"> {
  return c.type === "timeseries";
}

export function isHeatmapChart(c: Component): c is TypedComponent<"heatmap-chart"> {
  return c.type === "heatmap-chart";
}

export function isTreemapChart(c: Component): c is TypedComponent<"treemap-chart"> {
  return c.type === "treemap-chart";
}

export function isDensityHeatmap(c: Component): c is TypedComponent<"density-heatmap"> {
  return c.type === "density-heatmap";
}

// Data components
export function isDataTable(c: Component): c is TypedComponent<"data-table"> {
  return c.type === "data-table";
}

export function isGridTable(c: Component): c is TypedComponent<"grid-table"> {
  return c.type === "grid-table";
}

export function isMetric(c: Component): c is TypedComponent<"metric"> {
  return c.type === "metric";
}

export function isMeter(c: Component): c is TypedComponent<"meter"> {
  return c.type === "meter";
}

export function isSelector(c: Component): c is TypedComponent<"selector"> {
  return c.type === "selector";
}

export function isMap(c: Component): c is TypedComponent<"map"> {
  return c.type === "map";
}

export function isBadge(c: Component): c is TypedComponent<"badge"> {
  return c.type === "badge";
}

export function isCountdown(c: Component): c is TypedComponent<"countdown"> {
  return c.type === "countdown";
}

export function isTimeline(c: Component): c is TypedComponent<"timeline"> {
  return c.type === "timeline";
}

export function isGraph(c: Component): c is TypedComponent<"graph"> {
  return c.type === "graph";
}

export function isGraphCanvas(c: Component): c is TypedComponent<"graph-canvas"> {
  return c.type === "graph-canvas";
}

export function isEventTimeline(c: Component): c is TypedComponent<"event-timeline"> {
  return c.type === "event-timeline";
}

// Grouped data components
export function isGroupedView(c: Component): c is TypedComponent<"grouped-view"> {
  return c.type === "grouped-view";
}

// Plugin component
export function isIframePlugin(c: Component): c is TypedComponent<"iframe-plugin"> {
  return c.type === "iframe-plugin";
}

// Schema form
export function isSchemaForm(c: Component): c is TypedComponent<"schema-form"> {
  return c.type === "schema-form";
}

// Action component
export function isActionButton(c: Component): c is TypedComponent<"action-button"> {
  return c.type === "action-button";
}

// Form scope
export function isFormScope(c: Component): c is TypedComponent<"form-scope"> {
  return c.type === "form-scope";
}

// Form input components
export function isInput(c: Component): c is TypedComponent<"input"> {
  return c.type === "input";
}

export function isNumberInput(c: Component): c is TypedComponent<"number-input"> {
  return c.type === "number-input";
}

export function isSelect(c: Component): c is TypedComponent<"select"> {
  return c.type === "select";
}

export function isCheckbox(c: Component): c is TypedComponent<"checkbox"> {
  return c.type === "checkbox";
}

export function isDatePicker(c: Component): c is TypedComponent<"date-picker"> {
  return c.type === "date-picker";
}

export function isTextarea(c: Component): c is TypedComponent<"textarea"> {
  return c.type === "textarea";
}

export function isSubmitButton(c: Component): c is TypedComponent<"submit-button"> {
  return c.type === "submit-button";
}
