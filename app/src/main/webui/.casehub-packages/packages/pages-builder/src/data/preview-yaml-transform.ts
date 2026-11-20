import { PageDocument, type ComponentNode } from '@casehubio/pages-document';
import type { PreviewDataStrategy, DatasetSnapshot } from './preview-data-registry.js';

export function transformYamlForPreview(
  yaml: string,
  doc: PageDocument,
  registry: Map<string, PreviewDataStrategy>,
): string {
  const datasets = doc.getDatasets();
  const snapshots = new Map<string, DatasetSnapshot>();

  for (const page of doc.getPages()) {
    collectSnapshots(page.getComponents(), registry, datasets, snapshots);
    for (const row of page.getRows()) {
      for (const col of row.getColumns()) {
        collectSnapshots(col.getComponents(), registry, datasets, snapshots);
      }
    }
    for (const col of page.getColumns()) {
      collectSnapshots(col.getComponents(), registry, datasets, snapshots);
    }
  }

  if (snapshots.size === 0) return yaml;

  const workDoc = PageDocument.parse(yaml);

  for (const ds of workDoc.getDatasets()) {
    const snapshot = snapshots.get(ds.uuid);
    if (!snapshot || ds.getSource() === 'content') continue;
    ds.setProperty('content', JSON.stringify(snapshot.rows));
    const rawDoc = workDoc._getDoc();
    const urlPath = [...ds.path, 'url'] as (string | number)[];
    if (rawDoc.getIn(urlPath) != null) {
      rawDoc.deleteIn(urlPath);
    }
  }

  return workDoc.toString();
}

function collectSnapshots(
  components: readonly ComponentNode[],
  registry: Map<string, PreviewDataStrategy>,
  datasets: ReturnType<PageDocument['getDatasets']>,
  snapshots: Map<string, DatasetSnapshot>,
): void {
  for (const comp of components) {
    const strategy = registry.get(comp.type);
    if (strategy) {
      const results = strategy.generate(comp.getProperties(), datasets);
      for (const snapshot of results) {
        if (!snapshots.has(snapshot.uuid)) {
          snapshots.set(snapshot.uuid, snapshot);
        }
      }
    }
    if (comp.isContainer()) {
      const children = comp.getChildren();
      for (const slotComps of Object.values(children.slots)) {
        collectSnapshots(slotComps, registry, datasets, snapshots);
      }
    }
  }
}
