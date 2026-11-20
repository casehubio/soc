import type { DataSetId } from "../dataset/types.js";
import type { DataSetEvent } from "../dataset/events.js";
import type { DataSetManager } from "../dataset/manager.js";
import type { DataSource, SourceError, Disposable } from "./types.js";
export interface SourceConnector extends Disposable {
    connect(source: DataSource): void;
    disconnect(): void;
    replace(source: DataSource): void;
    refresh(): void;
    readonly source: DataSource | undefined;
    readonly connected: boolean;
}
export interface SourceConnectorOptions {
    readonly onError?: (err: SourceError) => void;
    readonly onConnecting?: () => void;
    readonly onEvent?: (event: DataSetEvent) => void;
}
export declare function createSourceConnector(id: DataSetId, manager: DataSetManager, options?: SourceConnectorOptions): SourceConnector;
//# sourceMappingURL=source-connector.d.ts.map