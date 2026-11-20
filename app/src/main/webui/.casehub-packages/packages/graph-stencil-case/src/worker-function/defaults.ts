import type { WorkerFunctionType, McpTransportType, ProviderModelConfig } from './types.js';

export const FUNCTION_TYPE_DEFAULTS: Record<WorkerFunctionType, unknown> = {
  agent: {
    systemPrompt: '',
    inputProjection: '.',
    outputProjection: '.',
    model: { openai: { modelName: '' } },
  },
  a2a: { endpoint: '' },
  mcp: { command: [] },
  sequence: [],
  flow: [],
  external: null,
  unknown: null,
};

export const MCP_TRANSPORT_DEFAULTS: Record<McpTransportType, Record<string, unknown>> = {
  stdio: { command: [] },
  http: { url: '' },
};

export const PROVIDER_DEFAULT: ProviderModelConfig = { modelName: '' };
