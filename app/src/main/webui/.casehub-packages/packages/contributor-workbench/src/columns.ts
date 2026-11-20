import { columnId, ColumnType } from '@casehubio/pages-data';
import type { TableColumnConfig } from '@casehubio/pages-table';
import type { ContributorOutcomeSummary } from './types.js';

export const ID_COL = columnId('occurredAt');
export const OUTCOME_COL = columnId('outcome');
export const REPO_COL = columnId('repo');
export const PR_COL = columnId('prNumber');
export const WHEN_COL = columnId('occurredAt');

export const OUTCOME_COLUMNS = [
  { id: ID_COL, name: 'When', type: ColumnType.TEXT, getValue: (s: ContributorOutcomeSummary) => s.occurredAt },
  { id: OUTCOME_COL, name: 'Outcome', type: ColumnType.TEXT, getValue: (s: ContributorOutcomeSummary) => s.outcome },
  { id: REPO_COL, name: 'Repository', type: ColumnType.TEXT, getValue: (s: ContributorOutcomeSummary) => s.repo },
  { id: PR_COL, name: 'PR', type: ColumnType.NUMBER, getValue: (s: ContributorOutcomeSummary) => s.prNumber },
];

export const OUTCOME_TABLE_CONFIG: readonly TableColumnConfig[] = [
  { id: OUTCOME_COL, sortable: false },
  { id: REPO_COL, sortable: false },
  { id: PR_COL, sortable: false },
  { id: WHEN_COL, sortable: true },
];
