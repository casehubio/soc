import type { RuntimeContext } from "./types.js";
/**
 * Create a new RuntimeContext with the row property set.
 * Row values are accessible via #{row.fieldName}.
 */
export declare function createRowContext(base: RuntimeContext, row: Record<string, unknown>): RuntimeContext;
/**
 * Evaluate a boolean expression against the runtime context.
 * Supports: &&, ||, !, ==, !=, <, >, <=, >=, parentheses, #{...} references,
 * string literals (single/double quotes), numeric literals, true/false/null.
 *
 * Type coercion: when both operands parse as finite numbers, compare numerically.
 * Otherwise compare as strings. Consistent across all operators.
 */
export declare function evaluateExpression(expression: string, context: RuntimeContext): boolean;
//# sourceMappingURL=expression-evaluator.d.ts.map