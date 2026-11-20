export declare function nextRequestId(): string;
export declare function buildConnectionUrl(baseUrl: string, config?: {
    relay?: {
        endpoint: string;
    };
    auth?: {
        type: "query-param";
        paramName?: string;
        token: string;
    };
}): string;
export declare function sendListen(ws: WebSocket, id: string, topics: string[], since?: Record<string, number>): void;
export declare function sendUnlisten(ws: WebSocket, id: string, topics: string[]): void;
export declare function sendSubscribe(ws: WebSocket, id: string, dataset: string, since?: string): void;
export declare function sendUnsubscribe(ws: WebSocket, id: string, dataset: string): void;
export declare function dispatchWireEvent(msg: {
    topic?: string;
    payload?: unknown;
}, eventTarget: EventTarget): void;
//# sourceMappingURL=push-wire.d.ts.map