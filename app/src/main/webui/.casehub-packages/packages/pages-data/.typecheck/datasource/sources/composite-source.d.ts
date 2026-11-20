import type { DataSource } from "../types.js";
/**
 * Combines an initial source (typically REST) with a live source (typically SSE
 * or WebSocket). On connect, the initial source is connected first. After it
 * emits its first `snapshot` event, the composite forwards that snapshot to the
 * outer sink, disconnects the initial source, and connects the live source.
 *
 * Non-snapshot events from the initial source are silently ignored — only the
 * first snapshot triggers the handoff. If the initial source errors, the live
 * source is never connected and the error is forwarded to the outer sink.
 */
export declare function composite(initial: DataSource, live: DataSource): DataSource;
//# sourceMappingURL=composite-source.d.ts.map