import type { Catalog, Result } from '@casehubio/yaml-core/step';
import { stepFailure, MapServiceRegistry, isCompatible } from '@casehubio/yaml-core/step';
import type { RuntimeEnvironment } from '@casehubio/yaml-core/step';

export interface CatalogExecuteRequest {
  actionName: string;
  params: Record<string, unknown>;
}

export function createCatalogExecuteHandler(
  catalog: Catalog,
  runtime: RuntimeEnvironment = 'ts',
): (req: CatalogExecuteRequest) => Promise<Result> {
  return async (req: CatalogExecuteRequest): Promise<Result> => {
    const entry = catalog.resolve(req.actionName);
    if (!entry) {
      return stepFailure(`Action '${req.actionName}' not found in catalog`);
    }

    const portability = entry.definition.portability ?? 'ts';
    if (!isCompatible(portability, runtime)) {
      return stepFailure(
        `Action '${req.actionName}' requires '${portability}' runtime — portability check failed (current runtime: '${runtime}')`,
      );
    }

    const services = new MapServiceRegistry();

    try {
      return await entry.action.execute(req.params, services);
    } catch (err) {
      return stepFailure(
        `Execution failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };
}
