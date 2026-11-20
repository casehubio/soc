import { parseDocument } from 'yaml';

export function yamlSetField(
  yaml: string,
  path: readonly (string | number)[],
  value: unknown,
): string {
  const doc = parseDocument(yaml);
  doc.setIn([...path], value);
  return doc.toString();
}

export function yamlDeleteField(
  yaml: string,
  path: readonly (string | number)[],
): string {
  const doc = parseDocument(yaml);
  doc.deleteIn([...path]);
  return doc.toString();
}
