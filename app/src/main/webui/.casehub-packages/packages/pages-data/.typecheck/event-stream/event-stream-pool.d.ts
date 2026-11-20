import type { ConnectionStatus, StatusChangeDetail } from "../dataset/external/sources/event-connection.js";
import type { PushSourceConfig } from "../dataset/external/sources/push-source.js";
export interface EventStreamPool {
    acquire(url: string, config: PushSourceConfig | undefined, batchEvents: boolean, topics: readonly string[]): PoolHandle;
}
export interface PoolHandle {
    readonly eventTarget: EventTarget;
    readonly status: () => ConnectionStatus;
    release(topics: readonly string[]): void;
    onStatusChange?: ((status: ConnectionStatus, detail?: StatusChangeDetail) => void) | undefined;
}
export declare function createEventStreamPool(): EventStreamPool;
export declare const defaultPool: EventStreamPool;
//# sourceMappingURL=event-stream-pool.d.ts.map