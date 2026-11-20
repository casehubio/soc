export type ExpressionErrorCode = "SYNTAX_ERROR" | "EVALUATION_FAILED" | "TYPE_COERCION_FAILED";
export declare class ExpressionError extends Error {
    readonly code: ExpressionErrorCode;
    readonly expression: string;
    readonly position: number | undefined;
    constructor(code: ExpressionErrorCode, expression: string, position: number | undefined, message?: string);
}
//# sourceMappingURL=errors.d.ts.map