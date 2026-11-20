import type { LitElement } from 'lit';
type Constructor<T = LitElement> = new (...args: any[]) => T;
export declare function FocusTrapMixin<T extends Constructor>(Base: T): Constructor<{
    trapFocus(container: HTMLElement): void;
    releaseFocus(): void;
}> & T;
export {};
//# sourceMappingURL=focus-trap.d.ts.map