export interface SSEEvent {
    readonly type: string;
    readonly data: unknown;
    readonly id?: string;
}
export interface SSESubscribeOptions {
    readonly eventNames?: readonly string[];
}
export type SSEHandler = (event: SSEEvent) => void;
export declare class SSEManager {
    private readonly _pool;
    private readonly _batchQueue;
    private _rafId;
    subscribe(url: string, handler: SSEHandler, options?: SSESubscribeOptions): void;
    unsubscribe(url: string, handler: SSEHandler): void;
    status(url: string): "connected" | "reconnecting" | "disconnected";
    disconnectAll(): void;
    private _createEntry;
    private _installUnnamedListener;
    private _installErrorHandler;
    private _attachNamedListeners;
    private _detachNamedListeners;
    private _enqueue;
    private _flushBatch;
    private _scheduleReconnect;
    private _closeEntry;
}
//# sourceMappingURL=sse-manager.d.ts.map