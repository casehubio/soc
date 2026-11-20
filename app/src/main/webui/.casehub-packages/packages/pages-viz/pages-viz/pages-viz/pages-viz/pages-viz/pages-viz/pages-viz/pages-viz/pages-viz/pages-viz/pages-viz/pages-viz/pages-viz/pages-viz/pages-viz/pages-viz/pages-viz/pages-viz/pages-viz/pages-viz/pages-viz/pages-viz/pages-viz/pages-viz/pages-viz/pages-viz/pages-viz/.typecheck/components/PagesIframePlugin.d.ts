import { type TemplateResult } from "lit";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { IframePluginProps } from "@casehubio/pages-component";
import { PagesElement } from "../base/PagesElement.js";
export declare class PagesIframePlugin extends PagesElement<IframePluginProps> {
    private _iframe;
    private _messageHandler;
    private _loaded;
    private _pendingProps;
    private _pendingDataset;
    private _currentSrc;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    protected renderContent(props: IframePluginProps, dataset: TypedDataSet): TemplateResult;
    updated(): void;
    private createIframe;
    private sendMessages;
    private handleMessage;
}
//# sourceMappingURL=PagesIframePlugin.d.ts.map