import type { EventTimelineLayout } from "@casehubio/pages-component";

export type EventNodeStatus = "completed" | "active" | "pending" | "failed" | "skipped";

export interface EventTimelineNode {
  readonly key: string;
  readonly label: string;
  readonly status: EventNodeStatus;
  readonly timestamp?: string;
  readonly actor?: string;
  readonly detail?: unknown;
  readonly category?: string;
}

export interface PaginationMeta {
  readonly page: number;
  readonly totalPages: number;
  readonly totalElements: number;
}

export interface EventTimelineStrategy<T = unknown> {
  toNodes(data: T): EventTimelineNode[];
  transformData?: (raw: unknown) => T;
  defaultLayout: EventTimelineLayout;
  renderNode?: (node: EventTimelineNode) => unknown;
  renderDetail?: (node: EventTimelineNode) => unknown;
  filterCategories?: string[];
  supportsPagination?: boolean;
  extractPaginationMeta?: (raw: unknown) => PaginationMeta | undefined;
}
