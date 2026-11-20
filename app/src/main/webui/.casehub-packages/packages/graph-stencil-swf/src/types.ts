import type { GraphModel } from '@casehubio/graph-core';

export interface AdapterResult {
  readonly model: GraphModel;
  readonly yamlPaths: ReadonlyMap<string, readonly (string | number)[]>;
  readonly degraded?: { readonly reason: string };
}

export const SWF_KNOWN_TYPES: ReadonlySet<string> = new Set([
  'call', 'set', 'switch', 'raise', 'try', 'try-catch', 'catch',
  'for', 'do', 'emit', 'fork', 'listen', 'run', 'wait',
  'start', 'end', 'entry', 'exit',
]);

export const SYNTHETIC_TYPES = new Set(['start', 'end', 'entry', 'exit', 'root', 'try', 'catch']);

export const SWF_TYPE_PREFIX = 'swf-';
