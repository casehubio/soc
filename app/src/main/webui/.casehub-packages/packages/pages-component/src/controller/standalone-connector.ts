import type { SourceConnector } from "@casehubio/pages-data";
import type { DataSetId, TypedDataSet } from "@casehubio/pages-data";
import { createSourceConnector, createDataSetManager } from "@casehubio/pages-data";
import type { DataReceiver } from "../model/hosting.js";
import type { VizTarget } from "../model/hosting.js";

export function createStandaloneConnector(target: DataReceiver & { readonly dataSetId: DataSetId }): SourceConnector {
  const manager = createDataSetManager({
    onChanged: (_id: DataSetId, ds: TypedDataSet) => { target.dataSet = ds; },
  });
  const vizTarget = target as Partial<VizTarget>;
  return createSourceConnector(target.dataSetId, manager, {
    onError: (err) => { if (err.permanent) target.error = err.message; },
    onConnecting: () => { target.loading = true; },
    onEvent: (event) => {
      if (event.type === "snapshot" && event.totalRows !== undefined && vizTarget.totalRows !== undefined) {
        vizTarget.totalRows = event.totalRows;
      }
    },
  });
}
