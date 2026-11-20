export type WorkerFunctionType =
  | 'agent' | 'flow' | 'a2a' | 'mcp' | 'sequence' | 'external' | 'unknown';

export interface AgentConfig {
  systemPrompt: string;
  inputProjection: string;
  outputProjection: string;
  userMessageTemplate?: string;
  model: AgentModel;
}

export type AgentModel =
  | { openai: ProviderModelConfig }
  | { anthropic: ProviderModelConfig }
  | { ollama: ProviderModelConfig }
  | { mistralAi: ProviderModelConfig }
  | { googleAiGemini: ProviderModelConfig };

export type ModelProviderKey =
  | 'openai' | 'anthropic' | 'ollama' | 'mistralAi' | 'googleAiGemini';

export const MODEL_PROVIDERS: readonly ModelProviderKey[] =
  ['openai', 'anthropic', 'ollama', 'mistralAi', 'googleAiGemini'] as const;

export interface ProviderModelConfig {
  modelName: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface A2AConfig {
  endpoint: string;
  skill?: string;
  streaming?: boolean;
  auth?: AuthConfig;
}

export type McpConfig = McpStdioConfig | McpHttpConfig;

export interface McpStdioConfig {
  command: string[];
  env?: Record<string, string>;
}

export interface McpHttpConfig {
  url: string;
  auth?: AuthConfig;
}

export type McpTransportType = 'stdio' | 'http';

export interface AuthConfig {
  type: 'none' | 'bearer' | 'api-key';
  tokenConfigKey?: string;
}

export const FUNCTION_TYPE_KEYS = ['agent', 'do', 'a2a', 'mcp', 'sequence'] as const;

export const FUNCTION_TYPE_TO_YAML_KEY: Record<WorkerFunctionType, string | null> = {
  agent: 'agent',
  flow: 'do',
  a2a: 'a2a',
  mcp: 'mcp',
  sequence: 'sequence',
  external: null,
  unknown: null,
};

export const CORE_WORKER_KEYS = new Set([
  'name', 'description', 'capabilities', 'executionPolicy',
  'contextType', 'outputType',
]);

export type TriggerType = 'contextChange' | 'cloudEvent' | 'schedule' | 'scopeActivated';

export const TRIGGER_TYPES: readonly TriggerType[] =
  ['contextChange', 'cloudEvent', 'schedule', 'scopeActivated'] as const;
