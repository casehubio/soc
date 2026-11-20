import { PageDocument } from '@casehubio/pages-document';
import type { Unsubscribe } from '@casehubio/pages-document';
export interface EditorAdapter {
    getValue(): string;
    setValue(value: string): void;
    onInput(handler: (value: string) => void): Unsubscribe;
}
export declare class YamlSync {
    private _document;
    private _editor;
    private _facadeUnsub;
    private _editorUnsub;
    private _debounceTimer;
    private _suppressEcho;
    private _onDocumentChange;
    constructor(_document: PageDocument, _editor: EditorAdapter);
    get document(): PageDocument;
    set document(doc: PageDocument);
    onDocumentChange(handler: (doc: PageDocument) => void): void;
    connect(): void;
    disconnect(): void;
}
//# sourceMappingURL=yaml-sync.d.ts.map