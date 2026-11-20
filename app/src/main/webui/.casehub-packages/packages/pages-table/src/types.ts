import type {TemplateResult} from 'lit';
import type {DirectiveResult} from 'lit/directive.js';
import type {CellValue, TypedRow} from '@casehubio/pages-data';
import type {
  TableColumnConfig as BaseTableColumnConfig,
  ColumnRenderer as BaseColumnRenderer,
  ColumnAlign,
  SelectionMode,
} from '@casehubio/pages-component';

export type { ColumnAlign, SelectionMode };

export type TableColumnConfig = BaseTableColumnConfig & {
  readonly compare?: (a: CellValue, b: CellValue) => number;
};

export type ColumnRenderer = (...args: Parameters<BaseColumnRenderer>) => TemplateResult | string | DirectiveResult;

export type DisplayMode = 'auto' | 'paginated' | 'scroll';
export type SortDirection = 'asc' | 'desc' | 'none';

export interface SortEntry {
  readonly columnId: string;
  readonly direction: SortDirection;
}

export interface SortChangeDetail {
  readonly columnId: string;
  readonly direction: SortDirection;
  readonly sortStack: readonly SortEntry[];
}

export interface PageChangeDetail {
  readonly page: number;
  readonly pageSize: number;
}

export interface SelectionChangeDetail {
  readonly selectedKeys: readonly string[];
  readonly selectedRows: readonly TypedRow[];
  readonly scope?: 'page';
}

export interface ColumnChangeDetail {
  readonly visibleColumns: readonly string[];
}

export interface RowActivateDetail {
  readonly row: TypedRow;
  readonly key?: string;
}

export interface FilterChangeDetail {
  readonly text: string;
  readonly matchCount: number;
}

export type LoadMoreDetail = Record<string, never>;

export interface PageSizeChangeDetail {
  readonly pageSize: number;
  readonly previousPageSize: number;
}

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

export type PagesFilterDetail = PagesFilterApply | PagesFilterReset;

export interface FilterConfig {
    readonly enabled: boolean;
    readonly group?: string | undefined;
}

export type DetailMode = 'single' | 'multi';

export interface DetailChangeDetail {
  readonly key: string;
  readonly row: TypedRow;
  readonly expanded: boolean;
}

export interface RowAccentConfig {
  readonly column: string;
  readonly colorMap: Readonly<Record<string, string>>;
  readonly default?: string;
  readonly columns?: 'all' | readonly string[];
}

export interface ColumnResizeDetail {
  readonly columnId: string;
  readonly width: number;
}

