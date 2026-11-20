import type { FilterOp, ResolvedFilterOp } from "./filter.js";
import type { GroupOp } from "./group.js";
import type { SortOp } from "./sort.js";
import { DataSetError } from "./errors.js";
import type { TypedDataSet } from "./types.js";
import { applyFilter } from "./filter-eval.js";
import { applyGroup, applyGroupSequence } from "./group-eval.js";
import { applySort } from "./sort-eval.js";

export type DataSetOp = FilterOp | GroupOp | SortOp;
export type ResolvedDataSetOp = ResolvedFilterOp | GroupOp | SortOp;

export interface ApplyOpsOptions {
  readonly referenceDate?: Date;
}

export function validateOpOrder(ops: readonly DataSetOp[]): void {
  let pattern = "";
  for (const op of ops) {
    switch (op.type) {
      case "filter": pattern += "F"; break;
      case "group": pattern += "G"; break;
      case "sort": pattern += "S"; break;
    }
  }
  if (!/^F*G*S?$/.test(pattern)) {
    throw new DataSetError(
      "INVALID_OPERATION",
      `Invalid operation sequence "${pattern}". Valid pattern: (0..N) FILTER > (0..N) GROUP > (0..1) SORT`,
    );
  }
}

export function applyOps(
  ds: TypedDataSet,
  ops: readonly ResolvedDataSetOp[],
  options?: ApplyOpsOptions,
): TypedDataSet {
  validateOpOrder(ops);

  let current = ds;
  let i = 0;

  while (i < ops.length) {
    const op = ops[i];
    if (!op) {
      throw new DataSetError("INVALID_OPERATION", `Operation at index ${String(i)} is undefined`);
    }

    if (op.type === "filter") {
      current = applyFilter(current, op, options?.referenceDate);
      i++;
    } else if (op.type === "group") {
      // Collect consecutive GroupOps for deferred materialisation
      const groupOps: GroupOp[] = [];
      while (i < ops.length) {
        const currentOp = ops[i];
        if (!currentOp || currentOp.type !== "group") break;
        groupOps.push(currentOp);
        i++;
      }
      const firstGroupOp = groupOps[0];
      if (!firstGroupOp) {
        throw new DataSetError("INVALID_OPERATION", "First group operation is undefined");
      }
      current = groupOps.length === 1
        ? applyGroup(current, firstGroupOp)
        : applyGroupSequence(current, groupOps);
    } else {
      current = applySort(current, op);
      i++;
    }
  }

  return current;
}
