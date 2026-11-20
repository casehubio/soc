import type { RuntimeContext, EscapeMode } from "@casehubio/pages-component";
import type { TypedDataSet, DataSetId } from "@casehubio/pages-data";
export interface ContextConsumer {
    element: Element;
    templates: Map<string, {
        template: string;
        escapeMode: EscapeMode;
        lastResolved: string;
        apply: (value: string) => void;
    }>;
    visibleWhen?: {
        expression: string;
        lastResult: boolean;
        onSuspend: () => void;
        onResume: () => void;
    };
    suspended: boolean;
    postEvaluate?: (changed: boolean) => void;
}
export declare class ContextManager {
    #private;
    getContext(): RuntimeContext;
    updateFilter(filter: Record<string, readonly string[]>): void;
    updateDataset(id: DataSetId, dataset: TypedDataSet): void;
    updatePage(name: string, path: string): void;
    updateParams(params: Record<string, string>): void;
    updateSelection(datasetId: string, row: Record<string, unknown> | null): void;
    clearAllSelections(): void;
    registerConsumer(consumer: ContextConsumer): void;
    deregisterConsumer(element: Element): void;
    evaluateAll(): void;
}
//# sourceMappingURL=context-wiring.d.ts.map