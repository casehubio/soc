import type { LitElement } from "lit";
import type { EventStreamOptions, ConnectionStatus } from "@casehubio/pages-data";
type Constructor<T = Record<string, unknown>> = new (...args: any[]) => T;
export declare function PushMixin<T extends Constructor<LitElement>>(Base: T): Constructor<{
    pushUrl: string;
    pushTopics: string[];
    pushStatus: ConnectionStatus;
    pushConnected: boolean;
    pushLatest: unknown;
    createPushOptions(): Partial<EventStreamOptions>;
    onPushEvent(event: unknown): void;
}> & T;
export {};
//# sourceMappingURL=push-mixin.d.ts.map