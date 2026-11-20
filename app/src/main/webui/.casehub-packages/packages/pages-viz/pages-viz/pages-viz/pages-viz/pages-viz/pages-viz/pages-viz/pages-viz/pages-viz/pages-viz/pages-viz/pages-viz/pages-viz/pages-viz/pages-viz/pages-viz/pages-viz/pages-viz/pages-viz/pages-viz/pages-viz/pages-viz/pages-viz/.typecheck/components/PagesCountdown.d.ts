import { type TemplateResult } from "lit";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { CountdownProps } from "@casehubio/pages-component";
import { PagesElement } from "../base/PagesElement.js";
/**
 * Live countdown timer component.
 *
 * Displays time remaining until a deadline from the dataset.
 * Updates every second with threshold-based color transitions.
 */
export declare class PagesCountdown extends PagesElement<CountdownProps> {
    private _countdownTimer;
    private _deadlineMs;
    private _warningThresholdMs;
    private _criticalThresholdMs;
    private _lastThresholdState;
    private _displayText;
    private _thresholdClass;
    static styles: import("lit").CSSResult;
    disconnectedCallback(): void;
    protected renderContent(props: CountdownProps, dataset: TypedDataSet): TemplateResult;
    private renderCountdownDisplay;
    private updateDisplayState;
    private getThresholdState;
    private hasThresholdChanged;
    private formatRemaining;
    private startCountdownTimer;
    private stopCountdownTimer;
}
//# sourceMappingURL=PagesCountdown.d.ts.map