import type { LitElement, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { DataSourceAdapter } from './data-source-adapter.js';
import { extractTrendPoints, type TrendPoint } from '@casehubio/pages-data';
import type { DataSource } from '@casehubio/pages-data';

type Constructor<T = Record<string, unknown>> = new (...args: any[]) => T;

export function TrendSourceMixin<T extends Constructor<LitElement>>(Base: T) {
  class TrendSourceHost extends Base {
    @property({ attribute: false }) trendSource?: DataSource;
    @property({ attribute: false }) trendData?: TrendPoint[] | undefined;
    @property({ type: Number, attribute: 'max-trend-points' }) maxTrendPoints = 30;

    @state() private _adapterTrendPoints: TrendPoint[] = [];
    @state() private _directTrendPoints: TrendPoint[] = [];

    readonly _trendAdapter: DataSourceAdapter = new DataSourceAdapter(this, {
      onChange: () => {
        const ds = this._trendAdapter.dataSet;
        if (ds) {
          const extracted = extractTrendPoints(ds);
          this._adapterTrendPoints = extracted.slice().sort(
            (a, b) => a.timestamp - b.timestamp,
          );
        }
      },
    });

    get trendPoints(): TrendPoint[] {
      const source = this.trendData !== undefined
        ? this._directTrendPoints
        : this._adapterTrendPoints;
      return source.slice(-this.maxTrendPoints);
    }

    get trendLoading(): boolean {
      if (this.trendData !== undefined) return false;
      return this._trendAdapter.loading;
    }

    get trendError(): string {
      if (this.trendData !== undefined) return '';
      return this._trendAdapter.error;
    }

    override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed);
      if (changed.has('trendSource') && this.trendSource) {
        this._trendAdapter.endpoint = undefined;
      }
      if (changed.has('trendData') && this.trendData !== undefined) {
        this._directTrendPoints = [...this.trendData].sort(
          (a, b) => a.timestamp - b.timestamp,
        );
      }
    }
  }

  return TrendSourceHost as unknown as Constructor<{
    trendSource?: DataSource;
    trendData?: TrendPoint[] | undefined;
    maxTrendPoints: number;
    readonly trendPoints: TrendPoint[];
    readonly trendLoading: boolean;
    readonly trendError: string;
    readonly _trendAdapter: DataSourceAdapter;
  }> & T;
}
