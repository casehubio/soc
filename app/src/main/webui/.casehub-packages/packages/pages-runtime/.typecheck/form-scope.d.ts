import type { FieldSchema } from "@casehubio/pages-component";
interface RegisteredField {
    element: HTMLElement;
    field: string;
    componentType: string;
}
export declare class FormScopeState {
    readonly schema: FieldSchema | undefined;
    readonly validateOnBlur: boolean;
    readonly fields: Map<string, RegisteredField>;
    constructor(schema: FieldSchema | undefined, validateOnBlur: boolean);
    registerField(field: string, element: HTMLElement, componentType: string): void;
    hasField(field: string): boolean;
    private pruneDisconnected;
    collectValues(): Record<string, unknown>;
    validateAll(): Record<string, string>;
    validateField(field: string, value: unknown): void;
}
export declare const FormScopeRegistry: WeakMap<HTMLElement, FormScopeState>;
export {};
//# sourceMappingURL=form-scope.d.ts.map