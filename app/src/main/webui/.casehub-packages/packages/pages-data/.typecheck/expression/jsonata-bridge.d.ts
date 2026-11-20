export interface CompiledExpression {
    evaluate(data: unknown, bindings?: Record<string, unknown>): Promise<unknown>;
}
export declare function compile(expression: string): CompiledExpression;
export declare function compileOrCached(expression: string): CompiledExpression;
export declare function clearCache(): void;
//# sourceMappingURL=jsonata-bridge.d.ts.map