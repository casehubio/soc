import type { DataSetId, Column } from "../../types.js";
import type { ExternalDataSetDef } from "../types.js";
import type { DataSetEventListener } from "../../events.js";
export interface PushSourceError {
    readonly message: string;
    readonly permanent: boolean;
}
export interface PushSource {
    subscribe(dataSetId: DataSetId, def: ExternalDataSetDef, listener: DataSetEventListener, onError: (error: PushSourceError) => void): void;
    unsubscribe(dataSetId: DataSetId): void;
    close(): void;
}
export interface PushSourceConfig {
    readonly relay?: {
        readonly endpoint: string;
    };
    readonly auth?: {
        readonly type: "query-param";
        readonly paramName?: string;
        readonly token: string;
    };
    readonly eventTarget?: EventTarget;
}
export interface WireMessage {
    dataset?: string;
    op?: string;
    seq?: string;
    columns?: Column[];
    rows?: (string | null)[][];
    row?: (string | null)[];
    key?: string;
    topic?: string;
    payload?: unknown;
}
export interface Subscription {
    readonly def: ExternalDataSetDef;
    readonly listener: DataSetEventListener;
    readonly onError: (error: PushSourceError) => void;
    snapshotReceived?: boolean;
}
export declare function processWireMessage(msg: WireMessage, subscriptions: Map<DataSetId, Subscription>, wireNameToId: Map<string, DataSetId>, config?: PushSourceConfig, updateSeq?: (seq: string) => void): void;
//# sourceMappingURL=push-source.d.ts.map