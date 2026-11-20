import type { CellValue, Column, ColumnSettings, ColumnId } from '@casehubio/pages-data';
import { compileOrCached } from '@casehubio/pages-data';

export function cellToRaw(cell: CellValue): string | number | Date | null {
  if (cell.type === 'NULL') return null;
  return cell.value;
}

export function resolveColumnName(
  column: Column,
  propsColumns?: readonly ColumnSettings[],
): string {
  const override = propsColumns?.find((c) => c.id === column.id);
  return override?.name ?? column.settings?.name ?? column.name;
}

export async function applyCellExpression(
  raw: string | number | Date | null,
  expression: string,
): Promise<string | number | Date | null> {
  if (raw === null) return null;
  try {
    const compiled = compileOrCached(expression);
    const result: unknown = await compiled.evaluate({ value: raw });
    if (result === undefined || result === null) return null;
    if (typeof result === 'number') return result;
    if (result instanceof Date) return result;
    if (typeof result === 'string') return result;
    if (typeof result === 'boolean') return String(result);
    return null;
  } catch {
    return raw;
  }
}

export function resolveColumnExpression(
  columnId: ColumnId | string,
  propsColumns?: readonly ColumnSettings[],
): string | undefined {
  return propsColumns?.find((c) => c.id === columnId)?.expression;
}
