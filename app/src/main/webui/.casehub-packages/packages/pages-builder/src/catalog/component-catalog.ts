import type { PaletteContext, ContextRelevance } from './palette-context.js';

export interface PreviewHints {
  readonly placeholderText?: string;
  readonly sampleChildren?: number;
  readonly displayDefaults?: Record<string, unknown>;
}

export interface ComponentCatalogEntry {
  readonly type: string;
  readonly label: string;
  readonly category: string;
  readonly icon: string;
  readonly description: string;
  readonly defaultProps: Record<string, unknown>;
  readonly prereqHint?: string;
  readonly previewHints?: PreviewHints;
  contextRelevance(ctx: PaletteContext): ContextRelevance;
}

export interface FilteredCatalogEntry {
  readonly entry: ComponentCatalogEntry;
  readonly relevance: ContextRelevance;
}

const FORM_TYPES = new Set([
  'input', 'number-input', 'select', 'checkbox',
  'date-picker', 'textarea', 'submit-button',
]);

const NEEDS_DATASET_TYPES = new Set([
  'bar-chart', 'line-chart', 'area-chart', 'pie-chart',
  'scatter-chart', 'bubble-chart', 'timeseries',
  'heatmap-chart', 'treemap-chart', 'density-heatmap',
  'data-table', 'grid-table', 'grouped-view',
  'metric', 'meter', 'selector', 'map',
  'timeline', 'graph', 'event-timeline',
]);

const PAGE_LEVEL_ONLY = new Set(['page', 'lazy-page']);
const LAYOUT_TYPES = new Set(['rows', 'columns', 'grid']);
const LAYOUT_BLOCKED_PARENTS = new Set(['column', 'row']);

function defaultRelevance(ctx: PaletteContext): ContextRelevance {
  return ctx.acceptsComponents ? 'normal' : 'hidden';
}

function layoutRelevance(ctx: PaletteContext): ContextRelevance {
  if (ctx.parentType && LAYOUT_BLOCKED_PARENTS.has(ctx.parentType)) return 'hidden';
  return 'normal';
}

function dataRelevance(ctx: PaletteContext): ContextRelevance {
  if (!ctx.acceptsComponents) return 'hidden';
  if (ctx.availableDatasets.length === 0) return 'needs-prereq';
  return 'normal';
}

function formRelevance(ctx: PaletteContext): ContextRelevance {
  if (!ctx.acceptsComponents) return 'hidden';
  if (ctx.parentType === 'form-scope') return 'promoted';
  return 'normal';
}

function pageLevelRelevance(ctx: PaletteContext): ContextRelevance {
  if (!ctx.acceptsComponents) return 'hidden';
  if (ctx.parentType !== undefined) return 'hidden';
  return 'normal';
}

function metricInGridRelevance(ctx: PaletteContext): ContextRelevance {
  if (!ctx.acceptsComponents) return 'hidden';
  if (ctx.availableDatasets.length === 0) return 'needs-prereq';
  if (ctx.parentType === 'metric-grid') return 'promoted';
  return 'normal';
}

function relevanceFor(type: string): (ctx: PaletteContext) => ContextRelevance {
  if (PAGE_LEVEL_ONLY.has(type)) return pageLevelRelevance;
  if (LAYOUT_TYPES.has(type)) return layoutRelevance;
  if (FORM_TYPES.has(type)) return formRelevance;
  if (type === 'metric') return metricInGridRelevance;
  if (NEEDS_DATASET_TYPES.has(type)) return dataRelevance;
  return defaultRelevance;
}

function entry(
  type: string, label: string, category: string,
  icon: string, description: string,
  defaultProps: Record<string, unknown> = {},
  prereqHint?: string,
  previewHints?: PreviewHints,
): ComponentCatalogEntry {
  return {
    type, label, category, icon, description, defaultProps,
    ...(prereqHint !== undefined ? { prereqHint } : {}),
    ...(previewHints !== undefined ? { previewHints } : {}),
    contextRelevance: relevanceFor(type),
  };
}

const dp = 'Add a dataset first';

