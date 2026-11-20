import type { QueueView } from './work-item.js';



// Navigation event topics (pages-events handle navigation only, not data state)
export const WorkItemEventTopics = {
  SELECTED: 'work-item:selected',
  DESELECTED: 'work-item:deselected',
  QUEUE_SCOPE_CHANGED: 'queue:scope-changed',
} as const;

export interface WorkItemSelectedPayload {
  readonly workItemId: string;
}

export interface QueueScopeChangedPayload {
  readonly queue: QueueView | null;
}
