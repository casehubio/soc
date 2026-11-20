import type { AriaTarget } from '@casehubio/pages-primitives';
import { resolveTarget } from '../executor/command-executor.js';

export type ReadinessStatus = 'ready' | 'unknown' | 'not-ready';

export function probeReadiness(targets: AriaTarget[]): ReadinessStatus {
  if (targets.length === 0) return 'unknown';
  for (const target of targets) {
    try {
      resolveTarget(target);
    } catch {
      return 'not-ready';
    }
  }
  return 'ready';
}
