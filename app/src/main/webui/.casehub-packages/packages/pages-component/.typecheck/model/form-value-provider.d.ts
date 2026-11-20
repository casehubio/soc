export interface FormValueProvider {
    readonly currentValue: unknown;
    value: unknown;
    error: string | undefined;
    validate(): boolean;
}
export declare function isFormValueProvider(el: unknown): el is FormValueProvider;
//# sourceMappingURL=form-value-provider.d.ts.map