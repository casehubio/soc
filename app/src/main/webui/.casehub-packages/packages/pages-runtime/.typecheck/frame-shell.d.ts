export interface PositionedState {
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
}
export declare function createFrameShell(key: string, pos: {
    x: number;
    y: number;
}, size: {
    width: number;
    height: number;
}): HTMLElement;
export declare function createFrameTitlebar(): HTMLElement;
export declare function createFrameResizeHandles(frameEl: HTMLElement, state: PositionedState, onResize?: (key: string, width: number, height: number) => void, key?: string): void;
export declare function wireTitlebarDrag(titlebar: HTMLElement, frameEl: HTMLElement, state: PositionedState, onMove?: (key: string, x: number, y: number) => void, key?: string): void;
//# sourceMappingURL=frame-shell.d.ts.map