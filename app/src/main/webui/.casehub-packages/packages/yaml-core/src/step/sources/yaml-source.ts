import type { CatalogSource } from '../catalog.js';
import type { CatalogEntry } from '../walker.js';
import type { InvokeHandler } from '../invoke/invoke-handler.js';
import type { DefinitionFile } from '../types.js';
import { DefinitionParser } from '../definition-parser.js';
import { ValidatingAction } from '../action.js';

export class YamlDefinitionSource implements CatalogSource {
  readonly priority = 100;
  private readonly files: DefinitionFile[] = [];
  private readonly handlers: InvokeHandler[] = [];

  constructor(handlers: InvokeHandler[]) {
    this.handlers = [...handlers];
  }

  addFile(raw: Record<string, unknown>): void {
    this.files.push(DefinitionParser.parse(raw));
  }

  addParsedFile(file: DefinitionFile): void {
    this.files.push(file);
  }

  populate(entries: Map<string, CatalogEntry>): void {
    for (const file of this.files) {
      for (const [name, definition] of Object.entries(file.actions)) {
        const qualifiedName = file.namespace ? `${file.namespace}.${name}` : name;
        if (definition.invoke) {
          const handler = this.handlers.find(h => h.supports(definition.invoke!));
          if (handler) {
            const rawAction = handler.create(definition, definition.invoke);
            const action = new ValidatingAction(rawAction, definition);
            if (!entries.has(qualifiedName)) {
              entries.set(qualifiedName, { qualifiedName, definition, action });
            }
            if (file.namespace && !entries.has(name)) {
              entries.set(name, { qualifiedName, definition, action });
            }
          }
        }
      }
    }
  }
}
