import { ColumnType } from './types.js';
import type { TypedDataSet } from './types.js';

export interface TrendPoint {
  readonly timestamp: number;
  readonly score: number;
}

export function extractTrendPoints(dataSet: TypedDataSet): TrendPoint[] {
  const tsCol = dataSet.columns.find(c => c.name === 'timestamp');
  const scoreCol = dataSet.columns.find(c => c.name === 'score');
  if (!tsCol || !scoreCol) return [];

  const points: TrendPoint[] = [];
  for (const row of dataSet.rows) {
    const tsCell = row.cell(tsCol.id);
    const scoreCell = row.cell(scoreCol.id);
    if (tsCell.type === 'NULL' || scoreCell.type === 'NULL') continue;
    if (tsCell.type !== ColumnType.NUMBER || scoreCell.type !== ColumnType.NUMBER) continue;
    points.push({ timestamp: tsCell.value, score: scoreCell.value });
  }
  return points;
}
