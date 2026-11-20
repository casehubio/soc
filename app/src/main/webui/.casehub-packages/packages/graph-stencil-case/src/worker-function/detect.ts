import type { WorkerFunctionType, McpTransportType, ModelProviderKey, TriggerType } from './types.js';
import { FUNCTION_TYPE_KEYS, CORE_WORKER_KEYS, MODEL_PROVIDERS, TRIGGER_TYPES } from './types.js';

export function detectFunctionType(
  data: Record<string, unknown>,
): WorkerFunctionType {
  if (data['agent'] != null) return 'agent';
  if (data['do'] != null) return 'flow';
  if (data['a2a'] != null) return 'a2a';
  if (data['mcp'] != null) return 'mcp';
  if (data['sequence'] != null) return 'sequence';
  const hasUnknown = Object.keys(data).some(
    k => !CORE_WORKER_KEYS.has(k) && !(FUNCTION_TYPE_KEYS as readonly string[]).includes(k),
  );
  return hasUnknown ? 'unknown' : 'external';
}

export function detectMcpTransport(
  mcp: Record<string, unknown>,
): McpTransportType | null {
  if (mcp['command'] != null) return 'stdio';
  if (mcp['url'] != null) return 'http';
  return null;
}

export function detectModelProvider(
  model: Record<string, unknown>,
): ModelProviderKey | null {
  for (const key of MODEL_PROVIDERS) {
    if (model[key] != null) return key;
  }
  return null;
}

export function detectTriggerType(
  on: Record<string, unknown>,
): TriggerType | null {
  for (const t of TRIGGER_TYPES) {
    if (on[t] !== undefined) return t;
  }
  return null;
}

export type TargetType = 'capability' | 'subCase' | 'humanTask';

export function detectTargetType(
  data: Record<string, unknown>,
): TargetType {
  if (data['subCase'] !== undefined) return 'subCase';
  if (data['humanTask'] !== undefined) return 'humanTask';
  return 'capability';
}
