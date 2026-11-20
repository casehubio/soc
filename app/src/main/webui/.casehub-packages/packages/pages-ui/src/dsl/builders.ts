import type {
  Component,
  GridItem,
  AccessControl,
} from "../model/types.js";
import type { TypedComponent } from "@casehubio/pages-component";
import type {
  HtmlProps,
  MarkdownProps,
  TitleProps,
  PanelProps,
  GridProps,
  ColumnsProps,
} from "../model/component-props.js";
import type {
  SplitProps,
  DockBarProps,
  DockItem,
  HostPanelProps,
  DockZone,
  DockSide,
  FloatingWorkspaceConfig,
  FloatingWorkspaceProps,
  DockPanelConfig,
  DockSideConfig,
  DockWorkbenchConfig,
  NormalizedSide,
  NormalizedConfig,
} from "@casehubio/pages-component";
import type { PageProps, PageSettings, DataScope, SaveConfig } from "../model/page-types.js";
import type { ExternalDataSetDef } from "@casehubio/pages-data";
import type { DataSetId } from "@casehubio/pages-data";
import type { DataSourceBinding, DataSource } from "@casehubio/pages-data";
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
  MetricGridProps,
  HeatmapChartProps,
  TreemapChartProps,
  DensityHeatmapProps,
  BadgeProps,
  CountdownProps,
  TimelineProps,
  GraphProps,
  EventTimelineProps,
  IframePluginProps,
  SchemaFormProps,
  FormScopeProps,
  ActionButtonProps,
  TextInputProps,
  NumberInputProps,
  DropdownProps,
  CheckboxProps,
  DatePickerProps,
  TextareaProps,
} from "@casehubio/pages-component";

// Grid ID counter — scoped per page tree via resetGridCounter()
let gridCounter = 0;

export function resetGridCounter(): void {
  gridCounter = 0;
}

export interface PageOptions {
  readonly datasets?: readonly ExternalDataSetDef[] | readonly DataSourceBinding[];
  readonly settings?: PageSettings;
  readonly properties?: Record<string, string>;
  readonly dataScope?: DataScope;
  readonly save?: SaveConfig;
}

function isPageOptions(arg: unknown): arg is PageOptions {
  if (typeof arg !== "object" || arg === null) return false;
  const obj = arg as Record<string, unknown>;
  // PageOptions has no 'type' property (Components always do)
  if ("type" in obj) return false;
  // Must have at least one of the PageOptions fields
  return "datasets" in obj || "settings" in obj || "properties" in obj
      || "dataScope" in obj || "save" in obj;
}

function freeze<T>(obj: T): T {
  return Object.freeze(obj);
}

export function page(
  name: string,
  ...args: (Component | PageOptions)[]
): TypedComponent<"page"> {
  // Validate name
  if (name.includes("/")) {
    throw new Error(`Page name cannot contain '/': ${name}`);
  }

  // Split args into children and options
  const children: Component[] = [];
  let options: PageOptions | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (i === args.length - 1 && isPageOptions(arg)) {
      options = arg;
    } else {
      children.push(arg as Component);
    }
  }

  // Validate no duplicate child page names at same level
  const childPages = children.filter((c) => c.type === "page");
  const pageNames = new Set<string>();
  for (const child of childPages) {
    const childName = (child.props as PageProps).name;
    if (childName) {
      if (pageNames.has(childName)) {
        throw new Error(`Duplicate child page name: ${childName}`);
      }
      pageNames.add(childName);
    }
  }

  const props: PageProps = {
    name,
    ...(options?.datasets && { datasets: options.datasets }),
    ...(options?.settings && { settings: options.settings }),
    ...(options?.properties && { properties: options.properties }),
    ...(options?.dataScope && { dataScope: options.dataScope }),
    ...(options?.save && { save: options.save }),
  };

  return freeze({
    type: "page" as const,
    props,
    slots: { content: children },
  });
}

