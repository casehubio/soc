import type { Manifest, ModelDescriptor, AliasDeclaration } from '@casehubio/mosaic-core';

export interface PresetTemplate {
  id: string;
  label: string;
  manifest: Manifest;
  authPatternId?: string;
}

const ANTHROPIC_MODELS: ModelDescriptor[] = [
  { id: 'claude-opus-4-6', displayName: 'Claude Opus 4.6', vendor: 'anthropic', tier: 'FLAGSHIP', contextWindow: 1000000, maxOutput: 32000, capabilities: ['vision', 'tool_use'] },
  { id: 'claude-sonnet-5', displayName: 'Claude Sonnet 5', vendor: 'anthropic', tier: 'STANDARD', contextWindow: 200000, maxOutput: 16000, capabilities: ['vision', 'tool_use'] },
  { id: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5', vendor: 'anthropic', tier: 'FAST', contextWindow: 200000, maxOutput: 8192, capabilities: ['vision', 'tool_use'] },
];

const OPENAI_MODELS: ModelDescriptor[] = [
  { id: 'gpt-4o', displayName: 'GPT-4o', vendor: 'openai', tier: 'FLAGSHIP', contextWindow: 128000, maxOutput: 16384, capabilities: ['vision', 'tool_use'] },
  { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', vendor: 'openai', tier: 'FAST', contextWindow: 128000, maxOutput: 16384, capabilities: ['vision', 'tool_use'] },
];

const OLLAMA_MODELS: ModelDescriptor[] = [
  { id: 'llama3.1', displayName: 'Llama 3.1', vendor: 'ollama', tier: 'STANDARD', contextWindow: 128000, locality: 'LOCAL' },
  { id: 'mistral', displayName: 'Mistral', vendor: 'ollama', tier: 'STANDARD', contextWindow: 32000, locality: 'LOCAL' },
];

const STANDARD_ALIASES: Record<string, AliasDeclaration> = {
  'reasoning-heavy': { tier: 'FLAGSHIP', capabilities: ['tool_use'] },
  'fast-response': { tier: 'FAST' },
  'vision': { capabilities: ['vision'] },
};

export const PRESETS: PresetTemplate[] = [
  {
    id: 'anthropic-direct',
    label: 'Anthropic (Direct)',
    manifest: {
      providers: [{ vendor: 'anthropic', credential: 'env:ANTHROPIC_API_KEY' }],
      models: ANTHROPIC_MODELS,
      aliases: { ...STANDARD_ALIASES, 'reasoning-heavy': { ...STANDARD_ALIASES['reasoning-heavy']!, preferVendor: 'anthropic' } },
    },
  },
  {
    id: 'anthropic-vertex',
    label: 'Anthropic (Vertex)',
    authPatternId: 'gcp-iam',
    manifest: {
      providers: [{ vendor: 'anthropic', credential: { projectId: '', region: 'us-central1' } }],
      models: ANTHROPIC_MODELS,
      aliases: { ...STANDARD_ALIASES, 'reasoning-heavy': { ...STANDARD_ALIASES['reasoning-heavy']!, preferVendor: 'anthropic' } },
    },
  },
  {
    id: 'anthropic-bedrock',
    label: 'Anthropic (Bedrock)',
    authPatternId: 'aws-iam',
    manifest: {
      providers: [{ vendor: 'anthropic', credential: { region: 'us-east-1' } }],
      models: ANTHROPIC_MODELS,
      aliases: { ...STANDARD_ALIASES, 'reasoning-heavy': { ...STANDARD_ALIASES['reasoning-heavy']!, preferVendor: 'anthropic' } },
    },
  },
  {
    id: 'openai-standard',
    label: 'OpenAI',
    manifest: {
      providers: [{ vendor: 'openai', credential: 'env:OPENAI_API_KEY' }],
      models: OPENAI_MODELS,
      aliases: { ...STANDARD_ALIASES, 'reasoning-heavy': { ...STANDARD_ALIASES['reasoning-heavy']!, preferVendor: 'openai' } },
    },
  },
  {
    id: 'local-development',
    label: 'Local (Ollama)',
    manifest: {
      providers: [{ vendor: 'ollama', host: 'http://localhost:11434' }],
      models: OLLAMA_MODELS,
      aliases: { 'reasoning-heavy': { tier: 'STANDARD' }, 'fast-response': { tier: 'STANDARD' } },
    },
  },
  {
    id: 'multi-provider',
    label: 'Multi-provider',
    manifest: {
      providers: [
        { vendor: 'anthropic', credential: 'env:ANTHROPIC_API_KEY' },
        { vendor: 'openai', credential: 'env:OPENAI_API_KEY' },
      ],
      models: [...ANTHROPIC_MODELS, ...OPENAI_MODELS],
      aliases: STANDARD_ALIASES,
    },
  },
];
