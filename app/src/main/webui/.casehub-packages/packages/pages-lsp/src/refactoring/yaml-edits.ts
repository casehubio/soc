import { parseDocument, isMap, isSeq, type YAMLSeq, type YAMLMap } from 'yaml';

export function yamlSetOrDelete(
  yaml: string,
  nodePath: readonly (string | number)[],
  field: readonly (string | number)[],
  value: unknown,
): string {
  const doc = parseDocument(yaml);
  const fullPath = [...nodePath, ...field];
  if (value === undefined) {
    doc.deleteIn(fullPath);
  } else {
    doc.setIn(fullPath, value);
  }
  return doc.toString();
}

export function yamlSwitchVariant(
  yaml: string,
  path: readonly (string | number)[],
  deleteKeys: string[],
  setKey: string,
  defaultValue: unknown,
): string {
  const doc = parseDocument(yaml);
  const node = doc.getIn(path);
  if (isMap(node)) {
    for (const key of deleteKeys) {
      if ((node as YAMLMap).has(key)) (node as YAMLMap).delete(key);
    }
    (node as YAMLMap).set(setKey, doc.createNode(defaultValue));
  } else {
    for (const key of deleteKeys) {
      doc.deleteIn([...path, key]);
    }
    doc.setIn([...path, setKey], defaultValue);
  }
  return doc.toString();
}

export type AppendOptions =
  | { mode: 'array-field'; nameField: string; prefix: string; defaults: Record<string, unknown> }
  | { mode: 'named-map'; prefix: string; defaults: Record<string, unknown> };

export function yamlAppendWithUniqueName(
  yaml: string,
  arrayPath: readonly (string | number)[],
  options: AppendOptions,
): string {
  const doc = parseDocument(yaml);

  if (options.mode === 'array-field') {
    const existing = new Set<string>();
    const seq = doc.getIn(arrayPath);
    if (isSeq(seq)) {
      for (const item of (seq as YAMLSeq).items) {
        if (isMap(item)) {
          const nameVal = (item as YAMLMap).get(options.nameField);
          if (typeof nameVal === 'string') existing.add(nameVal);
        }
      }
    }

    let n = 1;
    while (existing.has(`${options.prefix}-${n}`)) n++;
    const entry = { [options.nameField]: `${options.prefix}-${n}`, ...options.defaults };

    if (!seq) {
      doc.setIn(arrayPath, [entry]);
    } else {
      doc.addIn(arrayPath, entry);
    }
  } else {
    const existing = new Set<string>();
    const seq = doc.getIn(arrayPath);
    if (isSeq(seq)) {
      for (const item of (seq as YAMLSeq).items) {
        if (isMap(item)) {
          for (const pair of (item as YAMLMap).items) {
            if (pair.key) existing.add(String(pair.key));
          }
        }
      }
    }

    let n = 1;
    while (existing.has(`${options.prefix}${n}`)) n++;
    const entry = doc.createNode({ [`${options.prefix}${n}`]: options.defaults });

    if (!isSeq(seq)) {
      doc.setIn(arrayPath, []);
      (doc.getIn(arrayPath) as YAMLSeq).add(entry);
    } else {
      (seq as YAMLSeq).add(entry);
    }
  }

  return doc.toString();
}
