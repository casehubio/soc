import type { FloatingFrameEngine } from "./floating-frame-engine.js";
export interface TransferSnapshot {
    readonly scrollPositions: readonly {
        selector: string;
        top: number;
        left: number;
    }[];
    readonly focusedSelector: string | null;
    readonly inputValues: readonly {
        selector: string;
        value: string;
    }[];
}
export declare function captureTransferSnapshot(el: HTMLElement): TransferSnapshot;
export declare function applyTransferSnapshot(el: HTMLElement, snapshot: TransferSnapshot): void;
export declare function transferFrame(sourceEngine: FloatingFrameEngine, targetEngine: FloatingFrameEngine, frameKey: string, dropPosition: {
    x: number;
    y: number;
}): void;
//# sourceMappingURL=compositor-transfer.d.ts.map