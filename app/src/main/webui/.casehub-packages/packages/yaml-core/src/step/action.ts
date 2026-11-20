import type { Action, Result, ServiceRegistry } from './walker.js';
import { stepFailure } from './walker.js';
import type { Definition } from './types.js';
import { Validator } from './validator.js';

export class ValidatingAction implements Action {
  constructor(
    private readonly delegate: Action,
    private readonly definition: Definition,
  ) {}

  async execute(params: Record<string, unknown>, services: ServiceRegistry): Promise<Result> {
    const inputViolations = Validator.validateInputs(this.definition.name, params, this.definition);
    if (inputViolations.length > 0) {
      return stepFailure(
        `Input validation failed for '${this.definition.name}': ` +
        inputViolations.map(v => v.message).join('; '),
      );
    }

    const result = await this.delegate.execute(params, services);

    if (result.kind === 'success' && Object.keys(this.definition.outputs).length > 0) {
      const outputViolations = Validator.validateOutputs(result.output, this.definition);
      if (outputViolations.length > 0) {
        return stepFailure(
          `Output validation failed for '${this.definition.name}': ` +
          outputViolations.map(v => v.message).join('; '),
        );
      }
    }

    return result;
  }
}
