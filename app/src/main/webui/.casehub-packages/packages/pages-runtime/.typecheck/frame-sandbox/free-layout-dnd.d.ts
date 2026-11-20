import type { Container, FreeLayoutEntry } from "./types.js";
import { type EdgeZone } from "../frame-boundaries.js";
export type { EdgeZone };
export interface DndCallbacks {
    onDrop(sourceContainer: Container, tabKey: string, targetFrameKey: string | null, x: number, y: number): void;
    onEdgeSplit?(sourceContainer: Container, tabKey: string, targetFrameKey: string, edge: EdgeZone): void;
}
export declare function createFreeLayoutDnd(hostElement: HTMLElement, entryState: Map<string, FreeLayoutEntry>, frameElements: Map<string, HTMLElement>, callbacks: DndCallbacks): {
    dispose(): void;
};
//# sourceMappingURL=free-layout-dnd.d.ts.map