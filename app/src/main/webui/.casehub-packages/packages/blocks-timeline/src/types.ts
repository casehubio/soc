import type { EventTimelineStrategy } from '@casehubio/pages-viz';

export type BlocksTimelineStrategy<T = unknown> = EventTimelineStrategy<T>;

export type { PaginationMeta } from '@casehubio/pages-viz';

export interface StageConfig {
  key: string;
  label: string;
  icon?: string;
  terminal?: 'success' | 'failure' | 'transfer';
}
