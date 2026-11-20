import type { ExternalDataSetDef } from "../../dataset/external/types.js";
import type { PresetRegistry } from "../../dataset/external/types.js";
import type { PushPool } from "../../dataset/external/sources/push-pool.js";
import type { DataSetManager } from "../../dataset/manager.js";
import type { DataSourceBinding } from "../types.js";
export interface DefToBindingDeps {
    readonly manager: DataSetManager;
    readonly wsPool?: PushPool;
    readonly ssePool?: PushPool;
    readonly fetchFn?: typeof globalThis.fetch;
    readonly presets?: PresetRegistry;
}
export declare function defToBinding(def: ExternalDataSetDef, deps: DefToBindingDeps): DataSourceBinding;
//# sourceMappingURL=def-to-binding.d.ts.map