export interface CsvParseOptions {
    readonly delimiter?: string;
    readonly hasHeader?: boolean;
    readonly quote?: string;
}
export interface CsvParseResult {
    readonly headers: string[];
    readonly rows: string[][];
}
export declare function parseCsv(raw: string, options?: CsvParseOptions): CsvParseResult;
//# sourceMappingURL=csv.d.ts.map