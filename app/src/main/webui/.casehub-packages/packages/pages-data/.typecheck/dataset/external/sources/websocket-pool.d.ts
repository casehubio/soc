import type { WebSocketSourceConfig } from "./websocket-source.js";
import { type WebSocketSource } from "./websocket-source.js";
export interface WebSocketPool {
    configure(config: WebSocketSourceConfig): void;
    acquire(baseUrl: string): WebSocketSource;
    releaseAll(): void;
}
export declare function createWebSocketPool(WS?: typeof WebSocket): WebSocketPool;
//# sourceMappingURL=websocket-pool.d.ts.map