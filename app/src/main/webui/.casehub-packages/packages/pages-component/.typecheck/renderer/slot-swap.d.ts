export type SwapFn = (slotName: string) => void;
export declare const slotSwapRegistry: WeakMap<HTMLElement, SwapFn>;
export declare function dispatchSlotChange(container: HTMLElement, slotName: string): void;
//# sourceMappingURL=slot-swap.d.ts.map