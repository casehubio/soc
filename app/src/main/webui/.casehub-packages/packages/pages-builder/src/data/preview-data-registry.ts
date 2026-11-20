import type { DatasetNode } from '@casehubio/pages-document';
import { ChartDataStrategy } from './strategies/chart-strategy.js';
import { TableDataStrategy } from './strategies/table-strategy.js';
import { MetricDataStrategy } from './strategies/metric-strategy.js';
import { DataComponentStrategy } from './strategies/data-component-strategy.js';

export interface PreviewDataStrategy {
  generate(
    props: Record<string, unknown>,
    datasets: DatasetNode[],
  ): DatasetSnapshot[];
}

export interface DatasetSnapshot {
  uuid: string;
  rows: Record<string, unknown>[];
}

export function createDefaultRegistry(): Map<string, PreviewDataStrategy> {
  const registry = new Map<string, PreviewDataStrategy>();

  const chartStrategy = new ChartDataStrategy();
  for (const type of ['bar-chart', 'line-chart', 'area-chart', 'pie-chart', 'scatter-chart', 'bubble-chart', 'timeseries', 'heatmap-chart', 'treemap-chart', 'density-heatmap']) {
    registry.set(type, chartStrategy);
  }

  const tableStrategy = new TableDataStrategy();
  for (const type of ['data-table', 'grid-table', 'grouped-view']) {
    registry.set(type, tableStrategy);
  }

  const metricStrategy = new MetricDataStrategy();
  for (const type of ['metric', 'meter']) {
    registry.set(type, metricStrategy);
  }

  const dataStrategy = new DataComponentStrategy();
  for (const type of ['selector', 'map', 'timeline', 'graph', 'event-timeline']) {
    registry.set(type, dataStrategy);
  }

  return registry;
}
