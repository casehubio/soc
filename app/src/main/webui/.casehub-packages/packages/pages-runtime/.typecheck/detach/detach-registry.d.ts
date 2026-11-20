import type { DetachController } from "./detach-controller.js";
export declare class DetachRegistry {
    private readonly controllers;
    has(id: string): boolean;
    get(id: string): DetachController | undefined;
    register(id: string, controller: DetachController): void;
    remove(id: string): void;
    reattachAll(): void;
    disposeAll(): void;
    forEach(fn: (controller: DetachController, id: string) => void): void;
}
//# sourceMappingURL=detach-registry.d.ts.map