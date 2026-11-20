import { LitElement } from 'lit';
type ModalVariant = 'dialog' | 'alertdialog';
type ModalSize = 'sm' | 'md' | 'lg' | 'full';
declare const PagesModal_base: (new (...args: any[]) => {
    trapFocus(container: HTMLElement): void;
    releaseFocus(): void;
}) & typeof LitElement;
export declare class PagesModal extends PagesModal_base {
    open: boolean;
    variant: ModalVariant;
    size: ModalSize;
    noCloseButton: boolean;
    closeOnBackdrop: boolean | undefined;
    ariaLabel: string | null;
    private _hasHeaderContent;
    private _isAnimating;
    private _savedOverflow;
    private _savedScrollY;
    private _wasOpen;
    private get _dialog();
    private get _shouldShowCloseButton();
    private get _shouldCloseOnBackdrop();
    requestClose(returnValue?: string): void;
    updated(changed: Map<string, unknown>): void;
    private _handleNativeClose;
    private _handleCancel;
    private _handleBackdropClick;
    firstUpdated(): void;
    private _onHeaderSlotChange;
    private _checkHeaderContent;
    disconnectedCallback(): void;
    static styles: import("lit").CSSResult;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'pages-modal': PagesModal;
    }
}
export {};
//# sourceMappingURL=pages-modal.d.ts.map