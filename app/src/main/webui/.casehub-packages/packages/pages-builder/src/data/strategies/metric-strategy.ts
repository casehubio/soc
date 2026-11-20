import type { DatasetNode } from '@casehubio/pages-document';
import type { PreviewDataStrategy, DatasetSnapshot } from '../preview-data-registry.js';
import { lookupRecord } from '../lookup-record.js';

export class MetricDataStrategy implements PreviewDataStrategy {
  generate(props: Record<string, unknown>, datasets: DatasetNode[]): DatasetSnapshot[] {
    const lookupRaw = props['lookup'];
    if (!lookupRaw) return [];
    const lookup = lookupRecord(lookupRaw);
    if (!lookup?.['uuid']) return [];
    const uuid = String(lookup['uuid']);

    const value = Math.round(Math.random() * 90000 + 10000);
    const row: Record<string, unknown> = {};

    const ds = datasets.find(d => d.uuid === uuid);
    const columns = ds?.getColumns() ?? [];
    if (columns.length > 0) {
      for (const col of columns) {
        row[col.id] = col.type === 'NUMBER' || col.type === 'DECIMAL' ? value : col.id;
      }
    } else {
      row['value'] = value;
      row['min'] = 0;
      row['max'] = 100000;
    }

    return [{ uuid, rows: [row] }];
  }
}
