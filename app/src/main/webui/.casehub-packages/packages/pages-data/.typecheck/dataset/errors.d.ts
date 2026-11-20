export type DataSetErrorCode = "FETCH_FAILED" | "PARSE_FAILED" | "SCHEMA_MISMATCH" | "TRANSFORM_FAILED" | "TIMEOUT" | "INVALID_REF" | "UNKNOWN_COLUMN" | "TYPE_MISMATCH" | "UNKNOWN_PROVIDER" | "INVALID_OPERATION" | "RESOLUTION_FAILED" | "UNKNOWN_PRESET" | "EXTRACTION_ERROR" | "INVALID_DEFINITION" | "EMPTY_RESULT" | "INVALID_ARGUMENT" | "CONFIG_MISSING";
export declare class DataSetError extends Error {
    readonly code: DataSetErrorCode;
    readonly cause?: unknown;
    constructor(code: DataSetErrorCode, message: string, cause?: unknown);
    get recoverable(): boolean;
}
//# sourceMappingURL=errors.d.ts.map