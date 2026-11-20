export interface WsTriggerEvent {
    readonly op: string;
    readonly topic: string;
    readonly payload: Record<string, unknown>;
}
export type WsTriggerHandler = (event: WsTriggerEvent) => void;
export declare class WsTriggerPool {
    private readonly _pool;
    private readonly _WS;
    constructor(wsImpl?: typeof WebSocket);
    subscribe(url: string, handler: WsTriggerHandler): void;
    unsubscribe(url: string, handler: WsTriggerHandler): void;
    disconnectAll(): void;
    private _createEntry;
    private _connectWs;
    private _scheduleReconnect;
    private _closeEntry;
}
//# sourceMappingURL=ws-trigger-pool.d.ts.map