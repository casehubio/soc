import { PageDocument } from '@casehubio/pages-document';
import type { Unsubscribe } from '@casehubio/pages-document';

export interface EditorAdapter {
  getValue(): string;
  setValue(value: string): void;
  onInput(handler: (value: string) => void): Unsubscribe;
}

const DEBOUNCE_MS = 150;

export class YamlSync {
  private _facadeUnsub: Unsubscribe | undefined;
  private _editorUnsub: Unsubscribe | undefined;
  private _debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private _suppressEcho = false;
  private _onDocumentChange: ((doc: PageDocument) => void) | undefined;

  constructor(
    private _document: PageDocument,
    private _editor: EditorAdapter,
  ) {}

  get document(): PageDocument {
    return this._document;
  }

  set document(doc: PageDocument) {
    this._document = doc;
    this._suppressEcho = true;
    this._editor.setValue(doc.toString());
    this._suppressEcho = false;
  }

  onDocumentChange(handler: (doc: PageDocument) => void): void {
    this._onDocumentChange = handler;
  }

  connect(): void {
    this._facadeUnsub = this._document.onChange((yaml) => {
      if (this._suppressEcho) return;
      this._suppressEcho = true;
      this._editor.setValue(yaml);
      this._suppressEcho = false;
    });

    this._editorUnsub = this._editor.onInput((value) => {
      if (this._suppressEcho) return;
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this._suppressEcho = true;
        this._document = PageDocument.parse(value);
        this._suppressEcho = false;
        this._onDocumentChange?.(this._document);
      }, DEBOUNCE_MS);
    });
  }

  disconnect(): void {
    this._facadeUnsub?.();
    this._editorUnsub?.();
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._facadeUnsub = undefined;
    this._editorUnsub = undefined;
    this._debounceTimer = undefined;
  }
}
