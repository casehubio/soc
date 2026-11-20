export const WorkItemStatus = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  FAULTED: 'FAULTED',
  DELEGATED: 'DELEGATED',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  ESCALATED: 'ESCALATED',
  OBSOLETE: 'OBSOLETE',
} as const;

export type WorkItemStatus = typeof WorkItemStatus[keyof typeof WorkItemStatus];

export function isActiveStatus(status: WorkItemStatus): boolean {
  return (
    status === 'PENDING'
    || status === 'ASSIGNED'
    || status === 'IN_PROGRESS'
    || status === 'SUSPENDED'
    || status === 'DELEGATED'
  );
}

export function isTerminalStatus(status: WorkItemStatus): boolean {
  return !isActiveStatus(status);
}

export const WorkItemPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type WorkItemPriority = typeof WorkItemPriority[keyof typeof WorkItemPriority];

export interface WorkItemResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly types: readonly string[];
  readonly category: string | null;
  readonly formKey: string | null;
  readonly status: WorkItemStatus;
  readonly priority: WorkItemPriority;
  readonly assigneeId: string | null;
  readonly owner: string | null;
  readonly candidateGroups: string | null;
  readonly candidateUsers: string | null;
  readonly requiredCapabilities: string | null;
  readonly createdBy: string | null;
  readonly delegationDeclineTarget: 'DELEGATOR' | 'POOL' | null;
  readonly delegationChain: string | null;
  readonly priorStatus: WorkItemStatus | null;
  readonly payload: string | null;
  readonly resolution: string | null;
  readonly claimDeadline: string | null;
  readonly expiresAt: string | null;
  readonly followUpDate: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly assignedAt: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly suspendedAt: string | null;
  readonly labels: ReadonlyArray<{ readonly name: string; readonly value: string | null }>;
  readonly confidenceScore: number | null;
  readonly callerRef: string | null;
  readonly version: number;
  readonly templateId: string | null;
  readonly outcome: string | null;
  readonly permittedOutcomes: ReadonlyArray<{ readonly value: string; readonly label: string }> | null;
  readonly inputDataSchema: string | null;
  readonly outputDataSchema: string | null;
  readonly excludedUsers: string | null;
  readonly scope: string | null;
  readonly percentComplete: number | null;
  readonly statusNote: string | null;
}

export interface WorkItemRootResponse {
  readonly item: WorkItemResponse;
  readonly childCount: number;
  readonly completedCount: number | null;
  readonly requiredCount: number | null;
  readonly groupStatus: string | null;
}

export interface InboxSummary {
  readonly total: number;
  readonly byStatus: Readonly<Record<string, number>>;
  readonly byPriority: Readonly<Record<string, number>>;
  readonly overdue: number;
  readonly claimDeadlineBreached: number;
}

export interface CompleteRequest {
  readonly resolution?: string;
  readonly outcome?: string;
}

export interface EscalateRequest {
  readonly targetGroup: string;
  readonly reason: string;
}

export interface DelegateRequest {
  readonly to: string;
  readonly declineTarget?: 'DELEGATOR' | 'POOL';
}

export interface RejectRequest {
  readonly reason?: string;
}

export interface CancelRequest {
  readonly reason?: string;
}

export interface SuspendRequest {
  readonly reason?: string;
}

export interface BulkRequest {
  readonly operation: 'claim' | 'cancel';
  readonly workItemIds: readonly string[];
  readonly actorId: string;
  readonly reason?: string;
}

export interface BulkItemResult {
  readonly id: string;
  readonly status: string;
  readonly error: string | null;
}

export interface QueueView {
  readonly id: string;
  readonly name: string;
  readonly labelPattern: string;
  readonly scope: string | null;
}

export type InboxMode = 'my-work' | 'claimable' | 'all';

export interface QueueScope {
  readonly queue: QueueView;
  readonly items: WorkItemRootResponse[];
  readonly statusCounts: ReadonlyMap<string, number>;
  readonly priorityCounts: ReadonlyMap<string, number>;
  readonly overdueCount: number;
  readonly breachCount: number;
}

export interface QueueSummaryEntry {
  readonly queueId: string;
  readonly count: number;
  readonly breachCount: number;
}

export const WorkEventType = {
  CREATED: 'CREATED',
  ASSIGNED: 'ASSIGNED',
  STARTED: 'STARTED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  FAULTED: 'FAULTED',
  DELEGATED: 'DELEGATED',
  DELEGATION_ACCEPTED: 'DELEGATION_ACCEPTED',
  DELEGATION_DECLINED: 'DELEGATION_DECLINED',
  RELEASED: 'RELEASED',
  SUSPENDED: 'SUSPENDED',
  RESUMED: 'RESUMED',
  CANCELLED: 'CANCELLED',
  OBSOLETE: 'OBSOLETE',
  EXPIRED: 'EXPIRED',
  CLAIM_EXPIRED: 'CLAIM_EXPIRED',
  SPAWNED: 'SPAWNED',
  ESCALATED: 'ESCALATED',
  DEADLINE_EXTENDED: 'DEADLINE_EXTENDED',
  SLA_REASSIGNED: 'SLA_REASSIGNED',
  SLA_EXTENDED: 'SLA_EXTENDED',
  SIGNAL_RECEIVED: 'SIGNAL_RECEIVED',
  MANUALLY_ESCALATED: 'MANUALLY_ESCALATED',
  PROGRESS_UPDATE: 'PROGRESS_UPDATE',
  LABEL_ADDED: 'LABEL_ADDED',
  LABEL_REMOVED: 'LABEL_REMOVED',
} as const;

export type WorkEventType = typeof WorkEventType[keyof typeof WorkEventType];

export interface WorkItemLifecycleEvent {
  readonly type: string;
  readonly source: string;
  readonly subject: string;
  readonly workItemId: string;
  readonly status: WorkItemStatus;
  readonly occurredAt: string;
  readonly actor: string | null;
  readonly detail: string | null;
  readonly rationale: string | null;
  readonly planRef: string | null;
  readonly outcome: string | null;
  readonly callerRef: string | null;
  readonly assigneeId: string | null;
  readonly resolution: string | null;
  readonly candidateGroups: string | null;
}

export interface WorkItemQueueEvent {
  readonly workItemId: string;
  readonly queueViewId: string;
  readonly queueName: string;
  readonly eventType: 'ADDED' | 'REMOVED' | 'CHANGED';
  readonly tenancyId: string | null;
}
