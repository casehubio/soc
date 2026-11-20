import type { CatalogSource } from '../catalog.js';
import type { CatalogEntry, Action, Result } from '../walker.js';
import { stepSuccess, stepFailure } from '../walker.js';
import type { Definition } from '../types.js';

export type McpToolInvoker = (toolName: string, params: Record<string, unknown>) => Promise<Record<string, unknown>>;

export class McpToolSource implements CatalogSource {
  readonly priority = 300;

  constructor(
    private readonly tools: Map<string, Definition>,
    private readonly invoker: McpToolInvoker,
  ) {}

  populate(entries: Map<string, CatalogEntry>): void {
    for (const [name, definition] of this.tools) {
      if (!entries.has(name)) {
        const invoker = this.invoker;
        const action: Action = {
          async execute(params: Record<string, unknown>): Promise<Result> {
            try {
              const result = await invoker(name, params);
              return stepSuccess(result);
            } catch (err) {
              return stepFailure(`MCP tool '${name}' failed: ${err instanceof Error ? err.message : String(err)}`);
            }
          },
        };
        entries.set(name, { qualifiedName: name, definition, action });
      }
    }
  }
}
