import type { DataSource } from "../types.js";
import type { DataSetId } from "../../dataset/types.js";
import type { ExternalColumnDef } from "../../dataset/external/types.js";
import type { PresetRegistry } from "../../dataset/external/types.js";
export interface PostMessageSourceOptions {
    readonly columns?: readonly ExternalColumnDef[];
    readonly dataPath?: string;
    readonly type?: string;
    readonly expression?: string;
    readonly timeoutMs?: number;
    readonly eventTarget?: EventTarget;
    readonly presets?: PresetRegistry;
}
export declare function postMessageSource(dataSetId: DataSetId, options?: PostMessageSourceOptions): DataSource;
//# sourceMappingURL=post-message-source.d.ts.map