// Re-export all DSL builders
export {
  // Page builders
  page,
  type PageOptions,
  // Layout builders
  grid,
  at,
  columns,
  rows,
  metricGrid,
  stack,
  // Navigation builders
  tabs,
  pills,
  sidebar,
  tree,
  menu,
  accordion,
  carousel,
  tiles,
  // Wrapper builders
  panel,
  // Content builders
  html,
  markdown,
  title,
  // Decorator builders
  withId,
  withAccess,
  withStyle,
  // Dataset helpers
  bind,
  resetGridCounter,
  // Data component builders
  barChart,
  lineChart,
  areaChart,
  pieChart,
  scatterChart,
  bubbleChart,
  timeseries,
  dataTable,
  table,
  gridTable,
  metric,
  meter,
  selector,
  mapChart,
  heatmapChart,
  treemapChart,
  densityHeatmap,
  badge,
  countdown,
  timeline,
  graph,
  eventTimeline,
  schemaForm,
  actionButton,
  formScope,
  masterDetail,
  iframePlugin,
  // Form input builders
  textInput,
  numberInput,
  dropdown,
  checkbox,
  datePicker,
  textarea,
  // Workbench primitive builders
  split,
  dockBar,
  hostPanel,
  deferred,
  dockWorkbench,
  floatingWorkspace,
  type DockPanelConfig,
  type DockSideConfig,
  type DockWorkbenchConfig,
  // Zone-aware tree generation (used by ZoneLayoutEngine in pages-runtime)
  normalizeConfig,
  buildInitialZoneMap,
  buildTreeFromZones,
  type NormalizedSide,
  type NormalizedConfig,
  // Server pagination
  serverPaginated,
  type ServerPaginationOptions,
} from "./builders.js";

// Re-export all lookup helpers
export {
  // Main lookup builder
  lookup,
  // Group builders
  groupBy,
  groupByCalendar,
  // Filter builders
  filterBy,
  and,
  or,
  not,
  // Sort builder
  sortBy,
  // Result column helpers
  col,
  sum,
  avg,
  count,
  min,
  max,
  distinct,
  join,
  distinctJoin,
} from "./lookup-helpers.js";

// Re-export data source constructors from pages-data for ergonomic imports
export { inlineSource } from "@casehubio/pages-data";
export type { InlineSourceOptions } from "@casehubio/pages-data";
export { restSource } from "@casehubio/pages-data";
export type { RestSourceOptions, WsTriggerEvent } from "@casehubio/pages-data";
export { mutableRestSource } from "@casehubio/pages-data";
export type { WriteConfig, MutableRestSourceOptions } from "@casehubio/pages-data";
