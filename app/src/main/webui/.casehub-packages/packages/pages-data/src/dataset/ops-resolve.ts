import type { Column } from "./types.js";
import type { DataSetOp, ResolvedDataSetOp } from "./ops.js";
import { resolveFilterTypes } from "./filter-resolve.js";

export function resolveOps(
  ops: readonly DataSetOp[],
  columns: readonly Column[],
): ResolvedDataSetOp[] {
  return ops.map(op => {
    if (op.type !== "filter") return op;
    return {
      type: "filter" as const,
      expressions: op.expressions.map(expr => resolveFilterTypes(expr, columns)),
    };
  });
}
