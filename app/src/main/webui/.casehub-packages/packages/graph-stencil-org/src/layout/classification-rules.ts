import type { ClassificationRule } from './types.js';
import { defaultClassifiers } from '@casehubio/graph-renderer';

export function orgClassificationRules(): ClassificationRule[] {
  return defaultClassifiers();
}
