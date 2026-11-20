import type { DataSource } from "../types.js";
import type { RecordedEvent } from "./replay-source.js";
export interface RecordingCapture {
    getRecording(): readonly RecordedEvent[];
    clear(): void;
}
export declare function recording(innerSource: DataSource): DataSource & RecordingCapture;
//# sourceMappingURL=recording-source.d.ts.map