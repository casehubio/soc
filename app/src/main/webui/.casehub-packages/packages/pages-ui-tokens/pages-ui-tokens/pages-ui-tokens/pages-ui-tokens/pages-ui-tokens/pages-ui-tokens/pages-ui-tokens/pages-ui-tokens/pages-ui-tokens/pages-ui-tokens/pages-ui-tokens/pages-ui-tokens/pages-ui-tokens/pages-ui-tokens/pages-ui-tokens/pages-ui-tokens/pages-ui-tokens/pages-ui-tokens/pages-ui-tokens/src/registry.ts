import type { TransformFn } from './types.js';

const transforms = new Map<string, TransformFn>();

export function registerTransform(name: string, fn: TransformFn): void {
  transforms.set(name, fn);
}

export function getTransform(name: string): TransformFn {
  const fn = transforms.get(name);
  if (!fn) throw new Error(`Unknown transform: "${name}". Registered: ${[...transforms.keys()].join(', ')}`);
  return fn;
}

export function listTransforms(): string[] {
  return [...transforms.keys()];
}
