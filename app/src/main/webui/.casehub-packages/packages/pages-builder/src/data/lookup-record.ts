export function lookupRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const serializer = value as { toJSON?: () => unknown };
  const raw: unknown = typeof serializer.toJSON === 'function'
    ? serializer.toJSON()
    : value;
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : undefined;
}
