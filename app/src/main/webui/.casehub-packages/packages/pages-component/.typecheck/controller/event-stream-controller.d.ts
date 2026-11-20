import type { EventStreamOptions } from "@casehubio/pages-data";
import type { ConnectionStatus } from "@casehubio/pages-data";
import type { ReactiveController, ReactiveControllerHost } from "lit";
export declare class EventStreamController<T = unknown> implements ReactiveController {
    private readonly host;
    private readonly stream;
    constructor(host: ReactiveControllerHost, url: string, topics: string | string[], options?: EventStreamOptions<T>);
    get latest(): T | undefined;
    get all(): readonly T[];
    get status(): ConnectionStatus;
    hostConnected(): void;
    hostDisconnected(): void;
}
//# sourceMappingURL=event-stream-controller.d.ts.map