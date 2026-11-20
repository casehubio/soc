import type { PushSourceConfig } from "./push-source.js";
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';
export interface StatusChangeDetail {
    readonly gaps?: readonly string[];
}
export interface EventConnectionOptions {
    readonly config?: PushSourceConfig;
    readonly batchEvents?: boolean;
    readonly cursorStorage?: Storage;
    readonly onStatusChange?: (status: ConnectionStatus, detail?: StatusChangeDetail) => void;
}
export interface ListenAck {
    readonly topics: string[];
    readonly gaps?: string[];
}
export interface EventConnection {
    send(message: object): void;
    listen(topics: string[]): Promise<ListenAck>;
    unlisten(topics: string[]): Promise<void>;
    close(): void;
    readonly connected: boolean;
    readonly status: ConnectionStatus;
}
export declare function createEventConnection(url: string, options?: EventConnectionOptions): EventConnection;
//# sourceMappingURL=event-connection.d.ts.map