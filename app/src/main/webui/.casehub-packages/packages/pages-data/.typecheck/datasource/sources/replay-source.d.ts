import type { DataSource } from "../types.js";
import type { DataSetEvent } from "../../dataset/events.js";
import type { PlaybookController } from "../controller.js";
export interface RecordedEvent {
    readonly offsetMs: number;
    readonly event: DataSetEvent;
}
export interface ReplayOptions {
    readonly loop?: boolean;
}
export declare function replay(events: readonly RecordedEvent[], controller: PlaybookController, options?: ReplayOptions): DataSource;
//# sourceMappingURL=replay-source.d.ts.map