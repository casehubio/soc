import type { Component } from "../model/types.js";
/**
 * Converts a raw YAML component object to a typed Component.
 *
 * Handles:
 * - Content shorthands (html, markdown, title)
 * - Navigation references (screen → page-ref, panel, div → slot-target)
 * - Displayer components (delegates to displayer-desugar)
 * - Navigation components (TABS, TREE, MENU, etc.)
 * - External components (EXTERNAL → iframe-plugin)
 * - CSS properties (properties → style for content/displayer components)
 *
 * Some component types are transient (page-ref, slot-target) and will be
 * resolved by nav-desugar in a later step.
 */
export declare function desugarComponent(raw: Record<string, unknown>, displayerDefaults?: Record<string, unknown>): Component;
//# sourceMappingURL=component-desugar.d.ts.map