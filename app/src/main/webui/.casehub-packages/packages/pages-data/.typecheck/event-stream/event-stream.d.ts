import type { ConnectionStatus } from "../dataset/external/sources/event-connection.js";
import type { PushSourceConfig } from "../dataset/external/sources/push-source.js";
import type { EventStreamPool } from "./event-stream-pool.js";
export interface EventStreamOptions<T = unknown> {
    config?: PushSourceConfig;
    maxBuffer?: number;
    shared?: boolean;
    batchEvents?: boolean;
    parse?: (raw: unknown) => T;
    pool?: EventStreamPool;
    onChange?: () => void;
    onReconnect?: (gaps: string[]) => void;
}
export declare class EventStream<T = unknown> {
    private readonly url;
    private readonly topics;
    private readonly maxBuffer;
    private readonly shared;
    private readonly batchEvents;
    private readonly parse;
    private readonly pool;
    private readonly config;
    private readonly onChange;
    private readonly onReconnect;
    private handle;
    private listener;
    private _latest;
    private _all;
    private _prevStatus;
    constructor(url: string, topics: string | string[], options?: EventStreamOptions<T>);
    get latest(): T | undefined;
    get all(): readonly T[];
    get status(): ConnectionStatus;
    connect(): void;
    disconnect(): void;
    private handleStatusChange;
}
//# sourceMappingURL=event-stream.d.ts.map