import type { TypedDataSet } from './types.js';
export interface TrendPoint {
    readonly timestamp: number;
    readonly score: number;
}
export declare function extractTrendPoints(dataSet: TypedDataSet): TrendPoint[];
//# sourceMappingURL=trend-types.d.ts.map