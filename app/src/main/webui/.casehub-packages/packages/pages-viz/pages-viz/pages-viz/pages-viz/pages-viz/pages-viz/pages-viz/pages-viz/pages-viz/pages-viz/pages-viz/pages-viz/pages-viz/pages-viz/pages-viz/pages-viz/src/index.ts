// @casehubio/viz — Web Component visualization wrappers
// Components are registered via customElements.define() at import time.

import "./custom-elements.js";

// Base
export { PagesElement } from "./base/PagesElement.js";
export type { PagesDataRequestDetail } from "./base/PagesElement.js";
export { PagesChartElement } from "./base/PagesChartElement.js";
export { PagesContentElement } from "./base/PagesContentElement.js";
export type { PagesFilterDetail, PagesFilterApply, PagesFilterReset, ChartClickParams } from "./base/filter-types.js";
export type { VizComponentProps } from "./base/types.js";
export { cellToRaw, resolveColumnName } from "./base/cell-extract.js";
export { deepMerge } from "./base/deep-merge.js";

// Charts
export { PagesBarChart } from "./charts/PagesBarChart.js";
export { PagesLineChart } from "./charts/PagesLineChart.js";
export { PagesAreaChart } from "./charts/PagesAreaChart.js";
export { PagesPieChart } from "./charts/PagesPieChart.js";
export { PagesScatterChart } from "./charts/PagesScatterChart.js";
export { PagesBubbleChart } from "./charts/PagesBubbleChart.js";
export { PagesTimeseries } from "./charts/PagesTimeseries.js";
export { PagesMeter } from "./charts/PagesMeter.js";
export { PagesMap } from "./charts/PagesMap.js";

// HTML components
export { PagesGridTable } from "./components/PagesGridTable.js";
export { PagesMetric } from "./components/PagesMetric.js";
export { PagesSelector } from "./components/PagesSelector.js";
export { PagesIframePlugin } from "./components/PagesIframePlugin.js";

// Schema form
export { PagesSchemaForm } from "./form-inputs/PagesSchemaForm.js";

// Form inputs
export { PagesFormInput } from "./form-inputs/PagesFormInput.js";
export type { PagesFieldChangeDetail } from "./form-inputs/PagesFormInput.js";

// New charts
export { PagesTimeline } from "./charts/PagesTimeline.js";
export { PagesGraph } from "./charts/PagesGraph.js";
export { PagesHeatmapChart } from "./charts/PagesHeatmapChart.js";
export { PagesTreemapChart } from "./charts/PagesTreemapChart.js";
export { PagesDensityHeatmap } from "./charts/PagesDensityHeatmap.js";

// New components
export { PagesActionButton } from "./components/PagesActionButton.js";
export { PagesAlert } from "./components/PagesAlert.js";
export { PagesBadge } from "./components/PagesBadge.js";
export { PagesCountdown } from "./components/PagesCountdown.js";
export { PagesGroupedView } from "./components/grouped-view/PagesGroupedView.js";
export { PagesLegend } from "./components/PagesLegend.js";
export { PagesEventTimeline } from "./components/PagesEventTimeline.js";
export type { EventTimelineNode, EventTimelineStrategy, EventNodeStatus, PaginationMeta } from "./components/event-timeline-types.js";
export { renderVerticalTimeline, verticalTimelineStyles } from "./components/event-timeline/renderers/vertical.js";
export type { VerticalTimelineOptions } from "./components/event-timeline/renderers/vertical.js";
export { renderHorizontalTimeline, horizontalTimelineStyles } from "./components/event-timeline/renderers/horizontal.js";
export type { HorizontalTimelineOptions } from "./components/event-timeline/renderers/horizontal.js";
export { renderCompactTimeline, compactTimelineStyles } from "./components/event-timeline/renderers/compact.js";
export type { CompactTimelineOptions } from "./components/event-timeline/renderers/compact.js";
export { renderFilterBar, filterBarStyles } from "./components/event-timeline/renderers/filter-bar.js";

// Shared pipeline
export { datasetToSource, applyChartSettings } from "./charts/option-pipeline.js";
