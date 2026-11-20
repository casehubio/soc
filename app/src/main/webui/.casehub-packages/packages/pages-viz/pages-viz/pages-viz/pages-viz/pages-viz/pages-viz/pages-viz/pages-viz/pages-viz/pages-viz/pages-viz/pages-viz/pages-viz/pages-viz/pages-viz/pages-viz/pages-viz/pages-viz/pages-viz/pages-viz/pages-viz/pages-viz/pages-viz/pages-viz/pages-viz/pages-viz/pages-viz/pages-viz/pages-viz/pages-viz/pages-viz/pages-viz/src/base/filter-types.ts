import type { TypedRow } from "@casehubio/pages-data";

export type PagesFilterDetail = PagesFilterApply | PagesFilterReset;

export interface PagesFilterApply {
  readonly columnId: string;
  readonly value: string;
  readonly row: TypedRow;
  readonly reset: false;
  readonly group: string | undefined;
}

export interface PagesFilterReset {
  readonly columnId: string;
  readonly reset: true;
  readonly group: string | undefined;
}

export interface ChartClickParams {
  readonly dataIndex: number;
  readonly seriesIndex: number;
  readonly seriesName: string;
  readonly name: string;
  readonly data: unknown;
}
