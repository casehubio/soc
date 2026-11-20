import type { DatasetNode } from '@casehubio/pages-document';
import type { PreviewDataStrategy, DatasetSnapshot } from '../preview-data-registry.js';
import { lookupRecord } from '../lookup-record.js';

const SAMPLE_CATEGORIES = ['North', 'South', 'East', 'West', 'Central'];
const SAMPLE_PRODUCTS = ['Widget A', 'Widget B', 'Gadget X', 'Gadget Y', 'Tool Z'];

function generateValue(type: string): unknown {
  if (type === 'NUMBER' || type === 'DECIMAL') return Math.round(Math.random() * 90000 + 10000);
  if (type === 'DATE') {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * 365));
    return d.toISOString().split('T')[0];
  }
  return SAMPLE_CATEGORIES[Math.floor(Math.random() * SAMPLE_CATEGORIES.length)];
}

export class ChartDataStrategy implements PreviewDataStrategy {
  generate(props: Record<string, unknown>, datasets: DatasetNode[]): DatasetSnapshot[] {
    const lookupRaw = props['lookup'];
    if (!lookupRaw) return [];
    const lookup = lookupRecord(lookupRaw);
    if (!lookup?.['uuid']) return [];
    const uuid = String(lookup['uuid']);
    const ds = datasets.find(d => d.uuid === uuid);
    if (!ds) return [];
    const columns = ds.getColumns();

    const rowCount = 6;
    const rows: Record<string, unknown>[] = [];

    if (columns.length > 0) {
      for (let i = 0; i < rowCount; i++) {
        const row: Record<string, unknown> = {};
        for (const col of columns) {
          if (col.type === 'TEXT' || col.type === 'LABEL') {
            row[col.id] = (SAMPLE_CATEGORIES[i] ?? SAMPLE_PRODUCTS[i % SAMPLE_PRODUCTS.length])!;
          } else {
            row[col.id] = generateValue(col.type);
          }
        }
        rows.push(row);
      }
    } else {
      for (let i = 0; i < rowCount; i++) {
        rows.push({
          category: SAMPLE_CATEGORIES[i]!,
          value: Math.round(Math.random() * 90000 + 10000),
          secondary: Math.round(Math.random() * 50000 + 5000),
        });
      }
    }

    return [{ uuid, rows }];
  }
}
