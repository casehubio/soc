import { type TemplateResult } from "lit";
import type { ActionButtonProps } from "@casehubio/pages-component";
import { PagesContentElement } from "../base/PagesContentElement.js";
export declare class PagesActionButton extends PagesContentElement<ActionButtonProps> {
    private _isLoading;
    private _resultMessage;
    private _resultType;
    private _successTimeoutId;
    static styles: import("lit").CSSResult;
    protected renderContent(props: ActionButtonProps): TemplateResult;
    private _handleClick;
    private _handleResult;
    disconnectedCallback(): void;
}
//# sourceMappingURL=PagesActionButton.d.ts.map