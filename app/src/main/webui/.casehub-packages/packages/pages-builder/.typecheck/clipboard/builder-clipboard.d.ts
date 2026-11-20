export declare class BuilderClipboard {
    fragment: string | null;
    fragmentType: string | null;
    operation: 'cut' | 'copy' | null;
    insertMode: boolean;
    private _listeners;
    set(fragment: string, fragmentType: string, operation: 'cut' | 'copy'): void;
    clear(): void;
    setInsertMode(active: boolean): void;
    subscribe(cb: () => void): () => void;
    private _notify;
}
export declare function getClipboard(): BuilderClipboard;
export declare function _resetForTest(): void;
//# sourceMappingURL=builder-clipboard.d.ts.map