export function grid(columns: number, ...items: GridItem[]): TypedComponent<"grid"> {
  const gridId = `grid_${String(gridCounter++)}`;

  const props: GridProps = { columns };

  return freeze({
    type: "grid" as const,
    id: gridId,
    props,
    items,
  });
}

export function at(
  x: number,
  y: number,
  w: number,
  h: number,
  component: Component
): GridItem {
  return freeze({
    placement: freeze({ x, y, w, h }),
    component,
  });
}

export function columns(
  distribution: number[],
  ...slotContents: Component[][]
): TypedComponent<"columns"> {
  if (distribution.length !== slotContents.length) {
    throw new Error(
      `Distribution length (${String(distribution.length)}) must match slotContents length (${String(slotContents.length)})`
    );
  }

  const slots: Record<string, readonly Component[]> = {};
  for (let i = 0; i < slotContents.length; i++) {
    const content = slotContents[i];
    if (!content) continue;
    slots[`col-${String(i)}`] = content;
  }

  const props: ColumnsProps = { distribution };

  return freeze({
    type: "columns" as const,
    props,
    slots: freeze(slots),
  });
}

export function rows(...children: Component[]): Component {
  return freeze({
    type: "rows",
    slots: { default: children },
  });
}

export function metricGrid(
  ...args: [...Component[]] | [MetricGridProps, ...Component[]]
): TypedComponent<"metric-grid"> {
  const first = args[0];
  const hasOptions = first != null && typeof first === 'object' && !('type' in first) && 'direction' in first;
  const options = hasOptions ? first : undefined;
  const children = (hasOptions ? args.slice(1) : args) as Component[];
  return freeze({
    type: "metric-grid" as const,
    props: options?.direction ? { direction: options.direction } : {},
    slots: { default: freeze(children) },
  });
}

export function stack(...children: Component[]): Component {
  return freeze({
    type: "stack",
    slots: { default: children },
  });
}

// Helper for navigation components
function navComponent(
  type: string,
  entries: [string, ...Component[]][]
): Component {
  const slots: Record<string, readonly Component[]> = {};
  for (const [label, ...components] of entries) {
    slots[label] = components;
  }

  return freeze({
    type,
    slots: freeze(slots),
  });
}

export function tabs(...entries: [string, ...Component[]][]): Component {
  return navComponent("tabs", entries);
}

export function pills(...entries: [string, ...Component[]][]): Component {
  return navComponent("pills", entries);
}

export function sidebar(...entries: [string, ...Component[]][]): Component {
  return navComponent("sidebar", entries);
}

export function tree(...entries: [string, ...Component[]][]): Component {
  return navComponent("tree", entries);
}

export function menu(...entries: [string, ...Component[]][]): Component {
  return navComponent("menu", entries);
}

export function accordion(...entries: [string, ...Component[]][]): Component {
  return navComponent("accordion", entries);
}

export function carousel(...entries: [string, ...Component[]][]): Component {
  return navComponent("carousel", entries);
}

export function tiles(...entries: [string, ...Component[]][]): Component {
  return navComponent("tiles", entries);
}

export function panel(title: string, ...children: Component[]): TypedComponent<"panel"> {
  const props: PanelProps = { title };

  return freeze({
    type: "panel" as const,
    props,
    slots: { default: children },
  });
}

export function html(content: string): TypedComponent<"html"> {
  const props: HtmlProps = { content };

  return freeze({
    type: "html" as const,
    props,
  });
}

export function markdown(content: string): TypedComponent<"markdown"> {
  const props: MarkdownProps = { content };

  return freeze({
    type: "markdown" as const,
    props,
  });
}

export function title(text: string, size?: string): TypedComponent<"title"> {
  const props: TitleProps = {
    text,
    ...(size !== undefined && { size }),
  };

  return freeze({
    type: "title" as const,
    props,
  });
}

export function withId(id: string, component: Component): Component {
  return freeze({
    ...component,
    id,
  });
}

