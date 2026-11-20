import type { SourceConnector } from "@casehubio/pages-data";
import type { DataSetId } from "@casehubio/pages-data";
import type { DataReceiver } from "../model/hosting.js";
export declare function createStandaloneConnector(target: DataReceiver & {
    readonly dataSetId: DataSetId;
}): SourceConnector;
//# sourceMappingURL=standalone-connector.d.ts.map