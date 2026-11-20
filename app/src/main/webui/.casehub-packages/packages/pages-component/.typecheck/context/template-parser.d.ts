import type { RuntimeContext, EscapeMode } from "./types.js";
/**
 * Resolve template variables in a string.
 * Syntax: #{path.to.value}
 * Applies escaping based on the specified mode.
 */
export declare function resolveTemplate(template: string, context: RuntimeContext, escape: EscapeMode): string;
/**
 * Check if a string contains template variables.
 */
export declare function hasTemplateVars(str: string): boolean;
/**
 * Check if all template variables in a string resolve to non-empty values.
 * Returns true for strings with no template variables.
 */
export declare function allTemplateVarsResolved(template: string, context: RuntimeContext): boolean;
//# sourceMappingURL=template-parser.d.ts.map