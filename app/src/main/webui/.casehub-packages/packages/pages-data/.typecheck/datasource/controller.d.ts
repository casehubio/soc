import type { DataSetId } from "../dataset/types.js";
import type { DataSetEvent } from "../dataset/events.js";
import type { Disposable } from "./types.js";
export interface PlaybookAnnotation {
    readonly text: string;
    readonly target?: string;
    readonly style: AnnotationStyle;
    readonly duration?: number;
}
export type AnnotationStyle = {
    type: "label";
    position?: AnchorPosition;
} | {
    type: "arrow";
} | {
    type: "circle";
} | {
    type: "highlight-box";
} | {
    type: "highlight-line";
};
export type AnchorPosition = "above" | "below" | "left" | "right";
export interface EventLogEntry {
    readonly timestamp: number;
    readonly wallTime: number;
    readonly dataSetId: DataSetId;
    readonly event: DataSetEvent;
    readonly source: string;
}
export interface PlaybookController {
    readonly speed: number;
    setSpeed(multiplier: number): void;
    play(): void;
    pause(): void;
    readonly playing: boolean;
    step(): void;
    readonly pending: number;
    schedule(delayMs: number, callback: () => void): Disposable;
    readonly elapsed: number;
    readonly activeAnnotations: readonly PlaybookAnnotation[];
    onAnnotation(listener: (annotations: readonly PlaybookAnnotation[]) => void): Disposable;
    onEvent(listener: (entry: EventLogEntry) => void): Disposable;
    logEvent(entry: EventLogEntry): void;
}
export interface PlaybookControllerOptions {
    readonly speed?: number;
    readonly playing?: boolean;
}
export declare function createPlaybookController(options?: PlaybookControllerOptions): PlaybookController;
//# sourceMappingURL=controller.d.ts.map