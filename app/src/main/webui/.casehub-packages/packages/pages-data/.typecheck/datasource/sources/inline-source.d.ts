import type { DataSource } from "../types.js";
import type { ExternalColumnDef } from "../../dataset/external/types.js";
export type InlineData = readonly unknown[][] | readonly number[] | string | Record<string, unknown>[];
export interface InlineSourceOptions {
    readonly columns?: readonly ExternalColumnDef[];
    readonly expression?: string;
    readonly dataPath?: string;
    readonly type?: string;
}
export declare function inlineSource(data: InlineData, options?: InlineSourceOptions): DataSource;
//# sourceMappingURL=inline-source.d.ts.map