export function withAccess(
  access: AccessControl,
  component: Component
): Component {
  return freeze({
    ...component,
    access,
  });
}

export function withStyle(
  style: Record<string, string>,
  component: Component
): Component {
  return freeze({
    ...component,
    style: freeze(style),
  });
}

// Data component builders
export function barChart(props: BarChartProps): TypedComponent<"bar-chart"> {
  return freeze({
    type: "bar-chart" as const,
    props: { ...props },
  });
}

export function lineChart(props: LineChartProps): TypedComponent<"line-chart"> {
  return freeze({
    type: "line-chart" as const,
    props: { ...props },
  });
}

export function areaChart(props: AreaChartProps): TypedComponent<"area-chart"> {
  return freeze({
    type: "area-chart" as const,
    props: { ...props },
  });
}

export function pieChart(props: PieChartProps): TypedComponent<"pie-chart"> {
  return freeze({
    type: "pie-chart" as const,
    props: { ...props },
  });
}

export function scatterChart(props: ScatterChartProps): TypedComponent<"scatter-chart"> {
  return freeze({
    type: "scatter-chart" as const,
    props: { ...props },
  });
}

export function bubbleChart(props: BubbleChartProps): TypedComponent<"bubble-chart"> {
  return freeze({
    type: "bubble-chart" as const,
    props: { ...props },
  });
}

export function timeseries(props: TimeseriesProps): TypedComponent<"timeseries"> {
  return freeze({
    type: "timeseries" as const,
    props: { ...props },
  });
}

export function dataTable(props: DataTableProps): TypedComponent<"data-table"> {
  return freeze({
    type: "data-table" as const,
    props: { ...props },
  });
}

export const table = dataTable;

export function gridTable(props: GridTableProps): TypedComponent<"grid-table"> {
  return freeze({
    type: "grid-table" as const,
    props: { ...props },
  });
}

export function metric(props: MetricProps): TypedComponent<"metric"> {
  return freeze({
    type: "metric" as const,
    props: { ...props },
  });
}

export function meter(props: MeterProps): TypedComponent<"meter"> {
  return freeze({
    type: "meter" as const,
    props: { ...props },
  });
}

export function selector(props: SelectorProps): TypedComponent<"selector"> {
  return freeze({
    type: "selector" as const,
    props: { ...props },
  });
}

export function mapChart(props: MapProps): TypedComponent<"map"> {
  return freeze({
    type: "map" as const,
    props: { ...props },
  });
}

export function heatmapChart(props: HeatmapChartProps): TypedComponent<"heatmap-chart"> {
  return freeze({ type: "heatmap-chart" as const, props: { ...props } });
}

export function treemapChart(props: TreemapChartProps): TypedComponent<"treemap-chart"> {
  return freeze({ type: "treemap-chart" as const, props: { ...props } });
}

export function densityHeatmap(props: DensityHeatmapProps): TypedComponent<"density-heatmap"> {
  return freeze({ type: "density-heatmap" as const, props: { ...props } });
}

export function badge(props: BadgeProps): TypedComponent<"badge"> {
  return freeze({ type: "badge" as const, props: { ...props } });
}

export function countdown(props: CountdownProps): TypedComponent<"countdown"> {
  return freeze({ type: "countdown" as const, props: { ...props } });
}

export function timeline(props: TimelineProps): TypedComponent<"timeline"> {
  return freeze({ type: "timeline" as const, props: { ...props } });
}

export function graph(props: GraphProps): TypedComponent<"graph"> {
  return freeze({ type: "graph" as const, props: { ...props } });
}

export function eventTimeline(props: EventTimelineProps): TypedComponent<"event-timeline"> {
  return freeze({ type: "event-timeline" as const, props: { ...props } });
}

export function schemaForm(props: SchemaFormProps): TypedComponent<"schema-form"> {
  return freeze({ type: "schema-form" as const, props: { ...props } });
}

export function actionButton(props: ActionButtonProps): TypedComponent<"action-button"> {
  return freeze({ type: "action-button" as const, props: { ...props } });
}

