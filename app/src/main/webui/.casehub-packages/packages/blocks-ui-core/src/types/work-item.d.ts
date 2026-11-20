export declare const WorkItemStatus: {
    readonly PENDING: "PENDING";
    readonly ASSIGNED: "ASSIGNED";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly COMPLETED: "COMPLETED";
    readonly REJECTED: "REJECTED";
    readonly FAULTED: "FAULTED";
    readonly DELEGATED: "DELEGATED";
    readonly SUSPENDED: "SUSPENDED";
    readonly CANCELLED: "CANCELLED";
    readonly EXPIRED: "EXPIRED";
    readonly ESCALATED: "ESCALATED";
    readonly OBSOLETE: "OBSOLETE";
};
export type WorkItemStatus = typeof WorkItemStatus[keyof typeof WorkItemStatus];
export declare function isActiveStatus(status: WorkItemStatus): boolean;
export declare function isTerminalStatus(status: WorkItemStatus): boolean;
export declare const WorkItemPriority: {
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly HIGH: "HIGH";
    readonly URGENT: "URGENT";
};
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
    readonly labels: ReadonlyArray<{
        readonly name: string;
        readonly value: string | null;
    }>;
    readonly confidenceScore: number | null;
    readonly callerRef: string | null;
    readonly version: number;
    readonly templateId: string | null;
    readonly outcome: string | null;
    readonly permittedOutcomes: ReadonlyArray<{
        readonly value: string;
        readonly label: string;
    }> | null;
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
export declare const WorkEventType: {
    readonly CREATED: "CREATED";
    readonly ASSIGNED: "ASSIGNED";
    readonly STARTED: "STARTED";
    readonly COMPLETED: "COMPLETED";
    readonly REJECTED: "REJECTED";
    readonly FAULTED: "FAULTED";
    readonly DELEGATED: "DELEGATED";
    readonly DELEGATION_ACCEPTED: "DELEGATION_ACCEPTED";
    readonly DELEGATION_DECLINED: "DELEGATION_DECLINED";
    readonly RELEASED: "RELEASED";
    readonly SUSPENDED: "SUSPENDED";
    readonly RESUMED: "RESUMED";
    readonly CANCELLED: "CANCELLED";
    readonly OBSOLETE: "OBSOLETE";
    readonly EXPIRED: "EXPIRED";
    readonly CLAIM_EXPIRED: "CLAIM_EXPIRED";
    readonly SPAWNED: "SPAWNED";
    readonly ESCALATED: "ESCALATED";
    readonly DEADLINE_EXTENDED: "DEADLINE_EXTENDED";
    readonly SLA_REASSIGNED: "SLA_REASSIGNED";
    readonly SLA_EXTENDED: "SLA_EXTENDED";
    readonly SIGNAL_RECEIVED: "SIGNAL_RECEIVED";
    readonly MANUALLY_ESCALATED: "MANUALLY_ESCALATED";
    readonly PROGRESS_UPDATE: "PROGRESS_UPDATE";
    readonly LABEL_ADDED: "LABEL_ADDED";
    readonly LABEL_REMOVED: "LABEL_REMOVED";
};
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
//# sourceMappingURL=work-item.d.ts.map