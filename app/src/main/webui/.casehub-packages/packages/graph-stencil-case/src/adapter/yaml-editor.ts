import { parseDocument, parse as parseYaml, type YAMLMap } from 'yaml';
import { yamlSetOrDelete, yamlSwitchVariant, yamlAppendWithUniqueName } from '@casehubio/pages-lsp';
import type { WorkerFunctionType, McpTransportType, ModelProviderKey, TriggerType } from '../worker-function/types.js';
import { FUNCTION_TYPE_KEYS, FUNCTION_TYPE_TO_YAML_KEY, MODEL_PROVIDERS, TRIGGER_TYPES } from '../worker-function/types.js';
import { FUNCTION_TYPE_DEFAULTS, MCP_TRANSPORT_DEFAULTS, PROVIDER_DEFAULT } from '../worker-function/defaults.js';

export function applyPropertyEdit(
  yaml: string,
  nodePath: readonly (string | number)[],
  field: readonly (string | number)[],
  value: unknown,
): string {
  return yamlSetOrDelete(yaml, nodePath, field, value);
}

const ELEMENT_PATHS: Record<string, string> = {
  binding: 'bindings',
  worker: 'workers',
  milestone: 'milestones',
  goal: 'goals',
};

const ELEMENT_DEFAULTS: Record<string, (n: number) => Record<string, unknown>> = {
  binding: (n) => ({ name: `binding-${n}`, capability: '' }),
  worker: (n) => ({ name: `worker-${n}`, capabilities: [] }),
  milestone: (n) => ({ name: `milestone-${n}` }),
  goal: (n) => ({ name: `goal-${n}`, kind: 'success' }),
};

export function addElement(
  yaml: string,
  elementType: 'binding' | 'worker' | 'milestone' | 'goal',
  defaults?: Record<string, unknown>,
): string {
  const doc = parseDocument(yaml);
  const arrayKey = ELEMENT_PATHS[elementType]!;
  const specPath = ['spec', arrayKey];

  const parsed = parseYaml(yaml) as { spec: Record<string, Array<{ name?: string }>> };
  const existing = parsed.spec?.[arrayKey] ?? [];
  const existingNames = new Set(existing.map((e: { name?: string }) => String(e.name ?? '')));

  let n = 1;
  while (existingNames.has(`${elementType}-${n}`)) n++;

  const generated = ELEMENT_DEFAULTS[elementType]!(n);
  const merged = defaults ? { ...generated, ...defaults } : generated;

  const seq = doc.getIn(specPath);
  if (!seq) {
    doc.setIn(specPath, [merged]);
  } else {
    doc.addIn(specPath, merged);
  }
  return doc.toString();
}

export function removeElement(
  yaml: string,
  nodePath: readonly (string | number)[],
): string {
  const doc = parseDocument(yaml);
  doc.deleteIn([...nodePath]);
  return doc.toString();
}

const TARGET_DEFAULTS: Record<string, unknown> = {
  capability: '',
  subCase: { namespace: '', name: '' },
  humanTask: { title: '' },
};

export function switchBindingTarget(
  yaml: string,
  bindingPath: readonly (string | number)[],
  targetType: 'capability' | 'subCase' | 'humanTask',
): string {
  return yamlSwitchVariant(yaml, bindingPath,
    ['capability', 'subCase', 'humanTask'],
    targetType, TARGET_DEFAULTS[targetType],
  );
}

export function switchFunctionType(
  yaml: string,
  nodePath: readonly (string | number)[],
  newType: WorkerFunctionType,
): string {
  const yamlKey = FUNCTION_TYPE_TO_YAML_KEY[newType];
  if (yamlKey == null) {
    return yamlSwitchVariant(yaml, nodePath, [...FUNCTION_TYPE_KEYS], '', undefined);
  }
  return yamlSwitchVariant(yaml, nodePath,
    [...FUNCTION_TYPE_KEYS],
    yamlKey, FUNCTION_TYPE_DEFAULTS[newType],
  );
}

export function switchMcpTransport(
  yaml: string,
  nodePath: readonly (string | number)[],
  newTransport: McpTransportType,
): string {
  const defaults = MCP_TRANSPORT_DEFAULTS[newTransport];
  const doc = parseDocument(yaml);
  const mcpPath = [...nodePath, 'mcp'];
  const mcp = doc.getIn(mcpPath) as YAMLMap;
  for (const key of ['command', 'env', 'url', 'auth']) {
    if (mcp.has(key)) mcp.delete(key);
  }
  for (const [k, v] of Object.entries(defaults)) {
    mcp.set(k, doc.createNode(v));
  }
  return doc.toString();
}

export function switchModelProvider(
  yaml: string,
  nodePath: readonly (string | number)[],
  newProvider: ModelProviderKey,
): string {
  return yamlSwitchVariant(yaml, [...nodePath, 'agent', 'model'],
    [...MODEL_PROVIDERS],
    newProvider, PROVIDER_DEFAULT,
  );
}

const TRIGGER_DEFAULTS: Record<TriggerType, unknown> = {
  contextChange: {},
  cloudEvent: {},
  schedule: {},
  scopeActivated: {},
};

export function switchTriggerType(
  yaml: string,
  bindingPath: readonly (string | number)[],
  newType: TriggerType,
): string {
  return yamlSwitchVariant(yaml, [...bindingPath, 'on'],
    [...TRIGGER_TYPES],
    newType, TRIGGER_DEFAULTS[newType],
  );
}

export function removeCaseEdge(
  yaml: string,
  bindingPath: readonly (string | number)[],
  field: 'capability' | 'subCase',
): string {
  const doc = parseDocument(yaml);
  doc.deleteIn([...bindingPath, field]);
  return doc.toString();
}

export function addCaseEdge(
  yaml: string,
  bindingPath: readonly (string | number)[],
  field: 'capability',
  value: string,
): string {
  const doc = parseDocument(yaml);
  doc.setIn([...bindingPath, field], value);
  return doc.toString();
}