export function formScope(
  props: FormScopeProps,
  ...children: Component[]
): TypedComponent<"form-scope"> {
  return freeze({
    type: "form-scope" as const,
    props: { ...props },
    slots: { default: freeze(children) },
  });
}

export function iframePlugin(props: IframePluginProps): TypedComponent<"iframe-plugin"> {
  return freeze({
    type: "iframe-plugin" as const,
    props: { ...props },
  });
}

// Form input builders
export function input(props: TextInputProps): Component {
  return freeze({ type: "input" as const, props: freeze({ ...props }) });
}

export const textInput = input;

export function numberInput(props: NumberInputProps): Component {
  return freeze({ type: "number-input" as const, props: freeze({ ...props }) });
}

export function select(props: DropdownProps): Component {
  return freeze({ type: "select" as const, props: freeze({ ...props }) });
}

export const dropdown = select;

export function checkbox(props: CheckboxProps): Component {
  return freeze({ type: "checkbox" as const, props: freeze({ ...props }) });
}

export function datePicker(props: DatePickerProps): Component {
  return freeze({ type: "date-picker" as const, props: freeze({ ...props }) });
}

export function textarea(props: TextareaProps): Component {
  return freeze({ type: "textarea" as const, props: freeze({ ...props }) });
}

// DataSource binding builder

export function bind(
  id: string,
  source: DataSource,
  options?: { keyColumn?: string },
): DataSourceBinding {
  return Object.freeze({
    id: id as DataSetId,
    source,
    ...(options?.keyColumn !== undefined && { keyColumn: options.keyColumn }),
  });
}

// Workbench primitive builders

export function split(
  direction: "horizontal" | "vertical",
  children: Component[],
  options?: { ratio?: number[]; minSizes?: number[] },
): TypedComponent<"split"> {
  const slots: Record<string, readonly Component[]> = {};
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child) continue;
    slots[String(i)] = [child];
  }
  const props: SplitProps = {
    direction,
    ...(options?.ratio ? { ratio: options.ratio } : {}),
    ...(options?.minSizes ? { minSizes: options.minSizes } : {}),
  };
  return freeze({ type: "split" as const, props, slots: freeze(slots) });
}

export function dockBar(
  orientation: "vertical" | "horizontal",
  items: DockItem[],
  options?: { exclusive?: boolean; side?: DockSide },
): TypedComponent<"dock-bar"> {
  const props: DockBarProps = {
    orientation,
    items,
    ...(options?.exclusive ? { exclusive: true } : {}),
    ...(options?.side ? { side: options.side } : {}),
  };
  return freeze({ type: "dock-bar" as const, props });
}

export function hostPanel(
  typeName: string,
  panelProps?: Record<string, unknown>,
): TypedComponent<"host-panel"> {
  const props: HostPanelProps = {
    typeName,
    ...(panelProps ? { panelProps } : {}),
  };
  return freeze({ type: "host-panel" as const, props });
}

export function masterDetail(config: {
  master: TypedComponent<"data-table">;
  detail: TypedComponent<"host-panel">;
  direction?: "horizontal" | "vertical";
  ratio?: [number, number];
  selectionKey?: string;
}): TypedComponent<"split"> {
  const { master, detail, direction = "horizontal", ratio = [40, 60], selectionKey } = config;
  const existingHidden = (master.props as Record<string, unknown> | undefined)?.hiddenColumns as readonly string[] | undefined;
  const hiddenColumns = selectionKey
    ? [...(existingHidden ?? []), ...(existingHidden?.includes(selectionKey) ? [] : [selectionKey])]
    : existingHidden;
  const wiredMaster = freeze({
    ...master,
    props: {
      ...master.props,
      selection: "single" as const,
      ...(selectionKey ? { selectionKey } : {}),
      ...(hiddenColumns ? { hiddenColumns } : {}),
    },
  });
  const masterLookup = master.props!.lookup;
  const wiredDetail = freeze({
    ...detail,
    props: { ...detail.props, selectionSource: masterLookup.dataSetId },
  });
  return split(direction, [wiredMaster, wiredDetail], { ratio });
}

