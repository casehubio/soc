export declare class DetachController {
    readonly componentId: string;
    private container;
    private placeholder;
    private _childWindow;
    private eventRelay;
    private pollTimer;
    private panelTitle;
    private _isDetached;
    constructor(componentId: string, container: HTMLElement, panelTitle: string);
    get isDetached(): boolean;
    get childWindow(): Window | null;
    detach(): void;
    reattach(): void;
    dispose(): void;
}
//# sourceMappingURL=detach-controller.d.ts.map