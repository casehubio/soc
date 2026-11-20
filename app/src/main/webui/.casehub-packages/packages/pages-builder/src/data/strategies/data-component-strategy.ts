import type { DatasetNode } from '@casehubio/pages-document';
import type { PreviewDataStrategy, DatasetSnapshot } from '../preview-data-registry.js';
import { lookupRecord } from '../lookup-record.js';

const CATEGORIES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];
const CITIES = [
  { name: 'London', lat: 51.5, lng: -0.12 },
  { name: 'Paris', lat: 48.85, lng: 2.35 },
  { name: 'Berlin', lat: 52.52, lng: 13.41 },
  { name: 'Tokyo', lat: 35.68, lng: 139.69 },
  { name: 'New York', lat: 40.71, lng: -74.01 },
];

export class DataComponentStrategy implements PreviewDataStrategy {
  generate(props: Record<string, unknown>, datasets: DatasetNode[]): DatasetSnapshot[] {
    const lookupRaw = props['lookup'];
    if (!lookupRaw) return [];
    const lookup = lookupRecord(lookupRaw);
    if (!lookup?.['uuid']) return [];
    const uuid = String(lookup['uuid']);
    const ds = datasets.find(d => d.uuid === uuid);
    const columns = ds?.getColumns() ?? [];

    if (columns.length > 0) {
      const rows: Record<string, unknown>[] = [];
      for (let i = 0; i < 5; i++) {
        const row: Record<string, unknown> = {};
        for (const col of columns) {
          if (col.type === 'NUMBER' || col.type === 'DECIMAL') row[col.id] = Math.round(Math.random() * 1000);
          else if (col.type === 'DATE') {
            const d = new Date(); d.setDate(d.getDate() - i * 2);
            row[col.id] = d.toISOString();
          } else row[col.id] = CATEGORIES[i % CATEGORIES.length]!;
        }
        rows.push(row);
      }
      return [{ uuid, rows }];
    }

    const rows: Record<string, unknown>[] = CITIES.map((city, i) => ({
      id: `item-${i}`,
      name: city.name,
      lat: city.lat,
      lng: city.lng,
      value: Math.round(Math.random() * 1000),
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
    }));

    return [{ uuid, rows }];
  }
}
