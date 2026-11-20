const schemas = new Map<string, Record<string, unknown>>();

export function registerPropertySchema(nodeType: string, schema: Record<string, unknown>): void {
  schemas.set(nodeType, schema);
}

export function getPropertySchema(nodeType: string): Record<string, unknown> | undefined {
  return schemas.get(nodeType);
}

export function clearPropertySchemas(): void {
  schemas.clear();
}
