import type { LitElement } from 'lit';
type Constructor<T = LitElement> = new (...args: any[]) => T;
export declare function LiveRegionMixin<T extends Constructor>(Base: T): Constructor<{
    announce(message: string, priority?: "polite" | "assertive"): void;
}> & T;
export {};
//# sourceMappingURL=live-region.d.ts.map