export const COMPONENT_CATALOG: readonly ComponentCatalogEntry[] = [
  // Layout
  entry('grid', 'Grid', 'Layout', 'grid_view', 'CSS grid container'),
  entry('columns', 'Columns', 'Layout', 'view_column', 'Multi-column layout'),
  entry('rows', 'Rows', 'Layout', 'table_rows', 'Stacked row layout'),
  entry('stack', 'Stack', 'Layout', 'layers', 'Vertical stack of sections', {}, undefined, { sampleChildren: 2 }),
  entry('tabs', 'Tabs', 'Layout', 'tab', 'Tabbed container', {}, undefined, { sampleChildren: 2 }),
  entry('pills', 'Pills', 'Layout', 'toggle_on', 'Pill-style tabbed container', {}, undefined, { sampleChildren: 2 }),
  entry('sidebar', 'Sidebar', 'Layout', 'vertical_split', 'Side navigation with content', {}, undefined, { sampleChildren: 2 }),
  entry('tree', 'Tree', 'Layout', 'account_tree', 'Expandable tree navigation', {}, undefined, { sampleChildren: 2 }),
  entry('menu', 'Menu', 'Layout', 'menu', 'Menu with sections', {}, undefined, { sampleChildren: 2 }),
  entry('accordion', 'Accordion', 'Layout', 'expand_more', 'Collapsible sections', {}, undefined, { sampleChildren: 2 }),
  entry('carousel', 'Carousel', 'Layout', 'view_carousel', 'Scrollable section carousel', {}, undefined, { sampleChildren: 2 }),

  // Charts
  entry('bar-chart', 'Bar Chart', 'Charts', 'bar_chart', 'Bar or column chart', { subtype: 'column' }, dp),
  entry('line-chart', 'Line Chart', 'Charts', 'show_chart', 'Line chart', {}, dp),
  entry('area-chart', 'Area Chart', 'Charts', 'area_chart', 'Filled area chart', {}, dp),
  entry('pie-chart', 'Pie Chart', 'Charts', 'pie_chart', 'Pie or donut chart', {}, dp),
  entry('scatter-chart', 'Scatter Chart', 'Charts', 'scatter_plot', 'Scatter plot', {}, dp),
  entry('bubble-chart', 'Bubble Chart', 'Charts', 'bubble_chart', 'Bubble chart', {}, dp),
  entry('timeseries', 'Time Series', 'Charts', 'timeline', 'Time-based line chart', {}, dp),
  entry('heatmap-chart', 'Heatmap', 'Charts', 'grid_on', 'Colour-coded matrix', {}, dp),
  entry('treemap-chart', 'Treemap', 'Charts', 'view_comfy', 'Hierarchical area chart', {}, dp),
  entry('density-heatmap', 'Density Heatmap', 'Charts', 'gradient', 'Continuous density plot', {}, dp),

  // Tables
  entry('data-table', 'Data Table', 'Tables', 'table_chart', 'Tabular data display', {}, dp),
  entry('grid-table', 'Grid Table', 'Tables', 'grid_on', 'Editable spreadsheet-style table', {}, dp),
  entry('grouped-view', 'Grouped View', 'Tables', 'view_list', 'Group-by aggregation view', {}, dp),

  // Metrics
  entry('metric', 'Metric', 'Metrics', 'speed', 'Single KPI value with trend', {}, dp),
  entry('meter', 'Meter', 'Metrics', 'speed', 'Gauge / progress meter', {}, dp),
  entry('metric-grid', 'Metric Grid', 'Metrics', 'dashboard', 'Grid of metric cards'),
  entry('badge', 'Badge', 'Metrics', 'verified', 'Status badge'),
  entry('countdown', 'Countdown', 'Metrics', 'timer', 'Countdown timer'),

  // Forms
  entry('input', 'Text Input', 'Forms', 'edit', 'Single-line text field'),
  entry('number-input', 'Number Input', 'Forms', 'pin', 'Numeric input field'),
  entry('select', 'Select', 'Forms', 'arrow_drop_down', 'Dropdown selector'),
  entry('checkbox', 'Checkbox', 'Forms', 'check_box', 'Boolean toggle'),
  entry('date-picker', 'Date Picker', 'Forms', 'calendar_today', 'Date selection'),
  entry('textarea', 'Text Area', 'Forms', 'notes', 'Multi-line text input'),
  entry('schema-form', 'Schema Form', 'Forms', 'dynamic_form', 'Auto-generated form from schema'),
  entry('action-button', 'Action Button', 'Forms', 'smart_button', 'Clickable action trigger'),
  entry('form-scope', 'Form Scope', 'Forms', 'edit_note', 'Dataset-bound form wrapper'),
  entry('submit-button', 'Submit Button', 'Forms', 'send', 'Form submission button'),

  // Content
  entry('panel', 'Panel', 'Content', 'web_asset', 'Styled container panel', {}, undefined, { placeholderText: 'Panel content' }),
  entry('html', 'HTML', 'Content', 'code', 'Raw HTML block', {}, undefined, { placeholderText: '<p>Sample HTML content</p>' }),
  entry('markdown', 'Markdown', 'Content', 'article', 'Markdown-rendered content', {}, undefined, { placeholderText: '## Sample Heading\n\nSample paragraph text.' }),
  entry('title', 'Title', 'Content', 'title', 'Heading text', { text: 'New Title' }),
  entry('lazy-page', 'Lazy Page', 'Content', 'dynamic_feed', 'Lazily loaded sub-page'),
  entry('page', 'Page', 'Content', 'insert_drive_file', 'Embedded page reference'),

  // Workbench
  entry('split', 'Split', 'Workbench', 'vertical_split', 'Resizable split panes'),
  entry('dock-bar', 'Dock Bar', 'Workbench', 'dock_to_bottom', 'Dockable toolbar'),
  entry('host-panel', 'Host Panel', 'Workbench', 'picture_in_picture', 'External content host'),
  entry('floating-workspace', 'Floating Workspace', 'Workbench', 'open_in_new', 'Detachable floating panels'),

  // Data
  entry('selector', 'Selector', 'Data', 'filter_list', 'Data filter / selector control', {}, dp),
  entry('map', 'Map', 'Data', 'map', 'Geographic map', {}, dp),
  entry('timeline', 'Timeline', 'Data', 'view_timeline', 'Chronological event display', {}, dp),
  entry('graph', 'Graph', 'Data', 'hub', 'Node-link network graph', {}, dp),
  entry('event-timeline', 'Event Timeline', 'Data', 'event_note', 'Structured event log', {}, dp),
  entry('iframe-plugin', 'IFrame Plugin', 'Data', 'integration_instructions', 'Embedded external content'),
];

export function getFilteredCatalog(ctx: PaletteContext): readonly FilteredCatalogEntry[] {
  let catalog = COMPONENT_CATALOG;
  if (ctx.allowedTypes) {
    const allowed = new Set([
      ...ctx.allowedTypes.structuralTypes,
      ...ctx.allowedTypes.componentTypes,
    ]);
    catalog = catalog.filter(e => allowed.has(e.type));
  }
  return catalog
    .map(e => ({ entry: e, relevance: e.contextRelevance(ctx) }))
    .filter(e => e.relevance !== 'hidden');
}

export function getCatalogCategories(): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of COMPONENT_CATALOG) {
    if (!seen.has(e.category)) {
      seen.add(e.category);
      result.push(e.category);
    }
  }
  return result;
}
