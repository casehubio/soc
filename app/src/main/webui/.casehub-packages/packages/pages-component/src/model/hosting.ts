/**
 * Pre-attachment configuration contract for hosted Web Components.
 *
 * **Call timing:** When all panelProps values are immediately available
 * (no template variables), `configure(props)` is called before the element
 * is appended to the DOM — before `connectedCallback()` fires.
 *
 * When panelProps contain template variables (`#{...}`), configure() is
 * deferred until all variables resolve. In this case, `connectedCallback()`
 * fires first. Implementations must handle both orderings and provide a
 * valid default state from the constructor.
 *
 * **Re-configuration:** `configure()` may be called again after initial render
 * (e.g. navigation to a different item, context change). Implementations must
 * handle re-entry: tear down prior state and re-initialize with the new props.
 *
 * **Props content:** `props` contains the YAML `panelProps` values with all
 * template variables resolved. The generic `P` gives component authors type
 * safety for their specific props shape; the runtime calls with
 * `Record<string, unknown>`.
 */
export interface ConfigurablePanel<P extends Record<string, unknown> = Record<string, unknown>> {
  configure(props: P): void;
}

import type { SortColumn } from "@casehubio/pages-data";
import type { TypedDataSet } from "@casehubio/pages-data";

/**
 * Data delivery contract for components receiving pipeline data.
 *
 * **Mutual-clearing invariant:** implementations must clear `error` when
 * `dataSet` is set, and clear `dataSet` when `error` is set. Setting
 * `loading = true` clears `error`. Setting `dataSet` or `error` sets
 * `loading = false`. The pipeline delivers one or the other per cycle,
 * never both — but stale values from a prior cycle must not persist
 * alongside fresh values from the current one.
 */
export interface DataReceiver {
  loading: boolean;
  dataSet: TypedDataSet | undefined;
  error: string;
}

/**
 * Extended data delivery contract for components that support
 * pagination and sorting. Used by the data pipeline for table-like
 * visualisations.
 */
export interface VizTarget extends DataReceiver {
  totalRows: number;
  activeSort: SortColumn | undefined;
  activePage: number | undefined;
}
