import type { LitElement } from 'lit';
import { DataSourceAdapter } from './data-source-adapter.js';
import { type TrendPoint } from '@casehubio/pages-data';
import type { DataSource } from '@casehubio/pages-data';
type Constructor<T = Record<string, unknown>> = new (...args: any[]) => T;
export declare function TrendSourceMixin<T extends Constructor<LitElement>>(Base: T): Constructor<{
    trendSource?: DataSource;
    trendData?: TrendPoint[] | undefined;
    maxTrendPoints: number;
    readonly trendPoints: TrendPoint[];
    readonly trendLoading: boolean;
    readonly trendError: string;
    readonly _trendAdapter: DataSourceAdapter;
}> & T;
export {};
//# sourceMappingURL=trend-source-mixin.d.ts.map