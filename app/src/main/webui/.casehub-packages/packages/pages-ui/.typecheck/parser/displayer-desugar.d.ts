import type { Component } from "../model/types.js";
/**
 * Converts a raw YAML displayer object to a typed Component.
 *
 * Handles:
 * - Type mapping from DisplayerType enums to component types
 * - Settings extraction from nested YAML structure to flat props
 * - Lookup passthrough (parsed separately)
 * - External component handling (iframe-plugin)
 * - Field renames (html.html → html.template, extraConfiguration → extra)
 */
export declare function desugarDisplayer(raw: Record<string, unknown>): Component;
//# sourceMappingURL=displayer-desugar.d.ts.map