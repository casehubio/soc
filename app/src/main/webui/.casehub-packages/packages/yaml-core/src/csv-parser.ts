import { isTruthy } from './truthiness.js';

export type CsvColumnType = 'STRING' | 'INTEGER' | 'BOOLEAN' | 'NUMBER';

export interface CsvColumn {
  name: string;
  type: CsvColumnType;
}

export interface CsvDataSource {
  name: string;
  columns: CsvColumn[];
  rows: Record<string, unknown>[];
}

function parseColumnValue(
  type: CsvColumnType, value: string, row: number, columnName: string,
): unknown {
  switch (type) {
    case 'STRING': return value;
    case 'INTEGER': {
      const n = parseInt(value, 10);
      if (isNaN(n)) {
        throw new Error(
          `CSV row ${row}, column '${columnName}': expected INTEGER, got '${value}'`);
      }
      return n;
    }
    case 'NUMBER': {
      const n = parseFloat(value);
      if (isNaN(n)) {
        throw new Error(
          `CSV row ${row}, column '${columnName}': expected NUMBER, got '${value}'`);
      }
      return n;
    }
    case 'BOOLEAN': {
      try {
        return isTruthy(value);
      } catch {
        throw new Error(
          `CSV row ${row}, column '${columnName}': expected BOOLEAN, got '${value}'`);
      }
    }
  }
}

function parseHeader(headerLine: string): CsvColumn[] {
  const parts = headerLine.split(',');
  const columns: CsvColumn[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    const colon = trimmed.indexOf(':');
    if (colon < 0) {
      throw new Error(
        `Header column '${trimmed}' must use format columnName:TYPE (e.g. name:STRING).`);
    }
    const colName = trimmed.substring(0, colon).trim();
    const typeName = trimmed.substring(colon + 1).trim().toUpperCase();
    if (!['STRING', 'INTEGER', 'BOOLEAN', 'NUMBER'].includes(typeName)) {
      throw new Error(
        `Unknown column type '${typeName}' for column '${colName}'. Expected: STRING, INTEGER, BOOLEAN, NUMBER.`);
    }
    columns.push({ name: colName, type: typeName as CsvColumnType });
  }
  return columns;
}

function parseRow(
  line: string, columns: CsvColumn[], rowIndex: number,
): Record<string, unknown> {
  const values = line.split(',', -1);
  if (values.length !== columns.length) {
    throw new Error(
      `CSV row ${rowIndex} has ${values.length} values but header declares ${columns.length} columns.`);
  }
  const row: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]!;
    const value = values[i]!.trim();
    row[col.name] = parseColumnValue(col.type, value, rowIndex, col.name);
  }
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Preserve the published static facade.
export class CsvParser {
  static parse(name: string, csvContent: string): CsvDataSource {
    const lines = csvContent.split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      throw new Error('CSV content is empty — expected at least a header row.');
    }

    const columns = parseHeader(lines[0]!);
    const rows: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      rows.push(parseRow(lines[i]!, columns, i));
    }

    return { name, columns, rows };
  }

  static fromDataBlock(data: Record<string, unknown>): Record<string, CsvDataSource> {
    const sources: Record<string, CsvDataSource> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const spec = val as Record<string, unknown>;
        const inlineVal = spec['inline'];
        if (inlineVal != null) {
          sources[key] = CsvParser.parse(key, String(inlineVal));
        }
      }
    }
    return sources;
  }
}
