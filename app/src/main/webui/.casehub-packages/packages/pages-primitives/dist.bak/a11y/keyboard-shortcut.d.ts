import type { LitElement } from 'lit';
type Constructor<T = LitElement> = new (...args: any[]) => T;
export declare function KeyboardShortcutMixin<T extends Constructor>(Base: T): Constructor<{
    registerShortcut(key: string, handler: () => void, opts: {
        description: string;
        requiresModifier?: boolean;
    }): void;
    unregisterShortcut(key: string): void;
    getShortcuts(): Array<{
        key: string;
        description: string;
    }>;
}> & T;
export {};
//# sourceMappingURL=keyboard-shortcut.d.ts.map