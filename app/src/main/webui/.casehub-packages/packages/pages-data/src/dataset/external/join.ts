import type { DataSetId, TypedDataSet } from "../types.js";
import type { DataSetManager } from "../manager.js";
import { DataSetError } from "../errors.js";

function schemaMatches(
  first: TypedDataSet,
  other: TypedDataSet,
  otherId: DataSetId,
): void {
  if (first.columns.length !== other.columns.length) {
    throw new DataSetError(
      "SCHEMA_MISMATCH",
      `Column schema mismatch in join: dataset "${otherId}" has ${String(other.columns.length)} columns, expected ${String(first.columns.length)}`,
    );
  }

  for (let i = 0; i < first.columns.length; i++) {
    const firstCol = first.columns[i];
    const otherCol = other.columns[i];
    if (!firstCol || !otherCol) {
      throw new DataSetError(
        "INVALID_OPERATION",
        `Column at index ${String(i)} is undefined`,
      );
    }

    if (firstCol.id !== otherCol.id) {
      throw new DataSetError(
        "SCHEMA_MISMATCH",
        `Column schema mismatch in join: dataset "${otherId}" has column "${otherCol.id}" at position ${String(i)}, expected "${firstCol.id}"`,
      );
    }

    if (firstCol.type !== otherCol.type) {
      throw new DataSetError(
        "SCHEMA_MISMATCH",
        `Column schema mismatch in join: dataset "${otherId}" column "${otherCol.id}" has type ${otherCol.type}, expected ${firstCol.type}`,
      );
    }
  }
}

export function joinDataSets(
  ids: readonly DataSetId[],
  manager: DataSetManager,
): TypedDataSet {
  if (ids.length === 0) {
    throw new DataSetError("INVALID_OPERATION", "Cannot join zero datasets");
  }

  const datasets: TypedDataSet[] = [];

  for (const id of ids) {
    const ds = manager.get(id);
    if (!ds) {
      throw new DataSetError("UNKNOWN_PROVIDER", `Dataset "${id}" not registered`);
    }
    datasets.push(ds);
  }

  const first = datasets[0];
  if (!first) {
    throw new DataSetError("INVALID_OPERATION", "First dataset is undefined");
  }

  for (let i = 1; i < datasets.length; i++) {
    const dataset = datasets[i];
    const id = ids[i];
    if (!dataset || !id) {
      throw new DataSetError("INVALID_OPERATION", `Dataset or ID at index ${String(i)} is undefined`);
    }
    schemaMatches(first, dataset, id);
  }

  const allRows = datasets.flatMap(ds => ds.rows);

  return {
    columns: first.columns,
    rows: allRows,
  };
}
