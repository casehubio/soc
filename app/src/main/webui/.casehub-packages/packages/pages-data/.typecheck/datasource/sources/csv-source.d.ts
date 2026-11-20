import type { DataSource } from "../types.js";
import type { ExternalColumnDef } from "../../dataset/external/types.js";
export interface CsvSourceOptions {
    readonly delimiter?: string;
    readonly hasHeader?: boolean;
    readonly columns?: readonly ExternalColumnDef[];
}
export declare function csvSource(csv: string, options?: CsvSourceOptions): DataSource;
//# sourceMappingURL=csv-source.d.ts.map