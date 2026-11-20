import { parseDocument, isSeq, isMap, isPair, isScalar } from 'yaml';

export function buildYamlPaths(yamlStr: string): Map<string, (string | number)[]> {
  const doc = parseDocument(yamlStr);
  const paths = new Map<string, (string | number)[]>();
  const doNode = doc.getIn(['do'], true);
  if (!doNode || !isSeq(doNode)) return paths;
  walkTaskList(doNode, ['do'], '/do', paths);
  return paths;
}

function walkTaskList(
  seq: unknown,
  basePath: (string | number)[],
  idPrefix: string,
  paths: Map<string, (string | number)[]>,
): void {
  if (!seq || !isSeq(seq)) return;

  for (let i = 0; i < seq.items.length; i++) {
    const item = seq.items[i];
    if (!isMap(item) || item.items.length === 0) continue;

    const firstPair = item.items[0];
    if (!isPair(firstPair) || !isScalar(firstPair.key)) continue;

    const taskName = String(firstPair.key.value);
    const nodeId = `${idPrefix}/${taskName}`;
    const nodePath = [...basePath, i, taskName];
    paths.set(nodeId, nodePath);

    const taskBody = firstPair.value;
    if (!isMap(taskBody)) continue;

    for (const prop of taskBody.items) {
      if (!isPair(prop) || !isScalar(prop.key)) continue;
      const key = String(prop.key.value);

      if (key === 'try' && isSeq(prop.value)) {
        const tryContainerId = `${nodeId}/try`;
        walkTaskList(prop.value, [...nodePath, 'try'], `${nodeId}/try`, paths);
      }

      if (key === 'catch' && isMap(prop.value)) {
        for (const catchProp of prop.value.items) {
          if (!isPair(catchProp) || !isScalar(catchProp.key)) continue;
          if (String(catchProp.key.value) === 'do' && isSeq(catchProp.value)) {
            walkTaskList(catchProp.value, [...nodePath, 'catch', 'do'], `${nodeId}/catch/do`, paths);
          }
        }
      }

      if (key === 'do' && isSeq(prop.value)) {
        walkTaskList(prop.value, [...nodePath, 'do'], `${nodeId}/do`, paths);
      }

    }
  }
}
