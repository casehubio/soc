import { html } from 'lit';
import { columnId, ColumnType } from '@casehubio/pages-data';
import type { CellValue, ColumnId } from '@casehubio/pages-data';
import type { TableColumnConfig, ColumnRenderer } from '@casehubio/pages-table';
import { PHASE_STYLES } from '@casehubio/mosaic-routing-rationale';
import { formatTimestamp } from '@casehubio/mosaic-core';
import type { RoutingDecisionSummary } from './types.js';

export const ID_COL = columnId('id');
export const TIMESTAMP_COL = columnId('timestamp');
export const CAPABILITY_COL = columnId('capabilityTag');
export const WORKER_COL = columnId('selectedWorkerId');
export const SCORE_COL = columnId('finalScore');
export const PHASE_COL = columnId('phase');

export const ROUTING_HISTORY_COLUMNS = [
  { id: ID_COL, name: 'ID', type: ColumnType.TEXT, getValue: (s: RoutingDecisionSummary) => s.id },
  { id: TIMESTAMP_COL, name: 'Time', type: ColumnType.TEXT, getValue: (s: RoutingDecisionSummary) => s.timestamp },
  { id: CAPABILITY_COL, name: 'Capability', type: ColumnType.TEXT, getValue: (s: RoutingDecisionSummary) => s.capabilityTag },
  { id: WORKER_COL, name: 'Worker', type: ColumnType.TEXT, getValue: (s: RoutingDecisionSummary) => s.selectedWorkerId },
  { id: SCORE_COL, name: 'Score', type: ColumnType.NUMBER, getValue: (s: RoutingDecisionSummary) => s.finalScore },
  { id: PHASE_COL, name: 'Phase', type: ColumnType.TEXT, getValue: (s: RoutingDecisionSummary) => s.phase },
];

export const ROUTING_HISTORY_TABLE_CONFIG: readonly TableColumnConfig[] = [
  { id: TIMESTAMP_COL, sortable: true },
  { id: CAPABILITY_COL, sortable: true },
  { id: WORKER_COL, sortable: true },
  { id: SCORE_COL, sortable: true },
  { id: PHASE_COL, sortable: true },
];



export const DEFAULT_ROUTING_RENDERERS: ReadonlyMap<ColumnId, ColumnRenderer> = new Map([
  [TIMESTAMP_COL, (cell: CellValue) => {
    const value = cell.type === 'NULL' ? '' : String((cell as { value: string }).value);
    return html`<span style="font-size: 12px; color: var(--pages-neutral-9, #888);">${formatTimestamp(value)}</span>`;
  }],
  [SCORE_COL, (cell: CellValue) => {
    if (cell.type === 'NULL') return html`<span style="color: var(--pages-neutral-9, #888);">—</span>`;
    const value = (cell as { value: number }).value;
    const pct = Math.round(value * 100);
    return html`
      <div style="display: flex; align-items: center; gap: 0.5rem;" role="img" aria-label="Final score ${pct}%">
        <div style="flex: 1; height: 8px; background: var(--pages-neutral-4, #e5e5e5); border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${pct}%; background: var(--pages-accent-9, #3b82f6);"></div>
        </div>
        <span style="font-weight: 600; min-width: 35px; font-size: 13px;">${pct}%</span>
      </div>
    `;
  }],
  [PHASE_COL, (cell: CellValue) => {
    const value = cell.type === 'NULL' ? '' : String((cell as { value: string }).value);
    const style = PHASE_STYLES[value] ?? '';
    return html`<span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; ${style}">${value}</span>`;
  }],
]);
