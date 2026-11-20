import type { Catalog, CatalogEntry, InvokeHandler } from '@casehubio/yaml-core/step';
import { stepSuccess } from '@casehubio/yaml-core/step';
import { AriaInvokeHandler } from './invoke/aria-handler.js';
import { loadScenarioDefinitions } from './invoke/definitions.js';

const handlers: InvokeHandler[] = [new AriaInvokeHandler()];

export function createScenarioCatalog(): Catalog {
  const entries = new Map<string, CatalogEntry>();
  for (const file of loadScenarioDefinitions()) {
    for (const [name, def] of Object.entries(file.actions)) {
      if (def.invoke) {
        const handler = handlers.find(h => h.supports(def.invoke!));
        const action = handler
          ? handler.create(def, def.invoke!)
          : { async execute() { return stepSuccess({}); } };
        entries.set(name, { qualifiedName: name, definition: def, action });
      }
    }
  }
  return {
    resolve: (n: string) => entries.get(n),
    availableActions: () => new Set(entries.keys()),
  };
}
