export function mergeAbortSignals(
  parent: AbortSignal | undefined,
  child: AbortSignal,
): AbortSignal {
  if (!parent) return child;
  return AbortSignal.any([parent, child]);
}
