export interface FrameChromeCallbacks {
    readonly onClose: () => void;
    readonly onPin: () => void;
    readonly onDetach?: (() => void) | undefined;
    readonly onTitlebarDoubleClick: () => void;
    readonly onAddTab?: (() => void) | undefined;
    readonly onViewModeToggle?: (() => void) | undefined;
}
export interface ChromeExtraButton {
    readonly icon: string;
    readonly title: string;
    readonly className?: string | undefined;
    readonly onClick: () => void;
}
export declare function injectFrameChrome(groupEl: HTMLElement, titlebar: HTMLElement, callbacks: FrameChromeCallbacks, extraButtons: readonly ChromeExtraButton[]): void;
export declare function updatePinVisual(resizeContainer: HTMLElement, pinned: boolean): void;
//# sourceMappingURL=frame-chrome.d.ts.map