export function deferred(child: Component): Component {
  return freeze({ type: "deferred" as const, slots: freeze({ default: [child] }) });
}

export type { DockPanelConfig, DockSideConfig, DockWorkbenchConfig, NormalizedSide, NormalizedConfig };

// --- Zone-aware tree generation (used by dockWorkbench and ZoneLayoutEngine) ---

function normalizeSide(
  input: readonly DockPanelConfig[] | DockSideConfig,
  side: DockSide,
): NormalizedSide {
  if ("panels" in input) {
    return {
      zones: input.zones ?? 1,
      buttonPosition: input.buttonPosition ?? "end",
      panels: input.panels,
      side,
    };
  }
  return { zones: 1, buttonPosition: "end", panels: input, side };
}

function defaultZone(side: DockSide, position?: string): DockZone {
  if (side === "bottom") {
    return position === "right" ? "bottom-right" : "bottom-left";
  }
  return position === "bottom" ? `${side}-bottom` as DockZone : `${side}-top` as DockZone;
}

export function normalizeConfig(config: DockWorkbenchConfig): NormalizedConfig {
  return {
    centre: config.centre,
    storageKey: config.storageKey,
    left: config.left ? normalizeSide(config.left, "left") : undefined,
    right: config.right ? normalizeSide(config.right, "right") : undefined,
    bottom: config.bottom ? normalizeSide(config.bottom, "bottom") : undefined,
    statusBar: config.statusBar,
  };
}

export function buildInitialZoneMap(
  normalized: NormalizedConfig,
  savedZones?: Readonly<Record<string, DockZone>>,
): Map<string, DockZone> {
  const map = new Map<string, DockZone>();
  const allPanels = new Map<string, DockPanelConfig>();

  for (const sideKey of ["left", "right", "bottom"] as const) {
    const sideConfig = normalized[sideKey];
    if (!sideConfig) continue;
    for (const panel of sideConfig.panels) {
      allPanels.set(panel.key, panel);
      map.set(panel.key, defaultZone(sideConfig.side, panel.zone));
    }
  }

  if (savedZones) {
    for (const [key, zone] of Object.entries(savedZones)) {
      const panel = allPanels.get(key);
      if (!panel) continue;
      if (panel.allowedZones && !panel.allowedZones.includes(zone)) continue;
      map.set(key, zone);
    }
  }

  return map;
}

function wrapPanel(panel: DockPanelConfig): Component {
  return withStyle({ display: "none", flex: "1", minHeight: "0" }, withId(panel.key, deferred(panel.content)));
}

function buildZoneContainer(zoneId: string, panels: readonly DockPanelConfig[]): Component {
  return withStyle(
    { flex: "1", height: "100%", overflow: "hidden", gap: "0" },
    withId(zoneId, rows(...panels.map(wrapPanel))),
  );
}

function firstZoneId(side: DockSide): DockZone {
  return side === "bottom" ? "bottom-left" : `${side}-top` as DockZone;
}

function secondZoneId(side: DockSide): DockZone {
  return side === "bottom" ? "bottom-right" : `${side}-bottom` as DockZone;
}

