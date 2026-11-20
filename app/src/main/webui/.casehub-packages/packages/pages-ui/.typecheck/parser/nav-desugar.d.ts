import type { Component } from "../model/types.js";
/**
 * Resolves navigation references and transient types into direct slot composition.
 *
 * Performs 6-step resolution:
 * 1. Find components with navGroupId property
 * 2. Look up navGroupId in navTree to find child page names
 * 3. For each child page name, find the corresponding page
 * 4. Map each child into a named slot on the navigation component
 * 5. Remove slot-target placeholder components
 * 6. Fall back to using all pages when navTree is missing or group not found
 *
 * Also resolves page-ref components to their referenced pages.
 */
export declare function resolveNavigation(components: Component[], pages: Component[], navTree: unknown): Component[];
/**
 * Extracts all page names from a navTree group.
 * Recursively processes nested groups.
 */
export declare function collectNavTreePageNames(navTree: unknown): Set<string>;
export declare function collectNavTreeGroupIds(navTree: unknown): Set<string>;
//# sourceMappingURL=nav-desugar.d.ts.map