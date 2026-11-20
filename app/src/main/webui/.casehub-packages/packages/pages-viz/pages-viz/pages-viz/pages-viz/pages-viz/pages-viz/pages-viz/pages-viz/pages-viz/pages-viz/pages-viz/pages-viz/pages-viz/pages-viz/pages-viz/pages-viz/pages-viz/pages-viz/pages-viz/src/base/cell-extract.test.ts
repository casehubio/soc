import { describe, it, expect } from "vitest";
import { cellToRaw, resolveColumnName, applyCellExpression } from "./cell-extract.js";
import { ColumnType } from "@casehubio/pages-data";
import type { Column, ColumnId, ColumnSettings } from "@casehubio/pages-data";

describe("cellToRaw", () => {
  it("extracts number value", () => {
    expect(cellToRaw({ type: ColumnType.NUMBER, value: 42 })).toBe(42);
  });

  it("extracts string value from LABEL", () => {
    expect(cellToRaw({ type: ColumnType.LABEL, value: "hello" })).toBe("hello");
  });

  it("extracts string value from TEXT", () => {
    expect(cellToRaw({ type: ColumnType.TEXT, value: "text" })).toBe("text");
  });

  it("extracts Date value", () => {
    const d = new Date("2024-01-01");
    expect(cellToRaw({ type: ColumnType.DATE, value: d })).toBe(d);
  });

  it("returns null for NULL cell", () => {
    expect(cellToRaw({ type: "NULL" })).toBeNull();
  });
});

describe("resolveColumnName", () => {
  const col: Column = {
    id: "revenue" as ColumnId,
    name: "revenue",
    type: ColumnType.NUMBER,
  };

  it("returns column.name when no overrides", () => {
    expect(resolveColumnName(col)).toBe("revenue");
  });

  it("returns override name from propsColumns", () => {
    const overrides: ColumnSettings[] = [
      { id: "revenue" as ColumnId, name: "Total Revenue" },
    ];
    expect(resolveColumnName(col, overrides)).toBe("Total Revenue");
  });

  it("returns column.settings.name when no propsColumns match", () => {
    const colWithSettings: Column = {
      ...col,
      settings: { id: "revenue" as ColumnId, name: "Rev" },
    };
    expect(resolveColumnName(colWithSettings)).toBe("Rev");
  });

  it("propsColumns takes priority over settings.name", () => {
    const colWithSettings: Column = {
      ...col,
      settings: { id: "revenue" as ColumnId, name: "Rev" },
    };
    const overrides: ColumnSettings[] = [
      { id: "revenue" as ColumnId, name: "Override" },
    ];
    expect(resolveColumnName(colWithSettings, overrides)).toBe("Override");
  });

  it("ignores propsColumns with non-matching id", () => {
    const overrides: ColumnSettings[] = [
      { id: "other" as ColumnId, name: "Other" },
    ];
    expect(resolveColumnName(col, overrides)).toBe("revenue");
  });
});

describe("applyCellExpression", () => {
  it("returns null for null input", async () => {
    expect(await applyCellExpression(null, "value * 2")).toBeNull();
  });

  it("evaluates arithmetic expression", async () => {
    expect(await applyCellExpression(10, "value * 2")).toBe(20);
  });

  it("preserves number type", async () => {
    const result = await applyCellExpression(42, "value + 1");
    expect(result).toBe(43);
    expect(typeof result).toBe("number");
  });

  it("evaluates string function", async () => {
    expect(await applyCellExpression("hello", "$uppercase(value)")).toBe("HELLO");
  });

  it("evaluates $round", async () => {
    expect(await applyCellExpression(3.7, "$round(value)")).toBe(4);
  });

  it("evaluates $formatNumber", async () => {
    expect(await applyCellExpression(3.14159, '$formatNumber(value, "0.00")')).toBe("3.14");
  });

  it("evaluates ternary conditional", async () => {
    expect(await applyCellExpression(150, 'value > 100 ? "high" : "low"')).toBe("high");
    expect(await applyCellExpression(50, 'value > 100 ? "high" : "low"')).toBe("low");
  });

  it("evaluates $replace", async () => {
    expect(await applyCellExpression("hello world", '$replace(value, "world", "there")')).toBe("hello there");
  });

  it("evaluates $substring", async () => {
    expect(await applyCellExpression("2024-01-15T12:00:00Z", "$substring(value, 0, 10)")).toBe("2024-01-15");
  });

  it("evaluates $floor for integer conversion", async () => {
    expect(await applyCellExpression(2048, "$floor(value / 1024)")).toBe(2);
  });

  it("evaluates string concatenation with &", async () => {
    expect(await applyCellExpression(42, 'value & " MB"')).toBe("42 MB");
  });

  it("falls back to raw value on syntax error", async () => {
    expect(await applyCellExpression(42, "invalid syntax !!!")).toBe(42);
  });

  it("falls back to raw value on evaluation error", async () => {
    expect(await applyCellExpression("text", "$floor(value)")).toBe("text");
  });

  it("coerces boolean to string", async () => {
    expect(await applyCellExpression(5, "value > 3")).toBe("true");
  });
});
