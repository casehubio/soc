import { parseDocument, isMap, type YAMLSeq } from 'yaml';
import { yamlSetOrDelete } from '@casehubio/pages-lsp';

const SWF_TASK_DEFAULTS: Record<string, Record<string, unknown>> = {
  'swf-call': { call: 'http:get', with: {} },
  'swf-set': { set: {} },
  'swf-switch': { switch: [{ when: '.condition == true', then: 'continue' }] },
  'swf-raise': { raise: { error: { type: 'error', status: 500, title: 'Error' } } },
  'swf-try': { try: { call: 'http:get' }, catch: { as: 'error' } },
  'swf-for': { for: { each: 'item', in: '.items' }, do: [{ processItem: { call: 'http:get', with: {} } }] },
  'swf-do': { do: [{ step: { call: 'http:get', with: {} } }] },
  'swf-fork': { fork: { branches: [{ branch1: { call: 'http:get', with: {} } }] } },
  'swf-emit': { emit: { event: { with: { type: 'com.example.event' } } } },
  'swf-listen': { listen: { to: { one: { with: { type: 'com.example.event' } } } } },
  'swf-run': { run: { container: { image: 'example:latest' } } },
  'swf-wait': { wait: { seconds: 30 } },
};

const TYPE_TO_NAME_PREFIX: Record<string, string> = {
  'swf-call': 'newCall',
  'swf-set': 'newSet',
  'swf-switch': 'newSwitch',
  'swf-raise': 'newRaise',
  'swf-try': 'newTry',
  'swf-for': 'newFor',
  'swf-do': 'newDo',
  'swf-fork': 'newFork',
  'swf-emit': 'newEmit',
  'swf-listen': 'newListen',
  'swf-run': 'newRun',
  'swf-wait': 'newWait',
};

function prepareSwfTaskInsert(yaml: string, taskType: string) {
  const doc = parseDocument(yaml);
  const doSeq = doc.get('do') as YAMLSeq;
  if (!doSeq) throw new Error('No do: block found in workflow YAML');

  const existing = new Set<string>();
  for (const item of doSeq.items) {
    const map = (item as { items?: { key?: { value?: string } }[] }).items;
    if (map) {
      for (const pair of map) {
        if (pair.key?.value) existing.add(pair.key.value);
      }
    }
  }

  const prefix = TYPE_TO_NAME_PREFIX[taskType] ?? 'newStep';
  let counter = 1;
  while (existing.has(`${prefix}${counter}`)) counter++;
  const stepName = `${prefix}${counter}`;

  return { doc, doSeq, stepName };
}

export function addSwfTask(yaml: string, taskType: string): string {
  const { doc, doSeq, stepName } = prepareSwfTaskInsert(yaml, taskType);

  const lastTaskName = getLastTaskName(doSeq);
  if (lastTaskName && !findTaskThen(doSeq, lastTaskName)) {
    setTaskThen(doSeq, lastTaskName, 'exit');
  }

  const defaults = SWF_TASK_DEFAULTS[taskType] ?? {};
  const entry = doc.createNode({ [stepName]: defaults });
  doSeq.add(entry);
  return doc.toString();
}

function getLastTaskName(doSeq: YAMLSeq): string | undefined {
  if (doSeq.items.length === 0) return undefined;
  const last = doSeq.items[doSeq.items.length - 1];
  if (!isMap(last)) return undefined;
  const firstKey = last.items[0]?.key;
  return firstKey ? String(firstKey) : undefined;
}

export function insertSwfTask(yaml: string, taskType: string, beforeTaskName: string | null): string {
  const { doc, doSeq, stepName } = prepareSwfTaskInsert(yaml, taskType);
  const defaults = SWF_TASK_DEFAULTS[taskType] ?? {};
  const entry = doc.createNode({ [stepName]: defaults });

  if (beforeTaskName === null) {
    doSeq.add(entry);
  } else {
    let idx = doSeq.items.findIndex((item: unknown) => {
      if (isMap(item)) {
        const firstKey = item.items[0]?.key;
        return firstKey && String(firstKey) === beforeTaskName;
      }
      return false;
    });
    if (idx === -1) idx = doSeq.items.length;
    doSeq.items.splice(idx, 0, entry);
  }

  return doc.toString();
}

export function spliceSwfTask(yaml: string, taskType: string, sourceTaskName: string, targetTaskName: string): string {
  const { doc, doSeq, stepName } = prepareSwfTaskInsert(yaml, taskType);
  const defaults = SWF_TASK_DEFAULTS[taskType] ?? {};
  const newTaskData: Record<string, unknown> = { ...defaults, then: targetTaskName };

  let rewired = false;
  for (const item of doSeq.items) {
    if (!isMap(item)) continue;
    const firstKey = item.items[0]?.key;
    if (!firstKey) continue;
    const taskName = String(firstKey);
    const taskDef = item.items[0]?.value;
    if (!isMap(taskDef)) continue;

    if (taskName === sourceTaskName) {
      const thenNode = taskDef.get('then');
      if (thenNode !== undefined && String(thenNode) === targetTaskName) {
        taskDef.set('then', stepName);
        rewired = true;
      }
      const switchSeq = taskDef.get('switch');
      if (switchSeq && (switchSeq as YAMLSeq).items) {
        for (const caseItem of (switchSeq as YAMLSeq).items) {
          if (!isMap(caseItem)) continue;
          for (const casePair of caseItem.items) {
            const caseBody = casePair.value;
            if (isMap(caseBody)) {
              const caseThen = caseBody.get('then');
              if (caseThen !== undefined && String(caseThen) === targetTaskName) {
                caseBody.set('then', stepName);
                rewired = true;
              }
            }
          }
        }
      }
    }
  }

  if (!rewired) {
    delete newTaskData['then'];
  }

  const entry = doc.createNode({ [stepName]: newTaskData });
  let idx = doSeq.items.findIndex((item: unknown) => {
    if (isMap(item)) {
      const firstKey = item.items[0]?.key;
      return firstKey && String(firstKey) === targetTaskName;
    }
    return false;
  });
  if (idx === -1) idx = doSeq.items.length;
  doSeq.items.splice(idx, 0, entry);

  return doc.toString();
}

