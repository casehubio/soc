import type { SaveConfig } from "@casehubio/pages-ui";
export type SaveConfigRegistry = Map<string, SaveConfig>;
export declare function createSaveConfigRegistry(): SaveConfigRegistry;
export declare function getSaveConfig(registry: SaveConfigRegistry, pagePath: string): SaveConfig | undefined;
//# sourceMappingURL=save-config-registry.d.ts.map