function orderPanels(panels: readonly DockPanelConfig[], zone: DockZone, order: ReadonlyMap<DockZone, string[]>): readonly DockPanelConfig[] {
  const zoneList = order.get(zone);
  if (!zoneList) return panels;
  const sorted = [...panels];
  sorted.sort((a, b) => {
    const ai = zoneList.indexOf(a.key);
    const bi = zoneList.indexOf(b.key);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return sorted;
}

function buildSideContent(
  side: NormalizedSide,
  allPanels: readonly DockPanelConfig[],
  zoneMap: ReadonlyMap<string, DockZone>,
  order?: ReadonlyMap<DockZone, string[]>,
): Component | null {
  const first = firstZoneId(side.side);
  const second = secondZoneId(side.side);

  const firstPanels = orderPanels(allPanels.filter(p => zoneMap.get(p.key) === first), first, order ?? new Map());
  const secondPanels = orderPanels(allPanels.filter(p => zoneMap.get(p.key) === second), second, order ?? new Map());

  if (firstPanels.length === 0 && secondPanels.length === 0) return null;

  if (firstPanels.length > 0 && secondPanels.length > 0) {
    const dir = side.side === "bottom" ? "horizontal" as const : "vertical" as const;
    return withStyle({ height: "100%" }, split(dir, [
      buildZoneContainer(`__zone:${first}`, firstPanels),
      buildZoneContainer(`__zone:${second}`, secondPanels),
    ]));
  }

  if (firstPanels.length > 0) {
    return buildZoneContainer(`__zone:${first}`, firstPanels);
  }
  return buildZoneContainer(`__zone:${second}`, secondPanels);
}

function buildSideStripe(
  side: DockSide,
  allPanels: readonly DockPanelConfig[],
  zoneMap: ReadonlyMap<string, DockZone>,
  bottomSide: DockSide | undefined,
  order?: ReadonlyMap<DockZone, string[]>,
): Component {
  const sideFirst = firstZoneId(side);
  const sideSecond = secondZoneId(side);
  const bottomZone: DockZone | undefined = bottomSide
    ? (side === "left" ? "bottom-left" : "bottom-right")
    : undefined;

  const items: DockItem[] = [];

  const firstPanels = orderPanels(allPanels.filter(p => zoneMap.get(p.key) === sideFirst), sideFirst, order ?? new Map());
  const secondPanels = orderPanels(allPanels.filter(p => zoneMap.get(p.key) === sideSecond), sideSecond, order ?? new Map());

  for (const p of firstPanels) {
    items.push({
      icon: p.icon, label: p.label, panelId: p.key,
      ...(p.defaultOpen ? { defaultOpen: true } : {}),
      zone: "top",
      ...(p.allowedZones ? { allowedZones: p.allowedZones } : {}),
      ...(p.fixed ? { fixed: true } : {}),
    });
  }
  for (const p of secondPanels) {
    items.push({
      icon: p.icon, label: p.label, panelId: p.key,
      ...(p.defaultOpen ? { defaultOpen: true } : {}),
      zone: "top-second",
      ...(p.allowedZones ? { allowedZones: p.allowedZones } : {}),
      ...(p.fixed ? { fixed: true } : {}),
    });
  }

  if (bottomZone) {
    const bottomPanels = orderPanels(allPanels.filter(p => zoneMap.get(p.key) === bottomZone), bottomZone, order ?? new Map());
    for (const p of bottomPanels) {
      items.push({
        icon: p.icon,
        label: p.label,
        panelId: p.key,
        ...(p.defaultOpen ? { defaultOpen: true } : {}),
        zone: "bottom",
        ...(p.allowedZones ? { allowedZones: p.allowedZones } : {}),
        ...(p.fixed ? { fixed: true } : {}),
      });
    }
  }

  return withStyle({ height: "100%" }, dockBar("vertical", items, { exclusive: true, side }));
}

export function buildTreeFromZones(
  normalized: NormalizedConfig,
  zoneMap: ReadonlyMap<string, DockZone>,
  order?: ReadonlyMap<DockZone, string[]>,
): Component {
  const rawCentre = Array.isArray(normalized.centre)
    ? rows(...normalized.centre)
    : normalized.centre;
  const centreContent = withId("__dock-centre", withStyle({ flex: "1", height: "100%", "min-height": "0", overflow: "hidden" }, rawCentre));

  const hasLeft = normalized.left !== undefined;
  const hasRight = normalized.right !== undefined;
  const hasBottom = normalized.bottom !== undefined;

  if (!hasLeft && !hasRight && !hasBottom) return centreContent;

  const everyPanel: DockPanelConfig[] = [];
  for (const sideKey of ["left", "right", "bottom"] as const) {
    const s = normalized[sideKey];
    if (s) everyPanel.push(...s.panels);
  }

  const splitChildren: Component[] = [];
  const splitRatio: number[] = [];
  const leftContent = hasLeft ? buildSideContent(normalized.left, everyPanel, zoneMap, order) : null;
  if (leftContent) { splitChildren.push(leftContent); splitRatio.push(1); }
  splitChildren.push(centreContent); splitRatio.push(4);
  const rightContent = hasRight ? buildSideContent(normalized.right, everyPanel, zoneMap, order) : null;
  if (rightContent) { splitChildren.push(rightContent); splitRatio.push(1); }

  const panelSplit = splitChildren.length > 1
    ? withStyle({ flex: "1", overflow: "hidden", height: "100%" }, split("horizontal", splitChildren, { ratio: splitRatio }))
    : splitChildren[0]!;

  let middleContent: Component = panelSplit;
  if (hasBottom) {
    const bottomContent = buildSideContent(normalized.bottom, everyPanel, zoneMap, order);
    if (bottomContent) {
      middleContent = withStyle({ flex: "1", "min-height": "0", height: "100%" }, split("vertical", [panelSplit, bottomContent], { ratio: [70, 30] }));
    }
  }

  const outerChildren: Component[] = [];
  const outerDist: number[] = [];

  if (hasLeft) {
    outerChildren.push(buildSideStripe("left", everyPanel, zoneMap, hasBottom ? "bottom" : undefined, order));
    outerDist.push(0);
  }
  outerChildren.push(middleContent);
  outerDist.push(1);
  if (hasRight) {
    outerChildren.push(buildSideStripe("right", everyPanel, zoneMap, hasBottom ? "bottom" : undefined, order));
    outerDist.push(0);
  }

  const mainArea = outerChildren.length > 1
    ? withStyle({ flex: "1", "min-height": "0", height: "100%", "grid-template-rows": "1fr", gap: "1px" }, columns(outerDist, ...outerChildren.map(c => [c])))
    : outerChildren[0]!;

  if (normalized.statusBar) {
    return withStyle({ height: "100%", display: "flex", "flex-direction": "column", gap: "0" },
      rows(mainArea, withStyle({ "flex-shrink": "0" }, normalized.statusBar)),
    );
  }
  return withStyle({ height: "100%" }, mainArea);
}

export function dockWorkbench(config: DockWorkbenchConfig): TypedComponent<"dock-workbench"> {
  return Object.freeze({ type: "dock-workbench" as const, props: { __dockConfig: config } });
}

export interface ServerPaginationOptions {
  readonly offsetParam?: string;
  readonly limitParam?: string;
  readonly sortParam?: string;
  readonly orderParam?: string;
  readonly filterParam?: string;
  readonly defaultPageSize?: number;
  readonly maxCachedPages?: number;
  readonly totalPath?: string;
}

export function serverPaginated(options?: ServerPaginationOptions): import("@casehubio/pages-data").ServerPaginationConfig {
  return {
    offsetParam: options?.offsetParam ?? "offset",
    limitParam: options?.limitParam ?? "limit",
    sortParam: options?.sortParam,
    orderParam: options?.orderParam,
    filterParam: options?.filterParam,
    defaultPageSize: options?.defaultPageSize ?? 25,
    maxCachedPages: options?.maxCachedPages ?? 5,
    totalPath: options?.totalPath,
  };
}

export function floatingWorkspace(config: FloatingWorkspaceConfig): TypedComponent<"floating-workspace"> {
  const props: FloatingWorkspaceProps = {
    centre: config.centre,
    ...(config.frames ? { frames: config.frames } : {}),
    organisers: config.organisers ?? true,
  };
  return Object.freeze({ type: "floating-workspace" as const, props });
}