export function removeSwfTask(yaml: string, taskName: string): string {
  const doc = parseDocument(yaml);
  const doSeq = doc.get('do') as YAMLSeq;
  if (!doSeq) throw new Error('No do: block found in workflow YAML');

  const idx = doSeq.items.findIndex((item: unknown) => {
    if (isMap(item)) {
      const firstKey = item.items[0]?.key;
      return firstKey && String(firstKey) === taskName;
    }
    return false;
  });

  if (idx === -1) throw new Error(`Task '${taskName}' not found in do: block`);
  doSeq.delete(idx);
  return doc.toString();
}

export function moveSwfTask(yaml: string, taskName: string, beforeTaskName: string | null, edgeSourceName?: string): string {
  const doc = parseDocument(yaml);
  const doSeq = doc.get('do') as YAMLSeq;
  if (!doSeq) throw new Error('No do: block found in workflow YAML');

  const movedTaskThen = findTaskThen(doSeq, taskName);

  const srcIdx = doSeq.items.findIndex((item: unknown) => {
    if (isMap(item)) {
      const firstKey = item.items[0]?.key;
      return firstKey && String(firstKey) === taskName;
    }
    return false;
  });
  if (srcIdx === -1) throw new Error(`Task '${taskName}' not found in do: block`);

  const [removed] = doSeq.items.splice(srcIdx, 1);

  if (movedTaskThen) {
    rewriteAllThenReferences(doSeq, taskName, movedTaskThen);
  }

  if (beforeTaskName === null) {
    doSeq.items.push(removed);
  } else {
    let dstIdx = doSeq.items.findIndex((item: unknown) => {
      if (isMap(item)) {
        const firstKey = item.items[0]?.key;
        return firstKey && String(firstKey) === beforeTaskName;
      }
      return false;
    });
    if (dstIdx === -1) dstIdx = doSeq.items.length;
    doSeq.items.splice(dstIdx, 0, removed);
  }

  if (beforeTaskName && edgeSourceName) {
    rewriteThenReferences(doSeq, edgeSourceName, beforeTaskName, taskName);
  }

  if (movedTaskThen) {
    setTaskThen(doSeq, taskName, beforeTaskName);
  }

  return doc.toString();
}

function findTaskThen(doSeq: YAMLSeq, taskName: string): string | undefined {
  for (const item of doSeq.items) {
    if (!isMap(item)) continue;
    const firstKey = item.items[0]?.key;
    if (!firstKey || String(firstKey) !== taskName) continue;
    const taskDef = item.items[0]?.value;
    if (!isMap(taskDef)) continue;
    const then = taskDef.get('then');
    return then !== undefined && then !== null ? String(then) : undefined;
  }
  return undefined;
}

function setTaskThen(doSeq: YAMLSeq, taskName: string, newTarget: string | null): void {
  for (const item of doSeq.items) {
    if (!isMap(item)) continue;
    const firstKey = item.items[0]?.key;
    if (!firstKey || String(firstKey) !== taskName) continue;
    const taskDef = item.items[0]?.value;
    if (!isMap(taskDef)) continue;
    if (newTarget) {
      taskDef.set('then', newTarget);
    } else {
      taskDef.delete('then');
    }
    return;
  }
}

function rewriteAllThenReferences(doSeq: YAMLSeq, oldTarget: string, newTarget: string): void {
  for (const item of doSeq.items) {
    if (!isMap(item)) continue;
    const firstKey = item.items[0]?.key;
    if (!firstKey) continue;
    const taskDef = item.items[0]?.value;
    if (!isMap(taskDef)) continue;
    const switchSeq = taskDef.get('switch') as YAMLSeq | undefined;
    if (switchSeq) {
      for (const caseItem of switchSeq.items) {
        if (!isMap(caseItem)) continue;
        for (const casePair of caseItem.items) {
          const caseBody = casePair.value;
          if (isMap(caseBody) && String(caseBody.get('then')) === oldTarget) {
            caseBody.set('then', newTarget);
          }
        }
      }
    }
    if (String(taskDef.get('then')) === oldTarget) {
      taskDef.set('then', newTarget);
    }
  }
}

function rewriteThenReferences(doSeq: YAMLSeq, sourceTaskName: string, oldTarget: string, newTarget: string): void {
  for (const item of doSeq.items) {
    if (!isMap(item)) continue;
    const firstKey = item.items[0]?.key;
    if (!firstKey || String(firstKey) !== sourceTaskName) continue;
    const taskDef = item.items[0]?.value;
    if (!isMap(taskDef)) continue;
    const switchSeq = taskDef.get('switch') as YAMLSeq | undefined;
    if (switchSeq) {
      for (const caseItem of switchSeq.items) {
        if (!isMap(caseItem)) continue;
        for (const casePair of caseItem.items) {
          const caseBody = casePair.value;
          if (isMap(caseBody) && String(caseBody.get('then')) === oldTarget) {
            caseBody.set('then', newTarget);
          }
        }
      }
    }
    if (String(taskDef.get('then')) === oldTarget) {
      taskDef.set('then', newTarget);
    }
  }
}

export function applySwfPropertyEdit(
  yaml: string,
  nodePath: readonly (string | number)[],
  field: (string | number)[],
  value: unknown,
): string {
  return yamlSetOrDelete(yaml, nodePath, field, value);
}
