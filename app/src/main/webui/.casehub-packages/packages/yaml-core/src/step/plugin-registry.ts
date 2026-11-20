import type { Action, CatalogEntry } from './walker.js';
import type { Definition, Parameter } from './types.js';
import type { CatalogSource } from './catalog.js';

export interface PluginRegistration {
  name: string;
  description?: string;
  inputs: Record<string, Parameter>;
  outputs: Record<string, Parameter>;
  execute: Action['execute'];
}

export class PluginRegistry {
  private readonly plugins = new Map<string, PluginRegistration>();

  register(plugin: PluginRegistration): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  unregister(name: string): boolean {
    return this.plugins.delete(name);
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  createSource(priority = 200): CatalogSource {
    const plugins = this.plugins;
    return {
      priority,
      populate(entries: Map<string, CatalogEntry>): void {
        for (const [name, plugin] of plugins) {
          if (!entries.has(name)) {
            const definition: Definition = {
              name: plugin.name,
              ...(plugin.description !== undefined ? { description: plugin.description } : {}),
              inputs: plugin.inputs,
              outputs: plugin.outputs,
              portability: 'ts',
            };
            const action: Action = { execute: plugin.execute };
            entries.set(name, { qualifiedName: name, definition, action });
          }
        }
      },
    };
  }
}
