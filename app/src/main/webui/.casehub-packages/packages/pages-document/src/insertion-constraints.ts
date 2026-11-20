import { getContainerDescriptor } from './container-descriptors.js';

export interface InsertionConstraint {
  readonly structuralTypes: readonly string[];
  readonly componentTypes: readonly string[];
}

const ALL_COMPONENT_TYPES: readonly string[] = [
  'grid', 'columns', 'rows', 'stack', 'tabs', 'pills', 'sidebar',
  'tree', 'menu', 'accordion', 'carousel',
  'split', 'dock-bar', 'host-panel', 'floating-workspace', 'dock-workbench',
  'panel', 'html', 'markdown', 'title',
  'lazy-page', 'page',
  'bar-chart', 'line-chart', 'area-chart', 'pie-chart',
  'scatter-chart', 'bubble-chart', 'timeseries',
  'heatmap-chart', 'treemap-chart', 'density-heatmap',
  'metric-grid',
  'data-table', 'grid-table', 'metric', 'meter', 'selector',
  'map', 'badge', 'countdown', 'timeline', 'graph', 'graph-canvas',
  'event-timeline', 'grouped-view',
  'iframe-plugin',
  'input', 'number-input', 'select', 'checkbox',
  'date-picker', 'textarea', 'schema-form',
  'action-button', 'form-scope', 'submit-button',
];

const EMPTY: InsertionConstraint = { structuralTypes: [], componentTypes: [] };

const PAGE_CONSTRAINT: InsertionConstraint = {
  structuralTypes: ['row', 'column'],
  componentTypes: ALL_COMPONENT_TYPES,
};

const ROW_CONSTRAINT: InsertionConstraint = {
  structuralTypes: ['column'],
  componentTypes: [],
};

const COMPONENT_CONTAINER_CONSTRAINT: InsertionConstraint = {
  structuralTypes: [],
  componentTypes: ALL_COMPONENT_TYPES,
};

export function allowedTypesAt(parentNodeType: string): InsertionConstraint {
  if (parentNodeType === 'page') return PAGE_CONSTRAINT;
  if (parentNodeType === 'row') return ROW_CONSTRAINT;
  if (parentNodeType === 'column') return COMPONENT_CONTAINER_CONSTRAINT;
  if (getContainerDescriptor(parentNodeType)) return COMPONENT_CONTAINER_CONSTRAINT;
  return EMPTY;
}

export function allowedTypesForSiblingOf(nodeType: string): InsertionConstraint {
  if (nodeType === 'component') return allowedTypesAt('column');
  if (nodeType === 'column') return allowedTypesAt('row');
  if (nodeType === 'row') return allowedTypesAt('page');
  return EMPTY;
}

export function isAllowedChild(parentNodeType: string, childType: string): boolean {
  const c = allowedTypesAt(parentNodeType);
  return c.structuralTypes.includes(childType) || c.componentTypes.includes(childType);
}
