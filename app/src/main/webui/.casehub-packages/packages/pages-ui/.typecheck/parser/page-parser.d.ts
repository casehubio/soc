import type { Component } from "../model/types.js";
/**
 * Main entry point for parsing raw YAML dashboard objects into the Component model.
 *
 * Orchestrates:
 * 1. Property substitution (${name} → value)
 * 2. Component desugaring (YAML shorthands → typed components)
 * 3. Layout desugaring (components list / rows+columns → grid items)
 * 4. Navigation resolution (navGroupId + navTree → slots)
 * 5. Deterministic ID generation for grid items
 *
 * @param raw - A raw YAML object (output of yaml.load()). Does NOT import js-yaml itself.
 * @returns A frozen root Component of type "page" containing the full dashboard tree.
 */
export declare function parsePage(raw: unknown): Component;
//# sourceMappingURL=page-parser.d.ts.map