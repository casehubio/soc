import type { Action } from '../walker.js';
import type { Definition, InvokeBinding } from '../types.js';

export interface InvokeHandler {
  supports(binding: InvokeBinding): boolean;
  create(definition: Definition, binding: InvokeBinding): Action;
}
