import type { DatasetNode } from '@casehubio/pages-document';
import type { PreviewDataStrategy, DatasetSnapshot } from '../preview-data-registry.js';
import { lookupRecord } from '../lookup-record.js';

const NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack', 'Kim', 'Leo'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];

function generateValue(type: string, index: number): unknown {
  if (type === 'NUMBER' || type === 'DECIMAL') {
    if (index === 3) return null;
    if (index === 7) return -42;
    return Math.round(Math.random() * 90000 + 1000);
  }
  if (type === 'DATE') {
    const d = new Date();
    d.setDate(d.getDate() - index * 7);
    return d.toISOString().split('T')[0];
  }
  if (type === 'BOOLEAN') return index % 2 === 0;
  if (index === 5) return 'A longer text value that tests column width handling';
  return NAMES[index % NAMES.length]!;
}

export class TableDataStrategy implements PreviewDataStrategy {
  generate(props: Record<string, unknown>, datasets: DatasetNode[]): DatasetSnapshot[] {
    const lookupRaw = props['lookup'];
    if (!lookupRaw) return [];
    const lookup = lookupRecord(lookupRaw);
    if (!lookup?.['uuid']) return [];
    const uuid = String(lookup['uuid']);
    const ds = datasets.find(d => d.uuid === uuid);
    const columns = ds?.getColumns() ?? [];

    const rowCount = 12;
    const rows: Record<string, unknown>[] = [];

    if (columns.length > 0) {
      for (let i = 0; i < rowCount; i++) {
        const row: Record<string, unknown> = {};
        for (const col of columns) {
          row[col.id] = generateValue(col.type, i);
        }
        rows.push(row);
      }
    } else {
      for (let i = 0; i < rowCount; i++) {
        rows.push({
          name: NAMES[i % NAMES.length]!,
          region: REGIONS[i % REGIONS.length]!,
          amount: generateValue('NUMBER', i),
          date: generateValue('DATE', i),
          active: i % 3 !== 0,
        });
      }
    }

    return [{ uuid, rows }];
  }
}
