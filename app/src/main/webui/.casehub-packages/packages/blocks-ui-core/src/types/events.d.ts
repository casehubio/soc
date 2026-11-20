import type { QueueView } from './work-item.js';
export declare const WorkItemEventTopics: {
    readonly SELECTED: "work-item:selected";
    readonly DESELECTED: "work-item:deselected";
    readonly QUEUE_SCOPE_CHANGED: "queue:scope-changed";
};
export interface WorkItemSelectedPayload {
    readonly workItemId: string;
}
export interface QueueScopeChangedPayload {
    readonly queue: QueueView | null;
}
//# sourceMappingURL=events.d.ts.map