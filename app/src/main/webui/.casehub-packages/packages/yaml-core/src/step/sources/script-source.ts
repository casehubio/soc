import type { CatalogSource } from '../catalog.js';
import type { CatalogEntry } from '../walker.js';
import type { InvokeHandler } from '../invoke/invoke-handler.js';
import type { Definition, Parameter } from '../types.js';
import { ValidatingAction } from '../action.js';

export interface ScriptFileEntry {
  name: string;
  runtime: string;
  scriptPath: string;
  schema: { inputs: Record<string, Parameter>; outputs: Record<string, Parameter> };
}

export class ScriptSource implements CatalogSource {
  readonly priority = 400;

  constructor(
    private readonly scripts: ScriptFileEntry[],
    private readonly scriptHandler: InvokeHandler,
  ) {}

  populate(entries: Map<string, CatalogEntry>): void {
    for (const script of this.scripts) {
      if (!entries.has(script.name)) {
        const definition: Definition = {
          name: script.name,
          inputs: script.schema.inputs,
          outputs: script.schema.outputs,
          invoke: {
            kind: 'script',
            runtime: script.runtime,
            script: script.scriptPath,
            timeout: '30s',
            env: {},
          },
        };
        const rawAction = this.scriptHandler.create(definition, definition.invoke!);
        const action = new ValidatingAction(rawAction, definition);
        entries.set(script.name, { qualifiedName: script.name, definition, action });
      }
    }
  }
}
