import { describe, it, expect } from "vitest";
import { isFixedOptions } from "@casehubio/pages-component";
import type { FixedOptions, DataSetOptions } from "@casehubio/pages-component";
import { dataSetId } from "@casehubio/pages-data";

describe("form input type utilities", () => {
  it("isFixedOptions identifies FixedOptions correctly", () => {
    const fixedOpts: FixedOptions = { values: ["Option A", "Option B"] };
    expect(isFixedOptions(fixedOpts)).toBe(true);
  });

  it("isFixedOptions rejects DataSetOptions", () => {
    const datasetOpts: DataSetOptions = {
      dataset: dataSetId("employees"),
      labelColumn: "name",
      valueColumn: "id",
    };
    expect(isFixedOptions(datasetOpts)).toBe(false);
  });
});
