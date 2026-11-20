import { type LitElement } from 'lit';
type Constructor<T = LitElement> = new (...args: any[]) => T;
export type RovingDirection = 'horizontal' | 'vertical' | 'both';
export declare function RovingTabindexMixin<T extends Constructor>(Base: T): Constructor<{
    rovingSelector: string;
    rovingDirection: RovingDirection;
    rovingIndex: number;
    navigateRoving(direction: "next" | "prev" | "first" | "last"): void;
}> & T;
export {};
//# sourceMappingURL=roving-tabindex.d.ts.map