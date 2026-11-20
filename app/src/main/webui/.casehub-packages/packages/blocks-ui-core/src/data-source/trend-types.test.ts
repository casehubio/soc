import { describe, it, expect } from 'vitest';
import { extractTrendPoints } from './trend-types.js';
import { ColumnType, columnId } from '@casehubio/pages-data/dist/dataset/types.js';
import { createTypedRow } from '@casehubio/pages-data/dist/dataset/conversion.js';
import type { TypedDataSet, Column, CellValue } from '@casehubio/pages-data/dist/dataset/types.js';

const TS_COL: Column = { id: columnId('timestamp'), name: 'timestamp', type: ColumnType.NUMBER };
const SCORE_COL: Column = { id: columnId('score'), name: 'score', type: ColumnType.NUMBER };
const ID_COL: Column = { id: columnId('id'), name: 'id', type: ColumnType.TEXT };
const COLUMNS = [ID_COL, TS_COL, SCORE_COL];

function makeRow(id: string, ts: number, score: number) {
  const cells: CellValue[] = [
    { type: ColumnType.TEXT, value: id },
    { type: ColumnType.NUMBER, value: ts },
    { type: ColumnType.NUMBER, value: score },
  ];
  return createTypedRow(cells, COLUMNS);
}

function makeNullScoreRow(id: string, ts: number) {
  const cells: CellValue[] = [
    { type: ColumnType.TEXT, value: id },
    { type: ColumnType.NUMBER, value: ts },
    { type: 'NULL' as const },
  ];
  return createTypedRow(cells, COLUMNS);
}

describe('extractTrendPoints', () => {
  it('extracts TrendPoint[] from valid TypedDataSet', () => {
    const ds: TypedDataSet = {
      columns: COLUMNS,
      rows: [makeRow('1', 1000, 0.8), makeRow('2', 2000, 0.85)],
    };
    const points = extractTrendPoints(ds);
    expect(points).toEqual([
      { timestamp: 1000, score: 0.8 },
      { timestamp: 2000, score: 0.85 },
    ]);
  });

  it('returns empty array when timestamp column missing', () => {
    const ds: TypedDataSet = {
      columns: [ID_COL, SCORE_COL],
      rows: [],
    };
    expect(extractTrendPoints(ds)).toEqual([]);
  });

  it('returns empty array when score column missing', () => {
    const ds: TypedDataSet = {
      columns: [ID_COL, TS_COL],
      rows: [],
    };
    expect(extractTrendPoints(ds)).toEqual([]);
  });

  it('skips rows with NULL score cells', () => {
    const ds: TypedDataSet = {
      columns: COLUMNS,
      rows: [makeRow('1', 1000, 0.8), makeNullScoreRow('2', 2000), makeRow('3', 3000, 0.9)],
    };
    const points = extractTrendPoints(ds);
    expect(points).toEqual([
      { timestamp: 1000, score: 0.8 },
      { timestamp: 3000, score: 0.9 },
    ]);
  });

  it('skips rows with type-mismatched cells', () => {
    const wrongTypeCols: Column[] = [
      ID_COL,
      { id: columnId('timestamp'), name: 'timestamp', type: ColumnType.TEXT },
      SCORE_COL,
    ];
    const cells: CellValue[] = [
      { type: ColumnType.TEXT, value: '1' },
      { type: ColumnType.TEXT, value: 'not-a-number' },
      { type: ColumnType.NUMBER, value: 0.8 },
    ];
    const ds: TypedDataSet = {
      columns: wrongTypeCols,
      rows: [createTypedRow(cells, wrongTypeCols)],
    };
    expect(extractTrendPoints(ds)).toEqual([]);
  });

  it('returns empty array for empty rows', () => {
    const ds: TypedDataSet = { columns: COLUMNS, rows: [] };
    expect(extractTrendPoints(ds)).toEqual([]);
  });

  it('matches column name case-sensitively', () => {
    const wrongNameCols: Column[] = [
      ID_COL,
      { id: columnId('Timestamp'), name: 'Timestamp', type: ColumnType.NUMBER },
      SCORE_COL,
    ];
    const ds: TypedDataSet = { columns: wrongNameCols, rows: [] };
    expect(extractTrendPoints(ds)).toEqual([]);
  });
});
