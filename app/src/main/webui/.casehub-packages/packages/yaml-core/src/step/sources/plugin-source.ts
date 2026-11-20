import type { CatalogSource } from '../catalog.js';
import type { CatalogEntry } from '../walker.js';
import type { PluginRegistry } from '../plugin-registry.js';

export class RuntimePluginSource implements CatalogSource {
  readonly priority = 200;

  constructor(private readonly registry: PluginRegistry) {}

  populate(entries: Map<string, CatalogEntry>): void {
    const source = this.registry.createSource(this.priority);
    source.populate(entries);
  }
}
