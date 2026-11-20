import type { DataSetLookup } from "@casehubio/pages-data";
import type { ColumnSettings } from "@casehubio/pages-data";
import type {
  FilterSettings,
  RefreshSettings,
} from "@casehubio/pages-component";

export interface VizComponentProps {
  readonly lookup?: DataSetLookup;
  readonly filter?: FilterSettings;
  readonly refresh?: RefreshSettings;
  readonly columns?: readonly ColumnSettings[];
}
